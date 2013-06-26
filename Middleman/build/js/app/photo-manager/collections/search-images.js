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

            searchTerm: undefined,

            //
            // initialize:
            //
            //  attr: initial images.
            //  options:
            //
            initialize: function(attr, options) {
                !Plm.debug || console.log(this._debugPrefix + '.initialize: Initializing...');
                console.log("localStorage test:");
                console.log("Confirm undefined: " + localStorage["testundefined"]);
                localStorage["testundefined"] = "value";
                console.log("Confirm value set: " + localStorage["testundefined"]);

                console.log("Confirm lastsearch value: " + localStorage["lastsearch"]);

                if(typeof localStorage["lastsearch"] !== "undefined" ) {
                    this.searchTerm = localStorage["lastsearch"];
                    console.log("I JUST ASSIGNED THE SEARCH TERM.")
                    console.log(this);
                }
            },

            parse: function(response) {
                !Plm.debug || console.log(this._debugPrefix + '.parse: Parsing importers-images response - ' + JSON.stringify(response));
                return response.images;
            },

            url: function() {
                console.log("THE URL HAS BEEN REQUESTED");
                var url = '/api/media-manager/v0/images?tags='+this.searchTerm;

                return url;
            },
        });

        return SearchImagesCollection;
    }
);

