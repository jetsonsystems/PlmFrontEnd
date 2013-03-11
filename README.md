# PlmFrontEnd

The PLM front-end (html/css/js). Intended to be deployed into the PlmApp, but should be runable in a stand 
alone mode with some limitations. 

## Middleman 

The code is managed by a [Middleman project](./Middleman). All source shoud be edited in the ./Middleman/source 
directory. Once built, it should be possible to simply deploy the ./Middleman/build directory. For example, if 
deploying to the [PLM application]:(https://github.com/jetsonsystems/PlmApp), one could simply 
`rsync ./Middleman/build <PLM app root directory>/assets`.
