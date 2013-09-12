//
// Filename: cancel-import-dialog.js
//

/*
 * cancel-import-dialog: Code to be mixed in via extending a view in support of the cancel import dialog.
 */

define(
  [
    'jquery',
    'plmCommon/plm'
  ],
  function($, Plm) {
    var moduleName = 'photo-manager/cancel-import-dialog';

    //
    // handlersFactory: Return handlers for the cancel import dialog.
    //
    //  Args:
    //
    var handlersFactory = function() {

      var debugPrefix = moduleName + '.handlersFactory: ';

      //
      // _cancelImportDialogHandler: Manage the cancel import dialog. Includes AJAX call to 
      //  abort the import on confirmation.
      //
      var _cancelImportDialogHandler = function(onConfirmHandler) {

        var dp = moduleName + '._cancelImportDialogHandler: ';

        var onConfirm = function() {
          closeDialog();
          onConfirmHandler();
        };

        var openDialog = function() {
          $(".plm-dialog.pm-cancel-import").find(".confirm").on('click', onConfirm);
          $(".plm-dialog.pm-cancel-import").find(".cancel").on('click', function() {
            closeDialog();
          });
          $(".cancelImportDialogBackdrop").on('click', function() {
            closeDialog();
          });
          $(".plm-dialog.pm-cancel-import").show();
          $(".cancelImportDialogBackdrop").show();
        };

        var closeDialog = function() {
          $(".plm-dialog.pm-cancel-import").find(".confirm").off('click');
          $(".plm-dialog.pm-cancel-import").find(".cancel").off('click');
          $(".cancelImportDialogBackdrop").off('click');
          $(".plm-dialog.pm-cancel-import").hide();
          $(".cancelImportDialogBackdrop").hide();
        };
      
        openDialog();
      };

      var handlers = {
        _cancelImportDialogHandler: _cancelImportDialogHandler 
      }

      return handlers;
    };

    var cancelImportDialog = {
      handlersFactory: handlersFactory
    };

    return cancelImportDialog;

  }
);
