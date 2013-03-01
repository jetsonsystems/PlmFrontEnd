// Filename: photo-manager/collections/importers
define([
  'underscore',
  'backbone',
  // Grab the Image model as recent-uploads is just a collection of images.
  'app/models/importer'
],
       function(_, Backbone, ImporterModel) {
         var ImportersCollection = Backbone.Collection.extend({
           model: ImporterModel,

           numToFetch: undefined,

           initialize: function() {
             if (arguments.length > 1) {
               var options = arguments[1];
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

           parse: function(response) {
             return response.importers;
           }
         });

         return ImportersCollection;
       });
