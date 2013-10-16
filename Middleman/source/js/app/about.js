// Filename: about.js
//
// Simple script which grabs the version from the PLM module and updates the about page.
//

requirejs.config({
  baseUrl: '/js/libs',
  paths: {
    text: 'require/text',
    jquery: 'jquery/jquery.min',
    jqueryPageSlide: 'jquery/jquery.pageslide',
    jqueryColorbox: 'jquery/jquery.colorbox',
    jScrollPane: 'jquery/jquery.jScrollPane',
    jqueryQtip: 'jquery/jquery.qtip',
    underscore: 'underscore/underscore',
    postal: 'postal/postal',
    nprogress: 'nprogress/nprogress',
    plm: '../app',
    plmCommon: '../app/common'
  },
  //
  // Non-AMD modules like underscore.
  //
  shim: {
    underscore: {
      exports: "_"
    }
  }
});

requirejs(['jquery', 'plmCommon/plm'],
          function($, Plm) {
            $(document).ready(function() {
              !Plm.debug || console.log('/js/app/about.j: version - ' + Plm.VERSION);
              $('#version').html('Version ' + Plm.VERSION);
            });
          });
