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

      _debugPrefix: moduleName + '.AllPhotosView: ',

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
        var dp = this._debugPrefix.replace(': ', '._updateDirtyImporters: ');
        !Plm.debug || console.log(dp + 'id - ' + id + ', status - ' + status + ', created_at - ' + created_at);
        if (!id) {
          !Plm.debug || console.log(dp + 'Error, invalid id - ' + id);
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
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.initialize: ');
        !Plm.debug || console.log(dp + 'initializing...');


        _.extend(this, TagDialog.handlersFactory());

        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined,
                                                 {
                                                   withPagination: true,
                                                   pageSize: this._getOptimalPageSize()
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

        $(window).resize(function() {
          var parentCol = that.$el.find('.photos-collection');
          var collections = that.$el.find('.import-photos-collection');

          collections.each(function() {
            var col = $(this);
            var photoWidth = $(col.find('.photo')[0]).outerWidth();

            if (col.hasClass('open')) {
              !Plm.debug || console.log(dp.replace(': ', '.resize: ') + 'window resize, collection inner width - ' + col.innerWidth() + ', parent coll (inner width, width, css width) - (' + parentCol.innerWidth() + ', ' + parentCol.width() + ', ' + parentCol.css("width") + '), photos min - ' + that._photosMin + ', photo width - ' + photoWidth);
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
      render: function(options) {
        var that = this;

        options = options || {};

        var dp = that._debugPrefix.replace(': ', '.render: ');

        var compiledTemplate = _.template(allPhotosTemplate);
        that.$el.append(compiledTemplate);
        var onSuccess = function() {
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
              console.log(dp + 'image selection manager has been reset...');
              that._enablePaginationControls();
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
            }});
        };
        var onError = function() {
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        that.importers.pageSize = that._getOptimalPageSize();
        if (options.pageTo === 'previous') {
          that.importers.fetchPrevious({success: onSuccess,
                                        error: onError});
        }
        else if (options.pageTo === 'next') {
          that.importers.fetchNext({success: onSuccess,
                                    error: onError});
        }
        else {
          that.importers.fetch({success: onSuccess,
                                error: onError});
        }
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
      // _reRender: a combination of initialize + render to fetch
      //  the true last import and re-render the view.
      //
      //  options:
      //    pageTo: previous || next.
      //   
      _reRender: function(options) {
        options = options || {};

        var dp = this._debugPrefix.replace(': ', '._reRender: ');

        !Plm.debug || console.log(dp + 're-rendering, page to - ' + options.pageTo + ', status - ' + this.status + ', dirty - ' + this.dirty);

        this.status = this.STATUS_UNRENDERED;
        this.$el.html('');
        if (!options.pageTo || (this.importers === undefined)) {
          this.importers = new ImportersCollection(undefined, 
                                                   {
                                                     withPagination: true,
                                                     pageSize: this._getOptimalPageSize()
                                                   });
        }
        this.render(options);
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

        var dp = this._debugPrefix.replace(': ', '._renderImports: ');

        if ((this.importers === undefined) || (this.importers.length === 0)) {
          Plm.showFlash('You\' have no imports! Please, import some photos!');
          that.rendering.full = false;
          that.status = that.STATUS_RENDERED;
          if (options && options.done) {
            options.done();
          }
        }
        else {
          console.log(dp + 'Rendering ' + this.importers.length + ' imports...');
          this.status = this.STATUS_RENDERING;
          this.rendering.full = true;
          var toRender = this.importers.toArray();

          function renderImport(importer) {
            !Plm.debug || console.log(dp.replace(': ', '.renderImport: ') + 'Rendering importer - ' + importer.id + ', import_dir - ' + importer.import_dir);
            var importerImages = new ImportersImagesCollection(undefined, {importerId: importer.id});
            !Plm.debug || console.log(dp.replace(': ', '.renderImport: ') + 'Created /importers/images collection...');
            var onSuccess = function() {
              !Plm.debug || console.log(dp.replace(': ', '.renderImport.onSuccess: ') + 'Success retrieving importer images...');
              var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                                  importImages: importerImages,
                                                                  imageTemplate: importImageTemplate,
                                                                  importStatus: "imported",
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
            console.log(dp.replace(': ', '.renderImport: ') + 'About to fetch importer images w/ id - ' + importerImages.importerId);
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

        var dp = this._debugPrefix.replace(': ', '._startIncrementallyRenderingImport: ');

        //
        // We only allow starting an incremental rendering when nothing else is going on.
        //
        if (that.status === that.STATUS_RENDERED) {
          console.log(dp + 'Starting to incrementally render import, importer - ' + JSON.stringify(importer));

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
            console.log(dp + 'import already in DOM, will use it...');
            that.$importRenderingInc = importEl;
            that.$importRenderingInc.find('.import-count').html('0 Photos');
            that.$importRenderingInc.find('.import-photos-collection').html('<div class="clearfix"/>');
          }
          else {
            console.log(dp + 'compiling initial template for import...');

            var compiledTemplate = _.template(importTemplate, { importer: that.importRenderingInc,
                                                                importImages: that.importRenderingIncImages,
                                                                imageTemplate: importImageTemplate,
                                                                importStatus: "imported",
                                                                _: _,
                                                                formatDate: Plm.localDateTimeString });
            that.$el.find('.photos-collection').prepend(compiledTemplate);
            that.$importRenderingInc = $('#' + importElId);
            var twirlDownHandler = PhotoSet.twirlDownClickHandlerFactory(
              that,
              '.import-photos-collection');
            that.$importRenderingInc.find('.import-pip').on('click', twirlDownHandler);
            //
            // Setup the "Twirldown handler" to open close the import. Also, call it 
            // immediately to open the view.
            //
            twirlDownHandler.call(that.$importRenderingInc.find('.import-pip'));
            console.log(dp + 'compiled initial template for import, element ID - ' + importElId + ', element found - ' + that.$importRenderingInc.length);
          }
          that._imageSelectionManager.reset();
          that.rendering.incremental = true;
        }
        return that;
      },

      _addToIncrementalImportRender: function(image, eventTopic) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._addToIncrementalRender: ');

        var numAdded = 0;

        var addOne = function(image) {
          if (that.rendering.incremental) {
            if (!_.has(image, 'variants') || (image.variants.length === 0)) {
              !Plm.debug || console.log(dp + 'Skipping image with no variants, image w/ id - ' + image.id);
            }
            else if (!that.importRenderingIncImages.get(image.id)) {
              !Plm.debug || console.log(dp + 'Adding image to import w/ id - ' + image.id + ', to view.');
              //
              // Add to the collection.
              //
              var imageModel = new ImageModel(image);
              that.importRenderingIncImages.add(imageModel);
              //
              // Update the size of the import.
              //
              that.$importRenderingInc.find('.import-count').text(that.importRenderingIncImages.size() + " Photos");
              //
              // Also add the image to the view.
              //
              var compiledTemplate = _.template(importImageTemplate,
                                                {
                                                  image: imageModel,
                                                  importStatus: eventTopic.split('.').splice(2).join('.')
                                                });
              that.$importRenderingInc.find('.import-photos-collection').append(compiledTemplate);
              numAdded++;
            }
            else if ((eventTopic === 'import.images.imported') || (eventTopic === 'import.image.imported')) {
              //
              // Replace the image model within the collection.
              //
              var imageModel = new ImageModel(image);
              that.importRenderingIncImages.set([imageModel], {remove: false});
              //
              // Update the size of the import.
              //
              that.$importRenderingInc.find('.import-count').text(that.importRenderingIncImages.size() + " Photos");
              //
              // Replace the DOM element reresenting the image.
              //
              var compiledTemplate = _.template(importImageTemplate,
                                                {
                                                  image: imageModel,
                                                  importStatus: eventTopic.split('.').splice(2).join('.')
                                                });
              that.$importRenderingInc.find('.import-photos-collection [data-id="' + image.id + '"]').replaceWith(compiledTemplate);
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

        var dp = this._debugPrefix.replace(': ', '._renderDirtyImport: ');

        //
        // Don't allow us to do if a full render is inprogess:
        //
        if (that.rendering.full) {
          !options || !options.error || options.error('Full render in progress');
          return;
        }
        if (_.has(that.dirtyImporters, importerId)) {
          !Plm.debug || console.log(dp + 'About to render dirty import w/ id - ' + importerId);
          var importerToDo = that.dirtyImporters[importerId];
          delete that.dirtyImporters[importerId];

          that.status = this.STATUS_RENDERING;
          that.rendering.dirty = true;

          var importerImages = new ImportersImagesCollection(undefined, {importerId: importerId});

          var onSuccess = function(collection, response) {
            !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Have importer w/ id - ' + importerImages.importerId + ', response - ' + JSON.stringify(response));
            var iAttr = _.clone(response.importer);
            delete iAttr.images;

            //
            // Find where in the collection the importer is, if it exists at all.
            //
            var importer = that.importers.findWhere({id: importerId});
            var index = -1;

            !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Found importer - ' + JSON.stringify(importer));
            
            if (importer) {
              index = that.importers.indexOf(importer);
              !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Found importer model w/ index - ' + index);
            }
            else {
              !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Create importer model with attr - ' + JSON.stringify(iAttr));
              //
              // Not in the collection, figure out where to put it.
              //
              importer = new ImporterModel(iAttr);
              var firstSmaller = that.importers.find(function(v) { return v.get('created_at') < iAttr.created_at; });
              if (firstSmaller) {
                index = that.importers.indexOf(firstSmaller);
                !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Adding new importer at index - ' + index);
                that.importers.add(importer, {at:index});
              }
              else {
                //
                // Insert at end.
                //
                index = that.importers.length;
                !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Inserting importer at end...');
                that.importers.push(importer);
                if (Plm.debug) {
                  !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Trying to retrieve inserted importer w/id - ' + importer.id + ' (' + importerId + '), importers collection size - ' + that.importers.length);
                  that.importers.each(function(imp, i) {
                    !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'collection importer at index - ' + i + ', importer - ' + JSON.stringify(imp));
                  });
                  var tmp = that.importers.findWhere({id: importer.id});
                  console.log(dp.replace(': ', '.onSuccess: ') + 'Retrieved importer - ' + JSON.stringify(tmp));
                }
              }
            }
            !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Compiling import template.');
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
            !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Invoking success callback...');
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

          !Plm.debug || console.log(dp + 'Fetching importer images...');
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

        var dp = this._debugPrefix.replace(': ', '._renderDirtyImports: ');

        !Plm.debug || console.log(dp + 'Have ' + _.size(that.dirtyImporters) + ' importers to render.');
        var doOne = function(onSuccess, onError) {
          var toDo = _.sortBy(that.dirtyImporters,
                              function(v, k) { return v.created_at; });
          if (_.size(toDo) > 0) {
            var importerToDo = _.first(toDo);
            !Plm.debug || console.log(dp+ 'Selected importer w/ id - ' + importerToDo.id + ', w/ created_at - ' + importerToDo.created_at);
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
            !Plm.debug || console.log(dp.replace(': ', '.onSuccess: ') + 'Have ' + _.size(that.dirtyImporters) + ' importers left to render.');
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
                !Plm.debug || console.log(dp + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);
                var imageModel = new ImageModel({
                    id: selectedItem.id,
                    in_trash: false
                });

                //
                // Invoke a function to create a closure so we have a handle to the image model, and the jQuery element.
                //
                (function(imageModel, $el, updateStatus) {
                    !Plm.debug || console.log(dp + 'Moving selected image to trash, image id - ' + imageModel.id);
                    imageModel.save({'in_trash': true},
                        {success: function(model, response, options) {
                            !Plm.debug || console.log(dp + "Success saving image, id - " + model.id);
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
                                !Plm.debug || console.log(dp + "Error saving image, id - " + model.id);
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
        var enableNext = (this.importers && this.importers.paging && this.importers.paging.cursors && this.importers.paging.cursors.next && (this.importers.paging.cursors.next !== -1)) ? true : false;;

        !Plm.debug || console.log(dp + 'enable previous - ' + enablePrevious + ', enable next - ' + enableNext);

        that._disablePaginationControls();

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

        channel = '_notif-api:' + '/importers';
        topic = 'import.started';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 'import.started',
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.started, status - ' + that.status + ', rendering incremental - ' + that.rendering.incremental);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - import.started, msg - ' + JSON.stringify(msg));
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
        topic = 'import.images.variant.created';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.images.variant.created ...');
                                   if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                                     that._addToIncrementalImportRender(msg.data.doc, 'import.images.variant.created');
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
        topic = 'import.images.imported';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.images.imported ...');
                                   if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                                     that._addToIncrementalImportRender(msg.data.doc, 'import.images.imported');
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
        topic = 'import.image.imported';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
                                 topic,
                                 function(msg) {
                                   !Plm.debug || console.log(dp + 'event - import.image.imported ...');
                                   if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                                     that._addToIncrementalImportRender(msg.data.doc, 'import.image.imported');
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
                                   !Plm.debug || console.log(dp + 'event - import.completed, rendering incremental - ' + that.rendering.incremental);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - import.completed, msg - ' + JSON.stringify(msg));
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
                                   !Plm.debug || console.log(dp + 'event - ' + msg.event);
                                   !Plm.debug || !Plm.verbose || console.log(dp + 'event - ' + msg.event + ', msg.data - ' + JSON.stringify(msg.data));
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
                                     !Plm.debug || !Plm.verbose || console.log(dp + 'event - ' + msg.event + ', Have image event...');
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
                                   !Plm.debug || console.log(dp + 'event - sync.completed ...');
                                   if (that.dirty) {
                                     !Plm.debug || console.log(dp + 'event - sync.completed, view is dirty...');
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
