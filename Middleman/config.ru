require 'rubygems'
require 'middleman/rack'
require "rack/contrib/try_static"

# Try to find a static file that matches our request, since Middleman
# statically generates everything.
#use Rack::TryStatic, :root => "build", :urls => %w[/], :try => ['.html']
use Rack::TryStatic,
  :root => "build",
  :urls => ["/"],
  :try  => [".html", "index.html", "/index.html"]

run Middleman.server
