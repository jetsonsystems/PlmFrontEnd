//
// Filename: property-manager/views/home.js
//


define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm'
  ],
  function($, _, Backbone, Plm) {

    var ws = undefined;

    var HomeView = Backbone.View.extend({

      tagName: 'div',

      id: 'property-manager/home',

      path: undefined,

      initialize: function(options) {
        !Plm.debug || console.log(this.id + '.HomeView.initialize: called...');
        options = options || {};
        options.path = options.path ? options.path : '';
        !Plm.debug || console.log(this.id + '.HomeView.initialize: path - ' + this.path);
        this._updateView(options.path, { render: false });
      },

      render: function() {
        var that = this;
        this.contentView.once(this.contentView.id + ":rendered",
                              function() {
                                that.$el.html(that.contentView.$el);
                                that.trigger(that.id + ":rendered");
                              });
        this.contentView.render();
        return this;
      },

      _updateView: function(path, options) {
        options = options || {render: false};
        options.render = _.has(options, 'render') ? options.render : false;
        if (this.path != path) {
          this.path = path;
          //
          // Handle the Library nav.
          //
          $("#hamburger .hamburger-item").removeClass("selected");
          if (this.path === 'library/last-import') {
            this.contentView = new LastImportView();
            $("#hamburger .hamburger-item.last-import").addClass("selected");
          }
          else if (this.path === 'library/all-photos') {
            this.contentView = new AllPhotosView();
            $("#hamburger .hamburger-item.all-photos").addClass("selected");
          }
          else {
            !Plm.debug || console.log("_updateView: Don't know what to do with path - " + path);
          }
        }
        else {
          !Plm.debug || console.log("_updateView: nothing to do for path - " + path);
        }
        if (options.render) {
          this.render();
        }
        return this;
      }

    });

    return HomeView;
  }
);
