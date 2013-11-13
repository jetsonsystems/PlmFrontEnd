// Filename: photo-manager/collections/uncategorized-images.js
define(
  [
    'underscore',
    'backbone',
    'plmCommon/plm',
    'app/models/image'
  ],
  function(_, Backbone, Plm, ImageModel) {

    var util = require('util');

    var moduleName = 'photo-manager/collections/uncategorized-images';

    //
    // UncategorizedImagesCollection: collection of the images which have no tags.
    //
    //
    //  Constructor:
    //    Args;
    //      attr: initial images.
    //      options:
    //        withPagination: true or false, results will be paginated. Default is false.
    //        pageSize: page size to use for pagination. Can also be modified prior to
    //          calling one of the fetch* methods.
    //
    var UncategorizedImagesCollection = Backbone.Collection.extend({

      _debugPrefix: moduleName + '.UncategorizedImagesCollection: ',

      model: ImageModel,

      //
      // Pagination:
      //  pageSize: Requested page size during construction.
      //  paging: paging attribute returned via API for current page.
      //
      withPagination: false,
      pageSize: undefined,
      paging: undefined,

      //
      // initialize: Cunstructor initialization. See Constructor above.
      //
      initialize: function(attr, options) {
        !Plm.debug || console.log(this._debugPrefix.replace(': ', '.initialize: ') + 'Initializing...');

        if (options) {
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
        return '/api/media-manager/v0/images?tags=';
      },

      //
      // startPagingUrl: Url to begin pagination and get the first page.
      //
      startPagingUrl: function() {
        var dp = this._debugPrefix.replace(': ', '.startPagingUrl: ');

        if (this.withPagination) {
          var url = this.defaultUrl() + '&cursor=-1';

          if (this.pageSize) {
            url = url + '&page_size=' + this.pageSize;
          }
          return url;
        }
        else {
          throw Object.create(new Error(),
                              { 
                                name: { value: 'PaginationNotRequested' },
                                message: { value: dp + 'Method invoked outside of the context of pagination.' }
                              });
        }
      },

      atPageUrl: function(cursor) {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.atPageUrl: ');

        if (this.withPagination) {
          var url = this.defaultUrl() + '&cursor=';

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
                              { 
                                name: { value: 'PaginationNotRequested' },
                                message: { value: dp + 'invoked outside of the context of pagination.' }
                              });
        }
      },

      nextPageUrl: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.nextPageUrl: ');

        if (this.withPagination) {
          var url = this.defaultUrl() + '&cursor=';

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
                              { 
                                name: { value: 'PaginationNotRequested' },
                                message: { value: dp + 'Method invoked outside of the context of pagination.' }
                              });
        }
      },

      previousPageUrl: function() {
        var that = this;

        var dp = that._debugPrefix.replace(': ', '.previousPageUrl: ');

        if (this.withPagination) {
          var url = this.defaultUrl() + '&cursor=';

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
                              { 
                                name: { value: 'PaginationNotRequested' },
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

        !Plm.debug || console.log(dp + 'Fetching w/ options - ' + util.inspect(options));

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
        !Plm.debug || console.log(this._debugPrefix + '.parse: Parsing images response - ' + JSON.stringify(response));
        if (this.withPagination) {
          this.paging = response.paging;
        }
        return response.images;
      },

    });
    
    return UncategorizedImagesCollection;
  }
);

