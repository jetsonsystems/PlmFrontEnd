// Filename: app.js
//
// photo-manager app modulie.
//

define(
  [
    'jquery', 
    'underscore', 
    'backbone', 
    'plmCommon/plm',
    'plmCommon/msg-bus', 
    'app/router'
  ],
  function($, _, Backbone, Plm, MsgBus, Router) {
    !Plm.debug || console.log('/js/app/photo-manager/app: Loading, typeof MsgBus - ' + typeof(MsgBus) + ', typeof Router - ' + typeof(Router));

    var initialize = function() {
      !Plm.debug || console.log('/js/app/photo-manager/app: Initializing...');

      //
      // MsgBus:
      //
      //  Note, in the future the MsgBus initialization should probably occur outside of the
      //  context of an inidivdual App like the photo-manager such that it is an entity
      //  that can be shared accross pages. But, for that to happen we'll need to figure out
      //  how to share JS modules / instances accross pages, which may be possible via the
      //  window.name hack/work around. 
      //
      //  For this, we could consider a JavaScript session using Window.name, as described here:
      //
      //    http://stackoverflow.com/questions/1981673/persist-javascript-variables-across-pages
      //    http://www.thomasfrank.se/sessionvars.html
      //
      //  This thread also discusses some useful things to consider:
      //
      //    http://stackoverflow.com/questions/6396033/how-to-share-an-object-between-two-pages
      //
      MsgBus.initialize();
      Router.initialize();
    }

    return {
      initialize: initialize
    };
  }
);



