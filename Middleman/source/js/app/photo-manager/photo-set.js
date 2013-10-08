//
// Filename: photo-set.js
//

/*
 * photo-set: Code to be re-used for sets of photos.
 */

console.log('/js/app/photo-manager/photo-set: Running...');

define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm'
  ],
  function($, _, Backbone, Plm) {
    var moduleName = 'photo-manager/photo-set';
    var debugPrefix = moduleName;

    var photosMin = 6;

    //
    // onResizeHandlerFactory: Handler to invoke for window.resize.
    //
    var onResizeHandlerFactory = function(view,
                                          photoSetPhotosSel) {

      photoSetPhotosSel = photoSetPhotosSel || '.photo-set-photos-collection';

      var onResizeHandler = function() {
        var parentCol = view.$el.find('.photos-collection');
        var collections = view.$el.find(photoSetPhotosSel);

        collections.each(function() {
          var col = $(this);
          var photoWidth = $(col.find('.photo')[0]).outerWidth();

          if (col.hasClass('open')) {
            !Plm.debug || console.log(view._debugPrefix + ': window resize, collection inner width - ' + col.innerWidth() + ', parent coll (inner width, width, css width) - (' + parentCol.innerWidth() + ', ' + parentCol.width() + ', ' + parentCol.css("width") + '), photos min - ' + photosMin + ', photo width - ' + photoWidth);
            if (parentCol.width() > (photosMin * photoWidth)) {
              col.removeClass('photo-set-clip-overflow-cells');
              col.css('width', '100%');
            }
            else {
              col.addClass('photo-set-clip-overflow-cells');
              col.width(photosMin * photoWidth);
            }
          }
        });
      };
      return onResizeHandler;
    };

    //
    // twirlDownClickHandlerFactory: Return handlers for the twirldown to open / close.
    //
    //  Args:
    //    view: The view, ie: this or that.
    //    photoSetPhotosSel: The selector to find the container which includes all the photos.
    //
    var twirlDownClickHandlerFactory = function(view, 
                                                photoSetPhotosSel) {

      photoSetPhotosSel = photoSetPhotosSel || '.photo-set-photos-collection';

      return function() {
        $(this).toggleClass('open');
        var parentCol = view.$el.find('.photos-collection');
        var col = $(this).parent().siblings(photoSetPhotosSel).toggleClass('open');
        if (col.hasClass('open')) {
          var photoWidth = $(col.find('.photo')[0]).outerWidth();

          var photos = $(col.find('.photo'));
          var photo = $(photos[0]);
          
          !Plm.debug || console.log(view._debugPrefix + ': twirl down click open event, parrent collection width - ' + parentCol.width() + ', collection inner width - ' + col.innerWidth() + ', photos min - ' + photosMin + ', ' + photos.length + ' photos in import, photo width - (' + photo.innerWidth() + ', ' + photo.width() + ', ' + photo.outerWidth() + ').');
          
          if ((photoWidth === 0) || (parentCol.width() > (photosMin * photoWidth))) {
            col.removeClass('photo-set-clip-overflow-cells');
            col.css('width', '100%');
          }
          else {
            col.addClass('photo-set-clip-overflow-cells');
            col.width(photosMin * photoWidth);
          }
        } else {
          col.css('width', '100%');
        }
      };
    };

    return {
      photosMin: photosMin,
      onResizeHandlerFactory: onResizeHandlerFactory,
      twirlDownClickHandlerFactory: twirlDownClickHandlerFactory
    }
  }
);
