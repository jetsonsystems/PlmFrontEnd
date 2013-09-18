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
    'plmCommon/plm-ui',
    'app/views/home'
  ],
  function($, _, Backbone, Plm, PlmUI, HomeView) {
    console.log('/js/app/photo-manager/router: Loading, jquery type - ' + typeof($) + ', backbone type - ' + typeof(Backbone) + ', home view type - ' + typeof(HomeView));

    var views = {};

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
        if (_.has(views, 'home')) {
          views.home.navigateTo(path);
        }
        else {
          var view = new HomeView({path: path});
          views.home = view;
          view.once(view.id + ":rendered",
                    function() {
                      PlmUI.view.onRendered();
                      $('#middle-column').html(view.$el);
                    });
          PlmUI.view.onRender({
            showProgress: true,
            progress: {
              container: $("#middle-column")
            }
          });
          view.render();
        }
      }

    });

    var router;

    var initialize =  function() {
      !Plm.debug || console.log('/js/app/photo-manager/router: Initializing...');
      router = new Router();
      Backbone.history.start({pushState: true,
                              root: "/photos#home/library/all-photos"});
      router.navigate('#home/library/all-photos', {trigger: true, replace: false});
    };

    return {
      initialize: initialize,
      navigate: function() {
        router.navigate.apply(router, arguments);
      }
    };

  }
);
