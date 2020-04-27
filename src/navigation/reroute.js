import CustomEvent from "custom-event";
import { isStarted } from "../start.js";
import { toLoadPromise } from "../lifecycles/load.js";
import { toBootstrapPromise } from "../lifecycles/bootstrap.js";
import { toMountPromise } from "../lifecycles/mount.js";
import { toUnmountPromise } from "../lifecycles/unmount.js";
import {
  getMountedApps,
  getAppsToLoad,
  getAppsToUnmount,
  getAppsToMount,
  getAppStatus,
} from "../applications/apps.js";
import { callCapturedEventListeners } from "./navigation-events.js";
import { getAppsToUnload, toUnloadPromise } from "../lifecycles/unload.js";
import {
  toName,
  shouldBeActive,
  NOT_MOUNTED,
  MOUNTED,
  NOT_LOADED,
  SKIP_BECAUSE_BROKEN,
} from "../applications/app.helpers.js";

let appChangeUnderway = false,
  peopleWaitingOnAppChange = [];

export function triggerAppChange() {
  // Call reroute with no arguments, intentionally
  return reroute();
}

export function reroute(pendingPromises = [], eventArguments) {
  if (appChangeUnderway) {
    return new Promise((resolve, reject) => {
      peopleWaitingOnAppChange.push({
        resolve,
        reject,
        eventArguments,
      });
    });
  }

  const appsThatChanged = [];

  if (isStarted()) {
    appChangeUnderway = true;
    return performAppChanges();
  } else {
    return loadApps();
  }

  function addChangedApps(apps) {
    appsThatChanged.push(...apps);
    return apps;
  }

  function loadApps() {
    return Promise.resolve().then(() => {
      const loadPromises = addChangedApps(getAppsToLoad()).map(toLoadPromise);

      return (
        Promise.all(loadPromises)
          .then(callAllEventListeners)
          // there are no mounted apps, before start() is called, so we always return []
          .then(() => [])
          .catch((err) => {
            callAllEventListeners();
            throw err;
          })
      );
    });
  }

  function performAppChanges() {
    return Promise.resolve().then(() => {
      window.dispatchEvent(
        new CustomEvent(
          "single-spa:before-routing-event",
          getCustomEventDetail()
        )
      );
      const unloadPromises = addChangedApps(getAppsToUnload()).map(
        toUnloadPromise
      );

      const unmountUnloadPromises = addChangedApps(getAppsToUnmount())
        .map(toUnmountPromise)
        .map((unmountPromise) => unmountPromise.then(toUnloadPromise));

      const allUnmountPromises = unmountUnloadPromises.concat(unloadPromises);

      const unmountAllPromise = Promise.all(allUnmountPromises);

      const appsToLoad = addChangedApps(getAppsToLoad());

      /* We load and bootstrap apps while other apps are unmounting, but we
       * wait to mount the app until all apps are finishing unmounting
       */
      const loadThenMountPromises = appsToLoad.map((app) => {
        return toLoadPromise(app).then((app) =>
          tryToBootstrapAndMount(app, unmountAllPromise)
        );
      });

      /* These are the apps that are already bootstrapped and just need
       * to be mounted. They each wait for all unmounting apps to finish up
       * before they mount.
       */
      const mountPromises = getAppsToMount()
        .filter((appToMount) => appsToLoad.indexOf(appToMount) < 0)
        .map((appToMount) => {
          appsThatChanged.push(appToMount);
          return tryToBootstrapAndMount(appToMount, unmountAllPromise);
        });
      return unmountAllPromise
        .catch((err) => {
          callAllEventListeners();
          throw err;
        })
        .then(() => {
          /* Now that the apps that needed to be unmounted are unmounted, their DOM navigation
           * events (like hashchange or popstate) should have been cleaned up. So it's safe
           * to let the remaining captured event listeners to handle about the DOM event.
           */
          callAllEventListeners();

          return Promise.all(loadThenMountPromises.concat(mountPromises))
            .catch((err) => {
              pendingPromises.forEach((promise) => promise.reject(err));
              throw err;
            })
            .then(finishUpAndReturn);
        });
    });
  }

  function finishUpAndReturn() {
    const returnValue = getMountedApps();
    pendingPromises.forEach((promise) => promise.resolve(returnValue));

    try {
      const appChangeEventName =
        appsThatChanged.length === 0
          ? "single-spa:no-app-change"
          : "single-spa:app-change";
      window.dispatchEvent(
        new CustomEvent(appChangeEventName, getCustomEventDetail())
      );
      window.dispatchEvent(
        new CustomEvent("single-spa:routing-event", getCustomEventDetail())
      );
    } catch (err) {
      /* We use a setTimeout because if someone else's event handler throws an error, single-spa
       * needs to carry on. If a listener to the event throws an error, it's their own fault, not
       * single-spa's.
       */
      setTimeout(() => {
        throw err;
      });
    }

    /* Setting this allows for subsequent calls to reroute() to actually perform
     * a reroute instead of just getting queued behind the current reroute call.
     * We want to do this after the mounting/unmounting is done but before we
     * resolve the promise for the `reroute` function.
     */
    appChangeUnderway = false;

    if (peopleWaitingOnAppChange.length > 0) {
      /* While we were rerouting, someone else triggered another reroute that got queued.
       * So we need reroute again.
       */
      const nextPendingPromises = peopleWaitingOnAppChange;
      peopleWaitingOnAppChange = [];
      reroute(nextPendingPromises);
    }

    return returnValue;
  }

  /* We need to call all event listeners that have been delayed because they were
   * waiting on single-spa. This includes haschange and popstate events for both
   * the current run of performAppChanges(), but also all of the queued event listeners.
   * We want to call the listeners in the same order as if they had not been delayed by
   * single-spa, which means queued ones first and then the most recent one.
   */
  function callAllEventListeners() {
    pendingPromises.forEach((pendingPromise) => {
      callCapturedEventListeners(pendingPromise.eventArguments);
    });

    callCapturedEventListeners(eventArguments);
  }

  function getCustomEventDetail() {
    const newAppStatuses = {};
    const appsByNewStatus = {
      // for apps that were mounted
      [MOUNTED]: [],
      // for apps that were unmounted
      [NOT_MOUNTED]: [],
      // apps that were forcibly unloaded
      [NOT_LOADED]: [],
      // apps that attempted to do something but are broken now
      [SKIP_BECAUSE_BROKEN]: [],
    };
    appsThatChanged.forEach((app) => {
      const appName = toName(app);
      const status = getAppStatus(appName);
      newAppStatuses[appName] = status;
      const statusArr = (appsByNewStatus[status] =
        appsByNewStatus[status] || []);
      statusArr.push(appName);
    });

    return {
      detail: {
        newAppStatuses,
        appsByNewStatus,
        totalAppChanges: appsThatChanged.length,
        originalEvent: eventArguments?.[0],
      },
    };
  }
}

/**
 * Let's imagine that some kind of delay occurred during application loading.
 * The user without waiting for the application to load switched to another route,
 * this means that we shouldn't bootstrap and mount that application, thus we check
 * twice if that application should be active before bootstrapping and mounting.
 * https://github.com/single-spa/single-spa/issues/524
 */
function tryToBootstrapAndMount(app, unmountAllPromise) {
  if (shouldBeActive(app)) {
    return toBootstrapPromise(app).then((app) =>
      unmountAllPromise.then(() =>
        shouldBeActive(app) ? toMountPromise(app) : app
      )
    );
  } else {
    return unmountAllPromise.then(() => app);
  }
}
