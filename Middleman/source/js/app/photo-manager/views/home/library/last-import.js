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
    'app/collections/last-import',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, LastImportCollection, importTemplate, importImageTemplate) {

    //
    // LastImportView: The photo-manager/home/library/last-import view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var LastImportView = Backbone.View.extend({

      tagName: 'div',

      id: 'photo-manager/home/library/last-import',

      //
      //  STATUS_UNRENDERED: view has not be rendered.
      //  STATUS_RENDERED: the view has been rendered.
      //  STATUS_INCREMENTALLY_RENDERING: the view is being incrementally rendered one image at a time.
      //  STATUS_OBSOLETE: the view is rendered by obsolute. For example, may have seen an importer document from another
      //    app instance via the changes feed that will require re-rendering.
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERED: 1,
      STATUS_INCREMENTALLY_RENDERING: 2,
      STATUS_OBSOLETE: 3,
      status: undefined,
    
      initialize: function() {
        console.log(this.id + '.LastImportView.initialize: initializing...');
        this.status = this.STATUS_UNRENDERED;
        this.lastImport = new LastImportCollection();
      },

      render: function() {
        var that = this;
        var onSuccess = function(lastImport,
                                 response,
                                 options) {
          console.log('photo-manager/views/home: successfully loaded recent uploads...');
          that._doRender();
          that.status = that.STATUS_RENDERED;
          that.trigger(that.id + ":rendered");
        };
        var onError = function(lastImport, xhr, options) {
          console.log('photo-manager/views/home: error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.lastImport.fetch({success: onSuccess,
                               error: onError});
        return this;
      },

      //
      // _doRender: We have loaded the data, its safe to render.
      //
      _doRender: function() {
        // console.log('photo-manager/views/home._doRender: Will render ' + _.size(this.lastImport) + ' images...');
        if (this.lastImport.importer === undefined) {
          Plm.showFlash('You have not yet imported any images!');
        }
        else if (this.lastImport.length === 0) {
          Plm.showFlash('You\' most recent import has no images!');
        }
        else {
          this.lastImport.each(function(image) {
            console.log('photo-manager/views/home._doRender: Have image - ' + image.get('name'));
            var variants = image.get('variants');
            console.log('photo-manager/views/home._doRender:   have ' + variants.length + ' variants...');
            var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
            console.log('photo-manager/views/home._doRender:   have ' + filteredVariants.length + ' thumbnail variants...');
          });
        }
        var compiledTemplate = _.template(importTemplate, { importImages: this.lastImport,
                                                            imageTemplate: importImageTemplate,
                                                            _: _ });
        this.$el.html(compiledTemplate);
      },

      //
      // _startIncrementalRender: Initialize the view to a new importer which will be incrementally rendered.
      //
      _startIncrementalRender: function(importer) {
        if ((this.status === this.STATUS_UNRENDERED) || (this.status === this.STATUS_RENDERED)) {
          //
          // Initialize with the new importer, but the collection will be empty.
          //
          this.lastImport = new LastImportCollection(null, {importer: importer});
          var compiledTemplate = _.template(homeTemplate, { lastImportImages: this.lastImport,
                                                               _: _ });
          this.$el.html(compiledTemplate);
          this.status = this.INCREMENTALLY_RENDERING;
        }
      },

      //
      // _addToIncrementalRender: Add an image to a view which is being incrementally rendered.
      //
      _addToIncrementalRender: function(image) {
        if (!this.lastImport.get(image.id)) {
          console.log('photo-manager/views/home._addToIncrementalRender: adding image w/ id - ' + image.id + ', to view.');
          //
          // Add to the collection.
          //
          var imageModel = new ImageModel(image);
          this.lastImport.add(imageModel);
          //
          // Also add the image to the view.
          //
          var compiledTemplate = _.template(lastImportImageTemplate, { image: imageModel });
          $('.photos-collection').append(compiledTemplate);
        }
      },

      //
      // _finishIncrementalRender: Incremental rendering of the view should be complete.
      //
      //  Currently, only change status to STATUS_RENDERED.
      //
      _finishIncrementalRender: function() {
        if (this.status === this.STATUS_INCREMENTALLY_RENDERING) {
          this.status = this.STATUS_RENDERED;
        }
      },

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           that._startIncrementalRender(msg.data);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           that._addToIncrementalRender(msg.data.doc);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           console.log('photo-manager/views/home/library/last-import._respondToEvents: import completed!');
                           that._finishIncrementalRender();
                         });
      }

    });
    
    return LastImportView;

  }
);
