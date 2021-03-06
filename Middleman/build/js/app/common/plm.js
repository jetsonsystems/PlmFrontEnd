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


var fs = require('fs');
var path = require('path');
var plist = require('plist');

define(
  [
    'jquery',
    'underscore',
    'plmCommon/plm-ui'
  ],
  function($, _, PlmUI) {

    function getVersion() {
      var version = '?.?.?';
      if (_.has(process.env, 'PLM_APP_BUNDLE_DIR')) {
        if (fs.existsSync(process.env.PLM_APP_BUNDLE_DIR)) {
          var bDirStat = fs.statSync(process.env.PLM_APP_BUNDLE_DIR);
          if (bDirStat.isDirectory()) {
            var infoFile = path.join(process.env.PLM_APP_BUNDLE_DIR, 'Contents/Info.plist');
            if (fs.existsSync(infoFile)) {
              try {
                var info = plist.parseFileSync(infoFile);
                version = info.CFBundleVersion;
              }
              catch (e) {
                console.log('Error fetching version - ' + e);
              }
            }
          }
        }
      }
      return version;
    }

    var PLM = {};

    PLM.VERSION = getVersion();

    PLM.debug = false;

    PLM.verbose = false;

    //
    // localDateTimeString: Converts an ISO date string, to a local date string.
    //  Given: 2013-07-25T22:36:56.590Z
    //
    //  will produce:
    //
    //    Thursday, July 25, 2013 15:36:56
    //
    PLM.localDateTimeString = function(dateStr, includeTime) {
      includeTime = (includeTime || (includeTime === false))?includeTime:false;

      var date = new Date(dateStr);

      var d = date.toLocaleDateString();

      if (includeTime) {
        d = d + ' ' + date.toLocaleTimeString();
      }
      return d;
    };

    //
    // showFlash: Include for backward compatability. This might not be needed anymore.
    //
    PLM.showFlash = PlmUI.showFlash;

    PLM.onAppReady = function() {
      PlmUI.onAppReady();
    };

    //
    // _initialize: Various initialization which needs to occur.
    //
    var _initialize = function() {

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
    };

    $(document).ready(function() {
      console.log("Document is ready!");
      _initialize();
      PlmUI.onReady();
      console.log("Finished setting up document.");
    });

    return PLM;

  }
);
