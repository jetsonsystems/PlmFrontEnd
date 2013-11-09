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
    'app/collections/importers',
    'text!/html/photo-manager/templates/home/library/last-import.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, ImageModel, ImportersCollection, lastImportTemplate, importTemplate, importImageTemplate) {

    var util = require('util');

    var moduleName = '/app/photo-manager/views/home/library/last-import';

    //
    // LastImportView: The photo-manager/home/library/last-import view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/last-import:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //    <id>:updated - the view was updated.
    //
    var LastImportView = Backbone.View.extend({

      _debugPrefix: moduleName + '.LastImportView: ',

      tagName: 'div',

      id: 'photo-manager.home.library.last-import',

      //
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_UPDATING: the view is being updated via a fetch of the last import collection.
      //  STATUS_RENDERED: the view has been rendered.
      //
      STATUS_UNRENDERED: 0,
      STATUS_UPDATING: 1,
      STATUS_RENDERED: 2,

      status: undefined,

      dirty: false,

      //
      // Collection of importers, were we ONLY fetch one.
      //
      importers: undefined,

      subscriptions: {},

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },

      _photosMin: 6,
    
      initialize: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '.initialize: ');
        !Plm.debug || console.log(dp + 'initializing...');

        _.extend(this, TagDialog.handlersFactory());

        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined,
                                                 {
                                                   numToFetch: 1,
                                                   fetchImages: true,
                                                   imagesWithPagination: true,
                                                   imagesPageSize: 100
                                                 });
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

        this._twirlDownHandler = PhotoSet.twirlDownClickHandlerFactory(
          this,
          '.import-photos-collection');

        var onResizeHandler = this._onResizeHandler = PhotoSet.onResizeHandlerFactory(
          this,
          '.import-photos-collection');

        $(window).resize(onResizeHandler);

        this._respondToEvents();
      },

      //
      // render: Render an entire view.
      //
      render: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._render: ');

        var compiledTemplate = _.template(lastImportTemplate);
        that.$el.html(compiledTemplate);

        that._update({ context: 'render',
                       triggerEvents: true });

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
      // _enableImportersEvents: Setup events for changes on the importers.
      //
      _enableImportersEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enableImportersEvents: ');

        !Plm.debug || console.log(dp + 'enabling last import events...');

        //
        // Importers events which may change the import being rendered.
        //
        this.importers.on('importers-add', that._onImporterAdded, that);
        this.importers.on('importers-remove', that._onImporterRemoved, that);
        this.importers.on('change', that._onImporterChanged, that);
        this.importers.on('importers-reset', that._onImportersReset, that);

        //
        // Image events within the import being rendered.
        //
        this.importers.on('importer-images-add', function(image, images, importer) {
          that._onImageAdded(image);          
        });
        this.importers.on('importer-images-remove', function(image, images, importer) {
          that._onImageRemoved(image);
        });
        this.importers.on('importer-images-reset', function(images, importer) {
          that._onImportReset();
        });
        this.importers.on('importer-image-change', function(image, importer) {
          that._onImageChanged(image);
        });
      },

      //
      // _disableImportersEvents: Disable events on the last import.
      //
      _disableImportersEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._disableImportersEvents: ');

        !Plm.debug || console.log(dp + 'disabling last import events...');

        //
        // Importers events which may change the import being rendered.
        //
        this.importers.off('importers-add', that._onImporterAdded);
        this.importers.off('importers-remove', that._onImporterRemoved);
        this.importers.off('change', that._onImporterChanged);
        this.importers.off('importers-reset', that._onImportersReset);

        //
        // Image events within the import being rendered.
        //
        this.importers.off('importer-images-add');
        this.importers.off('importer-images-remove');
        this.importers.off('importer-images-reset');
        this.importers.off('importer-image-change');
      },

      //
      // _reRender: a combination of initialize + render to fetch
      //  the true last import and re-render the view.
      //
      //  options:
      //    pageTo: first || previous || next || at.
      //   
      _reRender: function(options) {
        var dp = this._debugPrefix.replace(': ', '._reRender: ');
        !Plm.debug || console.log(dp + 're-rendering, status - ' + this.status + ', dirty - ' + this.dirty + ', options - ' + util.inspect(options));
        this.status = this.STATUS_UNRENDERED;

        if (options.pageTo) {
          this.$el.find('.import-photos-collection').html('');
        }
        else {
          this.$el.find('.photos-collection').html('');
        }

        this._disableImportersEvents();
        if (!options.pageTo || (this.importers === undefined)) {
          this.importers = new ImportersCollection(undefined,
                                                   {
                                                     numToFetch: 1,
                                                     fetchImages: true,
                                                     imagesWithPagination: true,
                                                     imagesPageSize: 10
                                                   });
        }
        this._enableImportersEvents();

        var updateOpts = _.clone(options);

        updateOpts.context = options.pageTo ? 'update' : 'render';
        updateOpts.triggerEvents = false;
        this._update(updateOpts);

        this.dirty = false;
        return this;
      },

      //
      // _doRender: We have loaded the data, its safe to render.
      //
      _doRender: function(imagesAvailable) {
        var that = this;

        imagesAvailable = (imagesAvailable || (imagesAvailable === false)) ? imagesAvailable : true;

        var dp = this._debugPrefix.replace(': ', '._doRender: ');

        if (this.importers.length === 0) {
          !Plm.debug || console.log(dp + 'No images have yet been imported!');
          Plm.showFlash('You have not yet imported any images!');
        }
        else {
          var importer = this.importers.at(0);
          var images = this.importers.images(importer.id);

          !Plm.debug || !Plm.verbose || console.log(dp + 'Will render ' + _.size(images) + ' images...');

          if (!importer || (imagesAvailable && !images) || (imagesAvailable && images && (images.size() === 0)) || (importer.get('num_imported') === 0)) {
            !Plm.debug || console.log(dp + '# importers - ' + this.importers.size() + ', has images - ' + (images && (images.size() > 0)));
            Plm.showFlash('You\'re most recent import has no images!');
          }
          else {
            if (Plm.debug) {
              console.log(dp + 'Rendering import of size - ' + _.size(images) + ', imported at - ' + importer.get('completed_at'));
              // that._speedTestLastImport();
              images.each(function(image) {
                !Plm.verbose || console.log(dp + 'Have image - ' + image.get('name'));
                var variants = image.get('variants');
                !Plm.verbose || console.log(dp + '  have ' + variants.length + ' variants...');
                var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
                !Plm.verbose || console.log(dp + '  have ' + filteredVariants.length + ' thumbnail variants...');
              });
            }
          }
          var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                              numPhotos: _.has(images, 'paging') ? images.paging.total_size : undefined,
                                                              importImages: images,
                                                              imageTemplate: importImageTemplate,
                                                              importStatus: "imported",
                                                              _: _,
                                                              formatDate: Plm.localDateTimeString});
          !Plm.debug || console.log(dp + 'Replacing w/ compiled template - ' + compiledTemplate);
          this.$el.find('.import-collection').replaceWith(compiledTemplate);

          this._imageSelectionManager.reset();
          //
          // Setup the "Twirldown handler" to open close the import. Also, call it 
          // immediately to open the view.
          //
          this.$el.find('.import-collection').find('.import-pip').on('click', this._twirlDownHandler);
          this._twirlDownHandler.call(this.$el.find('.import-collection').find('.import-pip'));
          if (imagesAvailable) {
            this._enablePaginationControls();
          }
          this._onResizeHandler();
          return this;
        }
      },

      //
      // _update: Trigger a fetch of the importers collection to update the view.
      //  No view contents are modified. That is deferred to events emitted by the
      //  importers collection.
      //
      //  options:
      //    context: Invokation context. Default is 'update'.
      //      context ::= 'render' || 'update' || 'render-as-update'
      //    triggerEvents: trigger :rendered or :updated events. Default: true.
      //    pageTo: first || previous || next || at
      //
      //  events: Triggers <id>:rendered or <id>:updated once the last import
      //   is fetched.
      //   
      _update: function(options) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._update: ');

        options = options || {context: 'update', triggerEvents: true};
        options.triggerEvents = _.has(options, 'triggerEvents') ? options.triggerEvents : true;

        !Plm.debug || console.log(dp + 'Updating w/ context - ' + options.context);

        that.status = that.STATUS_UPDATING;

        var onSuccess = function(importers,
                                 response,
                                 onSuccessOptions) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onSuccess: ') + 'Successfully loaded recent uploads...');

          that.status = that.STATUS_RENDERED;

          if (options.triggerEvents) {
            if ((options.context === 'render') || (options.context === 'render-as-update')) {
              that.trigger(that.id + ":rendered");
            }
            else {
              that.trigger(that.id + ":updated");
            }
          }

          if (options.context === 'render') {
            //
            // We have ALL the data and we are doing an initial render, so just render the whole thing at once.
            // After we render, enable all the events associated with the model.
            //
            that._doRender(false);
            that._disableImportersEvents();
            that._enableImportersEvents();
          }
        };

        var onError = function(lastImport, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onError: ') + 'error loading recent uploads.');

          if (options.triggerEvents) {
            if ((options.context === 'render') || (options.context === 'render-as-update')) {
              that.trigger(that.id + ":rendered");
            }
            else {
              that.trigger(that.id + ":updated");
            }
          }
        };

        //
        // If its an update, then enable events to update the view.
        //
        this._disableImportersEvents();
        if ((options.context === 'update') || (options.context === 'render-as-update')) {
          this._enableImportersEvents();
        }

        this._disablePaginationControls();

        var fetchOpts = {
          success: onSuccess,
          error: onError
        };

        if (options.pageTo === 'first') {
          var importer = this.importers.at(0);
          var images = importer ? this.importers.images(importer.id) : undefined;

          if (images) {
            fetchOpts.reset = true;
            images.fetchFirst(fetchOpts);
          }
        }
        else if (options.pageTo === 'previous') {
          var importer = this.importers.at(0);
          var images = importer ? this.importers.images(importer.id) : undefined;

          if (images) {
            fetchOpts.reset = true;
            images.fetchPrevious(fetchOpts);
          }
        }
        else if (options.pageTo === 'next') {
          var importer = this.importers.at(0);
          var images = importer ? this.importers.images(importer.id) : undefined;

          if (images) {
            fetchOpts.reset = true;
            images.fetchNext(fetchOpts);
          }
        }
        else if (options.pageTo === 'at') {
          var importer = this.importers.at(0);
          var images = importer ? this.importers.images(importer.id) : undefined;

          if (images) {
            fetchOpts.reset = true;
            images.fetchAt(fetchOpts);
          }
        }
        else {
          this.importers.fetch(fetchOpts);
        }

        return this;
      },

      //
      // Dispatch to _onImportersEvent:
      //
      _onImporterAdded: function(importer, importers) {
        this._onImportersEvent('add', importer);
      },
      _onImporterRemoved: function(importer, importers) {
        this._onImportersEvent('remove', importer);
      },
      _onImporterChanged: function(importer) {
        this._onImportersEvent('change', importer);
      },
      _onImportersReset: function(importer) {
        this._onImportersEvent('importers-reset', importer);
      },

      //
      // onImportersEvent: Have a change in the collection of importers.
      //
      _onImportersEvent: function(ev, importerModel) {
        var dp = this._debugPrefix.replace(': ', '._onImportersEvent: ');

        !Plm.debug || console.log(dp + 'Importers event - ' + ev + ', importer w/ id - ' + importerModel.id);
        if (((ev === 'add') && (this.importers.at(0).id === importerModel.id)) || (ev === 'importers-reset')) {
          this._doRender(false);
        }
        return this;
      },

      _onImageAdded: function(imageModel){
        var dp = this._debugPrefix.replace(': ', '._onImageAdded: ');

        !Plm.debug || console.log(dp + 'Adding image w/ id - ' + imageModel.id);

        //
        // Also add the image to the view.
        //
        var compiledTemplate = _.template(importImageTemplate, 
                                          {
                                            image: imageModel, 
                                            importStatus: 'imported'
                                          });
        //
        // Append the template. Note, we may want to insert in case the image was added to the
        // collection somewhere in the middle. But, at the moment, that should NOT happen.
        //
        this.$el.find('.import-photos-collection').append(compiledTemplate);

        this._imageSelectionManager.reset();
        this._onResizeHandler();
        return this;
      },

      _onImageRemoved: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageRemoved: ');

        !Plm.debug || console.log(dp + 'Removing image w/ id - ' + imageModel.id);
        var $importColEl = this.$el.find('.import-collection');
        this.$el.find('.import-photos-collection [data-id="' + imageModel.id + '"]').remove();
        var $photoEls = $importColEl.find('.photo');
        if ($photoEls.length > 0) {
          $importColEl.find('.import-count').html($photoEls.length + " Photos");
        }
        else {
          $importColEl.find('.import-count').html("0 Photos");
          this._update({ context: 'update',
                         triggerEvents: false });
        }

        this._imageSelectionManager.reset();
        return this;
      },

      _onImportReset: function() {
        var dp = this._debugPrefix.replace(': ', '._onImportReset: ');

        !Plm.debug || console.log(dp + 'Reseting last import...');

        this._doRender(true);
        return this;
      },

      _onImageChanged: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageChanged: ');

        !Plm.debug || console.log(dp + 'Replacing image w/ id - ' + imageMode.id);

        //
        // Replace the DOM element reresenting the image.
        //
        var compiledTemplate = _.template(importImageTemplate, 
                                          { 
                                            image: imageModel,
                                            importStatus: 'imported'
                                          });
        !Plm.debug || console.log(dp + 'Replace DOM element for image...');
        this.$el.find('.import-photos-collection [data-id="' + imageModel.id + '"]').replaceWith(compiledTemplate);

        this._imageSelectionManager.reset();
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
              that._update({ context: 'update',
                             triggerEvents: false });
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
                                that.importers.removeImage(imageModel, that.importers.at(0).id);
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
      // _toPreviousPage: Go to the previoua page of imports.
      //
      _toPreviousPage: function() {
        var dp = this._debugPrefix.replace(': ', '._toPreviousPage: ');

        !Plm.debug || console.log(dp + 'Paging to previous page...');

        this._reRender({pageTo: 'previous'});

        return this;
      },

      //
      // _toNextPage: Go to the next page of imports.
      //
      _toNextPage: function() {
        var dp = this._debugPrefix.replace(': ', '._toNextPage: ');

        !Plm.debug || console.log(dp + 'Paging to next page...');

        this._reRender({pageTo: 'next'});

        return this;
      },

      //
      // _enablePaginationControls: Based upon pagination data received from the
      //  API enable previous / next arrows as appropriate, alone with click events.
      //
      _enablePaginationControls: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enablePaginationControls: ');

        !Plm.debug || console.log(dp + 'Checking pagination cursors...');
        var importer = this.importers ? this.importers.at(0) : undefined;
        var images = (this.importers && importer) ? this.importers.images(importer.id) : undefined;
        var enablePrevious = (images && images.paging && images.paging.cursors && images.paging.cursors.previous && (images.paging.cursors.previous !== -1)) ? true : false;
        var enableNext = (images && images.paging && images.paging.cursors && images.paging.cursors.next && (images.paging.cursors.next !== -1)) ? true : false;

        if (enablePrevious || enableNext) {
          this.$el.find('.pagination-controls').removeClass('hidden');
        }

        if (enablePrevious) {
          var prevControl = this.$el.find('.pagination-controls .previous-page');
          prevControl.on('click', function() {
            that._disablePaginationControls();            
            that._toPreviousPage();
          });
          prevControl.removeClass('disabled');
          console.log(dp + 'Previous page enabled...');
        }

        if (enableNext) {
          var nextControl = this.$el.find('.pagination-controls .next-page');
          nextControl.on('click', function() {
            that._disablePaginationControls();            
            that._toNextPage();
          });
          nextControl.removeClass('disabled');
          console.log(dp + 'Next page enabled...');
        }
        return this;
      },

      //
      // _disablePaginationControls: disable them.
      //
      _disablePaginationControls: function() {
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
                                 // import.started callback: Set the dirty flag. 
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.started ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

        channel = '_notif-api:' + '/importers';
        topic = 'import.images.variant.created';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.images.variants.created callback: Set the dirty flag.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.images.variant.created ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

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
                                   !Plm.debug || console.log(dp + 'import.images.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

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
                                   !Plm.debug || console.log(dp + 'import.image.imported ...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

        channel = '_notif-api:' + '/importers';
        topic = 'import.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 //
                                 // import.completed callback: Just invoke update.
                                 //
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'import.completed, dirty - ' + that.dirty + '...');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'msg - ' + JSON.stringify(msg));
                                   !that.dirty || that._update({ context: 'update',
                                                                 triggerEvents: false });
                                   that.dirty = false;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };
        !Plm.debug || console.log(dp + 'Subscribed to (' + channel + ', ' + topic + '), sub. id - ' + subId + '.');

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
        //  If the view is dirty, trigger an update.
        //
        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                                 'sync.completed',
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'sync.completed event...');
                                   if (that.dirty) {
                                     !Plm.debug || console.log(dp + 'sync.completed, view is dirty...');
                                     that._update({ context: 'update',
                                                    triggerEvents: false });
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

        var dp = that._debugPrefix.replace(': ', '._speedTestLastImport: ');

        var path = require('path');
        var thumbnailUrls = [];
        var localUrls = [];
        //
        // First get OUR links:
        //
        this.importers.images(that.importers.at(0).id).each(function(image) {
          !Plm.verbose || console.log(dp + 'Have image - ' + image.get('name'));
          var variants = image.get('variants');
                var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
                !Plm.verbose || console.log(dp + '  have ' + filteredVariants.length + ' thumbnail variants...');
                if (_.size(filteredVariants) > 0) {
                  thumbnailUrls.push(filteredVariants[0].url);
                  var localPath = path.join('/file', that.importers.at(0).get('import_dir'), image.get('name'));
                  console.log(dp + 'local path - ' + localPath + ', import dir - ' + that.importers.at(0).get('import_dir') + ', image name - ' + image.get('name'));
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
