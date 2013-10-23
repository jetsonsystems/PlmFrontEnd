//
// Filename: msg-bus.js
//

/*
 * msg-bus: Implements a message bus. The purpose of this message bus is 2 fold:
 *
 *  1. Connect to the server side notifications API, and subscribe to any notifications which 
 *     front-end applications (ie: photo-manater) require via subscription. Any notifications
 *     which are subsequently received from the API, are published to the message bus, such
 *     that any interested client side party can receive and react to the message.
 *
 *  2. Provide a vehicle, the message bus, for communication between arbitrary front-end
 *     components. These components could be applications (ie: photo-manager), views with an
 *     application, models, etc...
 *
 *  Messages:
 *
 *    One can publish or subscribe to messages. Both operations use a channel and/or topic.
 *
 *      Notifications API events:
 *
 *        * channels: There is a channel for each resource which emits events via the 
 *          notifications API. The channels are named as follows:
 *
 *          _notif-api:<resource name>
 *
 *          ie:
 *
 *          _notif-api:/importers
 *
 *        * topics: An api event is a topic.
 *
 *      Client views:
 *
 *        * channels: Each view has a channel, named as follows:
 *
 *          _client.view:/<app>/<path to view>
 *
 *          ie:
 *
 *          _client.view:/photo-manager/home
 *
 *       * topics: TBD
 *
 *      Example usage:
 *
 *        * subscribe to notifications API /importers events:
 *
 *          MsgBus.subscribe('_notif-api:/importers', 'import.image.*', function(data) ....);
 *
 *        * subscribe to photo-manager/home view messages:
 *
 *          MsgBus.subscribe('_client.view:/photo-manager/home', 'rendered', function(data) ....);
 */

//
// WebSocket: Bring in the node.js Notifications web-socket like interface.
//
// var WebSocket = require('MediaManagerApi/lib/NotificationsWsLike');

if (WebSocket) {
  console.log('/js/app/common/msg-bus: WebSockets are supported...');
}
else {
  console.log('/js/app/common/msg-bus: WebSockets are NOT supported');
}

console.log('/js/app/common/msg-bus: Running...');

define(
  [
    'postal',
    'plmCommon/plm'
  ],
  function(postal, Plm) {
    var moduleName = '/app/common/msg-bus';
    var debugPrefix = moduleName;

    !Plm.debug || console.log(debugPrefix + ': Loading, typeof postal - ' + typeof(postal));

    var uuid = require('node-uuid');

    var msgBus = undefined;

    var ws = undefined;

    var _listenToApiEvents = function() {

      var dp = debugPrefix + '._listToApiEvents: ';
      !Plm.debug || console.log(dp + 'listening to API events...');

      function isConnectionEstablished(parsedMsg) {
        return (parsedMsg.resource === '/notifications' && parsedMsg.event === 'connection.established');
      };

      function isValidResourceEvent(parsedMsg) {
        var isValid = 
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.started') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.images.created') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.image.created') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.images.variant.created') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.image.variant.created') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.images.imported') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.image.imported') ||
          (parsedMsg.resource === '/importers' && parsedMsg.event === 'import.completed') ||

          (parsedMsg.resource === '/storage/synchronizers' && parsedMsg.event === 'sync.started') ||
          (parsedMsg.resource === '/storage/synchronizers' && parsedMsg.event === 'sync.completed') ||

          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.image.created') ||
          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.image.updated') ||
          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.image.deleted') ||
          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.importer.created') ||
          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.importer.updated') ||
          (parsedMsg.resource === '/storage/changes-feed' && parsedMsg.event === 'doc.importer.deleted');
        return isValid;
      };

      function doSubscriptions(ws) {
        !Plm.debug || console.log(dp + 'Subscribing to notification events');
        ws.send(JSON.stringify({
          "resource": "_client",
          "event": "subscribe",
          "data": {
            "resource": "/importers"
          }}));
        ws.send(JSON.stringify({
          "resource": "_client",
          "event": "subscribe",
          "data": {
            "resource": "/storage/synchronizers"
          }}));
        ws.send(JSON.stringify({
          "resource": "_client",
          "event": "subscribe",
          "data": {
            "resource": "/storage/changes-feed"
          }}));
        !Plm.debug || console.log(dp + 'Subscribed to notification events');
      };

      ws.onerror = function() {
        !Plm.debug || console.log('js/app/common/msg-bus: websocket error!');
      };

      ws.onmessage = function(msg) {
        !Plm.debug || console.log(dp + msg.data);
          
        var parsedMsg = JSON.parse(msg.data);

        if (isConnectionEstablished(parsedMsg)) {
          doSubscriptions(ws);
        }
        else if (isValidResourceEvent(parsedMsg)) {
          var channel = '_notif-api:' + parsedMsg.resource;
          var topic = parsedMsg.event;

          if (_.has(msgBus, channel)) {
            msgBus[channel].publish(topic, parsedMsg);
          }
          else {
            !Plm.debug || console.log('app/msg-bus._listToApiEvents: channel does NOT exist - ' + channel);
          }
        }
        else {
          !Plm.debug || console.log('/js/app/common/msg-bus._listenToApiEvents.onmessage: message NOT understood - ' + msg.data);
        }

      };

    };

    var initialize = function() {
      if (msgBus === undefined) {

        msgBus = {
          '_notif-api:/storage/synchronizers' : postal.channel('_notif-api:/storage/synchronizers', 'sync.#'),
          '_notif-api:/importers' : postal.channel('_notif-api:/importers', 'import.#'),
          '_notif-api:/storage/changes-feed' : postal.channel('_notif-api:/storage/changes-feed', 'doc.#'),
          '_client.view:/photo-manager/home' : postal.channel('_notif-api:/photo-manager/home', '#')
        };

        !Plm.debug || console.log('app/msg-bus.initialize: Creating web-socket...');

        var that = this;
        ws = new WebSocket('ws://localhost:9002/notifications');

        _listenToApiEvents();

      }
      else {
        throw('/js/app/msg-bus: redundant initialization!');
      }
    };

    //
    //  Map of subscription IDs to subscriptions.
    //
    var subscriptions = {};

    //
    // subscribe: delgate to postal.
    //
    //  Args:
    //    channel: postal channel name
    //    topic: postal topic
    //    callback: f(data)
    //
    //  Returns: subId of subscription.
    //
    var subscribe = function(channel, topic, callback) {
      function callbackWrapper(data, envelope) {
        callback(data);
      };

      var subId = uuid.v4();

      var sub = postal.subscribe({
        channel: channel,
        topic: topic,
        callback: callbackWrapper});

      subscriptions[subId] = sub;

      return subId;
    };

    //
    // unsubscribe: Unsubscribe given a subscription ID.
    //
    function unsubscribe(subId) {
      if (_.has(subscriptions, subId)) {
        var subscription = subscriptions[subId];
        subscription.unsubscribe();
        delete subscriptions[subId];
      }
    }

    //
    // publish: TBD - currently we've just implemented forwarding of API events to those whom have subscribed.
    //
    var publish = function() {
      return this;
    };

    return {
      initialize: initialize,
      subscribe: subscribe,
      unsubscribe: unsubscribe,
      publish: publish
    };

  }
);
