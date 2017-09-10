// Description:
//   Assigns and notifies reviewers for GitHub pull requests
//
// Commands:
//   [hubot] review <GitHub PR URL> - assign and notify reviewers for GitHub PR
//   [hubot] review <GitHub PR URL> again - reassign and notify reviewers for GitHub PR
//
// Author:
//   Ivan Malopinsky

//todo: use https://assets-cdn.github.com/pinned-octocat.svg for Slack icon

var PullReview = require('./src/index');

module.exports = function (input) {
  input = input || {};
  var isHubot = input.name !== undefined && input.adapterName !== undefined && input.logger !== undefined && input.listen !== undefined && input.hear !== undefined;
  var isAPI = input.pullRequestURL !== undefined;

  if (isHubot) {
    var robot = input;
    robot.hear(/github\.com\//, function (res) {
      var adapter = robot.adapterName;
      var text = res.message.text;
      var room = res.message.room;

      function logError(e) {
        robot.logger.error('[pull-review]', e);
        res.send('[pull-review] ' + e);
      }

      if (adapter === 'slack') {
        var slackRoom = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMBYId(room);
        room = slackRoom.name;
      }

      PullReview({
        'isChat': true,
        'text': text,
        'room': room,
        'adapter': adapter
      })
        .then(function (response) {
          if (!response) {
            return;
          }

          try {
            if (response instanceof Error) {
              logError(response);
            } else {
              res.send(response);
            }
          } catch (err) {
            logError(err);
          }
        })
        .catch(logError);
    });
  } else if (isAPI) {
    return PullReview(input);
  } else {
    throw Error('Invalid input: either a review request or a Hubot reference must be provided');
  }
};
