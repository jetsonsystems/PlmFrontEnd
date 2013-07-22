//
// Filename: trash.js
//

/*
 * trash: Code to be mixed in via extending a view to support operations related to 
 *  sending images to trash.
 *
 *  In the views initialization:
 *
 *    initialize: function() {
 *      .
 *      .
 *      .
 *      _.extend(this, Trash.handlers);
 *
 *  As as result, the following private methods will be available to the view:
 *
 *    _toTrashHandler: Should be bound to the click event which would send an image into trash.
 *      Note, it is assumed the view has the following members:
 *        _imageSelectionManager: Instance of image-selection-manager which gives access to
 *          selected images.
 *        _reRender: Method which is responsible for updating the view after selected
 *          images have been moved to trash.
 *      We may want to instead provide a toTrashHandlerFactory method which generates the
 *      the method. The factory method could be passed paramaters such as DOM selectors,
 *      a rerender method to invoke, etc....
 *
 */


define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/image',
  ],
  function($, _, Backbone, Plm, ImageModel) {
    var moduleName = 'photo-manager/trash';
    var debugPrefix = moduleName;

    //
    // handlersFactory: Return handlers.
    //
    //  Args:
    //    photoSetColSelector: Collection for a set of photos, ie: .photo-set-collection or .import-collection.
    //    photoSetSizeSelector: Selector to element with text containing the number of images in the set.
    //    photoSelector: Selector to element containing links to photo, caption, etc....
    //
    //  Current handlers returned:
    //
    //  _trashDialogHandler: Open/close dialog, make ajax call to change trash state,
    //    remove image from current view, and adjust collections count.
    //
    var handlersFactory = function(photoSetColSelector, photoSetSizeSelector, photoSelector) {
      //
      // _trashDialogHandler: Manage the trash dialog.
      //
      var _toTrashHandler = function() {
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
                                var $importColEl = $el.parents(photoSetColSelector);
                                $el.remove();
                                var $photoEls = $importColEl.find(photoSelector);
                                if ($photoEls.length > 0) {
                                  $importColEl.find(photoSetSizeSelector).html($photoEls.length + " Photos");
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
      };

      var handlers = { _toTrashHandler: _toTrashHandler };

      return handlers;

    };

    var trash = {
      handlersFactory: handlersFactory
    };

    return trash;

  }
);
