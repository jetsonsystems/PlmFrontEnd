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
    'app/collections/trash-images',
    'text!/html/photo-manager/templates/home/library/trash.html',
    'text!/html/photo-manager/templates/home/library/trash-photos.html',
    'text!/html/photo-manager/templates/home/library/trash-photo.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, TrashImagesCollection, trashTemplate, trashPhotosTemplate, trashPhotoTemplate) {

    var moduleName = 'photo-manager/views/home/library/trash';

    //
    // TrashView: The photo-manager/home/library/trash view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/trash:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var TrashView = Backbone.View.extend({

      _debugPrefix: moduleName + '.TrashView',

      tagName: 'div',

      id: 'photo-manager/home/library/trash',

      images: undefined,

      events: {
        'click #trash-recover-selected': "_recoverSelectedHandler",
        'click #trash-delete-selected': "_deleteSelectedHandler",
        'click #trash-empty': "_emptyHandler"
      },

      initialize: function() {
        var dbgPrefix = this._debugPrefix + '.initialize: ';
        !Plm.debug || console.log(dbgPrefix + 'Initializing...');
        var that = this;
        this.images = new TrashImagesCollection();
        this._imageSelectionManager = new ImageSelectionManager(this.$el, '.trash-photos', 'trash');
        this._imageSelectionManager.on('change', function() {
          if (that._imageSelectionManager.anySelected()) {
            $("#trash-recover-selected").removeClass('disabled');
            $("#trash-delete-selected").removeClass('disabled');
          }
          else {
            $("#trash-recover-selected").addClass('disabled');
            $("#trash-delete-selected").addClass('disabled');
          }
        });
      },

      render: function() {
        var that = this;
        var dbgPrefix = this._debugPrefix + '.render: ';
        !Plm.debug || console.log(dbgPrefix + 'Rendering...');

        var compiledTemplate = _.template(trashTemplate);
        that.$el.append(compiledTemplate);

        var onSuccess = function(images,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onSuccess: Successfully loaded images in trash...');
          that._doRender();
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        var onError = function(images, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onError: error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.images.fetch({success: onSuccess,
                           error: onError});
        return this;
      },

      _reRender: function() {
        var that = this;
        !Plm.debug || console.log(that._debugPrefix + '._reRender: re-rendering...');
        this.$el.html('');
        this.images = new TrashImagesCollection();
        this.render();
        return this;
      },

      _doRender: function() {
        if (this.images.length === 0) {
          Plm.showFlash('You\'re trash is empty!');
        }
        else {
          var compiledTemplate = _.template(trashPhotosTemplate,
                                            {
                                              images: this.images,
                                              imageTemplate: trashPhotoTemplate
                                            });
          this.$el.find('.trash-photos').replaceWith(compiledTemplate);
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
      //
      //  Returns:
      //    status:
      //      0 - success
      //      1 - error
      //
      _processImages: function(action, options) {
        var that = this;
        var dbgPrefix = this._debugPrefix + '._processImages: ';
        !Plm.debug || console.log(dbgPrefix + 'Invoked...');

        options = options || { selected: true, unselected: false };

        var status = 0;

        if ((action === 'recover') || (action === 'delete')) {
          var selected = that._imageSelectionManager.images({ selected: options.selected,
                                                              unselected: options.unselected });

          if (selected.length) {
            var updateStatus = that._updateStatusMethodFactory(selected.length);

            !Plm.debug || console.log(dbgPrefix + selected.length + ' images are selected and about to perform action - ' + action + '...');
            _.each(selected, function(selectedItem) {
              !Plm.debug || console.log(dbgPrefix + 'Attempting to locate model for selected item w/ id - ' + selectedItem.id);

              var imageModel = that.images.find(function(image) {
                return selectedItem.id === image.id;
              });
              if (imageModel) {
                !Plm.debug || console.log(dbgPrefix + 'Found model for selected item w/ id - ' + selectedItem.id);
                (function(imageModel, $el, updateStatus) {
                  if (action === 'recover') {
                    !Plm.debug || console.log(dbgPrefix + 'About to recover model for selected item w/ id - ' + selectedItem.id);
                    imageModel.save({'in_trash': false},
                                    {success: function(model, response, options) {
                                      !Plm.debug || console.log(dbgPrefix + "Success saving image, id - " + model.id);
                                      var $colEl = $el.parents('.trash-photos');
                                      $el.remove();
                                      that.images.remove(imageModel);
                                      $colEl.find('.image-count').html(that.images.size() + " Photos");
                                      that._imageSelectionManager.reset();
                                      if (!that._imageSelectionManager.anySelected()) {
                                        $("#trash-recover-selected").addClass('disabled');
                                        $("#trash-delete-selected").addClass('disabled');
                                      }
                                      updateStatus(0);
                                    },
                                     error: function(model, xhr, options) {
                                       !Plm.debug || console.log(dbgPrefix + "Error saving image, id - " + model.id);
                                       updateStatus(1);
                                       status = 1;
                                     }});
                  }
                  else {
                    !Plm.debug || console.log(dbgPrefix + 'About to destroy model for selected item w/ id - ' + selectedItem.id);
                    imageModel.destroy({
                      success: function(model, response, options) {
                        var $colEl = $el.parents('.trash-photos');
                        $el.remove();
                        that.images.remove(imageModel);
                        $colEl.find('.image-count').html(that.images.size() + "  Photos");
                        that._imageSelectionManager.reset();
                        if (!that._imageSelectionManager.anySelected()) {
                          $("#trash-recover-selected").addClass('disabled');
                          $("#trash-delete-selected").addClass('disabled');
                        }
                        updateStatus(0);
                      },
                      error: function(model, xhr, options) {
                        updateStatus(1);
                        status = 1;
                      }
                    });
                  }
                })(imageModel, selectedItem.$el, updateStatus);
              }
              else {
                !Plm.debug || console.log(dbgPrefix + 'Model for selected item w/ id - ' + selectedItem.id + ' not found.');
                updateStatus(1);
                status = 1;
              }
            });
          }
        }
        else {
          status = 1;
        }
        return status;
      },

      _recoverSelectedHandler: function() {
        var that = this;
        var dbgPrefix = this._debugPrefix + '._recoverSelectedHandler: ';
        !Plm.debug || console.log(dbgPrefix + 'Invoked...');
        if (that._processImages('recover',
                                {
                                  selected: true,
                                  unselected: false
                                }) === 0) {
          !Plm.debug || console.log(dbgPrefix + 'Successfully recovered selected images!');
        }
        else {
          !Plm.debug || console.log(dbgPrefix + 'Error recovering selected images!');
        }
      },

      _deleteSelectedHandler: function() {
        var that = this;
        var dbgPrefix = this._debugPrefix + '._deleteSelectedHandler: ';
        !Plm.debug || console.log(dbgPrefix + 'Invoked...');

        if (that._processImages('delete',
                                {
                                  selected: true,
                                  unselected: false
                                }) === 0) {
          !Plm.debug || console.log(dbgPrefix + 'Successfully deleted selected images!');
        }
        else {
          !Plm.debug || console.log(dbgPrefix + 'Error deleting selected images!');
        }
      },

      _emptyHandler: function() {
        var that = this;
        var dbgPrefix = this._debugPrefix + '._emptySelectedHandler: ';
        !Plm.debug || console.log(dbgPrefix + 'Invoked...');

        if (that._processImages('delete',
                                {
                                  selected: true,
                                  unselected: true
                                }) === 0) {
          !Plm.debug || console.log(dbgPrefix + 'Successfully emptied trash!');
        }
        else {
          !Plm.debug || console.log(dbgPrefix + 'Error emptying trash!');
        }
      }

    });

    return TrashView;

  }
);
