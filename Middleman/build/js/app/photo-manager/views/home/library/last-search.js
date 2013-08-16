//
// Filename: photo-manager/views/home/library/last-search.js
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
    'app/collections/search-images',
    'text!/html/photo-manager/templates/home/library/last-search.html',
    'text!/html/photo-manager/templates/home/library/photo-set.html',
    'text!/html/photo-manager/templates/home/library/photo-set-photo.html'
  ],
  function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, PhotoSet, Lightbox, TagDialog, Trash, SearchImagesCollection, searchTemplate, photoSetTemplate, photoSetPhotoTemplate) {

    var moduleName = 'photo-manager/views/home/library/last-search';

    //
    // LastSearchView: The photo-manager/home/library/last-search view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/last-search:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var LastSearchView = Backbone.View.extend({

      _debugPrefix: moduleName + '.LastSearchView',

      tagName: 'div',

      id: 'photo-manager/home/library/last-search',

      images: undefined,

      searchTerm: undefined,

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

        this.images = new SearchImagesCollection();

        if(typeof localStorage["lastsearch"] !== "undefined" ) {
          this.searchTerm = localStorage["lastsearch"];
          console.log("I JUST ASSIGNED THE SEARCH TERM.")
          console.log(this);
        }

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
        var dbgPrefix = this._debugPrefix + '.render: ';
        !Plm.debug || console.log(dbgPrefix + 'Rendering...');

        var compiledTemplate = _.template(searchTemplate, { searchTerm: this.searchTerm});
        that.$el.append(compiledTemplate);

        var onSuccess = function(images,
                                 response,
                                 options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onSuccess: Successfully loaded images in search...');
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
        this.images = new SearchImagesCollection();
        this.render();
        return this;
      },

      _doRender: function() {
        if (this.images.length === 0) {
          Plm.showFlash('Your search returned no results.');
        }
        else {
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

      _updateStatusMethodFactory: function(numTodo) {

        var that = this;
        var numSuccess = 0;
        var numError = 0;

        var updateStatus = function(status) {
          if (status === 0) {
            numSuccess = numSuccess + 1;
          }
          else {
            numError = numError + 1;
          }
          if ((numSuccess + numError) === numTodo) {
            if ((numError > 0) || (that.images.size() < 1)) {
              that._reRender();
            }
          }
        };
        return updateStatus;
      },

      //
      // _onTagDialogClose: Executed via callback when tag dialog is closed.
      //  If there were any tags removed, or any errors, then rerender the view.
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
        else {
          !Plm.debug || console.log(this._debugPrefix + '._onTagDialogClose: Tag dialog closed, nothing to do, had tags added - ' + hadTagsAdded.length + ', had tags removed - ' + hadTagsRemoved.length + ', with success - ' + withSuccess.length + ', with error - ' + withError.length + '.');
        }
      }

    });

    return LastSearchView;
  }

);
