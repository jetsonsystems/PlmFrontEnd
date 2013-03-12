// Filename: router.js
//
// Our photo-manager router.
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
    console.log('/js/app/photo-manager/router: Loading, jquery type - ' + typeof($) + ', backbone type - ' + typeof(Backbone) + ', home view type - ' + typeof(HomeView));

    var Router = Backbone.Router.extend({

      routes: {
        "home/*path": "home"
      },

      //
      // Initialization
      //
      initialize: function(options) {
        !Plm.debug || console.log('photo-manager.router.initialize: initializing...');
      },

      home: function(path) {
        !Plm.debug || console.log('photo-manager.router.initialize: about to render home, path - ' + path);
        var view = new HomeView({path: path});
        view.once(view.id + ":rendered",
                  function() {
                    $('#right-column').html(view.$el);
                  });
        view.render();
      }

    });
    var initialize =  function() {
      !Plm.debug || console.log('/js/app/photo-manager/router: Initializing...');
      router = new Router();
      Backbone.history.start({pushState: true,
                              root: "/photos#home/library/all-photos"});
      router.navigate('#home/library/all-photos', {trigger: true, replace: false});
    };
    return {
      initialize: initialize
    };
  }
);
