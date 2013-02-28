//
// Filename: photo-manager/views/home.js
//

define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm', 
    'plmCommon/msg-bus', 
    'app/views/home/library/last-import',
    'app/views/home/library/all-photos'
  ],
  function($, _, Backbone, Plm, MsgBus, LastImportView, AllPhotosView) {

    var ws = undefined;

    //
    // HomeView: The photo-manager/home view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    //  Notes:
    //
    //    Last Import: The last import can changes as a result of an active local import, or a sync between peer applications.
    //
    //      * active local import: The lastImport is replaced and incrementally updated.
    //        On import.started:
    //          state = STATUS_INCREMENTALLY_RENDERING
    //        On import.image.saved:
    //          if state === STATUS_INCREMENTALLY_RENDERING then
    //            - add or update image in collection.
    //            - update view with image in collection.
    //        On import.completed
    //          state = STATUS_RENDERED
    //
    //      * sync with peer applications:
    //        When a doc.importers.created or doc.importers.updated event is detected from a foreign instance of the application:
    //          - if the importers document should supercede the current lastImport's lastImporter then
    //            state = STATUS_OBSOLETE
    //        When a sync.completed event is detected and state === STATUS_OBSOLETE:
    //          - render or re-render the view.
    //          state = STATUS_RENDERED
    //
    var HomeView = Backbone.View.extend({

      tagName: 'div',

      id: 'photo-manager/home',

      initialize: function(options) {
        console.log(this.id + '.HomeView.initialize: called...');
        options = options || {};
        options.path = options.path ? options.path : 'library/all-photos';
        this.path = options.path;
        console.log(this.id + '.HomeView.initialize: path - ' + this.path);
        this.contentView = new LastImportView();
        this._enableImport();
        this._enableSync();
        this._respondToEvents();
      },

      render: function() {
        var that = this;
        this.contentView.once(this.contentView.id + ":rendered",
                              function() {
                                that.$el.html(that.contentView.$el);
                                that.trigger(that.id + ":rendered");
                              });
        this.contentView.render();
        return this;
      },

      _enableImport: function() {
        $("#upload-photos").live("click", function(el){
          console.log("Trying to upload images...")
          window.frame.openDialog({
            type: 'open', // Either open or save
            title: 'Open...', // Dialog title, default is window title
            multiSelect: false, // Allows multiple file selection
            dirSelect:true, // Directory selector
            initialValue: '~/Pictures' // Initial save or open file name. Remember to escape backslashes.
          }, function( err , files ) {

            var dir = new String(files[0]);
            console.log(">> dir: " + dir);

            $.ajax({
              url: 'http://appjs/api/media-manager/v0/importers',
              type: 'POST',
              contentType: 'application/json',
              data: {
                "import_dir": dir
              },
              // processData: false,
              success: function(data, textStatus, jqXHR) {
                console.log(">> AJAX success");
              },
              error: function() {
                console.log(">> AJAX failure");
              }
            });
            // End of AJAX call

          });
          // End of Open Save Dialog

        });
        // End of button push
      },

      _enableSync: function() {
        $('#content-top-nav a.sync').click(function(el) {
          console.log('photo-manager/views/home: clicked sync!');
          $.ajax({url: 'http://appjs/api/media-manager/v0/storage/synchronizers',
                  type: 'POST',
                  contentType: 'application/json',
                  data: "",
                  processData: false,
                  success: function(data, textStatus, jqXHR) {
                    console.log('photo-manager/views/home._doRender: sync triggered...');
                  },
                  error: function() {
                    console.log('photo-manager/views/home._doRender: sync request error!');
                  }
                 });
        });
      },

      //
      // _respondToEvents: Subscribe, and respond to relevant events on the msg-bus.
      //
      _respondToEvents: function() {
        
        // Use this variable to keep track of the number of images imported
        var current_imported_images_count = 0;
        var total_images_to_import_count = 0;

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           console.log('photo-manager/views/home._respondToEvents: import started, msg.data - ' + msg.data);

                           $('#content-top-nav a.import').addClass('active');
                           Plm.showFlash('Media import started!');
            
                           // Import started, rotate the logo
                           console.log(">> Import started, trying to rotate logo");
                           $("#logo").addClass("rotate");
                           $("#notifications-collection").show();
                           $("#notification").text("Now importing images");
            
                           total_images_to_import_count = msg.data.num_to_import;
            
                           $("#notification-percentage").text(current_imported_images_count + "/" + total_images_to_import_count);
                           $("#num-images-imported").text(current_imported_images_count);
                           console.log(">> Number of files to import: " + msg.data.num_to_import);
                           console.log(">> Current number of images imported: " + current_imported_images_count);
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           current_imported_images_count++;
                           console.log(">> Current number of images imported: " + current_imported_images_count);
                           $("#notification-percentage").text(current_imported_images_count + "/" + total_images_to_import_count);
                           $("#num-images-imported").text(current_imported_images_count);

                           console.log('photo-manager/views/home._respondToEvents: import image saved!');
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           console.log('photo-manager/views/home._respondToEvents: import completed!');

                           Plm.showFlash('Media import completed!');
                           $('#content-top-nav a.import').removeClass('active');

                           // Import started, rotate the logo
                           console.log(">> Import ended, trying to stop logo rotation");
                           $("#logo").removeClass("rotate");
                           $("#notification").text("Finished importing images");
                           // $("#notification-percentage").text("100%");
                           $("#notification-percentage").text(current_imported_images_count + "/" + total_images_to_import_count);
                           $('#notifications-collection').delay(5000).fadeOut();
                         });

        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.started',
                         function(msg) {
                           console.log('photo-manager/views/home._respondToEvents: sync started!');
                           $('#content-top-nav a.sync').addClass('active');
                           Plm.showFlash('Media sync started!');
                         });

        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.completed',
                         function(msg) {
                           console.log('photo-manager/views/home._respondToEvents: sync completed!');
                           Plm.showFlash('Media sync completed!');
                           $('#content-top-nav a.sync').removeClass('active');
                         });
      }

    });

    return HomeView;
  }
);
