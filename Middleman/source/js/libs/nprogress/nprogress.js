/*! NProgress (c) 2013, Rico Sta. Cruz
 *  http://ricostacruz.com/nprogress 
 *
 *  Updated to return a constructor function:
 *
 *    new NProgress(options):
 *
 *      Args:
 *        options: See nprogress settings.
 */

var instCount = 0;

;(function(factory) {

  if (typeof module === 'function') {
    module.exports = factory(this.jQuery || require('jquery'));
  } else if (typeof define === 'function' && define.amd) {
    define(['jquery'], function($) {
      return factory($);
    });
  } else {
    this.NProgress = factory(this.jQuery);
  }

})(function($) {
  function NProgress(options) {

    instCount = instCount + 1;

    this.version = '0.1.2';

    this.instCount = instCount;

    var Settings = this.settings = {
      id: 'nprogress',
      minimum: 0.08,
      easing: 'ease',
      positionUsing: '',
      speed: 200,
      trickle: true,
      trickleRate: 0.02,
      trickleSpeed: 800,
      showSpinner: true,
      template: '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner"><div class="spinner-icon"></div></div>',
      container: document.body
    };

    function _configure(options) {
      $.extend(Settings, options);
    };

    /**
     * Updates configuration.
     *
     *     nprogress.configure({
     *       minimum: 0.1
     *     });
     */
    this.configure = function(options) {
      _configure(options);
      return this;
    };

    if (options) {
      _configure(options);
    }

    /**
     * Last number.
     */

    this.status = null;

    /**
     * Sets the progress bar status, where `n` is a number from `0.0` to `1.0`.
     *
     *     nprogress.set(0.4);
     *     nprogress.set(1.0);
     */

    this.set = function(n) {
      var that = this;
      var started = this.isStarted();

      n = clamp(n, Settings.minimum, 1);
      this.status = (n === 1 ? null : n);

      var $progress = this.render(!started),
      $bar      = $progress.find('[role="bar"]'),
      speed     = Settings.speed,
      ease      = Settings.easing;

      $progress[0].offsetWidth; /* Repaint */

      $progress.queue(function(next) {
        // Set positionUsing if it hasn't already been set
        if (Settings.positionUsing === '') Settings.positionUsing = that.getPositioningCSS();

        // Add transition
        $bar.css(barPositionCSS(n, speed, ease));

        if (n === 1) {
          // Fade out
          $progress.css({ transition: 'none', opacity: 1 });
          $progress[0].offsetWidth; /* Repaint */

          setTimeout(function() {
            $progress.css({ transition: 'all '+speed+'ms linear', opacity: 0 });
            setTimeout(function() {
              that.remove();
              next();
            }, speed);
          }, speed);
        } else {
          setTimeout(next, speed);
        }
      });

      return this;
    };

    this.isStarted = function() {
      return typeof this.status === 'number';
    };

    /**
     * Shows the progress bar.
     * This is the same as setting the status to 0%, except that it doesn't go backwards.
     *
     *     nprogress.start();
     *
     */
    this.start = function() {
      var that = this;

      if (!this.status) this.set(0);

      var work = function() {
        setTimeout(function() {
          if (!that.status) return;
          that.trickle();
          work();
        }, Settings.trickleSpeed);
      };

      if (Settings.trickle) work();

      return this;
    };

    /**
     * Hides the progress bar.
     * This is the *sort of* the same as setting the status to 100%, with the
     * difference being `done()` makes some placebo effect of some realistic motion.
     *
     *     nprogress.done();
     *
     * If `true` is passed, it will show the progress bar even if its hidden.
     *
     *     nprogress.done(true);
     */

    this.done = function(force) {
      if (!force && !this.status) return this;

      return this.inc(0.3 + 0.5 * Math.random()).set(1);
    };

    /**
     * Increments by a random amount.
     */

    this.inc = function(amount) {
      var n = this.status;

      if (!n) {
        return this.start();
      } else {
        if (typeof amount !== 'number') {
          amount = (1 - n) * clamp(Math.random() * n, 0.1, 0.95);
        }

        n = clamp(n + amount, 0, 0.994);
        return this.set(n);
      }
    };

    this.trickle = function() {
      return this.inc(Math.random() * Settings.trickleRate);
    };

    /**
     * (Internal) renders the progress bar markup based on the `template`
     * setting.
     */

    this.render = function(fromStart) {
      if (this.isRendered()) return $('#' + Settings.id);
      $('html').addClass('nprogress-busy');

      var $el = $("<div id='" + Settings.id + "' class='.nprogress'>")
        .html(Settings.template);

      var perc = fromStart ? '-100' : toBarPerc(this.status || 0);

      $el.find('[role="bar"]').css({
        transition: 'all 0 linear',
        transform: 'translate3d('+perc+'%,0,0)'
      });

      if (!Settings.showSpinner)
        $el.find('[role="spinner"]').remove();
      
      $el.appendTo(Settings.container);

      return $el;
    };
    
    /**
     * Removes the element. Opposite of render().
     */
    
    this.remove = function() {
      $('html').removeClass('nprogress-busy');
      $('#' + Settings.id).remove();
    };

    /**
     * Checks if the progress bar is rendered.
     */

    this.isRendered = function() {
      return ($('#' + Settings.id).length > 0);
    };

    /**
     * Determine which positioning CSS rule to use.
     */

    this.getPositioningCSS = function() {
      // Sniff on document.body.style
      var bodyStyle = document.body.style;

      // Sniff prefixes
      var vendorPrefix = ('WebkitTransform' in bodyStyle) ? 'Webkit' :
        ('MozTransform' in bodyStyle) ? 'Moz' :
        ('msTransform' in bodyStyle) ? 'ms' :
        ('OTransform' in bodyStyle) ? 'O' : '';

      if (vendorPrefix + 'Perspective' in bodyStyle) {
        // Modern browsers with 3D support, e.g. Webkit, IE10
        return 'translate3d';
      } else if (vendorPrefix + 'Transform' in bodyStyle) {
        // Browsers without 3D support, e.g. IE9
        return 'translate';
      } else {
        // Browsers without translate() support, e.g. IE7-8
        return 'margin';
      }
    };

    /**
     * Helpers
     */

    function clamp(n, min, max) {
      if (n < min) return min;
      if (n > max) return max;
      return n;
    }

    /**
     * (Internal) converts a percentage (`0..1`) to a bar translateX
     * percentage (`-100%..0%`).
     */
    function toBarPerc(n) {
      return (-1 + n) * 100;
    }

    /**
     * (Internal) returns the correct CSS for changing the bar's
     * position given an n percentage, and speed and ease from Settings
     */
    function barPositionCSS(n, speed, ease) {
      var dp = '/js/libs/nprogress.barPositionCSS: ';

      var barCSS;

      if (Settings.positionUsing === 'translate3d') {
        barCSS = { transform: 'translate3d('+toBarPerc(n)+'%,0,0)' };
      } else if (Settings.positionUsing === 'translate') {
        barCSS = { transform: 'translate('+toBarPerc(n)+'%,0)' };
      } else {
        barCSS = { 'margin-left': toBarPerc(n)+'%' };
      }

      barCSS.transition = 'all '+speed+'ms '+ease;

      return barCSS;
    }
  }

  return NProgress;
});

