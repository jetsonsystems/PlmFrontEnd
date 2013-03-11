# PlmFrontEnd

The PLM front-end (html/css/js). Intended to be deployed into the PlmApp, but should be runable in a stand 
alone mode with some limitations. 

## Middleman Project

The code is managed by a [Middleman project](./Middleman). All source shoud be edited in the ./Middleman/source 
directory. Once built, it should be possible to simply deploy the ./Middleman/build directory. For example, if 
deploying to the [PLM application]:(https://github.com/jetsonsystems/PlmApp), one could simply 
`rsync ./Middleman/build <PLM app root directory>/assets`.

## Directory Structure

This is an overview of the structure the applications directory structure:

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
