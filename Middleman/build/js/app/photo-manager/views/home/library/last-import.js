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
    'app/models/image',
    'app/collections/last-import',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageModel, LastImportCollection, importTemplate, importImageTemplate) {

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
      //
      STATUS_UNRENDERED: 0,
      STATUS_RENDERED: 1,
      STATUS_INCREMENTALLY_RENDERING: 2,
      status: undefined,
    
      initialize: function() {
        console.log(this.id + '.LastImportView.initialize: initializing...');
        this.status = this.STATUS_UNRENDERED;
        this.lastImport = new LastImportCollection();
        this._respondToEvents();
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
          console.log('photo-manager/views/home._doRender: No images have yet been imported!');
          Plm.showFlash('You have not yet imported any images!');
        }
        else {
          if (this.lastImport.length === 0) {
            Plm.showFlash('You\' most recent import has no images!');
          }
          else {
            console.log('photo-manager/views/home._doRender: Rendering import of size - ' + _.size(this.lastImport) + ', imported at - ' + this.lastImport.importer.get('completed_at'));
            this.lastImport.each(function(image) {
              console.log('photo-manager/views/home._doRender: Have image - ' + image.get('name'));
              var variants = image.get('variants');
              console.log('photo-manager/views/home._doRender:   have ' + variants.length + ' variants...');
              var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
              console.log('photo-manager/views/home._doRender:   have ' + filteredVariants.length + ' thumbnail variants...');
            });
          }
          var compiledTemplate = _.template(importTemplate, { importer: this.lastImport.importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              _: _ });
          this.$el.html(compiledTemplate);
        }
      },

      //
      // _startIncrementalRender: Initialize the view to a new importer which will be incrementally rendered.
      //
      _startIncrementalRender: function(importer) {
        console.log('photo-manager/views/home/library/last-import._startIncrementalRender: invoked with importer - ' + JSON.stringify(importer));
        if ((this.status === this.STATUS_UNRENDERED) || (this.status === this.STATUS_RENDERED)) {
          console.log('photo-manager/views/home/library/last-import._startIncrementalRender: initiating incremental rendering...');
          //
          // Initialize with the new importer, but the collection will be empty.
          //
          this.lastImport = new LastImportCollection(null, {importer: importer});
          var compiledTemplate = _.template(importTemplate, { importer: importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              _: _ });
          this.$el.html(compiledTemplate);
          this.status = this.STATUS_INCREMENTALLY_RENDERING;
        }
        return this;
      },

      //
      // _addToIncrementalRender: Add an image to a view which is being incrementally rendered.
      //
      _addToIncrementalRender: function(image) {
        console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: invoked with image - ' + JSON.stringify(image));
        if ((this.status === this.STATUS_INCREMENTALLY_RENDERING) && !this.lastImport.get(image.id)) {
          console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: adding image w/ id - ' + image.id + ', to view.');
          //
          // Add to the collection.
          //
          var imageModel = new ImageModel(image);
          this.lastImport.add(imageModel);
          //
          // Update the size of the import.
          //
          this.$el.find('.import-size').text(this.lastImport.size() + " Photos");
          //
          // Also add the image to the view.
          //
          var compiledTemplate = _.template(importImageTemplate, { image: imageModel });
          this.$el.find('.photos-collection').append(compiledTemplate);
        }
        else {
          console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: last import already contains image w/ id - ' + image.id);
        }
        return this;
      },

      //
      // _finishIncrementalRender: Incremental rendering of the view should be complete.
      //
      //  Currently, only change status to STATUS_RENDERED.
      //
      _finishIncrementalRender: function(importer) {
        console.log('photo-manager/views/home/library/last-import._finishIncrementalRender: invoked...');
        if (this.status === this.STATUS_INCREMENTALLY_RENDERING) {
          this.$el.find(".imported-timestamp").text(" Imported: " + importer.completed_at);
          this.status = this.STATUS_RENDERED;
        }
        return this;
      },

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         function(msg) {
                           console.log('photo-manager/views/home/library/last-import._respondToEvents: import started, msg - ' + JSON.stringify(msg));
                           that._startIncrementalRender(msg.data);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         function(msg) {
                           console.log('photo-manager/views/home/library/last-import._respondToEvents: import image saved, msg - ' + JSON.stringify(msg));
                           that._addToIncrementalRender(msg.data.doc);
                         });
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         function(msg) {
                           console.log('photo-manager/views/home/library/last-import._respondToEvents: import completed, msg - ' + JSON.stringify(msg));
                           that._finishIncrementalRender(msg.data);
                         });
      }

    });
    
    return LastImportView;

  }
);
