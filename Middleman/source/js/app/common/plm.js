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
    'underscore'
  ],
  function($, _) {
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

    var flashInprogress = false;

    PLM.showFlash = function(flashContent) {
      if ($('div.flash-notice').length === 0) {
        $('section.container').before('<div class="flash-notice"/>');
        $('div.flash-notice').html('<div class="flash-notice-inner twelve columns"/>');
        $('div.flash-notice-inner').html('<div class="flash-row row"/>');
        $('div.flash-row').html('<div class="flash-content four columns centered"/>');
      }
      $('div.flash-content').html(flashContent);
      if (flashInprogress === false) {
        flashInprogress = true;
        $('div.flash-notice').slideDown('slow');
        $('div.flash-notice').delay(5000).slideUp('slow', function() {
          flashInprogress = false;
        });
      }
    };

    PLM.NavManager = {

      onReady: function() {

        //
        // Make sure the currently loaded page is set as active.
        //
        if ($('#content').hasClass('dashboard/show')) {
          console.log('PLM.NavManager.onReady: Active content - dashboard/show');
          $('#top-nav-dashboard').addClass('active');        
        }
        else if ($('#content').hasClass('photo-manager/show')) {
          console.log('PLM.NavManager.onReady: Active content - photo-manager/show');
          $('.side-nav-photos').addClass('active');
        }
        
        //
        // Setup click events.
        //
        $('.top-bar section li.top-nav-icon').click(function(el) {
          console.log('Have top bar click event!');
          PLM.NavManager.onTopBarClick(el);
        });

        $('.side-nav li').click(function(el) {
          PLM.NavManager.onSideBarClick(el);
        });

      },

      onTopBarClick: function(el) {
	      $('.top-bar li').removeClass('active');
	      $('.side-nav li').removeClass('active');
        $(el).addClass('active');
      },

      onSideBarClick: function(el) {
	      $('.top-bar li').removeClass('active');
	      $('.side-nav li').removeClass('active');
        $(el).addClass('active');
      }

    };

    $(document).ready(function() {
      console.log("Document is ready!");
      PLM.NavManager.onReady();
      console.log("Finished setting up document.");
    });

    return PLM;

  }
);


