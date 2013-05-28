// Filename: photo-manager/collections/trash-images.js
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm', 
    'app/models/image'
  ],
  function(_, Backbone, Plm, ImageModel) {

    var moduleName = 'photo-manager/views/home/library/trash';

    //
    // LastImportCollection: collection of the images associated with the most recent import.
    //
    var TrashImagesCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.TrashImagesCollection',

      model: ImageModel,

      url: '/api/media-manager/v0/images?trashState=in',

      //
      // initialize:
      //
      //  attr: initial images.
      //  options:
      //
      initialize: function(attr, options) {
        !Plm.debug || console.log(this._debugPrefix + '.initialize: Initializing...');
      },

      parse: function(response) {
        !Plm.debug || console.log(this._debugPrefix + '.parse: Parsing importers-images response - ' + JSON.stringify(response));
        return response.images;
      }
    });
    
    return TrashImagesCollection;
  }
);
