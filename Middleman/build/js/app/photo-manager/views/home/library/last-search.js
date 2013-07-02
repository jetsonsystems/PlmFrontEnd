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
        'app/collections/search-images',
        'text!/html/photo-manager/templates/home/library/last-search.html',
        'text!/html/photo-manager/templates/home/library/search-photos.html',
        'text!/html/photo-manager/templates/home/library/search-photo.html'
    ],
    function($, _, Backbone, Plm, MsgBus, ImageSelectionManager, SearchImagesCollection, searchTemplate, searchPhotosTemplate, searchPhotoTemplate) {

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

            initialize: function() {
                var dbgPrefix = this._debugPrefix + '.initialize: ';
                !Plm.debug || console.log(dbgPrefix + 'Initializing...');
                var that = this;
                this.images = new SearchImagesCollection();

                if(typeof localStorage["lastsearch"] !== "undefined" ) {
                    this.searchTerm = localStorage["lastsearch"];
                    console.log("I JUST ASSIGNED THE SEARCH TERM.")
                    console.log(this);
                }
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
                    var compiledTemplate = _.template(searchPhotosTemplate,
                        {
                            images: this.images,
                            imageTemplate: searchPhotoTemplate
                        });
                    this.$el.find('.search-photos').replaceWith(compiledTemplate);
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
            }

        });

        return LastSearchView;

    }
);