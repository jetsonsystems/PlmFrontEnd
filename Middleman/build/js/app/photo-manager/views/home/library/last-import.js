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
    'text!/html/photo-manager/templates/home/library/last-import.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageModel, LastImportCollection, lastImportTemplate, importTemplate, importImageTemplate) {

    var moduleName = 'photo-manager/views/home/library/last-import';
    var debugPrefix = moduleName + '.LastImportView';

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

      dirty: false,

      lastImport: undefined,
    
      initialize: function() {
        !Plm.debug || console.log(debugPrefix + '.initialize: initializing...');
        this.status = this.STATUS_UNRENDERED;
        this.lastImport = new LastImportCollection();
        this._respondToEvents();
      },

      render: function() {
        var that = this;
        var compiledTemplate = _.template(lastImportTemplate);
        that.$el.append(compiledTemplate);
        var onSuccess = function(lastImport,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._render.onSuccess: successfully loaded recent uploads...');
          that._doRender();
          that.status = that.STATUS_RENDERED;
          that.trigger(that.id + ":rendered");
        };
        var onError = function(lastImport, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._render.onError: error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.lastImport.fetch({success: onSuccess,
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
        this.lastImport = new LastImportCollection();
        this.render();
        this.dirty = false;
        return this;
      },

      //
      // _doRender: We have loaded the data, its safe to render.
      //
      _doRender: function() {
        // !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._doRender: Will render ' + _.size(this.lastImport) + ' images...');
        if (this.lastImport.importer === undefined) {
          !Plm.debug || console.log('photo-manager/views/home._doRender: No images have yet been imported!');
          Plm.showFlash('You have not yet imported any images!');
        }
        else {
          if (this.lastImport.length === 0) {
            Plm.showFlash('You\' most recent import has no images!');
          }
          else {
            !Plm.debug || console.log('photo-manager/views/home._doRender: Rendering import of size - ' + _.size(this.lastImport) + ', imported at - ' + this.lastImport.importer.get('completed_at'));
            this.lastImport.each(function(image) {
              !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._doRender: Have image - ' + image.get('name'));
              var variants = image.get('variants');
              !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._doRender:   have ' + variants.length + ' variants...');
              var filteredVariants = _.filter(image.get('variants'), function(variant) { return variant.name === 'thumbnail.jpg'; });
              !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home._doRender:   have ' + filteredVariants.length + ' thumbnail variants...');
            });
          }
          var compiledTemplate = _.template(importTemplate, { importer: this.lastImport.importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              _: _ });
          this.$el.find('.import-collection').replaceWith(compiledTemplate);
        }
      },

      //
      // _startIncrementalRender: Initialize the view to a new importer which will be incrementally rendered.
      //
      _startIncrementalRender: function(importer) {
        !Plm.debug || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: invoked with importer w/ id - ' + importer.id);
        !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: importer - ' + JSON.stringify(importer));
        if ((this.status === this.STATUS_UNRENDERED) || (this.status === this.STATUS_RENDERED)) {
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._startIncrementalRender: initiating incremental rendering...');
          //
          // Initialize with the new importer, but the collection will be empty.
          //
          this.lastImport = new LastImportCollection(null, {importer: importer});
          var compiledTemplate = _.template(importTemplate, { importer: this.lastImport.importer,
                                                              importImages: this.lastImport,
                                                              imageTemplate: importImageTemplate,
                                                              _: _ });
          this.$el.find('.import-collection').replaceWith(compiledTemplate);
          this.status = this.STATUS_INCREMENTALLY_RENDERING;
        }
        return this;
      },

      //
      // _addToIncrementalRender: Add an image to a view which is being incrementally rendered.
      //
      _addToIncrementalRender: function(image) {
        !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: invoked with image w/ id - ' + image.id);
        !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: image - ' + JSON.stringify(image));
        if ((this.status === this.STATUS_INCREMENTALLY_RENDERING) && !this.lastImport.get(image.id)) {
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: adding image w/ id - ' + image.id + ', to view.');
          //
          // Add to the collection.
          //
          var imageModel = new ImageModel(image);
          this.lastImport.add(imageModel);
          //
          // Update the size of the import.
          //
          this.$el.find('.import-count').text(this.lastImport.size() + " Photos");
          //
          // Also add the image to the view.
          //
          var compiledTemplate = _.template(importImageTemplate, { image: imageModel });
          this.$el.find('.import-photos-collection .clearfix').before(compiledTemplate);
        }
        else {
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: last import already contains image w/ id - ' + image.id);
        }
        return this;
      },

      //
      // _finishIncrementalRender: Incremental rendering of the view should be complete.
      //
      //  Currently, only change status to STATUS_RENDERED.
      //
      _finishIncrementalRender: function(importer) {
        !Plm.debug || console.log('photo-manager/views/home/library/last-import._finishIncrementalRender: invoked...');
        if (this.status === this.STATUS_INCREMENTALLY_RENDERING) {
          this.$el.find(".import-date").text(" Imported: " + importer.completed_at);
          this.status = this.STATUS_RENDERED;
        }
        return this;
      },

      _respondToEvents: function() {
        var that = this;
        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.started',
                         //
                         // import.started callback:
                         //  Handle 2 cases:
                         //    1. the view's status is NOT STATUS_INCREMENTALLY_RENDERING (no import is going on)
                         //    2. the view's status is STATUS_INCREMENTALLY_RENDERING (import is in progress)
                         //  In 2, the view will now become 'dirty'.
                         //
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import started...');
                           !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                           if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
                             !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: incremental render in progress; marking view as dirty...');
                             that.dirty = true;
                           }
                           else {
                             !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: About to start incremental render...');
                             that._startIncrementalRender(msg.data);
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.image.saved',
                         //
                         // import.image.saved callback:
                         //  Handle 2 cases:
                         //    1. Its an image associated with the current 'incremental render' which is in progress.
                         //    2. Its an image from some other import (weird), set the view as dirty.
                         //
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import image saved...');
                           !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                           if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                             that._addToIncrementalRender(msg.data.doc);
                           }
                           else {
                             that.dirty = true;
                           }
                         });

        MsgBus.subscribe('_notif-api:' + '/importers',
                         'import.completed',
                         //
                         // import.completed callback:
                         //  Again, 2 cases:
                         //    1. Its the end of the current 'incremental render', which is inprogress:
                         //      - finish rendering it.
                         //      - if the view is dirty, re-render it to ensure we are show the most recent.
                         //    2. Its the end of some other import.
                         //      a. we have a current 'incremental render' going on:
                         //        - mark the view as dirty.
                         //      b. we don't have an 'incremental render' going on:
                         //        - update the view with a new 'last import' to ensure its up to date.
                         //
                         function(msg) {
                           !Plm.debug || console.log('photo-manager/views/home/library/last-import._respondToEvents: import completed...');
                           !Plm.debug || !Plm.verbose || console.log('photo-manager/views/home/library/last-import._respondToEvents: msg - ' + JSON.stringify(msg));
                           if ((that.status === that.STATUS_INCREMENTALLY_RENDERING) && (that.lastImport.importer.id === msg.data.id)) {
                             that._finishIncrementalRender(msg.data);
                             !that.dirty || that._reRender();
                           }
                           else if (that.status === that.STATUS_INCREMENTALLY_RENDERING) {
                             that.dirty = true;
                           }
                           else {
                             that._reRender();
                           }
                         });

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
                           that.dirty = true;
                         });

        //
        // Subscribe to sync.completed:
        //
        //  If the view is dirty, re-render it.
        //
        MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
                         'sync.completed',
                         function(msg) {
                           !Plm.debug || console.log(debugPrefix + '._respondToEvents: sync.completed event...');
                           if (that.dirty) {
                             !Plm.debug || console.log(debugPrefix + '._respondToEvents: sync.completed, view is dirty...');
                             if (that.status !== that.STATUS_INCREMENTALLY_RENDERING) {
                               that._reRender();
                             }
                           }
                         });

      }

    });
    
    return LastImportView;

  }
);
