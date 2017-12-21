var url = require('./url');
var PullReview = require('./index');
var userMapping = require('./utilities/user-mapping');

/**
 * Set up Hubot listeners for Pull Review
 * @param  {Object} robot - Hubot reference
 */
module.exports = function(robot) {
  var rawUsers;
  var adapter = robot.adapterName;

  if (adapter === 'slack') {
    rawUsers = robot.adapter.client.rtm.dataStore.users;
  }

  var chatUserMap = userMapping.generateChatUserMap(rawUsers, adapter);

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
    var processedText = chatText
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
          retryReview =
            processedText.indexOf('review ' + u + ' again') === reviewIndex;
          pullRequestURL = u;
          break;
        }
      }
    }

    if (!pullRequestURL) {
      return;
    }

    try {
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
