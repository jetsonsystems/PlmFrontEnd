// Filename: main.js (copy to main.js in a new sub-application folder)
//
// We use require.js to do AMD style loading of our applications.
// First configure any aliases along with where they live.
//
requirejs.config({
  //
  // By default, load anything from js/libs
  //
  baseUrl: 'js/libs',
  //
  // However, anything where module ID begins w/
  // "app", load it from js/app.
  //
  paths: {
    underscore: 'underscore/underscore',
    app: '../app'
  }
});

// Load our app and pass it into our definition function.
requirejs(['app'],
          function(App) {
            App.initialize();
          });

