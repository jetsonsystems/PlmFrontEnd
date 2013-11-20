// Filename: app/common/plm-ui.js
//
//  PLM UI common elements.
//
define(
  [
    'jquery',
    'jqueryPageSlide',
    'underscore',
    'nprogress'
  ],
  function($, PageSlide, _, NProgress) {

    //
    // showFlash: Render a flash message. 
    //
    //  Note: We may want to obsolete and delete this. Its called in the code
    //  but non-functional due to the section.container selector.
    //
    var flashInprogress = false;

    showFlash = function(flashContent) {
      $('#flash-notice-content').html(flashContent);
      if (flashInprogress === false) {
        flashInprogress = true;
        $('#flash-notice').show();
        $('#flash-notice').slideDown('slow');
        $('#flash-notice').delay(5000).slideUp('slow', function() {
          flashInprogress = false;
        });
      }
    };

    navManager = {

      onReady: function() {

        // Activate the hamburger slider
        $(".hamburger-button").pageslide({ direction: "right", modal: false });

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
    //        withProgressBar: show progress bar.
    //        withCancel: include cancel icon.
    //        cancelHandler: handler
    //
    //    update: update a notification.
    //
    //      options:
    //        progressBarPercent: progress bar percent, 0.0 - 1.0.
    //
    //    end: end a notification.
    //
    var notif = {

      withProgressBar: false,
      withCancel: false,
      cancelHandler: undefined,

      nprogress: undefined,

      init: function() {
        $("#notifications-collection").hide();
      },

      start: function(text, options) {
        options = options || { rotateLogo: false };

        this.withProgressBar = false;
        this.withCancel = false;
        this.cancelHandler = undefined;

        if (options.rotateLogo) {
          // Start rotating the logo
          $("#logo").addClass("rotate");
        }

        $("#notification-cancel-icon").hide();
        $("#notifications-collection").show();
        $("#notification").text(text);

        var progressText = options.progressText || "";
        $("#notification-progress").text(progressText);

        if (options.withProgressBar) {
          this.withProgressBar = true;
          var nprogress = this.nprogress = new NProgress({
            id: 'nprogress-notif',
            showSpinner: false,
            trickle: false,
            template: '<div class="progress-bar" role="bar"><div class="peg"></div></div><div class="progress-bar-backdrop"></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>',
            container: $('#notifications-collection')
          });
          nprogress.start();
        }
        if (options.withCancel) {
          this.withCancel = true;
          $("#notification-cancel-icon").show();
          if (options.cancelHandler) {
            this.cancelHandler = options.cancelHandler;
            $("#notification-cancel-icon").off('click').on('click', this.cancelHandler);
          }
        }
      },

      update: function(text, options) {
        options = options || (!_.isString(text) ? text : {});
        text = _.isString(text)?text:undefined;

        if (text !== undefined) {
          $("#notification").text(text);
        }

        if (options.progressText) {
          $("#notification-progress").text(options.progressText);
        }

        if (this.withProgressBar) {
          if (options.progressBarPercent) {
            if (options.progressBarPercent === 1.0) {
              $("#notification-cancel-icon").hide();
            }
            this.nprogress.set(options.progressBarPercent);
          }
          else {
            this.nprogress.inc();
          }
        }
      },

      end: function(text, options) {
        options = options || _.isObject(text) || {};
        if (!_.isString(text)) {
          text = undefined;
        }

        $("#notification-cancel-icon").hide();
        if (this.withProgressBar && this.nprogress) {
          this.nprogress.done();
        }
        this.nprogress = undefined;
        this.withProgressBar = false;

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

    var appLoadBar = undefined;

    //
    // onReady: To be invoked when the document's onReady event is detected.
    //
    var onReady = function() {
      notif.init();
      appLoadBar = new NProgress({
        id: 'nprogress-app-load',
        showSpinner: false,
        template: '<div class="app-load-bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>',
        trickle: true,
        trickleRate: 0.05,
        trickleSpeed: 100
      });
      appLoadBar.start();
      navManager.onReady();
    };

    //
    // onAppReady: When the application is ready. 
    //
    var onAppReady = function() {
      appLoadBar.done();
      appLoadBar.remove();
      appLoadBar = undefined;
      var loadingAnim = document.querySelectorAll('.appLoadAnimationBackdrop');
      for(var i = 0; i < loadingAnim.length; i++) {
        loadingAnim[i].style.display = "none";
      }
    };

    //
    // view: Each app loads into the #view container. Methods:
    //  onRender: start rendering, displays progress bar.
    //  onRendered: rendered, progress bar completes.
    //    
    var view = {

      nprogress: undefined,

      //
      // onRender:
      //  options:
      //    showProgress: show progress bar.
      //    progress: progress options.
      //
      onRender: function(options) {
        options = options || {};
        if (options.showProgress) {
          var pOpts = (options && options.progress) ? options.progress : {};

          pOpts.id = 'nprogress-view';

          pOpts.showSpinner = _.has(pOpts, 'showSpinner') ? pOpts.showSpinner : false;
          pOpts.template = _.has(pOpts, 'template') ? 
            pOpts.template : 
            '<div class="view-load-bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>';
          pOpts.trickle = _.has(pOpts, 'trickle') ? pOpts.trickle : true;
          pOpts.trickleRate = _.has(pOpts, 'trickleRate') ? pOpts.trickleRate : 0.20;
          pOpts.trickleSpeed = _.has(pOpts, 'trickleSpeed') ? pOpts.trickleSpeed : 200;

          this.nprogress = new NProgress(pOpts);
          this.nprogress.start();
        }
      },
      onRendered: function() {
        if (this.nprogress) {
          this.nprogress.done();
          this.nprogress.remove();
          this.nprogress = undefined;
        }
      }
    };

    return {
      onReady: onReady,
      onAppReady: onAppReady,
      showFlash: showFlash,
      notif: notif,
      view: view
    };
  }
);
