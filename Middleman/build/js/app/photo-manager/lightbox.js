//
// Filename: lightbox.js
//

/*
 * lightbox: Presents photos within a view in a lightbox.
 */


define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm'
  ],
  function($, _, Backbone, Plm, LightboxView) {
    var moduleName = '/app/photo-manager/lightbox';
    var debugPrefix = moduleName;

    //
    // Lightbox: constructor, initializes the lightbox S.T. all 
    //  Args:
    //    scope: jQuery wrapped scope, ie: the $el of the Backbone view the lightbox is instantiated in.
    //    imageSelector: Selector used to trigger rendering a lightbox with the selected image as the 
    //      initial one rendered. Delegated click events will be attached to the scope with the 
    //      imageSelector used to trigger rendering the lightbox.
    //    clickSelector: Selector which is a descendant of imageSelector which defines the clickable area.
    //    setSelector: A parent selector to iamgeSelector which would define the set of images which should
    //      be included in the lightbox.
    //    options:
    //      href: colorbox href which could be a function.
    //
    var Lightbox = function(scope, imageSelector, clickSelector, setSelector, options) {

      options = options || {};

      debugPrefix = debugPrefix + '.Lightbox';

      var that = this;

      !Plm.debug || console.log(debugPrefix + ': Initializing lightbox w/ imageSelector - ' + imageSelector + ', setSelector - ' + setSelector);

      _.extend(this, Backbone.Events);

      var images = undefined;

      //
      // Enable the color box.
      //
      that.enable = function() {
        scope.on('click', imageSelector + ' ' + clickSelector, function(event) {
          event.preventDefault();
          var dp = debugPrefix + '.click: ';

          !Plm.debug || console.log(dp + 'Opening lightbox on selected image...');

          if (images) {
            !Plm.debug || console.log(dp + 'Lightbox exists, cannot create another one you bonehead!');
            that.teardown();
          }

          if ($(event.target).parents(imageSelector + '[data-import-status="imported"]').length) {

            var imagesTmp = $(event.target).parents(setSelector).find(imageSelector + '[data-import-status="imported"] ' + clickSelector);

            if (imagesTmp.length) {

              !Plm.debug || console.log(dp + 'Creating lightbox...');

              var cbOpts = {
                rel: 'lightbox',
                slideshow: true,
                slideshowAuto: false,
                slideshowStart: "start slideshow",
                slideshowStop: "stop",
                maxWidth: "100%",
                maxHeight: "100%",
                onClosed: function() {
                  that.teardown();
                }
              };

              if (_.has(options, 'href')) {
                cbOpts.href = options.href;
              };

              images = imagesTmp.colorbox(cbOpts);
            }
            else {
              //
              // This should be IMPOSSIBLE!
              //
              !Plm.debug || console.log(dp + 'Image has data-import-status="imported", but no images found, not rendering lightbox!');
            }
          }
          else {
            !Plm.debug || console.log(dp + 'Image does NOT have data-import-status="imported", not rendering lightbox.');
            Plm.showFlash('Import not completed for clicked image, cannot render lightbox.');
          }
        });
      };

      //
      // Disable the color box.
      //
      that.disable = function() {
        scope.off('click', imageSelector + ' ' + clickSelector).on('click', function(event) {
          event.preventDefault();
        });
      };

      //
      // teardown: remove the colorbox.
      //
      that.teardown = function() {
        var dp = debugPrefix + '.teardown: ';

        if (images) {
          !Plm.debug || console.log(dp + "Removing lightbox from DOM!");
          $.colorbox.remove();
          images = undefined;
        }
        else {
          !Plm.debug || console.log(dp + "No lightbox exists...");
        }
      };

      that.enable();

    };

    return Lightbox;

  }
);
