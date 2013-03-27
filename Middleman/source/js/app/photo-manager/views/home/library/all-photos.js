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
    'app/models/importer',
    'app/models/image',
    'app/collections/importers',
    'app/collections/importers-images',
    'text!/html/photo-manager/templates/home/library/all-photos.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImporterModel, ImageModel, ImportersCollection, ImportersImagesCollection, allPhotosTemplate, importTemplate, importImageTemplate) {

    var moduleName = 'photo-manager/views/home/library/all-photos';
    var debugPrefix = moduleName + '.LastImportView';

    //
    // AllPhotosView: The photo-manager/home/library/all-photos view.
    //
    var AllPhotosView = Backbone.View.extend({

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
      //  <importer ID, including the leading '$'> -> {
      //                                                id: <importer ID>,
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

      initialize: function() {
        console.log(this.id + '.AllPhotosView.initialize: initializing...');
        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined, 
                                                 {
                                                   filterWithoutStartedAt: true
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
              console.log(that.id + '.AllPhotosView.render: success for importer w/ id - ' + importer.id);
            },
            error: function(importer) {
              console.log(that.id + '.AllPhotosView.render: error for importer w/ id - ' + importer.id);
            },
            done: function() {
              console.log(that.id + '.AllPhotosView.render: rendered all importers...');
              that.trigger(that.id + ":rendered");              
            }});
        };
        var onError = function() {
          that.trigger(that.id + ":rendered");
        };
        this.importers.fetch({success: onSuccess,
                              error: onError});
        return this;
      },

      //
      // _reRender: a combination of initialize + render to fetch
      //  the true last import and re-render the view.
      //   
      _reRender: function() {
        !Plm.debug || console.log(debugPrefix + '._reRender: re-rendering, status - ' + this.status + ', dirty - ' + this.dirty);
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
          if (options && options.done) {
            options.done();
          }
        }
        else {
          console.log(this.id + '._renderImports: Rendering ' + this.importers.length + ' imports...');
          this.status = this.STATUS_RENDERING;
          this.rendering.full = true;
          var toRender = this.importers.toArray();

          function renderImport(importer) {
            var importerImages = new ImportersImagesCollection(undefined, {importerId: importer.id});
            var onSuccess = function() {
              var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                                  importImages: importerImages,
                                                                  imageTemplate: importImageTemplate,
                                                                  _: _ });
              that.$el.find('.imports').append(compiledTemplate);
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
          console.log(that.id + '._startIncrementallyRenderingImport: Starting to incrementally render import, importer - ' + JSON.stringify(importer));

          that.status = that.STATUS_RENDERING;

          that.importRenderingInc = new ImporterModel(importer);
          that.importRenderingIncImages = new ImportersImagesCollection(undefined, {importerId: importer.id});
          //
          // We have 2 cases, either there is a import element already in the DOM,
          // in which case we will just append images to it. Or, we insert a new
          // one, in the correct place based upon the data-started_at attribute.
          //
          var importElId = 'import-' + importer.id.replace('$', '');
          var importEl = $('#' + importElId);

          if (importEl.length > 0) {
            console.log(that.id + '._startIncrementallyRenderingImport: import already in DOM, will use it...');
            that.$importRenderingInc = importEl;
            that.$importRenderingInc.find('.import-size').html('0 Photos');
            that.$importRenderingInc.find('.photos-collection').html('');
          }
          else {
            console.log(that.id + '._startIncrementallyRenderingImport: compiling initial template for import...');

            var compiledTemplate = _.template(importTemplate, { importer: that.importRenderingInc,
                                                                importImages: that.importRenderingIncImages,
                                                                imageTemplate: importImageTemplate,
                                                                _: _ });
            that.$el.find('.imports').prepend(compiledTemplate);
            that.$importRenderingInc = $('#' + importElId);
            console.log(that.id + '._startIncrementallyRenderingImport: compiled initial template for import, element ID - ' + importElId + ', element found - ' + that.$importRenderingInc.length);
          }
          that.rendering.incremental = true;
        }
        return that;
      },

      _addToIncrementalImportRender: function(image) {
        var that = this;
        if (that.rendering.incremental) {
          console.log(that.id + '._addToIncrementalImportRender: Adding image to import w/ id - ' + image.id + ', to view.');
          //
          // Add to the collection.
          //
          var imageModel = new ImageModel(image);
          this.importRenderingIncImages.add(imageModel);
          //
          // Update the size of the import.
          //
          this.$importRenderingInc.find('.import-size').text(this.importRenderingIncImages.size() + " Photos");
          //
          // Also add the image to the view.
          //
          var compiledTemplate = _.template(importImageTemplate, { image: imageModel });
          this.$importRenderingInc.find('.photos-collection').append(compiledTemplate);
        }
        return that;
      },

      _finishIncrementalImportRender: function(importer) {
        if (this.rendering.incremental) {
          this.$importRenderingInc.find(".imported-timestamp").text(" Imported: " + importer.completed_at);
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
          var importerToDo = that.dirtyImporters[importerId];
          delete that.dirtyImporters[importerToDo.id];

          that.status = this.STATUS_RENDERING;
          that.rendering.dirty = true;

          var importerImages = new ImportersImagesCollection(undefined, {importerId: importerId});

          var onSuccess = function(collection, response) {
            !Plm.debug || console.log(debugPrefix + '._renderDirtyImport.onSuccess: Have importer w/ id - ' + importerImages.importerId + ', response - ' + JSON.stringify(response));
            var iAttr = _.clone(response.importer);
            delete iAttr.images;
            !Plm.debug || console.log(debugPrefix + '._renderDirtyImport.onSuccess: Create importer model with attr - ' + iAttr);
            var importer = new ImporterModel(iAttr);
            var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                                importImages: importerImages,
                                                                imageTemplate: importImageTemplate,
                                                                _: _ });
            //
            // Find the element to insert after, or if it exists, do a replace.
            //
            that.$el.find('.imports').append(compiledTemplate);
            that.rendering.dirty = false;
            if (!that.rendering.full && !that.rendering.incremental) {
              that.status = that.STATUS_RENDERED;
            }
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
        var doOne = function(onSuccess, onError) {
          var toDo = _.sortBy(that.dirtyImporters,
                              function(v, k) { return v.created_at; });
          if (_.size(toDo) > 0) {
            var importerToDo = _.first(toDo);
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
            doOne(onSuccess, onError);
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

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           !Plm.debug || console.log(that.id + '._respondToEvents: import started, rendering incremental - ' + that.rendering.incremental);
                           !Plm.debug || !Plm.verbose || console.log(that.id + '._respondToEvents: import started, msg - ' + JSON.stringify(msg));
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
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           !Plm.debug || console.log(that.id + '._respondToEvents: import image saved, msg - ' + JSON.stringify(msg));
                           if (that.rendering.incremental && (that.importRenderingInc.id === msg.data.id)) {
                             that._addToIncrementalImportRender(msg.data.doc);
                           }
                           else {
                             that.dirty = true;
                             that._updateDirtyImporters(msg.data.id,
                                                        that.IMPORTER_STATUS_UPDATED);
                           }
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           !Plm.debug || console.log(debugPrefix + '._respondToEvents: import completed, rendering incremental - ' + that.rendering.incremental);
                           !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._respondToEvents: import completed, msg - ' + JSON.stringify(msg));
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

        MsgBus.subscribe('_notif-api:' + '/storage/changes-feed',
                         'doc.*.*',
                         //
                         // doc.*.* callback: Any importer / image document changes
                         //   from a different instance of the APP. Just flag the
                         //   view as being dirty.
                         //
                         function(msg) {
                           !Plm.debug || console.log(debugPrefix + '._respondToEvents: doc change event, event - ' + msg.event);
                           !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._respondToEvents: msg.data - ' + msg.data);
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
                             that.dirty = true;
                             that._updateDirtyImporters(msg.data.doc.importer_id,
                                                        that.IMPORTER_STATUS_UPDATED);
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.completed',
                         function(msg) {
                           !Plm.debug || console.log(debugPrefix + '._respondToEvents: sync.completed event...');
                           if (that.dirty) {
                             !Plm.debug || console.log(debugPrefix + '._respondToEvents: sync.completed, view is dirty...');
                             that._renderDirtyImports();
                           }
                         });

      }

    });

    return AllPhotosView;

  }
);
