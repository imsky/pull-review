var url = require('./url');
var PullReview = require('./index');
var userMapping = require('./utilities/user-mapping');
var spelling = require('./utilities/spelling');

var CHAT_USER_MAP_UPDATE_INTERVAL = 15 * 60 * 1000;
var lastUpdatedChatUserMap;

/**
 * Set up Hubot listeners for Pull Review
 * @param  {Object} robot - Hubot reference
 */
module.exports = function(robot) {
  var adapter = robot.adapterName;

  robot.hear(/github\.com\//, function(res) {
    var chatText = res.message.text;
    var chatRoom = res.message.room;
    var chatChannel = adapter === 'slack' ? 'hubot:slack' : 'hubot:generic';

    /**
     * @param  {Error} e - error
     */
    function logError(e) {
      robot.logger.error('[pull-review]', e);
      res.send('[pull-review] ' + e);
    }

    if (adapter === 'slack') {
      var slackRoom = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(
        chatRoom
      );
      chatRoom = slackRoom.name;
    }

    var pullRequestURL;
    var retryReview;

    var urls = url.extractURLs(chatText);
    var processedText = spelling.correctSpelling(chatText.trim(), ['review', 'again'])
      .replace(/\s+/g, ' ')
      .replace(/(\breview | again\b)/gi, function(m) {
        return m.toLowerCase();
      });

    for (var i = 0; i < urls.length; i++) {
      var u = urls[i];
      var uo = url.parseURL(u);

      if (uo.hostname === 'github.com') {
        var reviewIndex = processedText.indexOf('review ' + u);
        if (reviewIndex !== -1) {
          var m = processedText.match(new RegExp('review ' + u + '/? again'));
          retryReview = m && m.index === reviewIndex;
          pullRequestURL = u;
          break;
        }
      }
    }

    if (!pullRequestURL) {
      return;
    }

    var chatUserMap = {};

    function updateChatUserMap(skipReconnect) {
      if (adapter !== 'slack') {
        return;
      }

      var rtmClient = robot.adapter.client.rtm;
      var now = new Date();

      if (typeof rtmClient.reconnect === 'function') {
        if (skipReconnect !== 'skip reconnect' && lastUpdatedChatUserMap && (now - lastUpdatedChatUserMap < CHAT_USER_MAP_UPDATE_INTERVAL)) {
          rtmClient.reconnect();
        }
      } else {
        robot.logger.error('Slack RTM client has no reconnect() function');
      }

      lastUpdatedChatUserMap = new Date();

      Object.assign(
        chatUserMap,
        userMapping.generateChatUserMap(rtmClient.dataStore.users, adapter)
      );
    }

    try {
      updateChatUserMap('skip reconnect');
      //NB: Slack rate limits rtm.connect as a Tier 1 method, 1 req/min
      //todo: make this configurable
      setInterval(updateChatUserMap, CHAT_USER_MAP_UPDATE_INTERVAL);

      PullReview({
        pullRequestURL: pullRequestURL,
        retryReview: retryReview,
        chatRoom: chatRoom,
        chatChannel: chatChannel,
        isChat: true,
        notifyFn: function(message) {
          robot.logger.info(message);
          res.send(message);
        },
        userMappingFn: userMapping.createUserMappingFn(chatUserMap, adapter)
      }).catch(logError);
    } catch (err) {
      logError(err);
    }
  });
};
