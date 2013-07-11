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
    //
    var Lightbox = function(scope, imageSelector, clickSelector, setSelector) {
      debugPrefix = debugPrefix + '.Lightbox';

      var that = this;

      !Plm.debug || console.log(debugPrefix + ': Initializing lightbox w/ imageSelector - ' + imageSelector + ', setSelector - ' + setSelector);

      _.extend(this, Backbone.Events);

      var images = undefined;

      scope.on('click', imageSelector + ' ' + clickSelector, function(event) {
        var dp = debugPrefix + '.click: ';

        !Plm.debug || console.log(dp + 'Opening lightbox on selected image...');

        event.preventDefault();

        if (images) {
          !Plm.debug || console.log(dp + 'Lightbox exists, cannot create another one you bonehead!');
          that.teardown();
        }

        !Plm.debug || console.log(dp + 'Creating lightbox...');

        images = $(event.target).parents(setSelector).find(imageSelector + ' ' + clickSelector).colorbox({rel: 'lightbox',
                                                                                                          slideshow: true,
                                                                                                          slideshowAuto: false,
                                                                                                          slideshowStart: "start slideshow",
                                                                                                          slideshowStop: "stop",
                                                                                                          maxWidth: "100%",
                                                                                                          maxHeight: "100%",
                                                                                                          onClosed: function() {
                                                                                                            that.teardown();
                                                                                                          }
                                                                                                         });

      });

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

    };

    return Lightbox;

  }
);
