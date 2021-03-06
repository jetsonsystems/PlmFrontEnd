// Filename: main.js
//
// We use require.js to do AMD style loading of our applications.
// First configure any aliases along with where they live.
//

requirejs.config({
  nodeRequire: require,
  text: { env: 'xhr' },
  //
  // By default, load anything from js/libs
  //
  baseUrl: 'js/libs',
  //
  // However, anything where module ID begins w/
  // "app", load it from js/app/photo-manager.
  //
  paths: {
    text: 'require/text',
    jquery: 'jquery/jquery.min',
    jqueryPageSlide: 'jquery/jquery.pageslide',
    jqueryColorbox: 'jquery/jquery.colorbox',
    jScrollPane: 'jquery/jquery.jScrollPane',
    jqueryQtip: 'jquery/jquery.qtip',
    underscore: 'underscore/underscore',
    backbone: 'backbone/backbone',
    postal: 'postal/postal',
    nprogress: 'nprogress/nprogress',
    plm: '../app',
    plmCommon: '../app/common',
    app: '../app/photo-manager'
  },
  //
  // Non-AMD modules like underscore / backbone.
  //
  shim: {
    jqueryPageSlide: ["jquery"],
    underscore: {
      exports: "_"
    },
    backbone: {
      deps: ["underscore", "jquery"],
      exports: "Backbone"
    }
  }
});

addEventListener('app-ready', function(e){

  console.log('Got app-ready event!');

  if (!window.hasOwnProperty('appReady') || !window.appReady) {
    console.log('app/photo-manager/main: App ready event is false!');
    return;
  }

  if (processedAppReady) {
    console.log('app/photo-manager/main: App ready already processed...');
    return;
  }

  processedAppReady = true;

  // console.log('App is now ready...');

  // console.log('Testing require - ' + require('node-uuid').v4());

  //
  // Load our app and pass it into our definition function, along
  // with Plm such that it gets loaded for everyone down the road.
  //
  requirejs(['plmCommon/plm', 
             'app/app'],
            function(Plm, App) {
              !Plm.debug || console.log('/js/app/photo-manager/main: Loading, typeof Plm - ' + typeof(Plm) + ', typeof is - ' + typeof(App));
              Plm.onAppReady();
              App.initialize();
            });
});

//
// Load Plm, this will trigger initialization on doc. ready which should occur before the app-ready event.
// IE: Triggers the application load progress bar if the first time.
//
requirejs(['plmCommon/plm'],
          function(Plm) {
            !Plm.debug || console.log('/js/app/photo-manager/main: initial load...');
          });

//
//  There is a possible race condition where the app-ready event may be dispatched before
//  requireJS loads this. Hence, ensure triggering it ourself. The handler
//  will ONLY process things once.
//
if (window.hasOwnProperty('appReady') && window.hasOwnProperty('processedAppReady') && (window.appReady === true) && (processedAppReady === false)) {
  console.log('app/photo-manager/main: Self dispatching app-ready');
  dispatchEvent(new Event('app-ready'));
}
