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
    'backbone'
  ],
  function($, _, Backbone) {
    var moduleName = 'photo-manager/image-selection-handler';
    var debugPrefix = moduleName;

    //
    // ImageSelectionManager: constructor.
    //  Args:
    //    scope: jQuery wrapped scope.
    //
    var ImageSelectionManager = function(scope) {
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

        var importerScopes = scope.find('.import-collection');
        importerScopes.each(function() {
          allSelected = _doIt($(this), $(this).find('.plm-cb[data-select-scope="importer"]'));
        });
        return _allSelected;
      };

      //
      // Watching of elements in scope.
      //
      var _watchGlobal = function() {
        var dbPrefix = debugPrefix + "._watchGlobal: ";

        var found = scope.find('.plm-cb[data-select-scope="global"]');
        console.log(dbPrefix + "Watching select all on " + found.length + " elements.");
        found.on("change", function(ev) {
          console.log(dbPrefix + "Select all change event detected.");
          if ($(ev.delegateTarget).prop('checked')) {
            console.log(dbPrefix + "Select all - checked.");
            scope.find('.plm-cb').prop('checked', true);
            _updateAllSelected();
          }
          else {
            console.log(dbPrefix + "Select all - unchecked.");
            scope.find('.plm-cb').prop('checked', false);
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchGlobal = function() {
        scope.find('.plm-cb[dafta-select-scope="global"]').off("change");
      };

      var _watchImporters = function() {
        var dbPrefix = debugPrefix + "._watchImporters: ";

        var found = scope.find('.plm-cb[data-select-scope="importer"]');
        console.log(dbPrefix + "Watching select all on " + found.length + " elements.");
        found.on("change", function(ev) {
          console.log(dbPrefix + "Importer select all change event detected.");
          var importer = $(ev.delegateTarget).parents('.import-collection');
          console.log(dbPrefix + "Importer select all foubnd - " + importer.length);
          if ($(ev.delegateTarget).prop('checked')) {
            console.log(dbPrefix + "Importer select all - checked.");
            importer.find('.plm-cb').prop('checked', true);
            _updateAllSelected();
          }
          else {
            console.log(dbPrefix + "Importer select all - unchecked.");
            importer.find('.plm-cb').prop('checked', false);
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchImporters = function() {
        scope.find('.plm-cb[dafta-select-scope="importer"]').off("change");
      };

      var _watchImages = function() {
        var found = scope.find('.photo .plm-cb').on("change", function(ev) {
          if ($(ev.delegateTarget).prop('checked')) {
            var dbPrefix = debugPrefix + "._watchImages: ";

            console.log(dbPrefix + "Image - checked.");
            _updateAllSelected();
          }
          else {
            console.log(dbPrefix + "Image - unchecked.");
            _updateAllSelected();
          }
          that.trigger('change');
        });
      };

      var _unwatchImages = function() {
        var found = scope.find('.photo .plm-cb').off("change");
      };

      this.reset = function() {
        _unwatchGlobal();
        _watchGlobal();
        _unwatchImporters();
        _watchImporters();
        _unwatchImages();
        _watchImages();
      };

      _watchGlobal();
      _watchImporters();
      _watchImages();
    };

    return ImageSelectionManager;

  }
);
