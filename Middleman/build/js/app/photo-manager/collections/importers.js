// Filename: photo-manager/collections/importers
define(
  [
    'underscore',
    'backbone',
    // Grab the Image model as recent-uploads is just a collection of images.
    'app/models/importer'
  ],
  function(_, Backbone, ImporterModel) {

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
    //        To go to a page at a specific cursor value: <collection>.fetchAt(cursor, <options>)
    //        To go to the next page relative to the current page: <collection>.fetchNext(<options>)
    //        To go to the previous page relative to the current page: <collection>.fetchPrevious(<options>)
    //
    //      Other notes:
    //        * fetchNext() and fetchPrevious() will ONLY function properly if the collection
    //          is populated with a page.
    //        * invoking fetch() on a populated collection is equivalent to invoking fetchNext().
    //
    var ImportersCollection = Backbone.Collection.extend({
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
      // initialize:
      //
      //  Args:
      //    options:
      //      numToFetch: Number of importers to fetch.
      //
      initialize: function(models, options) {
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
        }
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
        throw Object.create(new Error(),
                            { name: { value: 'MethodNotImplemented' },
                              message: { value: 'photo-manager/collections/importers.atPageUrl method is not implemented.' }
                            });
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
          if (this.paging) {
            return this.nextPageUrl();
          }
          else {
            return this.startPagingUrl();
          }
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
        this.url = this.selectUrl;
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
      }

    });

    return ImportersCollection;
  }
);
