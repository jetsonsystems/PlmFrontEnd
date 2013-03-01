// Filename: photo-manager/collections/recent-uploads
define([
  'underscore',
  'backbone',
  // Grab the Image model as recent-uploads is just a collection of images.
  'app/models/image'
],
       function(_, Backbone, ImageModel) {
         var RecentUploadsCollection = Backbone.Collection.extend({
           model: ImageModel,

           url: '/api/media-manager/v0/images/',

           parse: function(response) {
             return response.images;
           }
         });

         return RecentUploadsCollection;
       });
