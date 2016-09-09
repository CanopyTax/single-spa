# single-spa
[![npm version](https://img.shields.io/npm/v/single-spa.svg?style=flat-square)](https://www.npmjs.org/package/single-spa)
[![Build Status](https://img.shields.io/travis/CanopyTax/single-spa.svg?style=flat-square)](https://travis-ci.org/CanopyTax/single-spa)

Combine multiple SPAs into one SPA by implementing lifecycle functions. This allows you to:
- [Use multiple frameworks on the same page](/docs/single-spa-ecosystem.md#help-for-frameworks) [without refreshing the page](/docs/child-applications.md)
  (React, Angular 1, Angular 2, Ember, or whatever you're using)
- Write code using a new framework, without rewriting your app
- [Lazy load code for improved initial load time](/docs/child-applications.md#load).

single-spa works in Chrome, Firefox, Safari, IE11, and Edge.

## Architectural Overview
Apps built with single-spa are made up of the following pieces:

1. An html file
1. Many [child applications](/docs/child-applications), each of which is almost like an entirely distinct SPA. Child applications respond to url routing events and must know how to bootstrap, mount, and unmount themselves from the DOM.
   For example, your React or Angular applications are child applications which are either active or dormant. When active, they listen to url routing events
   and put content on the DOM. When dormant, they do not listen to url routing events and are totally removed from the DOM.
1. A [root application](/docs/root-application.md) where child applications are registered. Each child application is registered with three things:
  1. A name
  1. A function to load the child application's code
  1. A function that determines when the child application is active/dormant.

## How hard will it be to use single-spa?
single-spa works with es5, es6+, typescript, webpack, systemjs, gulp, grunt, bower, or really anything build system you can think of. You can npm
install it, jspm install it, or even just use a `<script>` tag if you prefer. If you're not starting your application from scratch, you'll have to [migrate
your app](/docs/migrating-existing-spas.md) to become a single-spa child application.

## Documentation
Extensive documentation is found in the [docs](/docs) directory.

## Simple Usage
*Note*: this example uses [jspm](https://github.com/jspm/jspm-cli), but checkout the [build systems documentation](/docs/single-spa-ecosystem.md#help-with-frameworks) to see how
to set everything up with webpack or other build systems.
```bash
npm install -g jspm@beta
jspm init
jspm install npm:single-spa
```

Create an index.html file (see [docs](/docs/root-application.md#indexhtml-file) for more detail).
```html
<html>
  <head>
    <script src="jspm_packages/system.src.js"></script>
    <script src="jspm.browser.js"></script>
    <script src="jspm.config.js"></script>
    <script>
      System.import('src/main.js');
    </script>
  </head>
  <body>
    <div id="main-content"></div>
  </body>
</html>
```

Create the root application (see [docs](/docs/root-application.md) for more detail).
```js
// src/main.js
import { declareChildApplication, start } from "single-spa";
declareChildApplication('app1', () => System.import('/apps/app1.js'), () => window.location.hash === '');
start()
```

Create the child application (see [docs](/docs/child-applications.md) for more detail).
```js
document.getElementById('main-content').textContent += "App1 is loaded.";

// apps/app1.js
export async function bootstrap() {
  document.getElementById('main-content').textContent += "App1 is bootstrapped.";
}

export async function mount() {
  document.getElementById('main-content').textContent += "App1 is mounted!";
}

export async function unmount() {
  document.getElementById('main-content').textContent = "";
}
```

## API
See [single-spa api](/docs/single-spa-api.md) and [child application api](/docs/child-applications.md#child-application-lifecycle).

## View the demo!
A [demo is live](http://single-spa.surge.sh) on surge.sh, but is based on an old version of single-spa. The demo will soon be updated to use single-spa@3.x
