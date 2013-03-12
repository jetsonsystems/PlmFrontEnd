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
    //      filterWithoutStartedAt: don't return any which do NOT have a started_at attributed.
    //        These are imports which failed to trigger for some reason.
    //
    var ImportersCollection = Backbone.Collection.extend({
      model: ImporterModel,

      numToFetch: undefined,

      filterWithoutStartedAt: false,

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
          if (_.has(options, 'filterWithoutStartedAt')) {
            this.filterWithoutStartedAt = options.filterWithoutStartedAt;
          }
        }
      },

      url: function() {
        var url = '/api/media-manager/v0/importers';
        if (!this.filterWithoutStartedAt) {
          if (this.numToFetch) {
            url = url + '?n=' + this.numToFetch;
          }
        }
        return url;
      },

      //
      // parse: Return response.importers. If we asked to filter those
      //  without a 'started_at' attribute, filter them, and return the
      //  proper number.
      //
      parse: function(response) {
        if (this.filterWithoutStartedAt) {
          var filtered = _.filter(response.importers,
                                  function(importer) { return _.has(importer, 'started_at'); });
          if (this.numToFetch) {
            return _.first(filtered, this.numToFetch);
          }
          else {
            return filtered;
          }
        }
        else {
          return response.importers;
        }
      }

    });

    return ImportersCollection;
  }
);
