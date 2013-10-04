// Filename: photo-manager/collections/current-import.js
define([
  'underscore',
  'backbone',
  'plmCommon/plm', 
  'app/models/importer',
  'app/models/image'
],
       function(_, Backbone, Plm, ImporterModel, ImageModel) {

         var moduleName = 'photo-manager/collections/current-import';
         var debugPrefix = moduleName + '.CurrentImportCollection';

         //
         // CurrentImportCollection: collection of the images associated with the most recent import.
         //
         var CurrentImportCollection = Backbone.Collection.extend({

           model: ImageModel,

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
           initialize: function(models, options) {
             if (options && _.has(options, 'importer')) {
               this.importer = new ImporterModel(options.importer);
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
             var onImportersSuccess = function(importerCollection, response) {
               !Plm.debug || console.log(debugPrefix + '.fetch: Last importer fetched, w/ id - ' + that.importer.id + ', completed at - ' + that.importer.get('completed_at'));
               Backbone.Collection.prototype.fetch.call(that, options);
             };
             var onImporterError = function(importerCollection, xhr) {
               !Plm.debug || console.log(debugPrefix + '.fetch: We had an error fetching importer!');
             };
             this.importer.fetch({success: onImporterSuccess,
                                  error: onImporterError});
           },

           parse: function(response) {
             !Plm.debug || console.log(debugPrefix + '.parse: Parsing last-import response...');
             !Plm.debug || !Plm.verbose || console.log(debugPrefix + '.parse: response - ' + JSON.stringify(response));
             return response.importer.images;
           }
         });

         return CurrentImportCollection;
       });
