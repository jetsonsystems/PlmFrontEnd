# ----------------------
# SASS Options:
# Change Compass configuration
# compass_config do |config|
#   config.output_style = :compact
# end
compass_config do |config|
  config.line_comments   = true
  config.output_style    = :expanded
  # config.output_style    = :compressed
  # config.output_style    = :compact
  config.relative_assets = true
end

#
# ignores:
#
#   bootstrap.js - just here as a template when creating main.js for an app, ie:
#     /js/app/photo-manager/main.js
#
ignore '/js/app/bootstrap.js'
#
#   boilerplate.js - this is a template for an app's app.js, ie:
#     /js/app/photo-manager/app.js
#
ignore '/js/app/boilerplate.js'

# ----------------------
# Page Routing Options

# Per-page layout changes:
#
# With no layout
# page "/path/to/file.html", :layout => false
#
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
#
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy (fake) files
# page "/this-page-has-no-template.html", :proxy => "/template-file.html" do
#   @which_fake_page = "Rendering a fake page with a variable"
# end

#
# All our templates which should NOT have a layout.
#
page "/html/photo-manager/templates/*", :layout => false

# ----------------------
# Helpers

# Automatic image dimensions on image_tag helper
# activate :automatic_image_sizes

# Methods defined in the helpers block are available in templates
# helpers do
#   def some_helper
#     "Helping"
#   end
# end

# ----------------------
# Diectory Config
set :css_dir, 'css'

set :js_dir, 'js'

set :images_dir, 'imgs'

# set :build_dir, 'build'

# ----------------------
# Live Reload
activate :livereload

# ----------------------
# Production Export/Build Options
configure :build do
  # For example, change the Compass output style for deployment
  # activate :minify_css

  # Minify Javascript on build
  # activate :minify_javascript

  # Enable cache buster
  # activate :cache_buster

  # Hash asset names like Sprockets does for production
  # NOTE: I heard this might be buggy though...
  # http://middlemanapp.com/advanced/improving-cacheability/
  # activate :asset_hash

  # Make a directory for each page and create an index.html
  # For pretty URLs, sans .html
  # activate :directory_indexes

  # Use relative URLs
  # activate :relative_assets

  # Compress PNGs after build
  # First: gem install middleman-smusher
  # require "middleman-smusher"
  # activate :smusher

  # Or use a different image path
  # set :http_path, "/Content/images/"
end

# ----------------------
# Deployment Options
## Deploy via FTP
#activate :deploy do |deploy|
#  deploy.method = :ftp
#  deploy.host = "ftp.example.com"
#  deploy.user = "tvaughan"
#  deploy.password = "secret"
#  deploy.path = "/srv/www/site"
#end

# Deploy via RSync
activate :deploy do |deploy|
  deploy.method = :rsync
  deploy.user = "tvaughan"
  deploy.host = "www.example.com"
  deploy.path = "/srv/www/site"
end

# ----------------------
# HAML Options:
# set :haml, { :format => :html5, :ugly => true }
set :haml, { :format => :html5, :ugly => false, :escape_html => false }
