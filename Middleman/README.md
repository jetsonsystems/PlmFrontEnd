# Front-End Middleman Project

## Overview

We are using [Middleman](http://middlemanapp.com/) to compile/package/deploy the applications /assets directory.
[Middleman](http://middlemanapp.com/) takes all source assets in the ./source folder, and compiles them into
the ./build folder.

## Getting Set Up

## Notes on the Source Directory Structure

  * ./source/html:

## Notes on config.rb

## Build and Deploy Workflow

## Useful Command Line Examples

  * Buidling everything:

    `bundle exec middleman build --verbose`

  * Building a single view:

    `bundle exec middleman build --verbose -g *html/photo-manager/show.html`

  * Likewise to build a template:

    `bundle exec middleman build --verbose -g *html/photo-manager/templates/home/library/import.html`

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

