# Parcels

A single-spa parcel is a bundle of functionality (like an application) meant to be controlled imperatively 
by an application, Parcels use similar methodology as Applications so we recommend [starting with Applications.](/docs/applications.md)
A parcel can be as large as an application or as small as an component and written in 
and language as long as it exports the correct lifecycle events. In a single-spa world, your SPA contains 
many registered applications and potentially many parcels. Usually you'll want to mount a parcel within the 
context of an application, this will automatically unmount the parcel when the application is unmounted.

## Parcel Lifecycles
To read more about lifecycles and how single-spa handles the concept start with [applications](/docs/applications.md#registered-application-lifecycle)

### Bootstrap
This lifecycle function will be called once, right before the parcel is
mounted for the first time.

```js
function bootstrap(props) {
  return Promise
    .resolve()
    .then(() => {
        // This is where you do one-time initialization
        console.log('bootstrapped!')
        });
}
```

### Mount
This lifecycle function will be called whenever the parcel is not mounted and `mountParcel` is called. When
called, this function should create DOM elements, DOM event listeners, etc. to render content to the user.

```js
function mount(props) {
  return Promise
    .resolve()
    .then(() => {
        // This is where you tell a framework (e.g., React) to render some ui to the dom
        console.log('mounted!')
        });
}
```

### Unmount
This lifecycle function will be called whenever the parcel is mounted, and either A) `unmount()` is called 
or B) the parent parcel or Application is unmounted. When
called, this function should clean up all DOM elements, DOM event listeners, leaked memory, globals,
observable subscriptions, etc. that were created at any point when the parcel was mounted.

```js
function unmount(props) {
  return Promise
    .resolve()
    .then(() => {
        // This is where you tell a framework (e.g., React) to unrender some ui from the dom
        console.log('unmounted!');
        });
}
```

### Update (optional)
This lifecycle function will be called whenever the parcel is mounted, and it needs to be updated.

## Example use cases

### Modals
`App1` handles everything related to contacts (highly cohesive) but in another area `App2` of our single-spa application we need to create a contact.
We could do any number of things to share the functionality between application 1 and 2: 
- If both are written in the same framework we could export/import components.
- We could reimplement creating a contact (loss of cohesion)
- We could use single-spa parcels.

Exporting a parcel that wraps the component gives us the ability to share components and behavior across disparate frameworks, without losing application cohesion.
App1 can export a single-spa parcel and App2 can import the parcel and use it easily. One major advantage is that in the below example
if App2 is unmounted then the modal will also be unmounted.

```js
// App1
export const AddContactParcel = {
  bootstrap: bootstrapFn,
  mount: mountFn,
  unmount: unmountFn,
}

// App2
// get the parcel configuration in this case I'm using systemJS and react
...
componentDidMount() {
  SystemJS.import('App1').then(App1 => {
    const domElement = document.body
    App2MountProps.mountParcel(App1.AddContactParcel, {domElement})
  })
}
...

```

### Cross Library Components

There are a lot of different approaches to share components across libraries, one we use extensively 
for leaf nodes (buttons, etc) is web components. However once you move beyond a leaf node it's much more difficult 
to share complex components across different frameworks. Single Spa parcels takes the same concepts of multiple 
child apps written in multiple frameworks and applies that to components.

### Imperative Applications

Sometimes you need a single spa application to be mounted in a very specific situation. That situation 
could be in an area where another application is active 99% of the time by itself. You could use the [Application activity Function](/docs/single-spa-config.md#activity-function)
and `localStorage` or `history` to manage that or you could imperatively mount something using Parcels.
You could mount an entire application or you could mount a component.

