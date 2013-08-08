//
// Filename: photo-manager/views/home/library/last-import.js
//
define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm', 
    'plmCommon/msg-bus',
    'app/image-selection-manager',
    'app/photo-set',
    'app/lightbox',
    'app/tag-dialog',
    'app/models/image',
    'app/collections/last-import',
    'text!/html/photo-manager/templates/home/library/last-import.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, ImageModel, LastImportCollection, lastImportTemplate, importTemplate, importImageTemplate) {

    var moduleName = '/app/photo-manager/views/home/library/last-import';

    //
    // LastImportView: The photo-manager/home/library/last-import view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/last-import:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var LastImportView = Backbone.View.extend({

      _debugPrefix: moduleName + '.LastImportView: ',

      tagName: 'div',

      id: 'photo-manager/home/library/last-import',

      //
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //  STATUS_INCREMENTALLY_RENDERING: the view is being incrementally rendered one image at a time.
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERED: 1,
      STATUS_INCREMENTALLY_RENDERING: 2,
      status: undefined,

      dirty: false,

      lastImport: undefined,

      subscriptions: {},

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },

      _photosMin: 6,
    
      initialize: function() {
        var dp = this._debugPrefix.replace(': ', '.initialize: ');
        !Plm.debug || console.log(dp + 'initializing...');
        var that = this;

        _.extend(this, TagDialog.handlersFactory());

        this.status = this.STATUS_UNRENDERED;
        this.lastImport = new LastImportCollection();
        this._imageSelectionManager = new ImageSelectionManager(this.$el, '.import-collection', 'importer');
        this._imageSelectionManager.on('change', function() {
          if (that._imageSelectionManager.anySelected()) {
            $(".selection-toolbar").show();
          }
          else {
            $(".selection-toolbar").hide();
          }
        });
        this._lightbox = new Lightbox(that.$el, 
                                      '.photo', 
                                      '.photo-link', 
                                      '.import-collection',
                                      {
                                        href: function() {
                                          var url = $(this).data('urlFullSmall');

                                          !Plm.debug || console.log(dp.replace(': ', '.Lightbox.href: ') + 'element tag - ' + $(this).prop('tagName') + ', href url - ' + url);
                                          return url;
                                        }
                                      });


        $(window).resize(function() {
          var parentCol = that.$el.find('.photos-collection');
          var col = that.$el.find('.import-photos-collection');
          var photoWidth = $(col.find('.photo')[0]).outerWidth();

          if (col.hasClass('open')) {
            !Plm.debug || console.log(db.replace(': ', '.render.onSuccess: ') + 'window resize, collection inner width - ' + col.innerWidth() + ', parent coll (inner width, width, css width) - (' + parentCol.innerWidth() + ', ' + parentCol.width() + ', ' + parentCol.css("width") + '), photos min - ' + that._photosMin + ', photo width - ' + photoWidth);
            if (parentCol.width() > (that._photosMin * photoWidth)) {
              col.removeClass('photo-set-clip-overflow-cells');
              col.css('width', '100%');
            }
            else {
              col.addClass('photo-set-clip-overflow-cells');
              col.width(that._photosMin * photoWidth);
            }
          }
        });

        this._respondToEvents();
      },

      render: function() {
        var that = this;
        var dp = that._debugPrefix.replace(': ', '._render: ');
        var compiledTemplate = _.template(lastImportTemplate);
        that.$el.append(compiledTemplate);
        var onSuccess = function(lastImport,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onSuccess: ') + 'successfully loaded recent uploads...');
          that._doRender();
          that.status = that.STATUS_RENDERED;
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");

          // After import has been rendered, assign click events to them
          $('.import-collection').find('.import-pip').off('click').on('click', function() {
            $(this).toggleClass('open');
            var parentCol = that.$el.find('.photos-collection');
            var col = $(this).parent().siblings('.import-photos-collection').toggleClass('open');
            if (col.hasClass('open')) {
              var photoWidth = $(col.find('.photo')[0]).outerWidth();

              !Plm.debug || console.log(dp + '.import-pip click event, collection inner width - ' + col.innerWidth() + ', photos min - ' + that._photosMin + ', photo width - ' + photoWidth);

              if (parentCol.width() > (that._photosMin * photoWidth)) {
                col.removeClass('photo-set-clip-overflow-cells');
                col.css('width', '100%');
              }
              else {
                col.addClass('photo-set-clip-overflow-cells');
                col.width(that._photosMin * photoWidth);
              }
            } else {
              col.css('width', '100%');
            }
          });
        };
        var onError = function(lastImport, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onError: ') + 'error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.lastImport.fetch({success: onSuccess,
                               error: onError});

        return this;
      },

      //
      // teardown: Cleanup after ourselves. Should be called prior to invoking <view>.remove().
      //  Will unsubscribe any registered subscriptions with the msg bus.
      //
      teardown: function() {
        var that = this;
        var dp = that._debugPrefix.replace(': ', '.teardown: ');

        !Plm.debug || console.log(dp + 'invoking...');

        _.each(_.keys(that.subscriptions), function(key) {
          MsgBus.unsubscribe(key);
          delete that.subscriptions[key];
        });

        that._lightbox.teardown();
        that._lightbox = undefined;
      },

      //
      // _reRender: a combination of initialize + render to fetch
      //  the true last import and re-render the view.
      //   
      _reRender: function() {
        var dp = this._debugPrefix.replace(': ', '._reRender: ');
        !Plm.debug || console.log(dp + 're-rendering, status - ' + this.status + ', dirty - ' + this.dirty);
        this.status = this.STATUS_UNRENDERED;
        this.$el.html('');
        this.lastImport = new LastImportCollection();
        this.render();
        this.dirty = false;
        return this;
      },

      //
      // _doRender: We have loaded the data, its safe to render.
      //
      _doRender: function() {
        var that = this;
        // !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._doRender: Will render ' + _.size(this.lastImport) + ' images...');
        if (this.lastImport.importer === undefined) {
          !Plm.debug || console.log('photo-manager/views/home._doRender: No images have yet been imported!');
          Plm.showFlash('You have not yet imported any images!');
        }
        else {
          if (this.lastImport.length === 0) {
            Plm.showFlash('You\'re most recent import has no images!');
          }
          else {
            if (Plm.debug) {
              console.log('photo-manager/views/home._doRender: Rendering import of size - ' + _.size(this.lastImport) + ', imported at - ' + this.lastImport.importer.get('completed_at'));
              // that._speedTestLastImport();
              this.lastImport.each(function(image) {
                !Plm.verbose || console.log('photo-manager/views/home._doRender: Have image - ' + image.get('name'));
                var variants = image.get('variants');
                !Plm.verbose || console.log('photo-manager/views/home._doRender:   have ' + variants.length + ' variants...');
                var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
                !Plm.verbose || console.log('photo-manager/views/home._doRender:   have ' + filteredVariants.length + ' thumbnail variants...');
              });
            }
          }
          var compiledTemplate = _.template(importTemplate, { importer: this.lastImport.importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              importStatus: "imported",
                                                              _: _,
                                                              formatDate: Plm.localDateTimeString});
          this.$el.find('.import-collection').replaceWith(compiledTemplate);
        }
      },

      //
      // _startIncrementalRender: Initialize the view to a new importer which will be incrementally rendered.
      //
      _startIncrementalRender: function(importer) {
        !Plm.debug || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: invoked with importer w/ id - ' + importer.id);
        !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: importer - ' + JSON.stringify(importer));
        if ((this.status === this.STATUS_UNRENDERED) || (this.status === this.STATUS_RENDERED)) {
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: initiating incremental rendering...');
          //
          // Initialize with the new importer, but the collection will be empty.
          //
          this.lastImport = new LastImportCollection(null, {importer: importer});
          var compiledTemplate = _.template(importTemplate, { importer: this.lastImport.importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              importStatus: "imported",
                                                              _: _,
                                                              formatDate: Plm.localDateTimeString});
          this.$el.find('.import-collection').replaceWith(compiledTemplate);
          this._imageSelectionManager.reset();

          this.$el.find('.import-collection').find('.import-pip').on('click', 
                                                                     PhotoSet.twirlDownClickHandlerFactory(
                                                                       this,
                                                                       '.import-photos-collection'));

          this.status = this.STATUS_INCREMENTALLY_RENDERING;
        }
        return this;
      },

      //
      // _addToIncrementalRender: Add an image to a view which is being incrementally rendered.
      //
      _addToIncrementalRender: function(image, eventTopic) {
        var that = this;

        var numAdded = 0;

        var addOne = function(image) {
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: invoked with image w/ id - ' + image.id);
          !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: image - ' + JSON.stringify(image));
          if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
            if (!_.has(image, 'variants') || (image.variants.length === 0)) {
              !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: skipping image with no variants, image w/ id - ' + image.id);
            }
            else if (!that.lastImport.get(image.id)) {
              !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: adding image w/ id - ' + image.id + ', to view.');
              //
              // Add to the collection.
              //
              var imageModel = new ImageModel(image);
              that.lastImport.add(imageModel);
              //
              // Update the size of the import.
              //
              that.$el.find('.import-count').text(that.lastImport.size() + " Photos");
              //
              // Also add the image to the view.
              //
              var compiledTemplate = _.template(importImageTemplate, 
                                                {
                                                  image: imageModel, 
                                                  importStatus: eventTopic.split('.').splice(2).join('.')
                                                });
              !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: Appending compiled template - ' + compiledTemplate);
              that.$el.find('.import-photos-collection').append(compiledTemplate);
              numAdded++;
            }
            else if ((eventTopic === 'import.images.imported') || (eventTopic === 'import.image.imported')) {
              //
              // Replace the image model within the collection.
              //
              var imageModel = new ImageModel(image);
              that.lastImport.set([imageModel], {remove: false});
              //
              // Replace the DOM element reresenting the image.
              //
              var compiledTemplate = _.template(importImageTemplate, 
                                                { 
                                                  image: imageModel,
                                                  importStatus: eventTopic.split('.').splice(2).join('.')
                                                });
              !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: replace DOM element.');
              that.$el.find('.import-photos-collection [data-id="' + image.id + '"]').replaceWith(compiledTemplate);
              numAdded++;
            }
            else {
              !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: last import already contains image w/ id - ' + image.id);
            }
          }
        };

        if (_.isArray(image)) {
          _.map(image, addOne);
        }
        else {
          addOne(image);
        }

        if (numAdded) {
          this._imageSelectionManager.reset();
        }

        return this;
      },

      //
      // _finishIncrementalRender: Incremental rendering of the view should be complete.
      //
      //  Currently, only change status to STATUS_RENDERED.
      //
      _finishIncrementalRender: function(importer) {
        !Plm.debug || console.log('photo-manager/views/home/library/last-import._finishIncrementalRender: invoked...');
        if (this.status === this.STATUS_INCREMENTALLY_RENDERING) {
          this.$el.find(".import-date").text(" Imported: " + importer.completed_at);
          this.status = this.STATUS_RENDERED;
        }
        return this;
      },

      //
      // _toTrashHandler: Move selected images to trash.
      //
      _toTrashHandler: function() {
        var that = this;

        var dbgPrefix = this._debugPrefix.replace(': ', "._toTrashHandler: ");
        !Plm.debug || console.log(dbgPrefix + "invoked...");

        var selected = this._imageSelectionManager.selected();
        
        !Plm.debug || console.log(dbgPrefix + selected.length + ' images are selected.');
        
        var numTodo = selected.length;
        var numSuccess = 0;
        var numError = 0;

        var updateStatus = function(status) {
          if (status === 0) {
            numSuccess = numSuccess + 1;
          }
          else {
            numError = numError + 1;
          }
          if ((numSuccess + numError) === numTodo) {
            if (numError > 0) {
              that._reRender();
            }
          }
        };

        var openTrashDialog = function() {
          $(".plm-dialog.pm-trash").find(".confirm").on('click', function() {
            trashDialogConfirm();
          });
          $(".plm-dialog.pm-trash").find(".cancel").on('click', function() {
            closeTrashDialog();
          });
          $(".trashDialogBackdrop").on('click', function() {
            closeTrashDialog();
          });
          $(".plm-dialog.pm-trash").show();
          $(".trashDialogBackdrop").show();
          
        };

        var closeTrashDialog = function() {
          $(".plm-dialog.pm-trash").find(".confirm").off('click');
          $(".plm-dialog.pm-trash").find(".cancel").off('click');
          $(".trashDialogBackdrop").off('click');
          $(".plm-dialog.pm-trash").hide();
          $(".trashDialogBackdrop").hide();
        };
        
        var trashDialogConfirm = function() {
          _.each(selected, function(selectedItem) {
            !Plm.debug || console.log(dbgPrefix + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);
            var imageModel = new ImageModel({
              id: selectedItem.id,
              in_trash: false
            });

            //
            // Invoke a function to create a closure so we have a handle to the image model, and the jQuery element.
            //
            (function(imageModel, $el, updateStatus) {
              !Plm.debug || console.log(dbgPrefix + 'Moving selected image to trash, image id - ' + imageModel.id);
              imageModel.save({'in_trash': true},
                              {success: function(model, response, options) {
                                !Plm.debug || console.log(dbgPrefix + "Success saving image, id - " + model.id);
                                var $importColEl = $el.parents('.import-collection');
                                $el.remove();
                                var $photoEls = $importColEl.find('.photo');
                                if ($photoEls.length > 0) {
                                  $importColEl.find('.import-count').html($photoEls.length + " Photos");
                                }
                                else {
                                  $importColEl.remove();
                                }
                                updateStatus(0);
                              },
                               error: function(model, xhr, options) {
                                 !Plm.debug || console.log(dbgPrefix + "Error saving image, id - " + model.id);
                                 updateStatus(1);
                               }});
            })(imageModel, selectedItem.$el, updateStatus);
          });
          
          // Close the dialog after the images have been trashed
          closeTrashDialog();
        };

        openTrashDialog();

      },

      //
      // _respondToEvents: Subscribe, and respond to relevant events on the msg-bus.
      //
      _respondToEvents: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._respondToEvents: ');

        var subId;
        var channel;
        var topic;

        channel = '_notif-api:' + '/importers';
        topic = 'import.started';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 //
                                 // import.started callback:
                                 //  Handle 2 cases:
                                 //    1. the view's status is NOT STATUS_INCREMENTALLY_RENDERING (no import is going on)
                                 //    2. the view's status is STATUS_INCREMENTALLY_RENDERING (import is in progress)
                                 //  In 2, the view will now become 'dirty'.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import.started ...');
                                   !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                                   if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
                                     !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: incremental render in progress; marking view as dirty...');
                                     that.dirty = true;
                                   }
                                   else {
                                     !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: About to start incremental render...');
                                     that._startIncrementalRender(msg.data);
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.images.variant.created';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.images.variants.created callback:
                                 //  Handle 2 cases:
                                 //    1. Its an image associated with the current 'incremental render' which is in progress.
                                 //    2. Its an image from some other import (weird), set the view as dirty.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import.images.variant.created ...');
                                   !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.images.variant.created');
                                   }
                                   else {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.images.imported';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.image.saved callback:
                                 //  Handle 2 cases:
                                 //    1. Its an image associated with the current 'incremental render' which is in progress.
                                 //    2. Its an image from some other import (weird), set the view as dirty.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import.images.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.images.imported');
                                   }
                                   else {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.image.imported';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.image.saved callback:
                                 //  Handle 2 cases:
                                 //    1. Its an image associated with the current 'incremental render' which is in progress.
                                 //    2. Its an image from some other import (weird), set the view as dirty.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import.image.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.image.imported');
                                   }
                                   else {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.completed callback:
                                 //  Again, 2 cases:
                                 //    1. Its the end of the current 'incremental render', which is inprogress:
                                 //      - finish rendering it.
                                 //      - if the view is dirty, re-render it to ensure we are show the most recent.
                                 //    2. Its the end of some other import.
                                 //      a. we have a current 'incremental render' going on:
                                 //        - mark the view as dirty.
                                 //      b. we don't have an 'incremental render' going on:
                                 //        - update the view with a new 'last import' to ensure its up to date.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import.completed ...');
                                   !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                                     that._finishIncrementalRender(msg.data);
                                     !that.dirty || that._reRender();
                                   }
                                   else if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
                                     that.dirty = true;
                                   }
                                   else {
                                     that._reRender();
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // Subscribe to changes feed events, where the topics can be any of:
        //  doc.<doc type>.<change type>, where:
        //
        //    <doc type> ::= importer | image
        //    <change type> ::= created | updated | deleted
        //
        //  Note, all emitted events should be for documents where the app. ID
        //  that of another instance of the APP. So, the documents arrived via
        //  a sync.
        //
        channel = '_notif-api:' + '/storage/changes-feed';
        topic = 'doc.*.*';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/changes-feed',
                                 'doc.*.*',
                                 //
                                 // doc.*.* callback: Any importer / image document changes
                                 //   from a different instance of the APP. Just flag the
                                 //   view as being dirty.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'doc change event, event - ' + msg.event);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg.data - ' + msg.data);
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // Subscribe to sync.completed:
        //
        //  If the view is dirty, re-render it.
        //
        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                                 'sync.completed',
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'sync.completed event...');
                                   if (that.dirty) {
                                     !Plm.debug || console.log(dp + 'sync.completed, view is dirty...');
                                     if (that.status !== that.STATUS_INCREMENTALLY_RENDERING) {
                                       that._reRender();
                                     }
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

      },

      //
      // _speedTestLastImport: Using AJAX grab each image using thumbnail.url, and then off of the file system.
      //
      _speedTestLastImport: function() {
        var that = this;
        var dbp = 'photo-manager/views/home._speedTestLastImport: ';
        var path = require('path');
        var thumbnailUrls = [];
        var localUrls = [];
        //
        // First get OUR links:
        //
        this.lastImport.each(function(image) {
          !Plm.verbose || console.log('photo-manager/views/home._speedTestLastImport: Have image - ' + image.get('name'));
          var variants = image.get('variants');
                var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
                !Plm.verbose || console.log('photo-manager/views/home._speedTestLastImport:   have ' + filteredVariants.length + ' thumbnail variants...');
                if (_.size(filteredVariants) > 0) {
                  thumbnailUrls.push(filteredVariants[0].url);
                  var localPath = path.join('/file', that.lastImport.importer.get('import_dir'), image.get('name'));
                  console.log('photo-manager/views/home._speedTestLastImport: local path - ' + localPath + ', import dir - ' + that.lastImport.importer.get('import_dir') + ', image name - ' + image.get('name'));
                  localUrls.push(localPath);
                }
              });

        var startTS = 0;
        var now = 0;

        var epochSec = function() {
          return Math.floor(Date.now() / 1000);
        };

        var logProgress = function(msg) {
          var logDate = new Date();

          console.log(logDate.toString() + ' ' + (now - startTS) + ' ' + dbp + msg);
        };

        var numFetched = 0;
        var fetchUrls = function(urls, onDone) {
          if (_.size(urls) > 0) {
            var url = urls.shift();
            now = epochSec();
            logProgress('Fetching url - ' + url);
            $.ajax({
              url: url,
              success: function(data, textStatus, jqXHR) {
                now = epochSec();
                logProgress('url fetched - ' + url);
                numFetched = numFetched + 1;
                fetchUrls(urls, onDone);
              },
              error: function(jqXHR) {
                now = epochSec();
                logProgress('Error fetching - ' + url);
                fetchUrls(urls, onDone);
              }
            });
          }
          else {
            onDone();
          }
        };

        startTS = epochSec();
        now = startTS;
        logProgress('Starting to fetch ' + thumbnailUrls.length + ' thumbnails...');

        numFetched = 0;
        fetchUrls(thumbnailUrls,
                  function() {
                    var nps = 0;

                    if (numFetched > 0) {
                      nps = numFetched / (now - startTS);
                    }
                    logProgress(numFetched + 'thumnails fetched, nps - ' + nps);

                    startTS = epochSec();
                    now = startTS;

                    logProgress('Starting to fetch ' + localUrls.length + ' local assets...');
                    numFetched = 0;
                    fetchUrls(localUrls,
                              function() {
                                var nps = 0;

                                if (numFetched > 0) {
                                  nps = numFetched / (now - startTS);
                                }
                                logProgress(numFetched + 'local assets fetched, nps - ' + nps);
                              });
                  });

      }

    });
    
    return LastImportView;

  }
);
