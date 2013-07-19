//
// Filename: photo-manager/views/home/library/uncategorized.js
//
define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm',
    'plmCommon/msg-bus',
    'app/image-selection-manager',
    'app/lightbox',
    'app/tag-dialog',
    'app/trash',
    'app/collections/uncategorized-images',
    'text!/html/photo-manager/templates/home/library/uncategorized.html',
    'text!/html/photo-manager/templates/home/library/photo-set.html',
    'text!/html/photo-manager/templates/home/library/photo-set-photo.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, Lightbox, TagDialog, Trash, UncategorizedImagesCollection, uncategorizedTemplate, photoSetTemplate, photoSetPhotoTemplate) {

    var moduleName = 'photo-manager/views/home/library/uncategorized';

    //
    // UncategorizedView: The photo-manager/home/library/uncategorized view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/uncategorized:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var UncategorizedView = Backbone.View.extend({

      _debugPrefix: moduleName + '.UncategorizedView',

      tagName: 'div',

      id: 'photo-manager/home/library/uncategorized',

      images: undefined,

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },

      initialize: function() {
        var dbgPrefix = this._debugPrefix + '.initialize: ';

        !Plm.debug || console.log(dbgPrefix + 'Initializing...');

        var that = this;

        _.extend(this, TagDialog.handlers);
        _.extend(this, Trash.handlers);

        this.images = new UncategorizedImagesCollection();

        this._imageSelectionManager = new ImageSelectionManager(this.$el, '.photo-set-collection', 'photo-set-photos-collection');
        this._imageSelectionManager.on('change', function() {
          if (that._imageSelectionManager.anySelected()) {
            $(".selection-toolbar").show();
          }
          else {
            $(".selection-toolbar").hide();
          }
        });
        this._lightbox = new Lightbox(that.$el, '.photo', '.photo-link', '.photo-set-collection');
      },

      render: function() {
        var that = this;
        var dbgPrefix = this._debugPrefix + '.render: ';
        !Plm.debug || console.log(dbgPrefix + 'Rendering...');

        var compiledTemplate = _.template(uncategorizedTemplate);
        that.$el.append(compiledTemplate);

        var onSuccess = function(images,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onSuccess: Successfully loaded images...');
          that._doRender();
          that._imageSelectionManager.reset();
          that.trigger(that.id + ":rendered");
        };
        var onError = function(images, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onError: error loading recent uploads.');
          that.trigger(that.id + ":rendered");
        };
        this.images.fetch({success: onSuccess,
                           error: onError});

        return this;
      },

      teardown: function() {
        var that = this;
            
        !Plm.debug || console.log(debugPrefix + '.teardown: invoking...');
      },

      _reRender: function() {
        var that = this;
        !Plm.debug || console.log(that._debugPrefix + '._reRender: re-rendering...');
        this.$el.html('');
        this.images = new UncategorizedImagesCollection();
        this.render();
        return this;
      },

      _doRender: function() {
        if (this.images.length === 0) {
          Plm.showFlash('You have no uncategorized images. My you sure are organized!');
        }
        else {
          var compiledTemplate = _.template(photoSetTemplate,
                                            {
                                              images: this.images,
                                              photoTemplate: photoSetPhotoTemplate
                                            });
          this.$el.find('.photos-collection').html(compiledTemplate);
          // After view has been rendered, assign click events to show all images
          this.$el.find('.photo-set-collection').find('.photo-set-pip').on('click', function() {
            $(this).toggleClass('open');
            var collection = $(this).parent().siblings('.photo-set-photos-collection').toggleClass('open');
            if(collection.hasClass('open')) {
              collection.width($("#row").width());
            } else {
              collection.css('width', '100%');
            }
          });
        }
      }

    });

    return UncategorizedView;
  }

);
