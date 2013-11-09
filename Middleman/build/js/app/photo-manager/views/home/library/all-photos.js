//
// Filename: photo-manager/views/home/library/all-photos.js
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
    'text!/html/photo-manager/templates/home/library/all-photos.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, ImageModel, ImportersCollection, allPhotosTemplate, importTemplate, importImageTemplate) {

    var moduleName = 'photo-manager/views/home/library/all-photos';

    //
    // AllPhotosView: The photo-manager/home/library/all-photos view.
    //
    var AllPhotosView = Backbone.View.extend({

      _debugPrefix: moduleName + '.AllPhotosView: ',

      tagName: 'div',

      id: 'photo-manager.home.library.all-photos',

      //
      // status:
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_UPDATING: the view is being rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //
      STATUS_UNRENDERED: 0,
      STATUS_UPDATING: 1,
      STATUS_RENDERED: 2,

      status: undefined,

      //
      // Set to true, when the view becomes 'dirty'. That is when a message is received
      // concerning a document change where we cannot immediate update the view.
      //

      dirty: false,

      //
      // The collection of importers representing this view.
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

        var dp = that._debugPrefix.replace(': ', '.initialize: ');
        !Plm.debug || console.log(dp + 'initializing...');


        _.extend(this, TagDialog.handlersFactory());

        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined,
                                                 {
                                                   withPagination: true,
                                                   pageSize: this._getOptimalPageSize(),
                                                   fetchImages: true
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
                                      }
                                     );

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
      // render: Load data, and render the view upon a successful load.
      //
      render: function(options) {
        var that = this;

        options = options || {};

        var dp = that._debugPrefix.replace(': ', '.render: ');

        var compiledTemplate = _.template(allPhotosTemplate);
        that.$el.append(compiledTemplate);

        var updateOpts = _.clone(options);

        updateOpts.context = 'render';
        updateOpts.triggerEvents = true;

        that._update(updateOpts);

        return this;
      },

      teardown: function() {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '.teardown: ');

        !Plm.debug || console.log(dp + 'invoking...');

        _.each(_.keys(that.subscriptions), function(key) {
          MsgBus.unsubscribe(key);
          delete that.subscriptions[key];
        });

        that._lightbox.teardown();
        that._lightbox = undefined;
      },

      //
      // _enableImportersEvents: Setup events to update the view based upon changes to importers.
      //
      _enableImportersEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enableImportersEvents: ');

        !Plm.debug || console.log(dp + 'enabling importers events...');

        //
        // Importers events which may change the imports being rendered.
        //
        this.importers.on('importers-add', that._onImporterAdded, that);
        this.importers.on('importers-remove', that._onImporterRemoved, that);
        this.importers.on('change', that._onImporterChanged, that);
        this.importers.on('importers-reset', that._onImportersReset, that);

        //
        // Importer images events.
        //
        this.importers.on('importer-images-add', that._onImporterImagesAdd, that);
        this.importers.on('importer-images-remove', that._onImporterImagesRemove, that);
        this.importers.on('importer-images-reset', that._onImporterImagesReset, that);

        return this;
      },

      //
      // _disableImportersEvents: Disable events on the importers.
      //
      _disableImportersEvents: function() {
        var dp = this._debugPrefix.replace(': ', '._disableImportersEvents: ');

        !Plm.debug || console.log(dp + 'disabling importers events...');

        //
        // Importers events which may change the imports being rendered.
        //
        this.importers.off('importers-add');
        this.importers.off('importers-remove');
        this.importers.off('change');
        this.importers.off('importers-reset');

        return this;
      },

      //
      // _reRender: a combination of initialize + render to fetch
      //  the importers and re-render the view.
      //
      //  options:
      //    pageTo: first || previous || next || at.
      //   
      _reRender: function(options) {
        options = options || {};

        var dp = this._debugPrefix.replace(': ', '._reRender: ');

        !Plm.debug || console.log(dp + 're-rendering, page to - ' + options.pageTo + ', status - ' + this.status + ', dirty - ' + this.dirty);

        this.status = this.STATUS_UNRENDERED;
        this.$el.find('.photos-collection').html('');
        if (!options.pageTo || (this.importers === undefined)) {
          this.importers = new ImportersCollection(undefined, 
                                                   {
                                                     withPagination: true,
                                                     pageSize: this._getOptimalPageSize()
                                                   });
        }

        var updateOpts = _.clone(options);
        updateOpts.context = 'render';
        updateOpts.triggerEvents = false;

        this._update(updateOpts);

        this.dirty = false;

        return this;
      },

      _doRender: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._doRender: ');

        !Plm.debug || console.log(dp + 'Rendering...');

        that._renderImports({
          success: function(importer) {
            console.log(dp + 'success for importer w/ id - ' + importer.id);
          },
          error: function(importer) {
            console.log(dp + 'error for importer w/ id - ' + importer.id);
          },
          done: function() {
            console.log(dp + 'rendered all importers...');
            that._imageSelectionManager.reset();
            that.$el.find('.import-collection').find('.import-pip').on('click', that._twirlDownHandler);
          }});
      },

      //
      // _renderImports: We've successfully loaded the data, and actually
      //  render all imports.
      //
      //  Args:
      //    options:
      //      success: callback when an import was successfully added to the view.
      //      error: callback when an error occurred adding an import to the view.
      //      done: all importers where processed and the view has been updated as
      //        much as is possible.
      //
      _renderImports: function(options) {
        var that = this;

        options = options || {};

        var dp = this._debugPrefix.replace(': ', '._renderImports: ');

        if ((this.importers === undefined) || (this.importers.length === 0)) {
          Plm.showFlash('You\' have no imports! Please, import some photos!');
          !options.done || options.done();
        }
        else {
          console.log(dp + 'Rendering ' + this.importers.length + ' imports...');

          this.importers.each(function(importer) {
            console.log(dp + 'Rendering importer w/ id - ' + importer.id + '...');
            try {
              that._renderImport(importer, 
                                 { activate: false });
              !options.success || options.success(importer);
            }
            catch (e) {
              !Plm.debug || console.log(dp + 'Error rendering import, error - ' + e);
              !options.error || options.error(importer);
            }
          });

          !options.done || options.done();
        }
        return this;
      },

      //
      // _renderImport: insert / update import in view.
      //
      //  Args:
      //    options:
      //      activate: Enable twirldown, image selection, etc..
      //        Default: true
      //
      _renderImport: function(importer, options) {
        var that = this;

        options = options || {};

        options.activate = _.has(options, 'activate') ? options.activate : true;

        var dp = this._debugPrefix.replace(': ', '._renderImport: ');

        !Plm.debug || console.log(dp + 'Rendering importer w/ id - ' + importer.id + ', import_dir - ' + importer.import_dir);

        var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                            numPhotos: undefined,
                                                            importImages: this.importers.images(importer.id),
                                                            imageTemplate: importImageTemplate,
                                                            importStatus: "imported",
                                                            _: _,
                                                            formatDate: Plm.localDateTimeString});

        var importerElId = "import-" + importer.id.replace('$', '');
        var importerEl = that.$el.find('#' + importerElId);

        if (importerEl.length) {
          importerEl.replaceWith(compiledTemplate);
        }
        else {
          var index = that.importers.indexOf(importer);
          //
          // Find the element to insert after, or if it exists, do a replace:
          //  - index is where the new one should be:
          //    - if index === 0 -> prepend
          //    - if index + 1 === sizeOf(that.importers) -> append
          //    - else -> find the previous guy and stick it after.
          //
          if (index === 0) {
            that.$el.find('.photos-collection').prepend(compiledTemplate);
          }
          else if ((index + 1) === that.importers.length) {
            that.$el.find('.photos-collection').append(compiledTemplate);
          }
          else {
            var prevImporter = that.importers.at(index - 1);
            var prevElId = "import-" + prevImporter.id.replace('$', '');
            that.$el.find('#' + prevElId).after(compiledTemplate);
          }
        }

        if (options.activate) {
          that._imageSelectionManager.reset();
          importerEl = that.$el.find('#' + importerElId);
          importerEl.find('.import-pip').on('click', that._twirlDownHandler);
        }

        return this;
      },

      //
      // _update: Trigger a fetch of the importers collection to update the view.
      //
      //  No view contents are modified. That is deferred to events emitted by the
      //  importers collection unless options.context === 'render'. When
      //  options.context === 'render', then the entire view is rendered.
      //
      //  options:
      //    context: Invokation context. Default is 'update'.
      //      context ::= 'render' || 'update'
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
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onSuccess: ') + 'Successfully loaded importers...');

          that._enablePaginationControls();

          that.status = that.STATUS_RENDERED;

          if (options.triggerEvents) {
            if (options.context === 'render') {
              that.trigger(that.id + ":rendered");
            }
            else {
              that.trigger(that.id + ":updated");
            }
          }
        };

        var onError = function(lastImport, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onError: ') + 'error loading recent uploads.');

          if (options.triggerEvents) {
            if (options.context === 'render') {
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
        this._enableImportersEvents();

        that._disablePaginationControls();

        that.importers.pageSize = that._getOptimalPageSize();

        var fetchOpts = {
          success: onSuccess,
          error: onError,
          reset: (options.context === 'render') ? true : false
        };

        if (options.pageTo === 'first') {
          that.importers.fetchFirst(fetchOpts);
        }
        else if (options.pageTo === 'previous') {
          that.importers.fetchPrevious(fetchOpts);
        }
        else if (options.pageTo === 'next') {
          that.importers.fetchNext(fetchOpts);
        }
        else if (options.pageTo === 'at') {
          that.importers.fetchAt(fetchOpts);
        }
        else {
          that.importers.fetch(fetchOpts);
        }

        return this;
      },

      _onImporterAdded: function(importer, importers) {
        var dp = this._debugPrefix.replace(': ', '._onImporterAdded: ');

        !Plm.debug || console.log(dp + 'Importer add event...');

        this._renderImport(importer);

        return this;
      },

      //
      // _onImporterRemoved: Do an update. But _update the view which should
      //  fill in with a new importer.
      //
      _onImporterRemoved: function(importer, importers) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._onImporterRemoved: ');

        !Plm.debug || console.log(dp + 'Importer remove event...');

        var importerElId = "import-" + importer.id.replace('$', '');
        var importerEl = that.$el.find('#' + importerElId);

        importerEl.remove();

        //
        // We now have one less import, update the page.....
        //
        that._update({
          context: 'update',
          triggerEvents: false,
          pageTo: 'at'
        });        

        return this;
      },

      _onImporterChanged: function(importer) {
        var dp = this._debugPrefix.replace(': ', '._onImporterChanged: ');

        !Plm.debug || console.log(dp + 'Importer change event...');

        this._renderImport(importer);

        return this;
      },

      _onImportersReset: function(importers) {
        var dp = this._debugPrefix.replace(': ', '._onImportersReset: ');

        !Plm.debug || console.log(dp + 'Importers reset event...');

        this.status = this.STATUS_UNRENDERED;
        this.$el.find('.photos-collection').html('');

        this._doRender();

        return this;
      },

      //
      // _onImporterImagesAdd: Image is added, adjust dom.
      //
      _onImporterImagesAdd: function(image, images, importer) {
        var importerElId = "import-" + importer.id.replace('$', '');
        var importerEl = that.$el.find('#' + importerElId);

        if (importerEl.length) {
          //
          // Update the size of the import.
          //
          importerEl.find('.import-count').text(images.size() + " Photos");
          //
          // Replace the DOM element reresenting the image.
          //
          var compiledTemplate = _.template(importImageTemplate,
                                            {
                                              image: image,
                                              importStatus: 'imported'
                                            });

          var index = images.indexOf(image);

          if (index === 0) {
            //
            // Insert at the beginning of the photos collection for the import.
            //
            importerEl.find('.import-photos-collection').prepend(compiledTemplate);
          }
          else if ((index + 1) === images.length) {
            //
            // Insert at end of photos collection for the import.
            //
            importerEl.find('.import-photos-collection').append(compiledTemplate);
          }
          else {
            //
            // Find the previous image using its data-id attribute and insert after it.
            //
            var prevImage = images.at(index - 1);
            importerEl.find('.import-photos-collection [data-id="' + prevImage.id + '"]').after(compiledTemplate);
          }

          this._imageSelectionManager.reset();
          this._onResizeHandler();
        }
        return this;
      },

      //
      // _onImporterImagesRemove: Image is removed, adjust dom.
      //
      _onImporterImagesRemove: function(image, images, importer) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.onImporterImagesRemove: ');

        !Plm.debug || console.log(dp + 'Removing image w/ id - ' + image.id);

        var importerElId = "import-" + importer.id.replace('$', '');
        var importerEl = that.$el.find('#' + importerElId);

        if (importerEl.length) {
          //
          // Update the size of the import.
          //
          importerEl.find('.import-count').text(images.size() + " Photos");

          importerEl.find('.import-photos-collection [data-id="' + image.id + '"]').remove();
        }
        return this;
      },

      _onImporterImagesReset: function(images, importer) {
        var dp = this._debugPrefix.replace(': ', '._onImporterImagesReset: ');

        !Plm.debug || console.log(dp + 'Importer images reset event...');

        this._renderImport(importer);

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
            that._enablePaginationControls();
            if (numError > 0) {
              that._update({
                context: 'update',
                triggerEvents: false,
                pageTo: 'at'
              });
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
          that._disablePaginationControls();
          _.each(selected, function(selectedItem) {
            !Plm.debug || console.log(dp + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);

            //
            // Import has ID: import-<importer ID w/o $>.
            //
            var importerId = $(selectedItem.$el).parents('.import-collection').attr('id').replace('import-', '$');

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
                              {
                                success: function(model, response, options) {
                                  !Plm.debug || console.log(dp + "Success saving image, id - " + model.id + ', in importer w/ id - ' + importerId);
                                  that.importers.removeImage(imageModel, importerId);
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
      },

      //
      // _toNextPage: Go to the next page of imports.
      //
      _toNextPage: function() {
        var dp = this._debugPrefix.replace(': ', '._toNextPage: ');

        !Plm.debug || console.log(dp + 'Paging to next page...');
        this._reRender({pageTo: 'next'});
      },

      //
      // _enablePaginationControls: Based upon pagination data received from the
      //  API enable previous / next arrows as appropriate, alone with click events.
      //
      _enablePaginationControls: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enablePaginationControls: ');

        !Plm.debug || console.log(dp + 'Checking pagination cursors...');

        var enablePrevious = (this.importers && this.importers.paging && this.importers.paging.cursors && this.importers.paging.cursors.previous && (this.importers.paging.cursors.previous !== -1)) ? true : false;
        var enableNext = (this.importers && this.importers.paging && this.importers.paging.cursors && this.importers.paging.cursors.next && (this.importers.paging.cursors.next !== -1)) ? true : false;

        !Plm.debug || console.log(dp + 'enable previous - ' + enablePrevious + ', enable next - ' + enableNext);

        that._disablePaginationControls();

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

        return that;
      },

      //
      // _disablePaginationControls: disable them.
      //
      _disablePaginationControls: function() {
        var prevControl = this.$el.find('.pagination-controls .previous-page');
        prevControl.off('click');
        prevControl.addClass('disabled');
        var nextControl = this.$el.find('.pagination-controls .next-page');
        nextControl.off('click');
        nextControl.addClass('disabled');
      },

      //
      // _getOptimalPageSize: Compute the number of rows of imports we can squeeze in.
      //  Use this for the number of imports per page.
      //
      _getOptimalPageSize: function() {
        var dp = this._debugPrefix.replace(': ', '._getOptimalPageSize: ');
        //
        // IMPORT_HEIGHT: Height of import in px. Of course, this would ahve to 
        // change if the CSS changed. 
        //
        var IMPORT_HEIGHT = 225;
        var BOTTOM_POSITION = 40;
        var parentCol = this.$el.find('.photos-collection');
        var pageSize = undefined;

        if (parentCol.height() > 0) {
          pageSize = Math.floor(parentCol.height() / IMPORT_HEIGHT);
          !Plm.debug || console.log(dp + 'computed optimal page size relative to parent collection height - ' + parentCol.height());
        }
        else {
          var containerHeight = $('#content').height() - this.$el.find('.photos-header').outerHeight() - BOTTOM_POSITION;
          pageSize = Math.floor(containerHeight / IMPORT_HEIGHT);
          !Plm.debug || console.log(dp + 'computed optimal page size based upon content container height - ' + $('#content').height() + ', photos header height - ' + this.$el.find('.photos-header').outerHeight());
        }

        if (pageSize < 1) {
          pageSize = 1;
        }
        !Plm.debug || console.log(dp + 'optimal page size - ' + pageSize);
        return pageSize;
      },

      //
      // _respondToEvents: Subscribe, and respond to relevant events on the msg-bus.
      //
      _respondToEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._respondToEvents: ');

        var subId;
        var channel;
        var topic;

        //
        // import.started: We only care if the current page is the first one. If so, we
        //  set the dirty flag, and that is it.
        //
        channel = '_notif-api:' + '/importers';
        topic = 'import.started';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.started, status - ' + that.status);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - import.started, msg - ' + JSON.stringify(msg));
                                   if (that.importers && that.importers.paging && that.importers.paging.cursors && (that.importers.paging.cursors.previous === -1)) {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // import.images.variant.created: Same as import.started. We ONLY care if we are on the first page,
        //  and then we set the dirty flag.
        //
        channel = '_notif-api:' + '/importers';
        topic = 'import.images.variant.created';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.images.variant.created ...');
                                   if (that.importers && that.importers.paging && that.importers.paging.cursors && (that.importers.paging.cursors.previous === -1)) {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // import.images.imported: Same as import.started. We only care if we are on the fist page where a new import would show up.
        //
        channel = '_notif-api:' + '/importers';
        topic = 'import.images.imported';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.images.imported ...');
                                   if (that.importers && that.importers.paging && that.importers.paging.cursors && (that.importers.paging.cursors.previous === -1)) {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // import.image.imported: Same as import.started. We only care if there's an import going on, and we are on the first page.
        //
        channel = '_notif-api:' + '/importers';
        topic = 'import.image.imported';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.image.imported ...');
                                   if (that.importers && that.importers.paging && that.importers.paging.cursors && (that.importers.paging.cursors.previous === -1)) {
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // import.completed: We ONLY care if we are on the first page. And in that case, we invoke update
        //  to update the first page.
        //
        channel = '_notif-api:' + '/importers';
        topic = 'import.completed';
        subId = MsgBus.subscribe(channel,
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.completed.');
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - import.completed, msg - ' + JSON.stringify(msg));
                                   if (that.importers && that.importers.paging && that.importers.paging.cursors && (that.importers.paging.cursors.previous === -1)) {
                                     that._update({
                                       context: 'update',
                                       triggerEvents: false,
                                       pageTo: 'first'
                                     });
                                     that.dirty = false;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // /storage/changes-feed, doc.*.*: simply set the view to dirty, when the change is
        //  appropriate. When the sync. completes, the page will be re-freshed.
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
                                   !Plm.debug || console.log(dp + 'event - ' + msg.event);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - ' + msg.event + ', msg.data - ' + JSON.stringify(msg.data));
                                   var parsedEvent = msg.event.split('.');
                                   if (parsedEvent[1] === 'importer') {
                                     that.dirty = true;
                                   }
                                   else if (parsedEvent[1] === 'image') {
                                     //
                                     // Any change to an image implies the corresponding importer has changed.
                                     //
                                     !Plm.debug || !Plm.verbose || console.log(dp + 'event - ' + msg.event + ', Have image event...');
                                     that.dirty = true;
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // /storage/synchronizers, sync.completed: If the view is dirty, trigger an update of the 
        //  current page.
        //
        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                                 'sync.completed',
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - sync.completed, dirty - ' + that.dirty + ' ...');
                                   !that.dirty || that._update({
                                     context: 'update',
                                     triggerEvents: false,
                                     pageTo: 'at'
                                   });
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

      }

    });

    return AllPhotosView;

  }
);
