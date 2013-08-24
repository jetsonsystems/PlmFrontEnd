// Filename: photo-manager/collections/importers
define(
  [
    'underscore',
    'backbone',
    // Grab the Image model as recent-uploads is just a collection of images.
    'app/models/importer'
  ],
  function(_, Backbone, ImporterModel) {

    //
    // ImportersCollection:
    //
    //  Args:
    //    models: stardard.
    //    options:
    //      numToFetch: number to return.
    //
    var ImportersCollection = Backbone.Collection.extend({
      model: ImporterModel,

      numToFetch: undefined,

      //
      // initialize:
      //
      //  Args:
      //    options:
      //      numToFetch: Number of importers to fetch.
      //
      initialize: function(models, options) {
        if (options) {
          if (_.has(options, 'numToFetch') && options.numToFetch) {
            this.numToFetch = options.numToFetch;
          }
        }
      },

      url: function() {
        var url = '/api/media-manager/v0/importers';
        if (this.numToFetch) {
          url = url + '?n=' + this.numToFetch;
        }
        return url;
      },

      //
      // parse: Return response.importers. If we asked to filter those
      //  without a 'started_at' attribute, filter them, and return the
      //  proper number.
      //
      parse: function(response) {
        return response.importers;
      }

    });

    return ImportersCollection;
  }
);
