//
// Filename: tag-dialog.js
//

/*
 * tag-dialog: Code to be mixed in via extending a view in support of the tag dialog.
 */


console.log('/js/app/photo-manager/tag-dialog: Running...');

define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm'
  ],
  function($, _, Backbone, Plm) {
    var moduleName = 'photo-manager/tag-dialog';
    var debugPrefix = moduleName;

    //
    // _tagDialogHandler: Manage the tag dialog when the user clicks the Tagging icon
    //
    var _tagDialogHandler = function() {

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
                  },
                  error: function() {
                    !Plm.debug || console.log('');
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
              if (imageIds.length > 1) {
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
    };

    var tagDialog = {
      handlers: { _tagDialogHandler: _tagDialogHandler }
    };

    return tagDialog;

  }
);
