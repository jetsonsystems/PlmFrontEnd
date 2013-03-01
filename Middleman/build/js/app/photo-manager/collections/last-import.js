// Filename: photo-manager/collections/last-import.js
define([
  'underscore',
  'backbone',
  // Grab the Importers collection as we need to get the last importer used to import images.
  'app/collections/importers',
  // Grab the Image model as last-import is just a collection of images associated with the most recent import.
  'app/models/importer',
  'app/models/image'
],
       function(_, Backbone, ImportersCollection, ImporterModel, ImageModel) {

         //
         // LastImportCollection: collection of the images associated with the most recent import.
         //
         var LastImportCollection = Backbone.Collection.extend({

           model: ImageModel,

           //
           //  The collection used to get to the importers.
           //
           importers: undefined,
           //
           //  For convenience, holds a reference to the importer associated with the most recent importer.
           //
           importer: undefined,

           //
           // initialize:
           //
           //  options:
           //    importer - initialize with a specific instance of an importer.
           //
           initialize: function(options) {
             if (options && _.has(options, 'importer')) {
               this.importer = new ImporterModel(options.importer);
               this.importers = new ImportersCollection([this.importer], { numToImport: 1 } );
             }
             else {
               this.importers = new ImportersCollection(null, { numToImport: 1 } );
             }
           },

           url: function() {
             if (this.importer) {
               return '/api/media-manager/v0/importers/' + this.importer.id + '/images';
             }
             else {
               return undefined;
             }
           },

           fetch: function(options) {
             var that = this;
             var onImportersSuccess = function(importersCollection, response) {
               if (importersCollection.length > 0) {
                 that.importer = importersCollection.at(0);
                 console.log('Last importer fetched, w/ id - ' + that.importer.id);
                 Backbone.Collection.prototype.fetch.call(that, options);
               }
               else {
                 console.log('We have an empty collection of importers!');
                 if (options && _.has(options, 'success')) {
                   options.success(that, response, options);
                 }
               }
             };
             var onImportersError = function(importersCollection, xhr) {
               console.log('We had an error fetching importers!');
             }
             this.importers.fetch({success: onImportersSuccess,
                                   error: onImportersError});
           },

           parse: function(response) {
             console.log('Parsing last-import response - ' + JSON.stringify(response));
             return response.importer.images;
           }
         });

         return LastImportCollection;
       });
