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
    'app/lightbox',
    'app/tag-dialog',
    'app/models/image',
    'app/collections/last-import',
    'text!/html/photo-manager/templates/home/library/last-import.html',
    'text!/html/photo-manager/templates/home/library/import.html',
    'text!/html/photo-manager/templates/home/library/import-image.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, Lightbox, TagDialog, ImageModel, LastImportCollection, lastImportTemplate, importTemplate, importImageTemplate) {

    var moduleName = '/app/photo-manager/views/home/library/last-import';
    var debugPrefix = moduleName + '.LastImportView';

    //
    // LastImportView: The photo-manager/home/library/last-import view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/last-import:<event>.
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

      subscriptions: {},

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },
    
      initialize: function() {
        !Plm.debug || console.log(debugPrefix + '.initialize: initializing...');
        var that = this;

        _.extend(this, TagDialog.handlers);

        this.status = this.STATUS_UNRENDERED;
        this.lastImport = new LastImportCollection();
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
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        var onError = function(lastImport, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._render.onError: error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.lastImport.fetch({success: onSuccess,
                               error: onError});

        // After import has been rendered, assign click events to them
        $('.import-collection').find('.import-pip').off('click').on('click', function() {
          $(this).toggleClass('open');
          var collection = $(this).parent().siblings('.import-photos-collection').toggleClass('open');
          if(collection.hasClass('open')) {
            collection.width($("#row").width());
          } else {
            collection.css('width', '100%');
          }
        });
        return this;
      },

      //
      // teardown: Cleanup after ourselves. Should be called prior to invoking <view>.remove().
      //  Will unsubscribe any registered subscriptions with the msg bus.
      //
      teardown: function() {
        var that = this;

        !Plm.debug || console.log(debugPrefix + '.teardown: invoking...');

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
            Plm.showFlash('You\'re most recent import has no images!');
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

            console.log("attemting to assign click events");
            console.log($('.import-collection'));

            setTimeout(function() {
                // After import has been rendered, assign click events to them
                $('.import-collection').find('.import-pip').on('click', function() {
                    $(this).toggleClass('open');
                    $(this).parent().siblings('.import-photos-collection').toggleClass('open');
                });
            },50);


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
          this._imageSelectionManager.reset();
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
          !Plm.debug || console.log('photo-manager/views/home/library/last-import._addToIncrementalRender: Appending compiled template - ' + compiledTemplate);
          this.$el.find('.import-photos-collection').append(compiledTemplate);
          this._imageSelectionManager.reset();
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

      //
      // _toTrashHandler: Move selected images to trash.
      //
      _toTrashHandler: function() {
        var dbgPrefix = debugPrefix + "._toTrashHandler: ";
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
      // _tagDialogHandler: Manage the tag dialog when the user clicks the Tagging icon
      //
      _tagDialogHandler_NO_LONGER_USED: function() {

        var selected = this._imageSelectionManager.selected();
        var imageIds = [];
        var imageIdsStr = "";

        _.each(selected, function(selectedItem) {
          imageIds.push(selectedItem.id);
          imageIdsStr += selectedItem.id+",";
        });
        imageIdsStr = imageIdsStr.substring(0, imageIdsStr.length - 1);

        var openTagDialog = function() {

          // Fetch the tags for the currently selected images
          $.get('/api/media-manager/v0/tags?images='+imageIdsStr, function(data) {
            if(data.tags.length > 0) {
              var ul = $(document.createElement('ul'));
              _.each(data.tags, function(tag) {
                var tagItem = $(document.createElement('li')).html(tag);
                var deleteTagButton = $(document.createElement('span')).html('x');
                ul.append(tagItem.append(deleteTagButton.on('click', function(e) {
                  var tagToDelete = tag,
                  tagDeleteData = JSON.stringify({
                    remove : {
                      images : imageIds,
                      tags: [tagToDelete]
                    }
                  });
                  
                  $.ajax({
                    type: "POST",
                    url: '/api/media-manager/v0/tagger',
                    data: tagDeleteData,
                    contentType: 'application/json',
                    success: function(data) {
                      tagItem.remove();
                    }
                  });
                })));
              });
              $("#tagDialog").find('ul').remove();
              $("#tagDialog").find('p').remove();
              $("#tagDialog").find(".tagCloud").append(ul);
            } else {
              $("#tagDialog").find(".tagCloud").html("<p>This image does not have any tags associated with it. To add a tag, use the text box above.</p>");
            }
            
          });

          $("#tagDialog").find('.confirm').on('click', function() {
            var tagToAdd = $('#tagDialog').find('.tagInput').val();
            var addTagData = JSON.stringify({
              add : {
                images : imageIds,
                tags: [tagToAdd]
              }
            });
            $.ajax({
              type: "POST",
              url: '/api/media-manager/v0/tagger',
              data: addTagData,
              contentType: 'application/json',
              success: function(data) {
                closeTagDialog();
                var msg = '';
                if (imageIds.length > 0) {
                  msg = 'Images have been tagged with "' + tagToAdd + '".';
                }
                else {
                  msg = 'Image has been tagged with "' + tagToAdd + '".';
                }
                Plm.showFlash(msg);
              },
              error: function() {
                closeTagDialog();
                var msg = '';
                if (imageIds.length > 0) {
                  msg = 'An error occurred while attempting to tag images with "' + tagToAdd + '".';
                }
                else {
                  msg = 'An error occurred while attempting to tag an image with "' + tagToAdd + '".';
                }
                Plm.showFlash(msg);
              }
            });
          });
          $("#tagDialog").find('.cancel').on('click', function() {
            closeTagDialog();
          });
          $(".tagDialogBackdrop").on('click', function() {
            closeTagDialog();
          });
          $("#tagDialog").show();
          $(".tagDialogBackdrop").show();
        };

        var closeTagDialog = function() {
          $("#tagDialog").find('.confirm').off('click');
          $("#tagDialog").find('.cancel').off('click');
          $(".tagDialogBackdrop").off('click');
          $("#tagDialog").hide();
          $(".tagDialogBackdrop").hide();
          $("#tagDialog").find('.tagInput').off('focus').off('blur').off('keydown');
        };

        // Tag input functionality
        (function(elem) {
          var placehold = "Add New Tag";
          
          elem.on('focus', function(e) {
            if(elem.val().trim() === placehold) {
              elem.val('').removeClass('placeholding');
            }
          });

          elem.on('blur', function(e) {
            if(elem.val().trim().length === 0) {
              elem.val(placehold).addClass('placeholding');
            }
          });
          
          elem.on('keydown', function(e) {
            var key = e.which,
            value = elem.val();
            
            // If the user hits the Enter or Tab key while
            // inside the tag input, add the text as a tag
            if (key === 9 || key === 13) {
              e.preventDefault();
              e.stopPropagation();
              
              var taggerData = JSON.stringify({
                add : {
                  images : imageIds,
                  tags: [value]
                }
              });
              
              // Add tags to selected images
              $.ajax({
                type: "POST",
                url: '/api/media-manager/v0/tagger',
                data: taggerData,
                contentType: 'application/json',
                success: function(data) {
                  
                  // After the tag has been added, fetch the new tag list
                  $.get('/api/media-manager/v0/tags?images='+imageIdsStr, function(data) {
                    
                    elem.val('').removeClass('placeholding');
                    var ul = $(document.createElement('ul'));
                    _.each(data.tags, function(tag) {
                      var tagItem = $(document.createElement('li')).html(tag);
                      var deleteTagButton = $(document.createElement('span')).html('x');
                      ul.append(tagItem.append(deleteTagButton.on('click', function(e) {
                        var tagToDelete = tag,
                        tagDeleteData = JSON.stringify({
                          remove : {
                            images : imageIds,
                            tags: [tagToDelete]
                          }
                        });
                        
                        $.ajax({
                          type: "POST",
                          url: '/api/media-manager/v0/tagger',
                          data: tagDeleteData,
                          contentType: 'application/json',
                          success: function(data) {
                            tagItem.remove();
                          }
                        });
                      })));
                    });
                    $("#tagDialog").find('ul').remove();
                    $("#tagDialog").find('p').remove();
                    $("#tagDialog").find(".tagCloud").append(ul);
                  });
                }
              });

              //TagsAPI.addTag(value);
            }
          });

          elem.val(placehold).addClass('placeholding');
          
        })($("#tagDialog").find('.tagInput'));

        openTagDialog();
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
        subId = MsgBus.subscribe(channel,
                                 topic,
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.image.saved';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        channel = '_notif-api:' + '/importers';
        topic = 'import.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/importers',
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

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
                                   !Plm.debug || console.log(debugPrefix + '._respondToEvents: doc change event, event - ' + msg.event);
                                   !Plm.debug || !Plm.verbose || console.log(debugPrefix + '._respondToEvents: msg.data - ' + msg.data);
                                   that.dirty = true;
                                 });
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

        //
        // Subscribe to sync.completed:
        //
        //  If the view is dirty, re-render it.
        //
        channel = '_notif-api:' + '/storage/synchronizers';
        topic = 'sync.completed';
        subId = MsgBus.subscribe('_notif-api:' + '/storage/synchronizers',
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
        that.subscriptions[subId] = {
          channel: channel,
          topic: topic
        };

      }

    });
    
    return LastImportView;

  }
);
