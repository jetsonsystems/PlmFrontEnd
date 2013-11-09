//
// Filename: photo-manager/views/home/library/current-import.js
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
    'app/collections/current-import',
    'text!/html/photo-manager/templates/home/library/current-import.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, ImageModel, CurrentImportCollection, currentImportTemplate, importTemplate, importImageTemplate) {

    var moduleName = '/app/photo-manager/views/home/library/current-import';

    //
    // CurrentImportView: The photo-manager/home/library/current-import view. It represents
    //  an import which was triggerred by the user. It may be 'inprogress' or 'completed'.
    //  See the view's 'state' attribute.
    //
    //  The view's importer is loaded via an 'import.started' event. After the import is loaded
    //  it can be rerendered via a call to render(). But the view will NEVER be updated to
    //  represent a different importer.
    //
    //  Events: All events begin with the id, ie: photo-manager.home.library.current-import:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //    <id>:completed - the state went to completed
    //
    var CurrentImportView = Backbone.View.extend({

      _debugPrefix: moduleName + '.CurrentImportView: ',

      tagName: 'div',

      id: 'photo-manager.home.library.current-import',

      //
      // status: State is more relevant. But, for consistency with other views we include this.
      //
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //  STATUS_INCREMENTALLY_RENDERING: the view is being incrementally rendered one image at a time.
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERED: 1,
      STATUS_INCREMENTALLY_RENDERING: 2,
      status: undefined,

      //
      // state: State of the import.
      //
      //  STATE_UNDEFINED: undefined, initial value.
      //  STATE_INITIALIZED: the import is initialized, but importer state is not 'started'
      //   nor completed. 
      //  STATE_INPROGRESS: the import is in progress. Importer state is 'started'.
      //  STATE_COMPLETED: the import has completed.
      //
      STATE_UNDEFINED: undefined,
      STATE_INITIALIZED: 0,
      STATE_INPROGRESS: 1,
      STATE_ABORTING: 2,
      STATE_COMPLETED: 3,
      state: undefined,

      currentImport: undefined,

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
        this.state = this.STATE_UNDEFINED;
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
            !Plm.debug || console.log(dp.replace(': ', '.render.onSuccess: ') + 'window resize, collection inner width - ' + col.innerWidth() + ', parent coll (inner width, width, css width) - (' + parentCol.innerWidth() + ', ' + parentCol.width() + ', ' + parentCol.css("width") + '), photos min - ' + that._photosMin + ', photo width - ' + photoWidth);
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

      //
      // render: Render's the view. Render should ONLY be called on an initially empty.
      //  The contents of the template will popolate the view. No fetch of
      //  data in the currentImport collection is triggered. There will be no import
      //  within the view. That is deferred until an 'import.started' event is detected.
      //
      render: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._render: ');

        if (this.status === this.STATUS_UNRENDERED) {
          var compiledTemplate = _.template(currentImportTemplate);

          that.$el.append(compiledTemplate);

          this.status = this.STATUS_RENDERED;
        }
        else {
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
        }
        that.trigger(that.id + ":rendered");

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
          !Plm.debug || console.log(dp + 'unsubscribing sub. id - ' + key);
          MsgBus.unsubscribe(key);
          delete that.subscriptions[key];
        });

        that._lightbox.teardown();
        that._lightbox = undefined;
      },

      //
      // _initWithImporter: Initialize things when we get an importer for the view.
      //
      _initWithImporter: function(importer) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '.initWithImporter: ');

        //
        // Initialize with the new importer, but the collection will be empty.
        //
        this.currentImport = new CurrentImportCollection(null, {importer: importer});
        this.status = this.STATUS_UNRENDERED;
        this.state = this.STATE_UNDEFINED;

        var importerState = this.currentImport.importer.get('state');

        if (importerState === 'started') {
          this.status = this.STATUS_INCREMENTALLY_RENDERING;
          this.state = this.STATE_INPROGRESS;
        }
        else if ((importerState === 'aborted') || (importerState === 'completed') || (importerState === 'error')) {
          this.status = this.STATUS_RENDERED;
          this.state = this.STATE_COMPLETED;
          this.trigger(this.id + ":completed");
        }
        else if ((importerState === 'abort-requested') || (importerState === 'aborting')) {
          //
          // May get image events before the abort is complete.
          //
          this.status = this.STATUS_INCREMENTALLY_RENDERING;
          this.state = this.STATE_ABORTING;
        }
        if ((this.state === this.STATE_INPROGRESS) || (this.state === this.STATE_ABORTING)) {
          //
          // Setup collection add/change/remove events for individual models which would
          // trigger DOM adjustments.
          //
          this.currentImport.on('add', function(imageModel, currentImport) {
            that._onImageAdded(imageModel);
          });
          this.currentImport.on('remove', function(imageModel, currentImport) {
            that._onImageRemoved(imageModel);
          });
          this.currentImport.on('reset', function(currentImport) {
            !Plm.debug || console.log(dp.replace(': ', '.currentImport.reset: ') + 'Collection has been reset, not yet handled.');
          });
          this.currentImport.on('change', function(imageModel) {
            that._onImageChanged(imageModel);
          });
        }
        return this;
      },

      //
      // _update: Trigger a fetch of the currentImport collection to update the view.
      //  No view contents are modified. That is deferred to events emitted by the
      //  currentImport collection.
      //   
      _update: function() {
        var dp = this._debugPrefix.replace(': ', '._update: ');

        !Plm.debug || console.log(dp + 'updating, status - ' + this.status);

        this.status = this.STATUS_UNRENDERED;
        this.state = this.STATE_UNDEFINED;

        if (this.currentImport) {
          //
          // Have an existing import which will be updated from the server.
          // This is the only time there is something to do.
          //
          var onSuccess = function(currentImport,
                                   response,
                                   options) {
            !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onSuccess: ') + 'successfully loaded recent uploads...');

            var importerState = that.currentImport.importer.get('state');

            if (importerState === 'started') {
              that.status = that.STATUS_INCREMENTALLY_RENDERING;
              that.state = that.STATE_INPROGRESS;
            }
            else if ((importerState === 'aborted') || (importerState === 'completed') || (importerState === 'error')) {
              that.status = that.STATUS_RENDERED;
              that.state = that.STATE_COMPLETED;
              that.trigger(that.id + ":completed");
            }
            else if ((importerState === 'abort-requested') || (importerState === 'aborting')) {
              //
              // May get image events before the abort is complete.
              //
              that.status = that.STATUS_INCREMENTALLY_RENDERING;
              that.state = that.STATE_ABORTING;
            }
          };
          var onError = function(currentImport, xhr, options) {
            !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onError: ') + 'error loading recent uploads.');
          };
          this.currentImport.fetch({success: onSuccess,
                                    error: onError});
        }
        return this;
      },

      //
      // _onImageAdded: Adjust the view when a new image has been added.
      //
      _onImageAdded: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageAdded: ');
        //
        // Update the size of the import.
        //
        this.$el.find('.import-count').text(this.currentImport.size() + " Photos");
        //
        // Also add the image to the view.
        //
        var compiledTemplate = _.template(importImageTemplate, 
                                          {
                                            image: imageModel, 
                                            importStatus: imageModel.get('_last_event')
                                          });
        //
        // Append the template. Note, we may want to insert in case the image was added to the
        // collection somewhere in the middle. But, at the moment, that should NOT happen.
        //
        !Plm.debug || console.log(dp + 'Appending compiled template - ' + compiledTemplate);
        this.$el.find('.import-photos-collection').append(compiledTemplate);

        this._imageSelectionManager.reset();

        return this;
      },

      //
      // _onImageChanged: An image model changed.
      //
      _onImageChanged: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageChanged: ');

        //
        // Replace the DOM element reresenting the image.
        //
        var compiledTemplate = _.template(importImageTemplate, 
                                          { 
                                            image: imageModel,
                                            importStatus: imageModel.get('_last_event')
                                          });
        !Plm.debug || console.log(dp + 'Replace DOM element for image...');
        this.$el.find('.import-photos-collection [data-id="' + imageModel.id + '"]').replaceWith(compiledTemplate);

        this._imageSelectionManager.reset();

        return this;
      },

      //
      // _onImageRemoved: An image model has been removed.
      //
      _onImageRemoved: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageRemoved: ');

        var $importColEl = this.$el.find('.import-collection');
        this.$el.find('.import-photos-collection [data-id="' + imageModel.id + '"]').remove();
        var $photoEls = $importColEl.find('.photo');
        if ($photoEls.length > 0) {
          $importColEl.find('.import-count').html($photoEls.length + " Photos");
        }
        else {
          $importColEl.find('.import-count').html("0 Photos");
        }

        this._imageSelectionManager.reset();

        return this;
      },

      //
      // _startIncrementalRender: Initialize the view to the importer representing the current import
      //  which will be incrementally rendered. The view must have already been rendered, otherwise
      //  we won't have a way to update the import collection.
      //
      _startIncrementalRender: function(importer) {
        var dp = this._debugPrefix.replace(': ', '._startIncrementalRender: ');

        !Plm.debug || console.log(dp + 'invoked with importer w/ id - ' + importer.id);
        !Plm.debug || !Plm.verbose || console.log(dp + 'importer - ' + JSON.stringify(importer));

        if (this.status === this.STATUS_RENDERED) {
          !Plm.debug || console.log(dp + 'initiating incremental rendering...');
          this._initWithImporter(importer);
          var compiledTemplate = _.template(importTemplate, { importer: this.currentImport.importer,
                                                              numPhotos: undefined,
                                                              importImages: this.currentImport,
                                                              imageTemplate: importImageTemplate,
                                                              importStatus: "imported",
                                                              _: _,
                                                              formatDate: Plm.localDateTimeString});
          this.$el.find('.import-collection').replaceWith(compiledTemplate);
          this._imageSelectionManager.reset();

          var twirlDownHandler = PhotoSet.twirlDownClickHandlerFactory(
            this,
            '.import-photos-collection');

          //
          // Setup the "Twirldown handler" to open close the import. Also, call it 
          // immediately to open the view.
          //
          this.$el.find('.import-collection').find('.import-pip').on('click', twirlDownHandler);
          twirlDownHandler.call(this.$el.find('.import-collection').find('.import-pip'));
        }
        return this;
      },

      //
      // _addToIncrementalRender: Add an image to a view which is being incrementally rendered.
      //
      _addToIncrementalRender: function(image, eventTopic) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._addToIncrementalRender: ');

        var addOne = function(image) {
          !Plm.debug || console.log(dp + 'Invoked with image w/ id - ' + image.id);
          !Plm.debug || !Plm.verbose || console.log(dp + 'Image - ' + JSON.stringify(image));
          if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
            if (!_.has(image, 'variants') || (image.variants.length === 0)) {
              !Plm.debug || console.log(dp + 'Skipping image with no variants, image w/ id - ' + image.id);
            }
            else if (_.has(image, 'in_trash') && image.in_trash) {
              !Plm.debug || console.log(dp + 'Skipping image which has been moved to the trash, image w/ id - ' + image.id);
            }
            else if (!that.currentImport.get(image.id)) {
              !Plm.debug || console.log(dp + 'Adding image w/ id - ' + image.id + ', to view.');
              //
              // Add to the collection.
              //
              image._last_event = eventTopic.split('.').splice(2).join('.');
              var imageModel = new ImageModel(image);
              that.currentImport.add(imageModel);
            }
            else if ((eventTopic === 'import.images.imported') || (eventTopic === 'import.image.imported')) {
              //
              // Replace the image model within the collection.
              //
              image._last_event = eventTopic.split('.').splice(2).join('.');
              var imageModel = new ImageModel(image);
              that.currentImport.set([imageModel], {remove: false});
            }
            else {
              !Plm.debug || console.log(dp + 'current import already contains image w/ id - ' + image.id);
            }
          }
        };

        if (_.isArray(image)) {
          _.map(image, addOne);
        }
        else {
          addOne(image);
        }
        return this;
      },

      //
      // _finishIncrementalRender: Incremental rendering of the view should be complete.
      //  Any events for this import will now be ignored.
      //
      _finishIncrementalRender: function(importer) {
        var dp = this._debugPrefix.replace(': ', '._finishIncrementalRender: ');

        !Plm.debug || console.log(dp + 'invoked...');

        if (this.status === this.STATUS_INCREMENTALLY_RENDERING) {
          this.$el.find(".import-date").text(" Imported: " + importer.completed_at);

          this.status = this.STATUS_RENDERED;

          var importerState = importer.state;

          if ((importerState === 'aborted') || (importerState === 'completed') || (importerState === 'error')) {
            this.state = this.STATE_COMPLETED;
            this.trigger(this.id + ":completed");
          }
          else if ((importerState === 'abort-requested') || (importerState === 'aborting')) {
            //
            // May get image events before the abort is complete.
            //
            this.state = this.STATE_ABORTING;
          }
          else {
            this.state = this.STATE_COMPLETED;
            this.trigger(this.id + ":completed");
          }
        }
        return this;
      },

      //
      // _toTrashHandler: Move selected images to trash.
      //
      _toTrashHandler: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', "._toTrashHandler: ");
        !Plm.debug || console.log(dp + "invoked...");

        var selected = this._imageSelectionManager.selected();
        
        !Plm.debug || console.log(dp + selected.length + ' images are selected.');
        
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
              that._update();
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
            !Plm.debug || console.log(dp + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);
            var imageModel = new ImageModel({
              id: selectedItem.id,
              in_trash: false
            });

            //
            // Invoke a function to create a closure so we have a handle to the image model, and the jQuery element.
            //
            (function(imageModel, updateStatus) {
              !Plm.debug || console.log(dp + 'Moving selected image to trash, image id - ' + imageModel.id);
              imageModel.save({'in_trash': true},
                              {success: function(model, response, options) {
                                !Plm.debug || console.log(dp + "Success saving image, id - " + model.id);
                                that.currentImport.remove(imageModel);
                                updateStatus(0);
                              },
                               error: function(model, xhr, options) {
                                 !Plm.debug || console.log(dp + "Error saving image, id - " + model.id);
                                 updateStatus(1);
                               }});
            })(imageModel, updateStatus);
          });
          
          // Close the dialog after the images have been trashed
          closeTrashDialog();
        };

        openTrashDialog();

      },

      //
      // _respondToEvents: Subscribe, and respond to relevant events on the msg-bus.
      //  Only thing we worry about is importer events.
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
                                 //  In 2, we simply ignore and log. The view only represents ONE import which was the
                                 //   one initially triggered.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'Import.started ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
                                     !Plm.debug || console.log(dp + 'Incremental render is already in progress; ignoring event...');
                                   }
                                   else {
                                     !Plm.debug || console.log(dp + 'About to start incremental render...');
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
                                 //    2. Its an image from some other import (weird), just log.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.images.variant.created ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.currentImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.images.variant.created');
                                   }
                                   else {
                                     !Plm.debug || console.log(dp + 'Received event - ' + topic + ', for unknown importer.');
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
                                 //    2. Its an image from some other import (weird), just log and ignore.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.images.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.images.imported');
                                   }
                                   else {
                                     !Plm.debug || console.log(dp + 'Received event - ' + topic + ', for unknown importer.');
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
                                 //    2. Its an image from some other import (weird), log and ignore.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.image.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.currentImport.importer.id === msg.data.id)) {
                                     that._addToIncrementalRender(msg.data.doc, 'import.image.imported');
                                   }
                                   else {
                                     !Plm.debug || console.log(dp + 'Received event - ' + topic + ', for unknown importer.');
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
                                 //  There is ONLY one thing we worry about, the current import:
                                 //    Its the end of the current 'incremental render', which is inprogress:
                                 //      - finish rendering it.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.completed ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.currentImport.importer.id === msg.data.id)) {
                                     that._finishIncrementalRender(msg.data);
                                     !Plm.debug || console.log(dp + 'import.completed, finished incremental render!');
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

      }

    });
    
    return CurrentImportView;

  }
);
