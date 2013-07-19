// Filename: photo-manager/collections/uncategorized-images.js
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/image'
  ],
  function(_, Backbone, Plm, ImageModel) {

    var moduleName = 'photo-manager/collections/uncategorized-images';

    //
    // UncategorizedImagesCollection: collection of the images which have no tags.
    //
    var UncategorizedImagesCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.UncategorizedImagesCollection',

      model: ImageModel,

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
        !Plm.debug || console.log(this._debugPrefix + '.parse: Parsing images response - ' + JSON.stringify(response));
        return response.images;
      },

      url: function() {
        console.log("THE URL HAS BEEN REQUESTED");
        var url = '/api/media-manager/v0/images?tags=';
        
        return url;
      },
    });
    
    return UncategorizedImagesCollection;
  }
);

