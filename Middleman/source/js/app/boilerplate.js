// Filename: app.js (copy to app.js in a sub-application folder)

define(['underscore'],
       function(_) {
         var initialize = function() {
           console.log('initializing moudle...');
         }

         return {
           initialize: initialize
         };
       });
