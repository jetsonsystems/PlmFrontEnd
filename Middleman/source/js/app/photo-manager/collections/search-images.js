// Filename: photo-manager/collections/search-images.js
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/image'
  ],
  function(_, Backbone, Plm, ImageModel) {
    
    var moduleName = 'photo-manager/views/home/library/last-search';

    //
    // LastImportCollection: collection of the images associated with the most recent import.
    //
    var SearchImagesCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.TrashImagesCollection',

      model: ImageModel,

      _maxImages: undefined,

      searchTerm: undefined,

      //
      // initialize:
      //
      //  attr: initial images.
      //  options:
      //
      initialize: function(attr, options) {
        options = options || {};

        !Plm.debug || console.log(this._debugPrefix + '.initialize: Initializing...');
        console.log("localStorage test:");
        console.log("Confirm undefined: " + localStorage["testundefined"]);
        localStorage["testundefined"] = "value";
        console.log("Confirm value set: " + localStorage["testundefined"]);
        
        console.log("Confirm lastsearch value: " + localStorage["lastsearch"]);

        if(typeof localStorage["lastsearch"] !== "undefined" ) {
          this.searchTerm = localStorage["lastsearch"];
          console.log(this);
        }

        if (_.has(options, 'maxImages') && (options.maxImages > 0)) {
          this._maxImages = options.maxImages;
        }
      },

      parse: function(response) {
        !Plm.debug || console.log(this._debugPrefix + '.parse: Parsing importers-images response - ' + JSON.stringify(response));
        return response.images;
      },

      url: function() {
        var url = '/api/media-manager/v0/images?';

        if (this._maxImages) {
          url = url + 'n=' + this._maxImages + '&';
        }

        url = url + 'tags=' + this.searchTerm;
        
        return url;
      },
    });

    return SearchImagesCollection;
  }
);

