//
// Filename: image-selection-manager.js
//

/*
 * image-selection-handler: Handles management of photo selection in views.
 */


console.log('/js/app/common/image-selection-handler: Running...');

define(
  [
    'jquery',
    'underscore',
    'backbone',
    'plmCommon/plm'
  ],
  function($, _, Backbone, Plm) {
    var moduleName = 'photo-manager/image-selection-handler';
    var debugPrefix = moduleName;

    //
    // ImageSelectionManager: constructor.
    //  Args:
    //    scope: jQuery wrapped scope.
    //
    var ImageSelectionManager = function(scope, innerScopesSelector, innerSelectScope) {
      debugPrefix = debugPrefix + ".ImageSelectionManager";

      var that = this;

      _.extend(this, Backbone.Events);

      var _allSelected = false;
      this.allSelected = function() { return _allSelected; };

      var _anySelected = false;
      this.anySelected = function() { return _anySelected; };

      var _updateAllSelected = function() {

        var _doIt = function(doScope, selectAllCheckbox) {
          var imageCheckBoxes = doScope.find('.photo .plm-cb');
          var allSel = true;
          imageCheckBoxes.each(function() {
            if (!$(this).prop('checked')) {
              allSel = false;
              if (_anySelected) {
                return false;
              }
            }
            else {
              _anySelected = true;
            }
          });
          selectAllCheckbox.prop("checked", allSel);
        }

        _anySelected = false;
        _allSelected = _doIt(scope, scope.find('.plm-cb[data-select-scope="global"]'));

        var importerScopes = scope.find(innerScopesSelector);
        importerScopes.each(function() {
          allSelected = _doIt($(this), $(this).find('.plm-cb[data-select-scope="' + innerSelectScope + '"]'));
        });
        return _allSelected;
      };

      //
      // Watching of elements in scope.
      //
      var _watchGlobal = function() {
        var dbgPrefix = debugPrefix + "._watchGlobal: ";

        var found = scope.find('.plm-cb[data-select-scope="global"]');
        !Plm.debug || console.log(dbgPrefix + "Watching select all on " + found.length + " elements.");
        found.on("change", function(ev) {
          !Plm.debug || console.log(dbgPrefix + "Select all change event detected.");
          if ($(ev.delegateTarget).prop('checked')) {
            !Plm.debug || console.log(dbgPrefix + "Select all - checked.");
            scope.find('.plm-cb').prop('checked', true);
            _updateAllSelected();
          }
          else {
            !Plm.debug || console.log(dbgPrefix + "Select all - unchecked.");
            scope.find('.plm-cb').prop('checked', false);
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchGlobal = function() {
        scope.find('.plm-cb[dafta-select-scope="global"]').off("change");
      };

      var _watchInnerScopes = function() {
        var dbgPrefix = debugPrefix + "._watchInnerScopes: ";

        !Plm.debug || console.log(dbgPrefix + "Invoking with inner select scope - " + innerSelectScope + ", inner scopes selector - " + innerScopesSelector + ".");

        var found = scope.find('.plm-cb[data-select-scope="' + innerSelectScope + '"]');
        !Plm.debug || console.log(dbgPrefix + "Watching select all on inner scope " + found.length + " elements.");
        found.on("change", function(ev) {
          !Plm.debug || console.log(dbgPrefix + "Importer select all change event detected.");
          var importer = $(ev.delegateTarget).parents(innerScopesSelector);
          !Plm.debug || console.log(dbgPrefix + "Importer select all foubnd - " + importer.length);
          if ($(ev.delegateTarget).prop('checked')) {
            !Plm.debug || console.log(dbgPrefix + "Importer select all - checked.");
            importer.find('.plm-cb').prop('checked', true);
            _updateAllSelected();
          }
          else {
            !Plm.debug || console.log(dbgPrefix + "Importer select all - unchecked.");
            importer.find('.plm-cb').prop('checked', false);
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchInnerScopes = function() {
        scope.find('.plm-cb[data-select-scope="' + innerSelectScope + '"]').off("change");
      };

      var _watchImages = function() {
        var found = scope.find('.photo .plm-cb').on("change", function(ev) {
          if ($(ev.delegateTarget).prop('checked')) {
            var dbgPrefix = debugPrefix + "._watchImages: ";

            !Plm.debug || console.log(dbgPrefix + "Image - checked.");
            _updateAllSelected();
          }
          else {
            !Plm.debug || console.log(dbgPrefix + "Image - unchecked.");
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchImages = function() {
        var found = scope.find('.photo .plm-cb').off("change");
      };

      //
      // selected: Returns of selected images.
      //
      //  Returns: array of objects with the following attributes:
      //    id: id to use when communicating with the Media Manager API.
      //    el: jquery element associate with image div.
      //
      this.selected = function() {
        var toReturn = [];
        var found = scope.find('.photo .plm-cb');
        found.each(function() {
          if ($(this).prop('checked')) {
            var photo = $(this).parents('.photo');
            if (photo) {
              toReturn.push({
                id: photo.attr("data-id"),
                $el: photo
              });
            }
          }
        });
        return toReturn;
      };

      //
      // images: Returns images.
      //  Args:
      //    options:
      //      selected: true | false, default === true
      //      unselected: true | false, default === false
      //
      //  Returns: array of objects with the following attributes:
      //    id: id to use when communicating with the Media Manager API.
      //    el: jquery element associate with image div.
      //
      this.images = function(options) {
        var options = options || { selected: true, unselected: false };
        var toReturn = [];
        var found = scope.find('.photo .plm-cb');
        found.each(function() {
          if ((options.selected && $(this).prop('checked')) || (options.unselected && !$(this).prop('checked'))) {
            var photo = $(this).parents('.photo');
            if (photo) {
              toReturn.push({
                id: photo.attr("data-id"),
                $el: photo
              });
            }
          }
        });
        return toReturn;
      };

      this.reset = function() {
        _allSelected = false;
        _anySelected = false;
        _updateAllSelected();
        _unwatchGlobal();
        _watchGlobal();
        _unwatchInnerScopes();
        _watchInnerScopes();
        _unwatchImages();
        _watchImages();
      };

      _watchGlobal();
      _watchInnerScopes();
      _watchImages();
    };

    return ImageSelectionManager;

  }
);
