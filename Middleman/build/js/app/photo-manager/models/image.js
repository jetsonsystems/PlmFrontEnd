// Filename: photo-manager/models/image
define([
  'underscore',
  'backbone',
],
      function(_, Backbone) {
        var ImageModel = Backbone.Model.extend({
          urlRoot: '/api/media-manager/v0/images',

          _defaultUrl: function() {
            if (this.isNew()) {
              return this.urlRoot;
            }
            else {
              return this.urlRoot + '/' + this.id;
            }
          },

          //
          // _saveUrl: Create a save URL which will generate a HTTP PUT request. Note:
          //  - Values in attrs are passed as URL paramaters.
          //  - The url uses localhost, as PUT request via appjs don't seem to work.
          //
          _saveUrl: function(attrs) {
            var url = 'http://localhost:9001' + this.urlRoot + '/' + this.id;
            var keys = _.keys(attrs);
            if (keys.length) {
              var prefix = '?';
              _.each(keys, function(key) {
                url = url + prefix + key + '=' + attrs[key];
                prefix = '&';
              });
            }
            return url;
          },

          url: this._defaultUrl,

          save: function(key, val, options) {
            var attrs;
            if (key == null || typeof key === 'object') {
              attrs = key;
              options = val;
            } else {
              (attrs = {})[key] = val;
            }
            this.url = this._saveUrl(attrs);
            this.toJSON = function() {
              return {};
            };

            var response = Backbone.Model.prototype.save.call(this, key, val, options);
            if (!response) {
              console.log('ImageModel.save: Model NOT saved, isNew - ' + this.isNew() + '!');
            }

            this.url = this._defaultUrl;
            this.toJSON = Backbone.Model.prototype.toJSON;

            return response;
          }

        });

        return ImageModel;
      });
