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

    //
    // AllPhotosView: The photo-manager/home/library/all-photos view.
    //
    var AllPhotosView = Backbone.View.extend({

      tagName: 'div',

      id: 'photo-manager/home/library/all-photos',

      //
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //  STATUS_RENDERING_IMPORTS: going thru all imports and rendering each one.
      //  STATUS_INCREMENTALLY_RENDERING_IMPORT: an import within the view, could 
      //    be the latest or not is being rendered.
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERED: 1,
      STATUS_RENDERING_IMPORTS: 2,
      STATUS_INCREMENTALLY_RENDERING_IMPORT: 3,
      status: undefined,

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
              that.status = that.STATUS_RENDERED;
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
          this.status = this.STATUS_RENDERING_IMPORTS;
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
              else if (options && options.done) {
                options.done();
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
        if (that.status === that.STATUS_RENDERED) {
          console.log(that.id + '._startIncrementallyRenderingImport: Starting to incrementally render import, importer - ' + JSON.stringify(importer));

          that.status = that.STATUS_INCREMENTALLY_RENDERING_IMPORT;

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
          that.status = that.STATUS_INCREMENTALLY_RENDERING_IMPORT;
        }
        return that;
      },

      _addToIncrementalImportRender: function(image) {
        var that = this;
        if (that.status === that.STATUS_INCREMENTALLY_RENDERING_IMPORT) {
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

      _finishImportImportRender: function(importer) {
        if (this.status === this.STATUS_INCREMENTALLY_RENDERING_IMPORT) {
          this.$importRenderingInc.find(".imported-timestamp").text(" Imported: " + importer.completed_at);
          this.importRenderingInc = undefined;
          this.importRenderingIncImages = undefined;
          this.$importRenderingInc = undefined;
          this.status = this.STATUS_RENDERED;
        }
      },

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import started, msg - ' + JSON.stringify(msg));
                           that._startIncrementallyRenderingImport(msg.data);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import image saved, msg - ' + JSON.stringify(msg));
                           that._addToIncrementalImportRender(msg.data.doc);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import completed, msg - ' + JSON.stringify(msg));
                           that._finishImportImportRender(msg.data);
                         });
      }

    });

    return AllPhotosView;

  }
);
