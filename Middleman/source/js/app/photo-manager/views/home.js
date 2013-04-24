//
// Filename: photo-manager/views/home.js
//

var apiResources = require('MediaManagerAppSupport/lib/ApiResources');
var apiWorkers = require('MediaManagerAppSupport/lib/ApiWorkers');

define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm', 
    'plmCommon/msg-bus',
    'plmCommon/plm-ui',
    'app/views/home/library/last-import',
    'app/views/home/library/all-photos'
  ],
  function($, _, Backbone, Plm, MsgBus, PlmUI, LastImportView, AllPhotosView) {

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

      path: undefined,

      initialize: function(options) {
        !Plm.debug || console.log(this.id + '.HomeView.initialize: called...');
        options = options || {};
        options.path = options.path ? options.path : 'library/all-photos';
        !Plm.debug || console.log(this.id + '.HomeView.initialize: path - ' + this.path);
        this._updateView(options.path, { render: false });
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

      //
      // _updateView: Handle updating the view.
      //
      //  Args:
      //    path: path, ie: library/all-photos, library/last-import.
      //    options:
      //      render: true or false, default === false.
      //
      _updateView: function(path, options) {
        options = options || {render: false};
        options.render = _.has(options, 'render') ? options.render : false;
        if (this.path != path) {
          this.path = path;
          //
          // Handle the Library nav.
          //
          $("#hamburger .hamburger-item").removeClass("selected");
          if (this.path === 'library/last-import') {
            this.contentView = new LastImportView();
            $("#hamburger .hamburger-item.last-import").addClass("selected");
          }
          else if (this.path === 'library/all-photos') {
            this.contentView = new AllPhotosView();
            $("#hamburger .hamburger-item.all-photos").addClass("selected");
          }
          else {
            !Plm.debug || console.log("_updateView: Don't know what to do with path - " + path);
          }
        }
        else {
          !Plm.debug || console.log("_updateView: nothing to do for path - " + path);
        }
        if (options.render) {
          this.render();
        }
        return this;
      },

      _enableImport: function() {
        $("#main-button-collection .import").live("click", function(el){
          !Plm.debug || console.log("Trying to import images...")
          window.frame.openDialog({
            type: 'open', // Either open or save
            title: 'Open...', // Dialog title, default is window title
            multiSelect: false, // Allows multiple file selection
            dirSelect:true, // Directory selector
            initialValue: '~/Pictures' // Initial save or open file name. Remember to escape backslashes.
          }, function( err , files ) {

            var dir = String(files[0]);

            !Plm.debug || console.log(">> dir: " + dir);

            var payload = {
              "import_dir" : dir
            };

            $.ajax({
              url: 'http://localhost:9001/api/media-manager/v0/importers',
              type: 'POST',
              contentType: 'application/json',
              data: JSON.stringify(payload),
              processData: false,
              success: function(data, textStatus, jqXHR) {
                !Plm.debug || console.log(">> AJAX success");
              },
              error: function(jqXHR) {
                !Plm.debug || console.log(">> AJAX failure, response headers - " + jqXHR.getAllResponseHeaders());
              }
            });

          });
          // End of Open Save Dialog

        });
        // End of button push
      },

      _enableSync: function() {
        $('#row nav a.sync').click(function(el) {
          !Plm.debug || console.log('photo-manager/views/home: clicked sync!');
          $.ajax({
            url: 'http://localhost:9001/api/media-manager/v0/storage/synchronizers',
            type: 'POST',
            contentType: 'application/json',
            data: "",
            processData: false,
            success: function(data, textStatus, jqXHR) {
              !Plm.debug || console.log('photo-manager/views/home._doRender: sync triggered...');
            },
            error: function() {
              !Plm.debug || console.log('photo-manager/views/home._doRender: sync request error!');
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
        var import_in_progress = false;
        var sync_in_progress = false;

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import started, msg.data - ' + msg.data);

                           if (import_in_progress) {
                             Plm.showFlash('An import is already in progress, please wait til the current import finishes!');
                           }
                           else {
                             import_in_progress = true;
                             // $('#content-top-nav a.import').addClass('active');
                             total_images_to_import_count = msg.data.num_to_import;
                             PlmUI.notif.start("Now importing images",
                                               {
                                                 progressText: current_imported_images_count + "/" + total_images_to_import_count,
                                                 rotateLogo: false
                                               }
                                              );

                             !Plm.debug || console.log(">> Number of files to import: " + msg.data.num_to_import);
                             !Plm.debug || console.log(">> Current number of images imported: " + current_imported_images_count);
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           if (import_in_progress) {
                             current_imported_images_count++;
                             !Plm.debug || console.log(">> Current number of images imported: " + current_imported_images_count);

                             PlmUI.notif.update({progressText: current_imported_images_count + "/" + total_images_to_import_count});

                             !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import image saved!');
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import completed!');

                           if (import_in_progress) {
                             // $('#content-top-nav a.import').removeClass('active');
                             PlmUI.notif.end("Finished importing images",
                                             {
                                               progressText: current_imported_images_count + "/" + total_images_to_import_count
                                             });

                             current_imported_images_count = 0;
                             total_images_to_import_count = 0;
                             import_in_progress = false;
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.started',
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home._respondToEvents: sync started...');
                           !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._respondToEvents: msg.data - ' + msg.data);
                           if (sync_in_progress) {
                             Plm.showFlash('A sync is already in progress, please wait til the current sync finishes!');
                           }
                           else {
                             sync_in_progress = true;
                             // $('#content-top-nav a.sync').addClass('active');
                             PlmUI.notif.start("Syncing documents and meta-data",
                                               {
                                                 progressText: "",
                                                 rotateLogo: false
                                               }
                                              );
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.completed',
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home._respondToEvents: sync completed!');
                           if (sync_in_progress) {
                             // $('#content-top-nav a.sync').removeClass('active');
                             PlmUI.notif.end("Finished syncing",
                                             {
                                               progressText: ""
                                             });
                             sync_in_progress = false;
                           }
                         });
      }

    });

    return HomeView;
  }
);
