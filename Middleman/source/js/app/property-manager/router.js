// Filename: router.js
//
// Our property-manager router.
//
define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/views/home'
  ],
  function($, _, Backbone, Plm, HomeView) {
    console.log('/js/app/property-manager/router: Loading, jquery type - ' + typeof($) + ', backbone type - ' + typeof(Backbone) + ', home view type - ' + typeof(HomeView));

    var Router = Backbone.Router.extend({

      routes: {
        "home/*path": "home"
      },

      //
      // Initialization
      //
      initialize: function(options) {
        !Plm.debug || console.log('property-manager.router.initialize: initializing...');
      },

      home: function(path) {
        !Plm.debug || console.log('property-manager.router.initialize: about to render home, path - ' + path);
        var view = new HomeView({path: path});
        view.once(view.id + ":rendered",
                  function() {
                    $('#middle-column').html(view.$el);
                  });
        view.render();
      }

    });
    var initialize =  function() {
      !Plm.debug || console.log('/js/app/property-manager/router: Initializing...');
      router = new Router();
      Backbone.history.start({pushState: true,
                              root: "/properties#home"});
    };
    return {
      initialize: initialize
    };
  }
);
