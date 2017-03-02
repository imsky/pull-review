var Promise = require('native-promise-only');

var github = require('./github');
var messages = require('./messages');

var GenericMessage = messages.GenericMessage;
var SlackMessage = messages.SlackMessage;
var GitHubMessage = messages.GitHubMessage;

function Response (options) {
  var DRY_RUN = process.env.HUBOT_REVIEW_DRY_RUN;

  var request = options.request;
  var review = options.review;

  var isSlack = options.adapter === 'slack';
  var isReview = request.isReview;

  var githubURLs = request.githubURLs;

  function sendHubotMessage(inputs) {
    if (isSlack) {
      //todo: consider moving this to review flow
      var reviewerMap = (inputs.reviewers || []).reduce(function (map, reviewer) {
        var username = reviewer.login;

        if (reviewer.notify && reviewer.notify.slack) {
          username = reviewer.notify.slack;
        }

        map[reviewer.login] = username;
        return map;
      }, {});

      inputs.reviewerMap = reviewerMap;

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
        var review = res[0] || {};
        var resources = res[1];

        inputs = {
          'reviewers': review.reviewers,
          'resources': resources
        };

        var assignees = (review.reviewers || []).map(function (reviewer) {
          return reviewer.login;
        });

        function liveRun() {
          return github.assignUsersToResource(resources[0], assignees)
            .then(function () {
              return sendGitHubMessage(inputs);
            })
            .then(function () {
              return sendHubotMessage(inputs);
            });
        }

        function dryRun () {
          return Promise.resolve()
            .then(function () {
              console.info('Assigning ', review.reviewers, 'to', resources[0]);
            });
        }

        return DRY_RUN ? dryRun() : liveRun();
      });
  }

  if (githubURLs.length) {
    var resources = github.getGithubResources(githubURLs);

    if (isReview) {
      var reviewError;

      return review.catch(function (err) {
        reviewError = err;
      })
        .then(function (review) {
          if (reviewError) {
            return sendHubotMessage({
              'error': reviewError
            });
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
        var filteredResources = resources.filter(function (resource) {
          resource = resource || {};
          return resource.type === 'pull' || resource.type === 'issue';
        });

        return sendHubotMessage({
          'resources': filteredResources
        });
      });
  }

  return Promise.resolve(null);
}

module.exports = Response;
