// Filename: photo-manager/models/image
define([
  'underscore',
  'backbone',
],
      function(_, Backbone) {

        var moduleName = 'photo-manager/models/image';

        var ImageModel = Backbone.Model.extend({

          _debugPrefix: moduleName + '.ImageModel',

          urlRoot: '/api/media-manager/v0/images',

          _defaultUrl: function() {
            if (this.isNew()) {
              console.log(this._debugPrefix + '._defaultUrl:  returning collection url - ' + this.urlRoot);
              return this.urlRoot;
            }
            else {
              console.log(this._debugPrefix + '._defaultUrl:  returning  instance URL - ' + this.urlRoot + '/' + this.id);
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

          //
          // _destroyUrl: Create a destroy URL which will generate a HTTP DELETE request. Note:
          //  - The url uses localhost, as DELETE request via appjs don't seem to work.
          //
          _destroyUrl: function(attrs) {
            return 'http://localhost:9001' + this.urlRoot + '/' + this.id;
          },

          url: function() {
            return this._defaultUrl();
          },

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
          },

          destroy: function(options) {
            options = options || {};

            this.url = this._destroyUrl();

            var response = Backbone.Model.prototype.destroy.call(this, options);
            if (!response) {
              console.log('ImageModel.destroy: Model NOT destroyed, isNew - ' + this.isNew() + '!');
            }

            this.url = this._defaultUrl;

            return response;
          }

        });

        return ImageModel;
      });
