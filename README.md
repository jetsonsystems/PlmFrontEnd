# PlmFrontEnd

The PLM front-end (html/css/js). Intended to be deployed into the PlmApp, but should be runable in a stand 
alone mode with some limitations. 

## Middleman Project

The code is managed by a [Middleman project](./Middleman). All source shoud be edited in the ./Middleman/source 
directory. Once built, it should be possible to simply deploy the ./Middleman/build directory. For example, if 
deploying to the [PLM application](https://github.com/jetsonsystems/PlmApp), one could simply 
`rsync ./Middleman/build <PLM app root directory>/assets`.

## Directory Structure

This is an overview of the application's directory structure:

    |- html
    |   |
    |   |-- dashboard
    |   |
    |   |-- photo-manager
    |   |     |
    |   |     |--show.html
    |   |     |--templates
    |   |            |--home.html
    |   |
    |   |-- static-pages
    |   |
    |- js
    |   |-- libs
    |   |     |-- require
    |   |     |      |-- require.js     - require.js is used to dynamically load all JS modules
    |   |     |      |-- text.js        - require's text plugin
    |   |     |
    |   |     |-- jquery
    |   |     |      |-- jquery.min.js
    |   |     |
    |   |     |-- underscore
    |   |     |      |-- underscore.js
    |   |     |
    |   |     |-- backbone
    |   |     |      |-- backbone.js
    |   |     
    |   |-- app
    |   |     |-- bootstrap.js          - boilerplate, not built.
    |   |     |-- boilerplate.js        - more boilerplate, not built.
    |   |     |
    |   |     |-- application.js        - This right now is empty. Hopefully it stays that way.
    |   |     |      
    |   |     |-- common                - A set of supporting code shared by all applications.
    |   |     |      |-- plm.js         - Primarily initialization.
    |   |     |      |-- msg-bus.js     - A message bus based upon postal.js to allow decoupling of views.
    |   |     |      
    |   |     |-- photo-manager
    |   |     |      |-- main.js
    |   |     |      |-- app.js
    |   |     |      |-- router.js
    |   |     |      |-- models/
    |   |     |      |-- collections/
    |   |     |      |-- views/
    |   |

For example, in the context of the [PLM application](https://github.com/jetsonsystems/PlmApp), the above structure
would be found in the *./app/assets* folder.

## Notes on Styles

The styling is performed using SASS. The following are some notes with respect to techniques being used
that a developer should be aware of.

### box-sizing

The [reset styles](./Middleman/source/css/_reset.sass) coutain set *box-sizing: border-box*. For reference,
see the discussion by [Paul Irish](http://paulirish.com/2012/box-sizing-border-box-ftw/). Note, one of the 
recent comments mentioned that this technique can cause images to get scaled down, which one should be cautious
of.

## Dependencies Which Have Been Modified

### [postaljs/postal.js](https://github.com/postaljs/postal.js) 

/js/app/common/msg-bus.js uses the [postaljs/postal.js](https://github.com/postaljs/postal.js) 
publish/subscribe messaging library. The library supports 3 environments, and detects which
is currently available. Unfortunately, in AppJS we have BOTH a node.js / CommonJS environment
and an AMD environment for loading our client side JavaScript. The 0.8.2 version of the library
is in ./source/js/libs/postal/postal.js and it has been modified such that AMD takes precendence
over CommonJS. Otherwise, the postal.js module would not load via require.js. The change is
restructure the ananonymous function which performas the initialization as follows:

    (function ( root, factory ) {
      if ( typeof define === "function" && define.amd ) {
        // AMD. Register as an anonymous module.
        define( ["underscore"], function ( _ ) {
          return factory( _, root );
        } );
      }
      else if ( typeof module === "object" && module.exports ) {
        // Node, or CommonJS-Like environments
        module.exports = function ( _ ) {
          _ = _ || require( "underscore" );
          return factory( _ );
        }
      } else {
        // Browser globals
        root.postal = factory( root._, root );
      }
    }( this, function ( _, global, undefined ) {
