$(document).ready(function(){

  //--------------------------------------
  // Toggle Living Room
  $.get('http://core2.jetsonsys.com:10080/rpc/boca_lutron/get_state?_args=[01:08:01:27]', function(data) {
    // JSON response will be something like: {"result": {"level": 100}}

    // Light is currently on
    if (data.result.level > 0) {
      // console.log('Light on');

      // Show the current state
      $('#living-room-lightbulb').attr('src', '/images/Bulb-Yellow.png');
      $('#living-room-lightbulb').attr('data', 'on');

      $("#living-room").toggle(function(){
        $('#living-room-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#living-room-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[01:08:01:27]");
      }, function() {
        $('#living-room-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#living-room-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[01:08:01:27]");
      });
    }
    else {
      // Light is currently off
      // console.log('Light off');
      $('#living-room-lightbulb').attr('src', '/images/Bulb-Gray.png');
      $('#living-room-lightbulb').attr('data', 'off');

      $("#living-room").toggle(function(){
        $('#living-room-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#living-room-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[01:08:01:27]");
      }, function() {
        $('#living-room-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#living-room-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[01:08:01:27]");
      });
    }
  });

  //--------------------------------------
  // Toggle Kitchen
  $.get('http://core2.jetsonsys.com:10080/rpc/boca_lutron/get_state?_args=[01:08:01:25]', function(data) {
    // JSON response will be something like: {"result": {"level": 100}}

    // Light is currently on
    if (data.result.level > 0) {
      // console.log('Light on');

      // Show the current state
      $('#kitchen-lightbulb').attr('src', '/images/Bulb-Yellow.png');
      $('#kitchen-lightbulb').attr('data', 'on');

      $("#kitchen").toggle(function(){
        $('#kitchen-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#kitchen-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[01:08:01:25]");
      }, function() {
        $('#kitchen-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#kitchen-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[01:08:01:25]");
      });
    }
    else {
      // Light is currently off
      // console.log('Light off');
      $('#kitchen-lightbulb').attr('src', '/images/Bulb-Gray.png');
      $('#kitchen-lightbulb').attr('data', 'off');

      $("#kitchen").toggle(function(){
        $('#kitchen-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#kitchen-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[01:08:01:25]");
      }, function() {
        $('#kitchen-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#kitchen-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[01:08:01:25]");
      });
    }
  });

// [02:08:01:25]

  //--------------------------------------
  // Toggle Courtyard
  $.get('http://core2.jetsonsys.com:10080/rpc/boca_lutron/get_state?_args=[02:08:01:25]', function(data) {
    // JSON response will be something like: {"result": {"level": 100}}

    // Light is currently on
    if (data.result.level > 0) {
      // console.log('Light on');

      // Show the current state
      $('#courtyard-lightbulb').attr('src', '/images/Bulb-Yellow.png');
      $('#courtyard-lightbulb').attr('data', 'on');

      $("#courtyard").toggle(function(){
        $('#courtyard-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#courtyard-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[02:08:01:25]");
      }, function() {
        $('#courtyard-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#courtyard-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[02:08:01:25]");
      });
    }
    else {
      // Light is currently off
      // console.log('Light off');
      $('#courtyard-lightbulb').attr('src', '/images/Bulb-Gray.png');
      $('#courtyard-lightbulb').attr('data', 'off');

      $("#courtyard").toggle(function(){
        $('#courtyard-lightbulb').attr('src', '/images/Bulb-Yellow.png');
        $('#courtyard-lightbulb').attr('data', 'on');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_on?_args=[02:08:01:25]");
      }, function() {
        $('#courtyard-lightbulb').attr('src', '/images/Bulb-Gray.png');
        $('#courtyard-lightbulb').attr('data', 'off');
        $.get("http://core2.jetsonsys.com:10080/rpc/boca_lutron/turn_off?_args=[02:08:01:25]");
      });
    }
  });
});
