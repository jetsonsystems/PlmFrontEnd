//
// Filename: photo-manager/views/home/library/all-photos.js
//
define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm', 
    'plmCommon/msg-bus', 
    'app/collections/importers',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImportersCollection, importTemplate, importImageTemplate) {

    //
    // AllPhotosView: The photo-manager/home/library/all-photos view.
    //
    var AllPhotosView = Backbone.View.extend({

      tagName: 'div',

      id: 'photo-manager/home/library/all-photos',

      initialize: function() {
      },

      render: function() {
        this.trigger(this.id + ":rendered");
        return this;
      }

    });

    return AllPhotosView;

  }
);

