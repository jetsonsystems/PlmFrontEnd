// Filename: photo-manager/collections/importers
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/importer',
    'app/collections/importers-images'
  ],
  function(_, Backbone, Plm, ImporterModel, ImportersImagesCollection) {

    var util = require('util');

    var moduleName = 'photo-manager/collections/importers';

    //
    // ImportersCollection:
    //
    //  Constructor:
    //    Args:
    //      models: stardard.
    //      options:
    //        numToFetch: number to return. Only pertains to non-paginated results.
    //        withPagination: true or false, results will be paginated. Default is false.
    //        pageSize: page size to use for pagination. Can also be modified prior to
    //          calling one of the fetch* methods.
    //        fetchImages: triggers fetching and maintaining collections of images
    //          associated with importers. Default: false.
    //        imagesWithPagination: whether associated images should be paginated.
    //        imagesPageSize: page size to use for paginating images.
    //
    //  Either non-paged results can be obtained, or paginated results:
    //
    //    Non-paginated results: optionally supply numToFetch.
    //    Paginated results: Enable by supplying withPagination during construction.
    //      Desired page size of responses can be optionally specified via the pageSize
    //      parameter to the constructure. Its possible to change the attribute for
    //      subsequent requests. Note:
    //
    //        To start pagination, simply invoke <collection>.fetch(<options>) as normal.
    //        To get the first page (start pagination again), invoke <collection>.fetchFirst(<options>).
    //        To go to a page at a specific cursor value: <collection>.fetchAt(cursor, <options>)
    //        To go to the next page relative to the current page: <collection>.fetchNext(<options>)
    //        To go to the previous page relative to the current page: <collection>.fetchPrevious(<options>)
    //
    //      Other notes:
    //        * fetchNext() and fetchPrevious() will ONLY function properly if the collection
    //          is populated with a page.
    //        * invoking fetch() on a populated collection is equivalent to invoking fetchNext().
    //
    //  Fetching of Images: Fetching of images occurs as appropriate when enabled via the
    //    fetchImages option.
    //
    //    Whan the collection generates an 'add' event: fetch w/ reset is performed.
    //      events:
    //        importers-add on add to collection.
    //        importer-images-reset on reset of ImporterImagesCollection.
    //
    //    Whan the collection generates an 'remove' event:
    //      events:
    //        importers-remove on remove from collection.
    //
    //    When the collection generates a 'reset' event: fetch w/ reset is performed of each
    //      importer in the collection.
    //      events:
    //        importers-reset on reset of collection.
    //        importer-images-reset on each ImporterImagesCollection.
    //        
    //    When an importer generates an 'change' event: importers images are fetched.
    //      events:
    //        importer-change on change of importer.
    //        importer-images-* on image collection.
    //        importer-image-change on change in image model.
    //
    //  Events:
    //
    //    Importers collection:
    //      importers-add(importer, this):  on add to collection.
    //      importers-remove(importer, this): on remove from collection.
    //      importers-reset(this): on reset of collection.
    //
    //    Importer model:
    //      importer-change(importer): on change of importer.
    //
    //    Importer Images:
    //      importer-images-add(image, images, importer): on add to importer image collection.
    //      importer-images-remove(image, images, importer): on remove from images of importer.
    //      importer-images-reset(images, importer): on reset of importer image collection.
    //
    //    Importer Image model:
    //      importer-image-change on change of importer image model.
    //
    var ImportersCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.ImportersCollection: ',

      model: ImporterModel,

      numToFetch: undefined,

      //
      // Pagination:
      //  pageSize: Requested page size during construction.
      //  paging: paging attribute returned via API for current page.
      //
      withPagination: false,
      pageSize: undefined,
      paging: undefined,

      //
      // Pagination for images:
      //
      imagesWithPagination: false,
      imagesPageSize: undefined,

      _fetchImages: false,

      //
      // When fetchImages === true:
      //  importer.id -> ImportersImagesCollection
      //
      _imageCollections: undefined,

      //
      // initialize: Constructor initialization. See Constructor above.
      //
      initialize: function(models, options) {
        this._imageCollections = {};
        if (options) {
          if (_.has(options, 'numToFetch') && options.numToFetch) {
            if (_.has(options, 'withPagination') && options.withPagination) {
              throw Object.create(new Error(),
                                  { name: { value: 'InvalidArgsWithPagination' },
                                    message: { value: 'photo-manager/collections/importers.initialize provided non-pagination arguments yet pagination enabled.' }
                                  });
            }
            else {
              this.numToFetch = options.numToFetch;
            }
          }
          else if (_.has(options, 'withPagination') && options.withPagination) {
            this.withPagination = true;
            if (options.pageSize && _.isNumber(options.pageSize)) {
              this.pageSize = options.pageSize;
            }
          }
          if (_.has(options, 'fetchImages')) {
            this._fetchImages = options.fetchImages;
          }
          if (_.has(options, 'imagesWithPagination')) {
            this.imagesWithPagination = options.imagesWithPagination;
          }
          if (_.has(options, 'imagesPageSize')) {
            this.imagesPageSize = options.imagesPageSize;
          }
        }
        this._handleEvents();
      },

      //
      // *Url methods to construct URLs passed upon whether pagination is selected, and
      // what flavor of fetch in the context of pagination.
      //

      //
      // defaultUrl: The default non-paginated request.
      //
      defaultUrl: function() {
        var url = '/api/media-manager/v0/importers';
        if (this.numToFetch) {
          url = url + '?n=' + this.numToFetch;
        }
        return url;
      },

      //
      // startPagingUrl: Url to begin pagination and get the first page.
      //
      startPagingUrl: function() {
        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers?cursor=-1';

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { name: { value: 'PaginationNotRequested' },
                                message: { value: 'photo-manager/collections/importers.startPagingUrl invoked outside of the context of pagination.' }
                              });
        }
      },

      atPageUrl: function(cursor) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.atPageUrl: ');

        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers?cursor=';

          if (this.paging && _.has(this.paging, 'cursors') && _.has(this.paging.cursors, 'start')) {
            url = url + this.paging.cursors.start;
          }
          else {
            //
            // Don't have a current page, just go to the first one.
            //
            url = url + '-1';
          }

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { name: { value: 'PaginationNotRequested' },
                                message: { value: dp + 'invoked outside of the context of pagination.' }
                              });
        }
      },

      nextPageUrl: function() {
        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers?cursor=';

          if (this.paging && _.has(this.paging, 'cursors') && _.has(this.paging.cursors, 'start')) {
            url = url + this.paging.cursors.start + '&page_to=next';
          }
          else {
            //
            // Don't have a current page, just go to the first one.
            //
            url = url + '-1';
          }

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { name: { value: 'PaginationNotRequested' },
                                message: { value: 'photo-manager/collections/importers.nextPageUrl invoked outside of the context of pagination.' }
                              });
        }
      },

      previousPageUrl: function() {
        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers?cursor=';

          if (this.paging && _.has(this.paging, 'cursors') && _.has(this.paging.cursors, 'start')) {
            url = url + this.paging.cursors.start + '&page_to=previous';
          }
          else {
            //
            // Don't have a current page, just go to the first one.
            //
            url = url + '-1';
          }

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { name: { value: 'PaginationNotRequested' },
                                message: { value: 'photo-manager/collections/importers.previousPageUrl invoked outside of the context of pagination.' }
                              });
        }
      },

      //
      // Select a URL based upon whether we have are doing pagination or not.
      //
      selectUrl: function() {
        if (this.withPagination) {
          return this.startPagingUrl();
        }
        else {
          return this.defaultUrl();
        }
      },

      url: function() {
        return this.selectUrl();
      },

      //
      // fetch* methods:
      //
      fetch: function(options) {
        var dp = this._debugPrefix.replace(': ', '.fetch: ');

        !Plm.debug || console.log(dp + 'Fetching importers, have image collections for - ' + util.inspect(_.keys(this._imageCollections)));

        this.url = this.selectUrl;
        Backbone.Collection.prototype.fetch.call(this, options);
      },

      fetchFirst: function(options) {
        this.url = this.startPagingUrl;
        Backbone.Collection.prototype.fetch.call(this, options);
      },

      fetchAt: function(cursor, options) {
        this.url = function() {
          return this.atPageUrl(cursor);
        };
        Backbone.Collection.prototype.fetch.call(this, options);
      },

      fetchNext: function(options) {
        this.url = this.nextPageUrl;
        Backbone.Collection.prototype.fetch.call(this, options);
      },

      fetchPrevious: function(options) {
        this.url = this.previousPageUrl;
        Backbone.Collection.prototype.fetch.call(this, options);
      },

      //
      // parse: Return response.importers. If we asked to filter those
      //  without a 'started_at' attribute, filter them, and return the
      //  proper number.
      //
      parse: function(response) {
        if (this.withPagination) {
          this.paging = response.paging;
        }
        for (var i = 0; i < response.importers.length; i++) {
          response.importers[i]._index = i;
        }
        return response.importers;
      },

      comparator: function(importer) {
        return importer.get('_index');
      },

      images: function(importerId) {
        return _.has(this._imageCollections, importerId) ? this._imageCollections[importerId] : undefined;
      },

      removeImage: function(imageModel, importerId) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.removeImage: ');

        importerId = importerId || imageModel.get('importer_id');

        if (_.has(that._imageCollections, importerId)) {
          !Plm.debug || !Plm.verbose || console.log(dp + 'Removing image w/ id - ' + imageModel.id + ', from importer w/ id - ' + importerId);

          var importerImages = that._imageCollections[importerId];

          importerImages.remove(imageModel);
          if (importerImages.size() === 0) {
            that._deleteImportersImagesCollection(importerId);
            that.remove(that.get(importerId));
            !Plm.debug || !Plm.verbose || console.log(dp + 'Removed importer w/ id - ' + importerId + ' which now has no images.');
          }
          else {
            !Plm.debug || !Plm.verbose || console.log(dp + 'After image removal import still has ' + importerImages.size() + ' images.');
          }
        }
        else {
          !Plm.debug || console.log(dp + 'Image collection NOT found when removing image w/ id - ' + imageModel.id + ', from importer w/ id - ' + importerId);
        }
      },

      //
      // _handleEvents: Respond to events on the importers collection.
      //  Generate any appropriate custom events.
      //  If enabled, trigger creation / deletion and if necessary
      //  fetchings of importer images. Associated events will also
      //  be generated.
      //
      _handleEvents: function() {
        var that = this;
        //
        // Handle events on the collection of importers.
        //
        this.on('add', that._onImporterAdded, that);
        this.on('remove', that._onImporterRemoved, that);
        this.on('change', that._onImporterChanged, that);
        this.on('reset', that._onImportersReset, that);
      },

      _onImporterAdded: function(importer, importers) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._onImporterAdded: ');

        !Plm.debug || console.log(dp + 'Importer added w/ id - ' + importer.id + ', have images - ' + _.has(this._imageCollections, importer.id));

        this.trigger('importers-add', importer, this);

        if (this._fetchImages) {
          this._createImportersImagesCollection(importer);
        }
      },

      _onImporterRemoved: function(importer, importers) {
        this.trigger('importers-remove', importer, this);
      },

      _onImporterChanged: function(importer) {
        this.trigger('importer-change', importer);
      },

      _onImportersReset: function(importers) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._onImportersReset: ');

        !Plm.debug || console.log(dp + 'Importers reset...');

        this.trigger('importers-reset', this);

        _.each(_.keys(this._imageCollections), function(id) {
          that._imageCollections[id].off();
          delete that._imageCollections[id];
        });

        importers.each(function(importer) {
          if (that._fetchImages && !_.has(that._imageCollections, importer.id)) {
            that._createImportersImagesCollection(importer);
          }
        });
      },

      _createImportersImagesCollection: function(importer) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '._createImportersImagesCollection: ');

        if (!_.has(this._imageCollections, importer.id)) {
          !Plm.debug || console.log(dp + 'Preparing to fetch images collection for importer w/ id - ' + importer.id);
          var opts = {importerId: importer.id};
          if (this.imagesWithPagination) {
            opts.withPagination = true;
            if (this.imagesPageSize) {
              opts.pageSize = this.imagesPageSize;
            }
          }
          var importerImages = new ImportersImagesCollection(undefined, opts);

          this._imageCollections[importer.id] = importerImages;

          importerImages.on('add', 
                            function(imageModel, importerImages) {
                              this.trigger('importer-images-add', imageModel, importerImages, importer);
                            }, 
                            this);

          importerImages.on('remove', 
                            function(imageModel, importerImages) {
                              !Plm.debug || console.log(dp + 'on remove, image w/ id - ' + imageModel.id);
                              this.trigger('importer-images-remove', imageModel, importerImages, importer);
                            }, 
                            this);

          importerImages.on('reset', 
                            function() {
                              this.trigger('importer-images-reset', importerImages, importer);
                            }, 
                            this);

          !Plm.debug || console.log(dp + 'About to fetch images collection for importer w/ id - ' + importer.id);

          importerImages.fetch({
            reset: true
          });

          !Plm.debug || console.log(dp + 'Created images collection for importer w/ id - ' + importer.id);

          return importerImages;
        }
        else {
          !Plm.debug || console.log(dp + 'Returning existing image collection for importer w/ id - ' + importer.id + ', image collection size - ' + this._imageCollections[importer.id].size());
          return this._imageCollections[importer.id];
        }
      },

      _deleteImportersImagesCollection: function(importerId) {
        var importerImages = undefined;

        if (_.has(this._imageCollections, importerId)) {
          importerImages = this._imageCollections[importerId];

          importerImages.off();
          delete this._imageCollections[importerId];
        }
        return importerImages;
      }

    });

    return ImportersCollection;
  }
);
