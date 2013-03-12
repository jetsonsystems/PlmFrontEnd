// Filename: photo-manager/collections/importers-images.js
define([
  'underscore',
  'backbone',
  'app/models/image'
],
       function(_, Backbone, ImageModel) {

         //
         // LastImportCollection: collection of the images associated with the most recent import.
         //
         var ImportersImagesCollection = Backbone.Collection.extend({

           model: ImageModel,

           //
           // importerId: ID of importer we need to get images from.
           //
           importerId: undefined,

           //
           // initialize:
           //
           //  attr: initial images.
           //  options:
           //    importer - initialize with a specific instance of an importer.
           //    importerId - provide the ID of the importer.
           //
           //    Note, either options.importer or options.importerId is required.
           //
           initialize: function(attr, options) {
             if (options) {
               if (_.has(options, 'importer')) {
                 this.importerId = options.importer.id;
               }
               else if (options.importerId) {
                 this.importerId = options.importerId;
               }
             }
           },

           url: function() {
             if (this.importerId) {
               return '/api/media-manager/v0/importers/' + this.importerId + '/images';
             }
             else {
               return undefined;
             }
           },

           parse: function(response) {
             console.log('Parsing importers-images response - ' + JSON.stringify(response));
             return response.importer.images;
           }
         });

         return ImportersImagesCollection;
       });
