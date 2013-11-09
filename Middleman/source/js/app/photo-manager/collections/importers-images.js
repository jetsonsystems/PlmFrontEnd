// Filename: photo-manager/collections/importers-images.js
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/image'
  ],
  function(_, Backbone, Plm, ImageModel) {

    var util = require('util');

    var moduleName = 'photo-manager/collections/importers-images';

    //
    // ImportersImagesCollection: collection of the images associated with the most recent import.
    //
    //  Constructor:
    //    Args:
    //      attr: initial images.
    //      options:
    //        importer - initialize with a specific instance of an importer.
    //        importerId - provide the ID of the importer.
    //
    //        withPagination: true or false, results will be paginated. Default is false.
    //        pageSize: page size to use for pagination. Can also be modified prior to
    //          calling one of the fetch* methods.
    //
    //      Note, either options.importer or options.importerId is required.
    //
    var ImportersImagesCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.ImportersImagesCollection: ',

      model: ImageModel,

      //
      // importerId: ID of importer we need to get images from.
      //
      importerId: undefined,

      //
      // Pagination:
      //  pageSize: Requested page size during construction.
      //  paging: paging attribute returned via API for current page.
      //
      withPagination: false,
      pageSize: undefined,
      paging: undefined,

      //
      // initialize: Constructor initialization. See Constructor above.
      //
      initialize: function(attr, options) {
        if (options) {
          if (_.has(options, 'importer')) {
            this.importerId = options.importer.id;
          }
          else if (options.importerId) {
            this.importerId = options.importerId;
          }
          if (_.has(options, 'withPagination') && options.withPagination) {
            this.withPagination = true;
            if (options.pageSize && _.isNumber(options.pageSize)) {
              this.pageSize = options.pageSize;
            }
          }
        }
      },

      //
      // defaultUrl: The default non-paginated request.
      //
      defaultUrl: function() {
        if (this.importerId) {
          return '/api/media-manager/v0/importers/' + this.importerId + '/images';
        }
        else {
          return undefined;
        }
      },

      //
      // startPagingUrl: Url to begin pagination and get the first page.
      //
      startPagingUrl: function() {
        var dp = this._debugPrefix.replace(': ', '.startPagingUrl: ');

        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers/' + this.importerId + '/images?cursor=-1';

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { name: { value: 'PaginationNotRequested' },
                                message: { value: dp + 'Method invoked outside of the context of pagination.' }
                              });
        }
      },

      atPageUrl: function(cursor) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.atPageUrl: ');

        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers/' + this.importerId + '/images?cursor=';

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
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.nextPageUrl: ');

        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers/' + this.importerId + '/images?cursor=';

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
                                message: { value: dp + 'Method invoked outside of the context of pagination.' }
                              });
        }
      },

      previousPageUrl: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.previousPageUrl: ');

        if (this.withPagination) {
          var url = '/api/media-manager/v0/importers/' + this.importerId + '/images?cursor=';

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
                                message: { value: dp + 'Method invoked outside of the context of pagination.' }
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

        !Plm.debug || console.log(dp + 'Fetching for importer w/ id - ' + this.importerId + ', w/ options - ' + util.inspect(options));

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

      parse: function(response) {
        if (this.withPagination) {
          this.paging = response.paging;
          return response.images;
        }
        else {
          return response.importer.images;
        }
      }
    });

    return ImportersImagesCollection;
  });
