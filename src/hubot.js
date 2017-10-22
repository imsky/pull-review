var url = require('./url');
var PullReview = require('./index');

/**
 * Set up Hubot listeners for Pull Review
 * @param  {Object} robot - Hubot reference
 */
module.exports = function(robot) {
  var rawUsers = {};
  var chatUserMap = {};
  var adapter = robot.adapterName;

  if (adapter === 'slack') {
    rawUsers = robot.adapter.client.rtm.dataStore.users;
  }

  Object.keys(rawUsers).forEach(function(userId) {
    var user = rawUsers[userId];
    var key = user.real_name || user.name;
    if (key !== undefined) {
      chatUserMap[key] = userId;
    }
  });

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
        userMappingFn: function(user) {
          if (adapter !== 'slack') {
            return user;
          }

          if (!typeof user === 'string') {
            return;
          } else if (user.indexOf('@') === 0) {
            return user;
          } else {
            return '<@' + chatUserMap[user] + '>';
          }
        }
      }).catch(logError);
    } catch (err) {
      logError(err);
    }
  });
};
