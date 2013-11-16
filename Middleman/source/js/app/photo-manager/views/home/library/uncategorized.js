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

    var util = require('util');

    //
    // UncategorizedView: The photo-manager/home/library/uncategorized view.
    //
    //  Events: All events begin with the id, ie: photo-manager/home/library/uncategorized:<event>.
    //
    //    <id>:rendered - the view was rendered.
    //
    var UncategorizedView = Backbone.View.extend({

      _debugPrefix: moduleName + '.UncategorizedView: ',

      tagName: 'div',

      id: 'photo-manager/home/library/uncategorized',

      images: undefined,

      events: {
        'click .selection-toolbar .tag': "_tagDialogHandler",
        'click .selection-toolbar .to-trash': "_toTrashHandler"
      },

      initialize: function() {
        var that = this;

        var dp = this._debugPrefix + '.initialize: ';

        !Plm.debug || console.log(dp + 'Initializing...');

        var that = this;

        _.extend(this, TagDialog.handlersFactory(function() {
          that._onTagDialogClose.apply(that, arguments);
        }));
        _.extend(this, Trash.handlersFactory('.photo-set-collection',
                                             '.photo-set-size',
                                             '.photo',
                                             function(numSuccess, numError) {
                                               var updateOpts = {
                                                 context: 'update',
                                                 triggerEvents: false
                                               };
                                               if (numError === 0) {
                                                 if (that.images && that.images.paging && that.images.paging.cursors) {
                                                   !Plm.debug || console.log(dp + 'Images removed, images size - ' + that.images.size() + ', cursors - ' + util.inspect(that.images.paging.cursors));
                                                   if (that.images.size() || (that.images.paging.cursors.next && (that.images.paging.cursors.next !== -1))) {
                                                     updateOpts.pageTo = 'at';
                                                   }
                                                   else if (that.images.paging.cursors.previous && (that.images.paging.cursors.previous !== -1)) {
                                                     updateOpts.pageTo = 'previous';
                                                   }
                                                   else {
                                                     updateOpts.pageTo = 'first';
                                                   }
                                                 }
                                               }
                                               that._update(updateOpts);
                                             }));

        this.images = new UncategorizedImagesCollection(null,
                                                        {
                                                          withPagination: true,
                                                          pageSize: 100
                                                        });

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

        this._twirlDownHandler = PhotoSet.twirlDownClickHandlerFactory(
          this,
          '.photo-set-photos-collection');

        $(window).resize(PhotoSet.onResizeHandlerFactory(this,
                                                         '.photo-set-photos-collection'));
      },

      render: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.render: ');

        !Plm.debug || console.log(dp + 'Rendering...');

        var compiledTemplate = _.template(uncategorizedTemplate);
        that.$el.append(compiledTemplate);

        that._update({ context: 'render',
                       triggerEvents: true });

        return this;
      },

      teardown: function() {
        var that = this;
            
        !Plm.debug || console.log(that._debugPrefix + '.teardown: invoking...');
      },

      //
      // _enableImagesEvents: Setup image collection events.
      //
      _enableImagesEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enableImagesEvents: ');

        !Plm.debug || console.log(dp + 'enabling images collection events...');

        this.images.on('add', function(image, images) {
          that._onImageAdded(image);          
        });
        this.images.on('remove', function(image, images) {
          that._onImageRemoved(image);
        });
        this.images.on('reset', function(images) {
          that._onImagesReset();
        });
        this.images.on('change', function(image) {
          that._onImageChanged(image);
        });
      },

      //
      // _disableImagesEvents: Disable image collection events.
      //
      _disableImagesEvents: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._disableImagesEvents: ');

        !Plm.debug || console.log(dp + 'disabling images collection events...');

        this.images.off('add');
        this.images.off('remove');
        this.images.off('reset');
        this.images.off('change');
      },

      //
      // _reRender: a combination of initialize + render to fetch
      //  perhaps a new page of images.
      //
      //  options:
      //    pageTo: first || previous || next || at.
      //   
      _reRender: function(options) {
        var that = this;
        !Plm.debug || console.log(that._debugPrefix + '._reRender: re-rendering...');

        if (options.pageTo) {
          this.$el.find('.photo-set-photos-collection').html('');
        }
        else {
          this.$el.find('.photos-collection').html('');
        }

        this._disableImagesEvents();
        if (!options.pageTo || (this.images === undefined)) {
          this.images = new UncategorizedImagesCollection(null,
                                                          {
                                                            withPagination: true,
                                                            pageSize: 100
                                                          });
        }
        this._enableImagesEvents();

        var updateOpts = _.clone(options);

        updateOpts.context = options.pageTo ? 'update' : 'render';
        updateOpts.triggerEvents = false;
        this._update(updateOpts);

        return this;
      },

      _doRender: function(imagesAvailable) {
        var that = this;

        imagesAvailable = (imagesAvailable || (imagesAvailable === false)) ? imagesAvailable : true;

        if (this.images.length === 0) {
          if (imagesAvailable) {
            Plm.showFlash('You have no uncategorized images. My you sure are organized!');
          }
        }
        else {
          var dp = this._debugPrefix.replace(': ', '._doRender: ');

          !Plm.debug || console.log(dp + 'About to render ' + this.images.length + ', images available - ' + imagesAvailable);

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
                                              numPhotos: _.has(this.images, 'paging') ? this.images.paging.total_size : undefined,
                                              images: this.images,
                                              photoTemplate: photoSetPhotoTemplate
                                            });
          that.$el.find('.photos-collection').html(compiledTemplate);

          that._imageSelectionManager.reset();
          //
          // Setup the "Twirldown handler" to open close the import. Also, call it 
          // immediately to open the view.
          //
          that.$el.find('.photo-set-collection').find('.photo-set-pip').on('click', this._twirlDownHandler);
          this._twirlDownHandler.call(this.$el.find('.photo-set-collection').find('.photo-set-pip'));
          if (imagesAvailable) {
            this._enablePaginationControls();
          }
        }
        return this;
      },

      //
      // _update: Trigger a fetch of the images collection to update the view.
      //
      //  options:
      //    context: Invokation context. Default is 'update'.
      //      context ::= 'render' || 'update' || 'render-as-update'
      //    triggerEvents: trigger :rendered or :updated events. Default: true.
      //    pageTo: first || previous || next || at
      //
      //  events: Triggers <id>:rendered or <id>:updated once the last import
      //   is fetched.
      //   
      _update: function(options) {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._update: ');

        options = options || {context: 'update', triggerEvents: true};
        options.triggerEvents = _.has(options, 'triggerEvents') ? options.triggerEvents : true;

        !Plm.debug || console.log(dp + 'Updating w/ context - ' + options.context);

        var onSuccess = function(images,
                                 response,
                                 onSuccessOptions) {
          !Plm.debug || !Plm.verbose || console.log(dp.replace(': ', '.onSuccess: ') + 'Successfully loaded ' + that.images.length + ' images...');

          if (options.context === 'render') {
            that._doRender(true);
            that._disableImagesEvents();
            that._enableImagesEvents();
          }

          if (options.triggerEvents) {
            if ((options.context === 'render') || (options.context === 'render-as-update')) {
              that.trigger(that.id + ":rendered");
            }
            else {
              that.trigger(that.id + ":updated");
            }
          }
        };
        var onError = function(images, xhr, options) {
          !Plm.debug || !Plm.verbose || console.log(that._debugPrefix + '._render.onError: error loading recent uploads.');

          if (options.triggerEvents) {
            if ((options.context === 'render') || (options.context === 'render-as-update')) {
              that.trigger(that.id + ":rendered");
            }
            else {
              that.trigger(that.id + ":updated");
            }
          }
        };

        this._disableImagesEvents();
        if ((options.context === 'update') || (options.context === 'render-as-update')) {
          this._enableImagesEvents();
        }
        this._disablePaginationControls();

        var fetchOpts = {
          success: onSuccess,
          error: onError,
          reset: options.pageTo ? true : false
        };

        if (options.pageTo === 'first') {
          this.images.fetchFirst(fetchOpts);
        }
        else if (options.pageTo === 'previous') {
          this.images.fetchPrevious(fetchOpts);
        }
        else if (options.pageTo === 'next') {
          this.images.fetchNext(fetchOpts);
        }
        else if (options.pageTo === 'at') {
          this.images.fetchAt(this.images.paging.cursors.start, fetchOpts);
        }
        else {
          this.images.fetch(fetchOpts);
        }

        return this;
      },

      _onImageAdded: function(imageModel){
        var dp = this._debugPrefix.replace(': ', '._onImageAdded: ');

        !Plm.debug || console.log(dp + 'Adding image w/ id - ' + imageModel.id);

        //
        // Also add the image to the view.
        //
        var compiledTemplate = _.template(photoSetPhotoTemplate, 
                                          {
                                            image: imageModel, 
                                            importStatus: 'imported'
                                          });
        //
        // Append the template. Note, we may want to insert in case the image was added to the
        // collection somewhere in the middle. But, at the moment, that should NOT happen.
        //
        this.$el.find('.photo-set-photos-collection').append(compiledTemplate);

        this._imageSelectionManager.reset();
        // this._onResizeHandler();
        return this;
      },

      _onImageRemoved: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageRemoved: ');

        !Plm.debug || console.log(dp + 'Removing image w/ id - ' + imageModel.id);
        var $photoSetColEl = this.$el.find('.photo-set-collection');
        this.$el.find('.photo-set-photos-collection [data-id="' + imageModel.id + '"]').remove();
        var $photoEls = $photoSetColEl.find('.photo');
        if (this.images) {
          $photoSetColEl.find('.import-count').html(_.has(images, 'paging') ? images.paging.total_size : $photoEls.length + " Photos");
        }
        else {
          $photoSetColEl.find('.import-count').html("0 Photos");
        }
        this._imageSelectionManager.reset();
        return this;
      },

      _onImagesReset: function() {
        var dp = this._debugPrefix.replace(': ', '._onImagesReset: ');

        !Plm.debug || console.log(dp + 'Reseting images...');

        this._doRender(true);
        return this;
      },

      _onImageChanged: function(imageModel) {
        var dp = this._debugPrefix.replace(': ', '._onImageChanged: ');

        !Plm.debug || console.log(dp + 'Replacing image w/ id - ' + imageMode.id);

        //
        // Replace the DOM element reresenting the image.
        //
        var compiledTemplate = _.template(photoSetPhotoTemplate, 
                                          { 
                                            image: imageModel,
                                            importStatus: 'imported'
                                          });
        !Plm.debug || console.log(dp + 'Replace DOM element for image...');
        this.$el.find('.photo-set-photos-collection [data-id="' + imageModel.id + '"]').replaceWith(compiledTemplate);

        this._imageSelectionManager.reset();
        return this;
      },

      //
      // _toPreviousPage: Go to the previoua page of imports.
      //
      _toPreviousPage: function() {
        var dp = this._debugPrefix.replace(': ', '._toPreviousPage: ');

        !Plm.debug || console.log(dp + 'Paging to previous page...');

        this._reRender({pageTo: 'previous'});

        return this;
      },

      //
      // _toNextPage: Go to the next page of imports.
      //
      _toNextPage: function() {
        var dp = this._debugPrefix.replace(': ', '._toNextPage: ');

        !Plm.debug || console.log(dp + 'Paging to next page...');

        this._reRender({pageTo: 'next'});

        return this;
      },

      //
      // _enablePaginationControls: Based upon pagination data received from the
      //  API enable previous / next arrows as appropriate, alone with click events.
      //
      _enablePaginationControls: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._enablePaginationControls: ');

        !Plm.debug || console.log(dp + 'Checking pagination cursors...');
        var images = this.images;
        var enablePrevious = (images && images.paging && images.paging.cursors && images.paging.cursors.previous && (images.paging.cursors.previous !== -1)) ? true : false;
        var enableNext = (images && images.paging && images.paging.cursors && images.paging.cursors.next && (images.paging.cursors.next !== -1)) ? true : false;

        if (enablePrevious || enableNext) {
          this.$el.find('.pagination-controls').removeClass('hidden');
        }

        if (enablePrevious) {
          var prevControl = this.$el.find('.photo-set-header .pagination-controls .previous-page');
          prevControl.on('click', function() {
            that._disablePaginationControls();            
            that._toPreviousPage();
          });
          prevControl.removeClass('disabled');
          console.log(dp + 'Previous page enabled...');
        }

        if (enableNext) {
          var nextControl = this.$el.find('.photo-set-header .pagination-controls .next-page');
          nextControl.on('click', function() {
            that._disablePaginationControls();            
            that._toNextPage();
          });
          nextControl.removeClass('disabled');
          console.log(dp + 'Next page enabled...');
        }
        return this;
      },

      //
      // _disablePaginationControls: disable them.
      //
      _disablePaginationControls: function() {
        var that = this;

        var dp = this._debugPrefix.replace(': ', '._disableImportPaginationControls: ');

        !Plm.debug || console.log(dp + 'Disabling pagination controls...');

        var prevControl = this.$el.find('.photo-set-header .pagination-controls .previous-page');
        prevControl.off('click');
        prevControl.addClass('disabled');
        var nextControl = this.$el.find('.photo-set-header .pagination-controls .next-page');
        nextControl.off('click');
        nextControl.addClass('disabled');

        return this;
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
