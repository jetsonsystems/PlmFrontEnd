//
// Filename: plm.js
//

/*
 * plm: The PLM module. It provides the following functionality:
 *
 *  - Performs some initialization of the global navigation elements.
 *  - Initialize underscore templating S.T. they use mustache style
 *    interpolation. See the comments below.
 *  - Exposes some common functionality such as:
 *
 *    - showFlash: Show a flash message.
 *
 *  - Note, it is a requirejs module, so include it in dependencies of
 *    other modules.
 *
 */

define(
  [
    'jquery',
    'underscore',
    'plmCommon/plm-ui'
  ],
  function($, _, PlmUI) {
    console.log('/js/app/common/plm: Loading, typeof $ - ' + typeof($));

    var PLM = {};

    PLM.VERSION = '0.1';

    PLM.debug = true;

    //
    //  IMPORTANT: We use underscore templates w/ moustache style
    //  interpolation. See: https://github.com/janl/mustache.js#readme
    //  See the underscore note here: http://underscorejs.org/#template
    //  This allows us to interpolate in an attribute, ie:
    //    %img{ :src => {{ imageUrl }} }
    //  whereas,
    //    %img{ :src => <%= imageUrl %> }
    //  would escape the <%= and the interpolation would fail.
    //
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g,
      evaluate : /\{\%(.+?)\%\}/g
    };

    if ($('div.flash-notice').length) {
      $('div.flash-notice').hide();
    }

    //
    // showFlash: Include for backward compatability. This might not be needed anymore.
    //
    PLM.showFlash = PlmUI.showFlash;

    $(document).ready(function() {
      console.log("Document is ready!");
      PlmUI.onReady();
      console.log("Finished setting up document.");
    });

    return PLM;

  }
);
