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
    'app/models/importer',
    'app/models/image',
    'app/collections/importers',
    'app/collections/importers-images',
    'text!/html/photo-manager/templates/home/library/all-photos.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, ImporterModel, ImageModel, ImportersCollection, ImportersImagesCollection, allPhotosTemplate, importTemplate, importImageTemplate) {

    var moduleName = 'photo-manager/views/home/library/all-photos';


    //
    // AllPhotosView: The photo-manager/home/library/all-photos view.
    //
    var AllPhotosView = Backbone.View.extend({

      _debugPrefix: moduleName + '.AllPhotosView',

      tagName: 'div',

      id: 'photo-manager/home/library/all-photos',

      //
      // status:
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_RENDERING: the view is being rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERING: 1,
      STATUS_RENDERED: 2,

      status: undefined,

      //
      // rendering:
      //  What form of rendering is going on, if any:
      //
      //    full: rendering everything!
      //    incremental: do an incremental render
      //    dirty: rendering a dirty import
      //
      rendering: {
        full: false,
        incremental: false,
        dirty: false
      },

      //
      // Set to true, when the view becomes 'dirty'. That is when a message is received
      // concerning a document change where we cannot immediate update the view.
      //
      dirty: false,
      //
      // Thesee are the importers which will need to be updated in the view at the appropriate
      // time. This is a mapping from:
      //
      //  <importer ID, including the leading '$'> -> { id: <importer ID>,
      //                                                status: <importer status>,
      //                                                created_at: <created at> }
      //
      //    <importer status> ::= CREATED | UPDATED | DELETED
      //
      IMPORTER_STATUS_CREATED: 0,
      IMPORTER_STATUS_UPDATED: 1,
      IMPORTER_STATUS_DELETED: 2,

      dirtyImporters: {},

      _updateDirtyImporters: function(id, status, created_at) {
        !Plm.debug || console.log(this._debugPrefix + '._updateDirtyImporters: id - ' + id + ', status - ' + status + ', created_at - ' + created_at);
        if (!id) {
          !Plm.debug || console.log(this._debugPrefix + '._updateDirtyImporters: Error, invalid id - ' + id);
          return;
        }
        if (_.has(this.dirtyImporters, id)) {
          if (status) {
            this.dirtyImporters[id].status = status;
          }
          if (created_at) {
            this.dirtyImporters[id].created_at = created_at;
          }
        }
        else {
          this.dirtyImporters[id] = {
            id: id,
            status: status,
            created_at: created_at
          };
        }
      },

      //
      // The collection of importers representing this view.
      //
      importers: undefined,

      //
      // When an active import is going on, we utilize these:
      //
      //  importRenderingInc: Set to ImporterModel.
      //  importRenderingIncImages: ImportersImagesCollection to access images.
      //  $importRenderingInc: jQuery reference to compiled importTemplate to be updated
      //    as new images come in.
      //
      importRenderingInc: undefined,
      importRenderingIncImages: undefined,
      $importRenderingInc: undefined,

      subscriptions: {},

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },

      _photosMin: 6,

      initialize: function() {
        !Plm.debug || console.log(this._debugPrefix + '.initialize: initializing...');
        var that = this;

        _.extend(this, TagDialog.handlersFactory());

        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined,
                                                 {
                                                   filterWithoutStartedAt: true
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
        this._lightbox = new Lightbox(that.$el, '.photo', '.photo-link', '.import-collection');

        $(window).resize(function() {
          var parentCol = that.$el.find('.photos-collection');
          var collections = that.$el.find('.import-photos-collection');

          collections.each(function() {
            var col = $(this);
            var photoWidth = $(col.find('.photo')[0]).outerWidth();

            if (col.hasClass('open')) {
              !Plm.debug || console.log(that._debugPrefix + '.render.onSuccess: window resize, collection inner width - ' + col.innerWidth() + ', parent coll (inner width, width, css width) - (' + parentCol.innerWidth() + ', ' + parentCol.width() + ', ' + parentCol.css("width") + '), photos min - ' + that._photosMin + ', photo width - ' + photoWidth);
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
        });

        this._respondToEvents();
      },

      //
      // render: Load data, and render the view upon a successful load.
      //
      render: function() {
        var that = this;
        var compiledTemplate = _.template(allPhotosTemplate);
        that.$el.append(compiledTemplate);
        var onSuccess = function() {
          that._renderImports({
            success: function(importer) {
              console.log(that._debugPrefix + '.render: success for importer w/ id - ' + importer.id);
            },
            error: function(importer) {
              console.log(that._debugPrefix + '.render: error for importer w/ id - ' + importer.id);
            },
            done: function() {
              console.log(that._debugPrefix + '.render: rendered all importers...');
              that._imageSelectionManager.reset();
              that.trigger(that.id + ":rendered");

              // After import has been rendered, assign click events to them
              $('.import-collection').find('.import-pip').off('click').on('click', function() {
                $(this).toggleClass('open');
                var parentCol = that.$el.find('.photos-collection');
                var col = $(this).parent().siblings('.import-photos-collection').toggleClass('open');
                if (col.hasClass('open')) {
                  var photoWidth = $(col.find('.photo')[0]).outerWidth();

                  !Plm.debug || console.log(that._debugPrefix + '.render: .import-pip click event, collection inner width - ' + col.innerWidth() + ', photos min - ' + that._photosMin + ', photo width - ' + photoWidth);
                  
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
            }});
        };
        var onError = function() {
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        this.importers.fetch({success: onSuccess,
                              error: onError});
        return this;
      },

      teardown: function() {
        var that = this;

        !Plm.debug || console.log(that._debugPrefix + '.teardown: invoking...');

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
        !Plm.debug || console.log(this._debugPrefix + '._reRender: re-rendering, status - ' + this.status + ', dirty - ' + this.dirty);
        this.status = this.STATUS_UNRENDERED;
        this.$el.html('');
        this.importers = new ImportersCollection(undefined, 
                                                 {
                                                   filterWithoutStartedAt: true
                                                 });
        this.render();
        this.dirty = false;
        return this;
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
        if ((this.importers === undefined) || (this.importers.length === 0)) {
          Plm.showFlash('You\' have no imports! Please, import some photos!');
          that.rendering.full = false;
          that.status = that.STATUS_RENDERED;
          if (options && options.done) {
            options.done();
          }
        }
        else {
          console.log(that._debugPrefix + '._renderImports: Rendering ' + this.importers.length + ' imports...');
          this.status = this.STATUS_RENDERING;
          this.rendering.full = true;
          var toRender = this.importers.toArray();

          function renderImport(importer) {
            var importerImages = new ImportersImagesCollection(undefined, {importerId: importer.id});
            var onSuccess = function() {
              var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                                  importImages: importerImages,
                                                                  imageTemplate: importImageTemplate,
                                                                  _: _,
                                                                  formatDate: Plm.localDateTimeString});

              if(importerImages.length > 0) {
                  // Assign import pip toggles before adding them to the page
                  that.$el.find('.photos-collection').append(compiledTemplate);
              }
              if (options && options.success) {
                options.success(importer);
              }
              if (toRender.length > 0) {
                renderImport(toRender.shift());
              }
              else {
                that.rendering.full = false;
                that.status = that.STATUS_RENDERED;
                !options || !options.done || options.done();
              }
            };
            var onError = function() {
              Plm.showFlash('There was an unexpected error retrieving images for one of your imports!');
              if (options && options.error) {
                options.error(importer);
              }
              if (toRender.length > 0) {
                renderImport(toRender.shift());
              }
              else {
                that.rendering.full = false;
                that.status = that.STATUS_RENDERED;
              }
            };
            importerImages.fetch({success: onSuccess,
                                  error: onError});
          };
          renderImport(toRender.shift());
        }
      },

      //
      // _startIncrementallyRenderingImport: We have a new import.
      //
      _startIncrementallyRenderingImport: function(importer) {
        var that = this;
        //
        // We only allow starting an incremental rendering when nothing else is going on.
        //
        if (that.status === that.STATUS_RENDERED) {
          console.log(that._debugPrefix + '._startIncrementallyRenderingImport: Starting to incrementally render import, importer - ' + JSON.stringify(importer));

          that.status = that.STATUS_RENDERING;

          that.importRenderingInc = new ImporterModel(importer);
          that.importers.add(that.importRenderingInc, {at: 0});
          that.importRenderingIncImages = new ImportersImagesCollection(undefined, {importerId: importer.id});
          //
          // We have 2 cases, either there is a import element already in the DOM,
          // in which case we will just append images to it. Or, we insert a new
          // one, in the correct place based upon the data-started_at attribute.
          //
          var importElId = 'import-' + importer.id.replace('$', '');
          var importEl = $('#' + importElId);

          if (importEl.length > 0) {
            console.log(that._debugPrefix + '._startIncrementallyRenderingImport: import already in DOM, will use it...');
            that.$importRenderingInc = importEl;
            that.$importRenderingInc.find('.import-count').html('0 Photos');
            that.$importRenderingInc.find('.import-photos-collection').html('<div class="clearfix"/>');
          }
          else {
            console.log(that._debugPrefix + '._startIncrementallyRenderingImport: compiling initial template for import...');

            var compiledTemplate = _.template(importTemplate, { importer: that.importRenderingInc,
                                                                importImages: that.importRenderingIncImages,
                                                                imageTemplate: importImageTemplate,
                                                                _: _,
                                                                formatDate: Plm.localDateTimeString });
            that.$el.find('.photos-collection').prepend(compiledTemplate);
            that.$importRenderingInc = $('#' + importElId);
            that.$importRenderingInc.find('.import-pip').on('click', 
                                                            PhotoSet.twirlDownClickHandlerFactory(
                                                              that,
                                                              '.import-photos-collection'));
            console.log(that._debugPrefix + '._startIncrementallyRenderingImport: compiled initial template for import, element ID - ' + importElId + ', element found - ' + that.$importRenderingInc.length);
          }
          that._imageSelectionManager.reset();
          that.rendering.incremental = true;
        }
        return that;
      },

      _addToIncrementalImportRender: function(image) {
        var that = this;
        if (that.rendering.incremental) {
          console.log(that._debugPrefix + '._addToIncrementalImportRender: Adding image to import w/ id - ' + image.id + ', to view.');
          //
          // Add to the collection.
          //
          var imageModel = new ImageModel(image);
          this.importRenderingIncImages.add(imageModel);
          //
          // Update the size of the import.
          //
          this.$importRenderingInc.find('.import-count').text(this.importRenderingIncImages.size() + " Photos");
          //
          // Also add the image to the view.
          //
          var compiledTemplate = _.template(importImageTemplate, { image: imageModel });
          that.$importRenderingInc.find('.import-photos-collection').append(compiledTemplate);
          that._imageSelectionManager.reset();
        }
        return that;
      },

      _finishIncrementalImportRender: function(importer) {
        if (this.rendering.incremental) {
          this.$importRenderingInc.find(".import-date").text(" Imported: " + importer.completed_at);
          this.importRenderingInc = undefined;
          this.importRenderingIncImages = undefined;
          this.$importRenderingInc = undefined;
          this.rendering.incremental = false;
          if (!this.rendering.full && !this.rendering.dirty) {
            this.status = this.STATUS_RENDERED;
          }
          else {
            this.status = this.STATUS_RENDERING;
          }
        }
        return this;
      },

      //
      // _renderDirtyImport: Render a single dirty import.
      //  The process involves:
      //    1. Removing it from the set of dirtyImporters.
      //    2. Fetching the import
      //      2.a. onSuccess: 
      //        - Finding the element to insert it after.
      //        - insert it.
      //        - invoke an onSuccess callback.
      //      3.b. onError: 
      //        - Re-insert it into the set of dirty importers.
      //        - invoke an onError callback.
      //
      _renderDirtyImport: function(importerId, options) {
        var that = this;

        //
        // Don't allow us to do if a full render is inprogess:
        //
        if (that.rendering.full) {
          !options || !options.error || options.error('Full render in progress');
          return;
        }
        if (_.has(that.dirtyImporters, importerId)) {
          !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport: About to render dirty import w/ id - ' + importerId);
          var importerToDo = that.dirtyImporters[importerId];
          delete that.dirtyImporters[importerId];

          that.status = this.STATUS_RENDERING;
          that.rendering.dirty = true;

          var importerImages = new ImportersImagesCollection(undefined, {importerId: importerId});

          var onSuccess = function(collection, response) {
            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Have importer w/ id - ' + importerImages.importerId + ', response - ' + JSON.stringify(response));
            var iAttr = _.clone(response.importer);
            delete iAttr.images;

            //
            // Find where in the collection the importer is, if it exists at all.
            //
            var importer = that.importers.findWhere({id: importerId});
            var index = -1;

            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Found importer - ' + JSON.stringify(importer));
            
            if (importer) {
              index = that.importers.indexOf(importer);
              !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Found importer model w/ index - ' + index);
            }
            else {
              !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Create importer model with attr - ' + JSON.stringify(iAttr));
              //
              // Not in the collection, figure out where to put it.
              //
              importer = new ImporterModel(iAttr);
              var firstSmaller = that.importers.find(function(v) { return v.get('created_at') < iAttr.created_at; });
              if (firstSmaller) {
                index = that.importers.indexOf(firstSmaller);
                !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Adding new importer at index - ' + index);
                that.importers.add(importer, {at:index});
              }
              else {
                //
                // Insert at end.
                //
                index = that.importers.length;
                !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Inserting importer at end...');
                that.importers.push(importer);
                if (Plm.debug) {
                  console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Trying to retrieve inserted importer w/id - ' + importer.id + ' (' + importerId + '), importers collection size - ' + that.importers.length);
                  that.importers.each(function(imp, i) {
                    console.log(that._debugPrefix + '._renderDirtyImport.inSuccess: collection importer at index - ' + i + ', importer - ' + JSON.stringify(imp));
                  });
                  var tmp = that.importers.findWhere({id: importer.id});
                  console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Retrieved importer - ' + JSON.stringify(tmp));
                }
              }
            }
            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Compiling import template.');
            var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                                importImages: importerImages,
                                                                imageTemplate: importImageTemplate,
                                                                _: _,
                                                                formatDate: Plm.localDateTimeString });
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
            that.rendering.dirty = false;
            if (!that.rendering.full && !that.rendering.incremental) {
              that.status = that.STATUS_RENDERED;
            }
            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport.onSuccess: Invoking success callback...');
            !options || !options.success || options.success();
          };
          var onError = function() {
            Plm.showFlash('There was an unexpected error retrieving images for one of your imports!');
            that.rendering.dirty = false;
            if (!that.rendering.full && !that.rendering.incremental) {
              that.status = that.STATUS_RENDERED;
            }
            !options || !options.error || options.error('There was an unexpected retrieving images for an import!');
          };

          !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImport: Fetching importer images...');
          importerImages.fetch({success: onSuccess,
                                error: onError});
        }
        else {
          if (_.has(options, 'error')) {
            !options || !options.error || options.error('Importer with id ' + importerId + ' not found!');
          }
        }
      },

      _renderDirtyImports: function() {
        var that = this;
        !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImports: Have ' + _.size(that.dirtyImporters) + ' importers to render.');
        var doOne = function(onSuccess, onError) {
          var toDo = _.sortBy(that.dirtyImporters,
                              function(v, k) { return v.created_at; });
          if (_.size(toDo) > 0) {
            var importerToDo = _.first(toDo);
            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImports: Selected importer w/ id - ' + importerToDo.id + ', w/ created_at - ' + importerToDo.created_at);
            that._renderDirtyImport(importerToDo.id,
                                    {success: onSuccess,
                                     error: onError});
          }
          else {
            onError('No importers');
          }
        };
        var onSuccess = function(id) {
          if (_.size(that.dirtyImporters) > 0) {
            !Plm.debug || console.log(that._debugPrefix + '._renderDirtyImports.onSuccess: Have ' + _.size(that.dirtyImporters) + ' importers left to render.');
            doOne(onSuccess, onError);
          }
          else {
            $('.import-collection').find('.import-pip').off('click').on('click',
                                                                        PhotoSet.twirlDownClickHandlerFactory(
                                                                          that,
                                                                          '.import-photos-collection'));
            that._imageSelectionManager.reset();
          }
        };
        var onError = function(err) {
          if (_.size(that.dirtyImporters) > 0) {
            window.setTimeout(function() {
              doOne(onSuccess, onError);
            }, 1000);
          }
        };
        if (_.size(this.dirtyImporters) > 0) {
          doOne(onSuccess, onError);
        }
      },

      //
      // _toTrashHandler: Move selected images to trash.
      //
      _toTrashHandler: function() {
        var dbgPrefix = this._debugPrefix + "._toTrashHandler: ";
        !Plm.debug || console.log(dbgPrefix + "invoked...");
        var that = this;
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

        var subId;
        var channel;
        var topic;

        channel = '_notif-api:' + '/importers';
        topic = 'import.started';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 'import.started',
                                 function(msg) {
                                   !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: import started, status - ' + that.status + ', rendering incremental - ' + that.rendering.incremental);
                                   !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._respondToEvents: import started, msg - ' + JSON.stringify(msg));
                                   if (that.rendering.incremental) {
                                     that.dirty = true;
                                     that._updateDirtyImporters(msg.data.id,
                                                                that.IMPORTER_STATUS_CREATED,
                                                                msg.data.created_at);
                                   }
                                   else {
                                     that._startIncrementallyRenderingImport(msg.data);
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
                                   !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: import image saved, msg - ' + JSON.stringify(msg));
                                   if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                                     that._addToIncrementalImportRender(msg.data.doc);
                                   }
                                   else {
                                     that.dirty = true;
                                     that._updateDirtyImporters(msg.data.id,
                                                                that.IMPORTER_STATUS_UPDATED);
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
                                   !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: import completed, rendering incremental - ' + that.rendering.incremental);
                                   !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._respondToEvents: import completed, msg - ' + JSON.stringify(msg));
                                   if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                                     that._finishIncrementalImportRender(msg.data);
                                   }
                                   else {
                                     that.dirty = true;
                                     that._updateDirtyImporters(msg.data.id,
                                                                that.IMPORTER_STATUS_UPDATED,
                                                                msg.data.created_at);
                                     that._renderDirtyImport(msg.data.id);
                                   }
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

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
                                   !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: doc change event, event - ' + msg.event);
                                   !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._respondToEvents: msg.data - ' + JSON.stringify(msg.data));
                                   var parsedEvent = msg.event.split('.');
                                   if (parsedEvent[1] === 'importer') {
                                     that.dirty = true;
                                     if (parsedEvent[2] === 'created') {
                                       that._updateDirtyImporters(msg.data.doc.id,
                                                                  that.IMPORTER_STATUS_CREATED,
                                                                  msg.data.doc.created_at);
                                     }
                                     else if (parsedEvent[2] === 'deleted') {
                                       that._updateDirtyImporters(msg.data.doc.id,
                                                                  that.IMPORTER_STATUS_DELETED);
                                     }
                                     else {
                                       that._updateDirtyImporters(msg.data.doc.id,
                                                                  that.IMPORTER_STATUS_UPDATED,
                                                                  msg.data.doc.created_at);
                                     }
                                   }
                                   else if (parsedEvent[1] === 'image') {
                                     //
                                     // Any change to an image implies the corresponding importer has changed.
                                     //
                                     !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._respondToEvents: have image event...');
                                     that.dirty = true;
                                     if (_.has(msg.data.doc, 'importer_id')) {
                                       //
                                       // Only if we have an importer ID, do we update our dirty ones.
                                       //
                                       that._updateDirtyImporters(msg.data.doc.importer_id,
                                                                  that.IMPORTER_STATUS_UPDATED);
                                     }
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
                                   !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: sync.completed event...');
                                   if (that.dirty) {
                                     !Plm.debug || console.log(that._debugPrefix + '._respondToEvents: sync.completed, view is dirty...');
                                     that._renderDirtyImports();
                                   }
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
