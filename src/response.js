require('native-promise-only');

var slack = require('./slack');
var github = require('./github');

function SlackResponse(options) {
  var review = options.review;
  var resources = options.resources;
  var error = options.error;

  var attachments = resources.map(slack.generateSlackAttachmentFromGithubResource);

  return {
    'attachments': attachments
  };
}

function GenericResponse(options) {
  var review = options.review;
  var resources = options.resources;
  var error = options.error;

  if (review) {
    //todo: factor out the "assigning" message into a common function
    var reviewers = review.reviewers.map(function (reviewer) {
      return '@' + reviewer.login;
    });

    var pullRequest = resources[0];
    var shorthand = pullRequest.owner + '/' + pullRequest.repo + '#' + pullRequest.number;

    if (reviewers.length) {
      return 'Assigning ' + reviewers.join(', ') + ' to ' + shorthand;
    }
  }
}

function Response (options) {
  var request = options.request;
  var review = options.review;

  var isSlack = options.adapter === 'slack';
  var isReview = request.isReview;

  var githubURLs = request.githubURLs;

  function sendResponse(inputs) {
    if (isSlack) {
      return SlackResponse(inputs);
    }

    return GenericResponse(inputs);
  }

  if (githubURLs.length) {
    var resources = github.getGithubResources(githubURLs);
    var inputs;

    if (isReview) {
      //todo: process review first, shortcut processing if there's a review error
      return Promise.all([review, resources])
        .then(function (res) {
          var review = res[0];
          var resources = res[1];

          inputs = {
            'review': review,
            'resources': resources
          };

          //todo: assign up to max number of reviewers, post comment on github tagging reviewers
          //todo: notify reviewers

          return sendResponse(inputs);
        });
    }

    return resources
      .then(function (resources) {
        inputs = {
          'resources': resources
        }

        return sendResponse(inputs);
      });
  }

  return Promise.resolve(null);
}

module.exports = Response;