require('native-promise-only');

var github = require('./github');
var messages = require('./messages');

var GenericMessage = messages.GenericMessage;
var SlackMessage = messages.SlackMessage;
var GitHubMessage = messages.GitHubMessage;

function Response (options) {
  var request = options.request;
  var review = options.review;

  var isSlack = options.adapter === 'slack';
  var isReview = request.isReview;

  var githubURLs = request.githubURLs;

  function sendHubotMessage(inputs) {
    if (isSlack) {
      return SlackMessage(inputs);
    }

    return GenericMessage(inputs);
  }

  function sendGitHubMessage(inputs) {
    var message = GitHubMessage(inputs);
    var resources = inputs.resources;

    if (!message) {
      return;
    }

    return github.postPullRequestComment(resources[0], message);
  }

  function successfulReviewFlow (review, resources) {
    var inputs;

    return Promise.all([review, resources])
      .then(function (res) {
        var review = res[0];
        var resources = res[1];

        inputs = {
          'review': review,
          'resources': resources
        };

        return github.assignUsersToResource(resources[0], review.reviewers);
      })
      .then(function () {
        return sendGitHubMessage(inputs);
      })
      .then(function () {
        return sendHubotMessage(inputs);
      });
  }

  if (githubURLs.length) {
    var resources = github.getGithubResources(githubURLs);

    if (isReview) {
      var reviewError = false;

      return review.catch(function (err) {
        reviewError = true;

        return sendHubotMessage({
          'error': err
        });
      })
        .then(function (review) {
          if (reviewError) {
            return review;
          }

          return successfulReviewFlow(review, resources);
        })
        .catch(function (err) {
          return sendHubotMessage({
            'error': err
          });
        });
    }

    return resources
      .then(function (resources) {
        inputs = {
          'resources': resources
        }

        return sendHubotMessage(inputs);
      });
  }

  return Promise.resolve(null);
}

module.exports = Response;