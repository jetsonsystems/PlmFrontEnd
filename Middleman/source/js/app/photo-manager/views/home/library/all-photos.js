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
    'app/collections/importers',
    'app/collections/importers-images',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImportersCollection, ImportersImagesCollection, importTemplate, importImageTemplate) {

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

      initialize: function() {
        console.log(this.id + '.AllPhotosView.initialize: initializing...');
        this.status = this.STATUS_UNRENDERED;
        this.importers = new ImportersCollection(undefined, 
                                                 {
                                                   filterWithoutStartedAt: true
                                                 });
        // this._respondToEvents();
      },

      //
      // render: Load data, and render the view upon a successful load.
      //
      render: function() {
        var that = this;
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
              that.$el.append(compiledTemplate);
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

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import started!');
                           // console.log(that.id + '._respondToEvents: import started, msg - ' + JSON.stringify(msg));
                           // that._startIncrementallyRenderingImport(msg.data);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import image saved!');
                           // console.log(that.id + '._respondToEvents: import image saved, msg - ' + JSON.stringify(msg));
                           // that._addToIncrementalImportRender(msg.data.doc);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           console.log(that.id + '._respondToEvents: import completed!');
                           // console.log(that.id + '._respondToEvents: import completed, msg - ' + JSON.stringify(msg));
                           // that._finishImportImportRender(msg.data);
                         });
      }

    });

    return AllPhotosView;

  }
);
