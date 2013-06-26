// Filename: photo-manager/collections/search
define(
    [
        'underscore',
        'backbone',
        // Grab the Image model as recent-uploads is just a collection of images.
        'app/models/search'
    ],
    function(_, Backbone, SearchModel) {

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
        var SearchCollection = Backbone.Collection.extend({
            model: SearchModel,

            searchTerm: undefined,

            //
            // initialize:
            //
            //  Args:
            //    options:
            //
            initialize: function(models, options) {

            },

            url: function() {
                var url = '/api/media-manager/v0/images?tags='+this.searchTerm;
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

        return SearchCollection;
    }
);
