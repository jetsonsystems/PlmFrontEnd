// Filename: app/common/plm-ui.js
//
//  PLM UI common elements.
//
define(
  [
    'jquery',
    'jqueryPageSlide',
    'underscore'
  ],
  function($, PageSlide, _) {

    //
    // showFlash: Render a flash message. 
    //
    //  Note: We may want to obsolete and delete this. Its called in the code
    //  but non-functional due to the section.container selector.
    //
    var flashInprogress = false;

    showFlash = function(flashContent) {
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

    navManager = {

      onReady: function() {

        // Activate the hamburger slider
        $(".hamburger-button").pageslide({ direction: "right", modal: false });

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

    //
    // notif: manage notifications.
    //
    //  Methods:
    //
    //    start(text, options): start a notification.
    //
    //      options:
    //        rotateLogo: default is false.
    //        progressText: text representing progress.
    //
    //    update: update a notification.
    //    end: end a notification.
    //
    var notif = {

      start: function(text, options) {
        options = options || { rotateLogo: false };

        if (options.rotateLogo) {
          // Start rotating the logo
          console.log(">> Notif started, trying to rotate logo");
          $("#logo").addClass("rotate");
        }
        $("#notifications-collection").show();
        $("#notification").text(text);

        var progressText = options.progressText || "";
        $("#notification-progress").text(progressText);
      },

      update: function(text, options) {
        options = options || _.isObject(text) ? text : {};
        if (!_.isString(text)) {
          text = undefined;
        }

        if (text !== undefined) {
          $("#notification").text(text);
        }

        if (options.progressText) {
          $("#notification-progress").text(options.progressText);
        }
      },

      end: function(text, options) {
        options = options || _.isObject(text) || {};
        if (!_.isString(text)) {
          text = undefined;
        }
        console.log(">> Trying to stop logo rotation");
        $("#logo").removeClass("rotate");
        if (text !== undefined) {
          $("#notification").text(text);
        }
        if (options.progressText) {
          $("#notification-progress").text(options.progressText);
        }
        $('#notifications-collection').delay(5000).fadeOut();
      }
    };

    //
    // onReady: To be invoked when the document's onReady event is detected.
    //
    var onReady = function() {
      navManager.onReady();
    };

    return {
      showFlash: showFlash,
      notif: notif,
      onReady: onReady
    };
  }
);
