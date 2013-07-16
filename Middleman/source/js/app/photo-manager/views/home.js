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
    'app/router',
    'app/views/home/library/last-import',
    'app/views/home/library/all-photos',
    'app/views/home/library/trash',
    'app/views/home/library/uncategorized',
    'app/views/home/library/last-search'
  ],
  function($, _, Backbone, Plm, MsgBus, PlmUI, Router, LastImportView, AllPhotosView, TrashView, UncategorizedView, LastSearchView) {

    var moduleName = '/app/photo-manager/views/home';
    var debugPrefix = moduleName + '.HomeView';

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

      contentView: undefined,

      subscriptions: {},

      // Reference to last search made by user (Note: currently does not persist between application closes)
      lastSearch: undefined,

      //
      // importInProgress: Is there an import in progress? We only allow one import to be going on.
      //
      importInProgress: false,

      events: {
        'click #search-gear-collection .search': "_toggleSearchInput"
      },

      initialize: function(options) {
        !Plm.debug || console.log(this.id + '.HomeView.initialize: called...');
        options = options || {};
        options.path = options.path ? options.path : 'library/all-photos';
        !Plm.debug || console.log(this.id + '.HomeView.initialize: path - ' + options.path);
        this._updateView(options.path, { render: false });
        this._enableImport();
        this._enableSync();
        this._respondToEvents();

        $("#search-gear-collection").children(".search").off('click').on('click', this._toggleSearchInput);
        this._initializeSearchInput();

      },

      //
      // Navigate to somewhere within the photo-manager home view.
      //
      navigateTo: function(path) {
        this._updateView(path, {render: true,
                                refresh: true});
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
      // teardown: Cleanup after ourselves. Should be called prior to invoking <view>.remove().
      //  Will unsubscribe any registered subscriptions with the msg bus.
      //
      teardown: function() {
        !Plm.debug || console.log(debugPrefix + '.teardown: invoking...');

        var that = this;

        if (this.contentView) {
          this.contentView.teardown();
          this.contentView.remove();
          this.contentView = undefined;
        }

        _.each(_.keys(that.subscriptions), function(key) {
          MsgBus.unsubscribe(key);
          delete that.subscriptions[key];
        });
      },

      //
      // _updateView: Handle updating the view.
      //
      //  Args:
      //    path: path, ie: library/all-photos, library/last-import.
      //    options:
      //      render: true or false, default === false.
      //      refresh: true or false, default === false. Forces refreshing the
      //        view, ie: teardown and recreate the view even paths are the same
      //        and then render if render is true.
      //
      _updateView: function(path, options) {
        options = options || {render: false};
        options.render = _.has(options, 'render') ? options.render : false;
        if ((this.path != path) || options.refresh) {
          this.path = path;

          if (this.contentView) {
            this.contentView.teardown();
            this.contentView.remove();
            this.contentView = undefined;
          }

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
          else if (this.path === 'library/trash') {
            this.contentView = new TrashView();
            $("#hamburger .hamburger-item.trash").addClass("selected");
          }
          else if (this.path === 'library/uncategorized') {
              this.contentView = new UncategorizedView();
              $("#hamburger .hamburger-item.uncategorized").addClass("selected");
          }
          else if (this.path === 'library/last-search') {
              this.contentView = new LastSearchView();
              console.log("LOADING LASTSEARCHVIEW");
              $("#hamburger .hamburger-item.last-search").addClass("selected");
          }
          else {
            !Plm.debug || console.log("_updateView: Don't know what to do with path - " + path);
          }
          if (options.render) {
            this.render();
          }
        }
        else {
          !Plm.debug || console.log("_updateView: nothing to do for path - " + path);
        }
        return this;
      },

      _enableImport: function() {
        var that = this;

        var openImportInProgressDialog = function() {
          $(".plm-dialog.pm-trash").find(".ok").on('click', function() {
            closeImportInProgressDialog();
          });
          $(".importInProgressDialogBackdrop").on('click', function() {
            closeImportInProgressDialog();
          });
          $(".plm-dialog.pm-import-in-progress").show();
          $(".importInProgressDialogBackdrop").show();
        };

        var closeImportInProgressDialog = function() {
          $(".plm-dialog.pm-import-in-progress").find(".ok").off('click');
          $(".importInProgressDialogBackdrop").off('click');
          $(".plm-dialog.pm-import-in-progress").hide();
          $(".importInProgressDialogBackdrop").hide();
        };

        if (that.importInProgress) {
          !Plm.debug || console.log(debugPrefix + "._enableImport: Import in progress, cannot re-enable!");
          return;
        }

        $("#hamburger #import-button").removeClass('disabled');

        $("#hamburger #import-button").click(function(el){
          if (that.importInProgress) {
            !Plm.debug || console.log(debugPrefix + "._enableImport.click: Import in progress, aborting...");
            _openImportInProgressDialog();
          }
          else {
            that.importInProgress = true;
            that._disableImport();
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
                  that.importInProgress = false;
                  that._enableImport();
                }
              });

            });
            // End of Open Save Dialog
          }
        });
        // End of button push
      },

      _disableImport: function() {
        $("#hamburger #import-button").off('click');
        $("#hamburger #import-button").addClass('disabled');
      },

      _enableSync: function() {
        $('#hamburger #sync-button').click(function(el) {
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

      _toggleSearchInput: function() {
        var gearContainer = $("#search-gear-collection");
          gearContainer.children(".search-input").toggle();
          gearContainer.children(".search").toggleClass('selected');
      },

      _initializeSearchInput: function() {
          var that = this;
          $("#search-gear-collection").children(".search-input").off('keydown').on('keydown',  function(e) {
              var key = e.which;

              if(key === 13) {
                  !Plm.debug || console.log('_searchInputKeydown: calling _handleSearch("'+$(e.currentTarget).val()+'")');
                  that._handleSearch($(e.currentTarget).val());
              }
          });
      },

      _handleSearch: function(searchTerm) {
        // Assign the search term to local storage
        localStorage["lastsearch"] = searchTerm;

        // Forward user to the search page, which will automatically pick
        // up the stored term.
        if (window.location === "/photos#home/library/last-search") {
          //
          // If the location is the same, routing won't happen unless we explicitly
          // route. We could call _updateView but the the history won't get updated
          // so this is a bit more correct.
          //
          Router.navigate("/photos#home/library/last-search",
                          {trigger: true});
          //
          // this._updateView("library/last-search",
          //   {refresh: true,
          //    render: true});
          //
        }
        else {
          window.location = "/photos#home/library/last-search";
        }
      },

      //
      // _respondToEvents: Subscribe, and respond to relevant events on the msg-bus.
      //
      _respondToEvents: function() {
        var that = this;
        
        // Use this variable to keep track of the number of images imported
        var current_imported_images_count = 0;
        var total_images_to_import_count = 0;
        var importStarted = false;
        var sync_in_progress = false;

        var subId;
        var channel;
        var topic;

        channel = '_notif-api:' + '/importers';
        topic = 'import.started';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import started, msg.data - ' + msg.data);

                                   if (importStarted) {
                                     Plm.showFlash('An import is already in progress, please wait til the current import finishes!');
                                   }
                                   else {
                                     importStarted = true;
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.image.saved';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 'import.image.saved',
                                 function(msg) {
                                   if (importStarted) {
                                     current_imported_images_count++;
                                     !Plm.debug || console.log(">> Current number of images imported: " + current_imported_images_count);
                                     
                                     PlmUI.notif.update({progressText: current_imported_images_count + "/" + total_images_to_import_count});
                                     
                                     !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import image saved!');
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 'import.completed',
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home._respondToEvents: import completed!');

                                   if (importStarted) {
                                     // $('#content-top-nav a.import').removeClass('active');
                                     PlmUI.notif.end("Finished importing images",
                                                     {
                                                       progressText: current_imported_images_count + "/" + total_images_to_import_count
                                                     });
                                     
                                     current_imported_images_count = 0;
                                     total_images_to_import_count = 0;
                                     importStarted = false;
                                   }
                                   if (that.importInProgress) {
                                     that.importInProgress = false;
                                     that._enableImport();
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.started';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };


        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
      }

    });

    return HomeView;
  }
);
