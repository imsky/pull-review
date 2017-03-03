// Description
//   Assigns and notifies reviewers for GitHub pull requests
//
// Configuration:
//   HUBOT_REVIEW_GITHUB_TOKEN - required API access token with GraphQL API enabled
//   HUBOT_REVIEW_REQUIRED_ROOMS - optional comma-separated list of chat rooms where review requests are restricted to
//   HUBOT_REVIEW_PULL_REVIEW_CONFIG - optional pull review config override encoded as JSON
//   HUBOT_REVIEW_DRY_RUN - optional flag to log, but not execute review actions
//   HUBOT_REVIEW_GITHUB_ICON_URL - optional fallback icon URL for unfurled GitHub URLs
//
// Commands:
//   [hubot] <GitHub URL> - unfurl GitHub URLs on platforms like Slack
//   [hubot] review <GitHub PR URL> - assign and notify reviewers for GitHub PR
//
// Notes:
//  * Make sure to enable the GitHub GraphQL API for your user/organization
//  * Make sure to add everyone who can be notified to .pull-review (reviews won't work otherwise)
//
// Author:
//   Ivan Malopinsky

//todo: consider pull request review integration
//todo: consider PR size tags

var HubotReview = require('./src/hubot-review');

module.exports = function (robot) {
  robot.hear(/github\.com\//, function (res) {
    var adapter = robot.adapterName;
    var message = res.message;
    var text = message.text;
    var room = message.room;

    if (adapter === 'slack') {
      var slackRoom = robot.adapter.client.rtm.dataStore.getChannelGroupOrDMById(room) || {};
      room = slackRoom.name;
    }

    var hubotReview = HubotReview({
      'text': text,
      'adapter': adapter,
      'room': room
    });

    hubotReview.then(function (response) {
      if (!response) {
        return;
      }

      try {
        res.send(response);
      } catch (e) {
        robot.logger.error(e);

        try {
          res.send('[hubot-review] ' + String(response));
        } catch (e) {
          robot.logger.error(e);

          res.send('[hubot-review] ' + e);
        }
      }
    })
      .catch(function (e) {
        robot.logger.error(e);

        res.send('[hubot-review] ' + e);
      });
  });
};
