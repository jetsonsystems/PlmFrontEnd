//
// Filename: photo-manager/views/home/library/trash.js
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
    'app/collections/trash-images',
    'text!/html/photo-manager/templates/home/library/trash.html',
    'text!/html/photo-manager/templates/home/library/trash-photos.html',
    'text!/html/photo-manager/templates/home/library/trash-photo.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, TrashImagesCollection, trashTemplate, trashPhotosTemplate, trashPhotoTemplate) {

    //
    // Sweet, we can require node's util...
    //
    // var util = require('util');

    var moduleName = 'photo-manager/views/home/library/trash';

    //
    // TrashView: The photo-manager/home/library/trash view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/trash:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var TrashView = Backbone.View.extend({

      _debugPrefix: moduleName + '.TrashView: ',

      tagName: 'div',

      id: 'photo-manager/home/library/trash',

      images: undefined,

      events: {
        'click #trash-recover-selected.enabled': "_recoverSelectedHandler",
        'click #trash-delete-selected.enabled': "_deleteSelectedHandler",
        'click #trash-empty.enabled': "_emptyHandler"
      },

      //
      // Set to true when any of "recover", "delete" or "empty" actions 
      // have been initiated but not completed.
      //
      _actionInProgress: false,

      initialize: function() {
        var dp = this._debugPrefix.replace(': ', '.initialize: ');
        !Plm.debug || console.log(dp + 'Initializing...');
        var that = this;
        this.images = new TrashImagesCollection();
        this._imageSelectionManager = new ImageSelectionManager(this.$el, '.trash-photos', 'trash');
        this._imageSelectionManager.on('change', function() {
          if (that._imageSelectionManager.anySelected()) {
            that._enableButton("#trash-recover-selected");
            that._enableButton("#trash-delete-selected");
          }
          else {
            that._disableButton("#trash-recover-selected");
            that._disableButton("#trash-delete-selected");
          }
        });
        $(window).resize(PhotoSet.onResizeHandlerFactory(this,
                                                         '.trash-photos-collection'));
      },

      render: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '.render: ');
        !Plm.debug || console.log(dp + 'Rendering...');

        var compiledTemplate = _.template(trashTemplate);
        that.$el.append(compiledTemplate);

        var onSuccess = function(images,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix.replace(': ', '._render.onSuccess: Successfully loaded images in trash...'));
          that._doRender();
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        var onError = function(images, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix.replace(': ', '._render.onError: error loading recent uploads.'));
          that.trigger(that.id + ":rendered");
        };
        !Plm.debug || console.log(dp + 'About to fetch trash images...');
        this.images.fetch({success: onSuccess,
                           error: onError});
        return this;
      },

      teardown: function() {
        var that = this;

        !Plm.debug || console.log(that._debugPrefix.replace(': ', '.teardown: invoking...'));
      },

      _reRender: function() {
        var that = this;
        !Plm.debug || console.log(that._debugPrefix.replace(': ', '._reRender: re-rendering...'));
        this.$el.html('');
        this.images = new TrashImagesCollection();
        this.render();
        return this;
      },

      _doRender: function() {
        var dp = this._debugPrefix.replace(': ', '._doRender: ');
        if (this.images.length === 0) {
          Plm.showFlash('You\'re trash is empty!');
        }
        else {
          !Plm.debug || console.log(dp + 'About to render ' + _.size(this.images) + ' images...');
          var compiledTemplate = _.template(trashPhotosTemplate,
                                            {
                                              images: this.images,
                                              imageTemplate: trashPhotoTemplate
                                            });
          this.$el.find('.trash-photos').replaceWith(compiledTemplate);
          var parentCol = $('#middle-column');
          var col = this.$el.find('.trash-photos-collection');
          var photoWidth = $(col.find('.photo')[0]).outerWidth();

          console.log(dp + 'parent col width - ' + parentCol.width() + ', photo set photos min - ' + PhotoSet.photosMin + ', photoWidth - ' + photoWidth);
          
          if (parentCol.width() > (PhotoSet.photosMin * photoWidth)) {
            col.removeClass('photo-set-clip-overflow-cells');
            col.css('width', '100%');
          }
          else {
            col.addClass('photo-set-clip-overflow-cells');
            col.width(PhotoSet.photosMin * photoWidth);
          }
        }
      },

      _updateStatusMethodFactory: function(numTodo) {

        var that = this;
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
            if ((numError > 0) || (that.images.size() < 1)) {
              that._reRender();
            }
          }
          return {
            numSuccess: numSuccess,
            numError: numError
          };
        };
        return updateStatus;
      },

      //
      // _processImages: Process, performing an <action> (see action argument).
      //
      //  Args:
      //    action: 'recover' || 'delete'
      //    options:
      //      selected: true | false, default === true
      //      unselected: true | false, default === false
      //      callback(err, { numSuccess: <int>, numError: <int> });
      //
      _processImages: function(action, options, callback) {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '._processImages: ');
        !Plm.debug || console.log(dp + 'Invoked...');

        options = options || { selected: true, unselected: false };

        if ((action === 'recover') || (action === 'delete')) {
          var selected = that._imageSelectionManager.images({ selected: options.selected,
                                                              unselected: options.unselected });

          if (selected.length) {
            var updateStatus = that._updateStatusMethodFactory(selected.length);

            !Plm.debug || console.log(dp + selected.length + ' images are selected and about to perform action - ' + action + '...');
            _.each(selected, function(selectedItem) {
              !Plm.debug || console.log(dp + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);

              var imageModel = that.images.find(function(image) {
                return selectedItem.id === image.id;
              });
              if (imageModel) {
                !Plm.debug || console.log(dp + 'Found model for selected item w/ id - ' + selectedItem.id);
                (function(imageModel, $el, updateStatus) {
                  if (action === 'recover') {
                    !Plm.debug || console.log(dp + 'About to recover model for selected item w/ id - ' + selectedItem.id);
                    imageModel.save({'in_trash': false},
                                    {success: function(model, response, options) {
                                      !Plm.debug || console.log(dp + "Success saving image, id - " + model.id);
                                      var $colEl = $el.parents('.trash-photos');
                                      $el.remove();
                                      that.images.remove(imageModel);
                                      $colEl.find('.trash-size').html(that.images.size() + " Photos");
                                      that._imageSelectionManager.reset();
                                      var stat = updateStatus(0);

                                      if ((stat.numSuccess + stat.numError) === selected.length) {
                                        var err = stat.numError ? stat.numError + " errors processing images." : null;
                                        callback(err, stat);
                                      }
                                    },
                                     error: function(model, xhr, options) {
                                       !Plm.debug || console.log(dp + "Error saving image, id - " + model.id);
                                       var stat = updateStatus(1);

                                       if ((stat.numSuccess + stat.numError) === selected.length) {
                                         var err = stat.numError ? stat.numError + " errors processing images." : null;
                                         callback(err, stat);
                                       }
                                     }});
                  }
                  else {
                    !Plm.debug || console.log(dp + 'About to destroy model for selected item w/ id - ' + selectedItem.id);
                    imageModel.destroy({
                      success: function(model, response, options) {
                        var $colEl = $el.parents('.trash-photos');
                        $el.remove();
                        that.images.remove(imageModel);
                        $colEl.find('.trash-size').html(that.images.size() + "  Photos");
                        that._imageSelectionManager.reset();
                        var stat = updateStatus(0);

                        if ((stat.numSuccess + stat.numError) === selected.length) {
                          var err = stat.numError ? stat.numError + " errors processing images." : null;
                          callback(err, stat);
                        }
                      },
                      error: function(model, xhr, options) {
                        var stat = updateStatus(1);

                        if ((stat.numSuccess + stat.numError) === selected.length) {
                          var err = stat.numError ? stat.numError + " errors processing images." : null;
                          callback(err, stat);
                        }
                      }
                    });
                  }
                })(imageModel, selectedItem.$el, updateStatus);
              }
              else {
                !Plm.debug || console.log(dp + 'Model for selected item w/ id - ' + selectedItem.id + ' not found.');
                var stat = updateStatus(1);

                if ((stat.numSuccess + stat.numError) === selected.length) {
                  var err = stat.numError ? stat.numError + " errors processing images." : null;
                  callback(err, stat);
                }
              }
            });
          }
          else {
            callback(null, {numSuccess: 0, numError: 0});
          }
        }
        else {
          callback('Invalid action - ' + action, {numSuccess: 0, numError: 0});
        }
      },

      _recoverSelectedHandler: function() {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '._recoverSelectedHandler: ');
        !Plm.debug || console.log(dp + 'Invoked, action in progress - ' + that._actionInProgress);
        //
        // Don't allow while something is in progress. 
        //
        if (that._actionInProgress) {
          !Plm.debug || console.log(dp + 'An action is in progress, aborting...');
          return;
        }

        that._preAction();

        //
        // Do the work.
        //
        that._processImages('recover',
                            {
                              selected: true,
                              unselected: false
                            },
                            function(err, status) {
                              if (err) {
                                !Plm.debug || console.log(dp + 'Error recovering selected images, error - ' + err);
                              }
                              else {
                                !Plm.debug || console.log(dp + 'Successfully recovered selected images!');
                              }
                              that._postAction();
                            })
      },

      _deleteSelectedHandler: function() {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '._deleteSelectedHandler: ');
        !Plm.debug || console.log(dp + 'Invoked, action in progress - ' + that._actionInProgress);
        //
        // Don't allow while something is in progress. 
        //
        if (that._actionInProgress) {
          !Plm.debug || console.log(dp + 'An action is in progress, aborting...');
          return;
        }

        that._preAction();

        //
        // Do the work.
        //
        that._processImages('delete',
                            {
                              selected: true,
                              unselected: false
                            },
                            function(err, status) {
                              if (err) {
                                !Plm.debug || console.log(dp + 'Error deleting selected images, error - ' + err);
                              }
                              else {
                                !Plm.debug || console.log(dp + 'Successfully deleted selected images!');
                              }
                              that._postAction();
                            });
      },

      _emptyHandler: function() {

        var that = this;
        var dp = this._debugPrefix.replace(': ', '._emptyHandler: ');
        !Plm.debug || console.log(dp + 'Invoked...');

        var openEmptyDialog = function() {
          $(".plm-dialog.pm-empty").find(".confirm").on('click', function() {
            emptyDialogConfirm();
          });
          $(".plm-dialog.pm-empty").find(".cancel").on('click', function() {
            closeEmptyDialog();
          });
          $(".emptyDialogBackdrop").on('click', function() {
            closeEmptyDialog();
          });
          $(".plm-dialog.pm-empty").show();
          $(".emptyDialogBackdrop").show();
          
        };

        var closeEmptyDialog = function() {
          $(".plm-dialog.pm-empty").find(".confirm").off('click');
          $(".plm-dialog.pm-empty").find(".cancel").off('click');
          $(".emptyDialogBackdrop").off('click');
          $(".plm-dialog.pm-empty").hide();
          $(".emptyDialogBackdrop").hide();
        };

        var emptyDialogConfirm = function() {
          //
          // Don't allow while something is in progress. 
          //
          if (that._actionInProgress) {
            !Plm.debug || console.log(dp + 'An action is in progress, aborting...');
            return;
          }

          that._preAction();

          that._processImages('delete',
                              {
                                selected: true,
                                unselected: true
                              },
                              function(err, status) {
                                if (err) {
                                  !Plm.debug || console.log(dp + 'Error emptying trash, err - ' + err);
                                }
                                else {
                                  !Plm.debug || console.log(dp + 'Successfully emptied trash!');
                                }
                                that._postAction();                                
                              });
          closeEmptyDialog();
        };

        openEmptyDialog();

      },

      _preAction: function() {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '._preAction: ');

        !Plm.debug || console.log(dp + 'Invoked...');

        that._actionInProgress = true;
        //
        // First disable all buttons.
        //
        that._disableButton('#trash-recover-selected');
        that._disableButton('#trash-delete-selected');
        that._disableButton('#trash-empty');
        that.delegateEvents();
        $('#hamburger-button').hide();
      },

      _postAction: function() {
        var that = this;
        var dp = this._debugPrefix.replace(': ', '._postAction: ');
        //
        // Re-enable buttons as needed.
        //
        if (that._imageSelectionManager.anySelected()) {
          !Plm.debug || console.log(dp + 'Have selected images, enabling recover and delete of selected...');
          that._enableButton("#trash-recover-selected");
          that._enableButton("#trash-delete-selected");
        }
        else {
          !Plm.debug || console.log(dp + 'No selected images...');
          that._disableButton("#trash-recover-selected");
          that._disableButton("#trash-delete-selected");
        }
        that._enableButton('#trash-empty');
        that.delegateEvents();
        $('#hamburger-button').show();
        that._actionInProgress = false;
      },

      _enableButton: function(selector) {
        $(selector).removeClass('disabled');
        $(selector).addClass('enabled');        
      },

      _disableButton: function(selector) {
        $(selector).removeClass('enabled');
        $(selector).addClass('disabled');
      }

    });

    return TrashView;

  }
);
