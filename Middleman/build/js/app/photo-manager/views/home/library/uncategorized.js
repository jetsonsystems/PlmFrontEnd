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
    'app/photo-set',
    'app/lightbox',
    'app/tag-dialog',
    'app/trash',
    'app/collections/uncategorized-images',
    'text!/html/photo-manager/templates/home/library/uncategorized.html',
    'text!/html/photo-manager/templates/home/library/photo-set.html',
    'text!/html/photo-manager/templates/home/library/photo-set-photo.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, Trash, UncategorizedImagesCollection, uncategorizedTemplate, photoSetTemplate, photoSetPhotoTemplate) {

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

        _.extend(this, TagDialog.handlersFactory(function() {
          that._onTagDialogClose.apply(that, arguments);
        }));
        _.extend(this, Trash.handlersFactory('.photo-set-collection',
                                             '.photo-set-size',
                                             '.photo'));

        this.images = new UncategorizedImagesCollection();

        this._imageSelectionManager = new ImageSelectionManager(this.$el, '.photo-set-collection', 'photo-set-collection');
        this._imageSelectionManager.on('change', function() {
          if (that._imageSelectionManager.anySelected()) {
            $(".selection-toolbar").show();
          }
          else {
            $(".selection-toolbar").hide();
          }
        });
        this._lightbox = new Lightbox(that.$el, '.photo', '.photo-link', '.photo-set-collection');
        $(window).resize(PhotoSet.onResizeHandlerFactory(this,
                                                         '.photo-set-photos-collection'));
      },

      render: function() {
        var that = this;
        var dbgPrefix = that._debugPrefix + '.render: ';
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
            
        !Plm.debug || console.log(that._debugPrefix + '.teardown: invoking...');
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
        var that = this;
        if (this.images.length === 0) {
          Plm.showFlash('You have no uncategorized images. My you sure are organized!');
        }
        else {
          if (Plm.debug) {
            this.images.each(function(image) {
              var variants = image.get('variants');
              if (variants) {
                _.each(variants, function(variant) {
                  if (!variant.url) {
                    console.log(that._debugPrefix + '._doRender: image variant w/ id - ' + image.id + ', has variant w/ no URL, variant w/ id - ' + variant.id);
                  }
                });
                var thumbnail = _.first(_.filter(variants, function(variant) { return variant.name === 'thumbnail.jpg'; }));
                var fullSmall = _.first(_.filter(variants, function(variant) { return variant.name === 'full-small.jpg'; }));

                if (!thumbnail) {
                  console.log(that._debugPrefix + '._doRender: image has NO thumbnail variant, id - ' + image.id);
                }
                if (!fullSmall) {
                  console.log(that._debugPrefix + '._doRender: image has NO full-small variant, id - ' + image.id);
                }
              }
              else {
                console.log(that._debugPrefix + '._doRender: image has NO variants, id - ' + image.id);
              }

            });
            console.log(that._debugPrefix + '._doRender: successfully verified image URL properties of ' + this.images.length + ' images.');
          }
          
          var compiledTemplate = _.template(photoSetTemplate,
                                            {
                                              images: this.images,
                                              photoTemplate: photoSetPhotoTemplate
                                            });
          this.$el.find('.photos-collection').html(compiledTemplate);

          // After view has been rendered, assign click events to show all images
          this.$el.find('.photo-set-collection').find('.photo-set-pip').on('click', 
                                                                           PhotoSet.twirlDownClickHandlerFactory(
                                                                             this,
                                                                             '.photo-set-photos-collection'));
        }
      },

      //
      // _onTagDialogClose: Callback executed when a tag dialog is closed.
      //
      //  if there where any selected elements in hadTagsRemoved or withError then
      //    re-render the entire view.
      //  else
      //    for all selected elements in hadTagsAdded
      //      remove the element from the view.
      //
      _onTagDialogClose: function(hadTagsAdded,
                                  hadTagsRemoved,
                                  withSuccess,
                                  withError) {
        !Plm.debug || console.log(this._debugPrefix + '._onTagDialogClose: Tag dialog closed.');

        if ((withError && withError.length) || (hadTagsRemoved && hadTagsRemoved.length)) {
          //
          // Note, one could have added tags, and then removed one or more. So, if any were removed,
          // the entire view needs to be re-rendered.
          //
          this._reRender();
        }
        else if (hadTagsAdded && hadTagsAdded.length) {
          _.each(hadTagsAdded, function(selected) {
            selected.$el.remove();
          });
        }
        else {
          !Plm.debug || console.log(this._debugPrefix + '._onTagDialogClose: Tag dialog closed, nothing to do, had tags added - ' + hadTagsAdded.length + ', had tags removed - ' + hadTagsRemoved.length + ', with success - ' + withSuccess.length + ', with error - ' + withError.length + '.');
        }
      }

    });

    return UncategorizedView;
  }

);
