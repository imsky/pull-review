var slack = require('./slack');
var github = require('./github');

function Response (options) {
  var request = options.request;
  var isSlack = options.isSlack;

  var isReview = request.isReview;
  var githubURLs = request.githubURLs;

  if (isReview) {
    throw Error('Review response not supported yet');
  }

  if (!isSlack) {
    throw Error('Non-Slack response not supported yet');
  }

  if (githubURLs.length) {
    return github.getGithubResources(githubURLs)
      .then(function (resources) {
        return resources.map(slack.generateSlackAttachmentFromGithubResource)
      })
      .then(function (attachments) {
        return {
          'attachments': attachments
        };
      });
  }

  return Promise.resolve(null);
}

module.exports = Response;