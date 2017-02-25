require('native-promise-only');

var slack = require('./slack');
var github = require('./github');

function SlackResponse(options) {
  var review = options.review;
  var resources = options.resources;

  var attachments = resources.map(slack.generateSlackAttachmentFromGithubResource);

  return {
    'attachments': attachments
  };
}

function GenericResponse(options) {
  var review = options.review;
  var resources = options.resources;

  return 'hello world';
}

function Response (options) {
  var request = options.request;
  var review = options.review;
  var isSlack = options.adapter === 'slack';

  var githubURLs = request.githubURLs;

  if (githubURLs.length) {
    var resources = github.getGithubResources(githubURLs);
    return Promise.all([review, resources])
      .then(function (res) {
        var resources = res[0];
        var inputs = {
          'review': review,
          'resources': resources
        };

        if (isSlack) {
          return SlackResponse(inputs);
        }

        return GenericResponse(inputs);
      });
  }

  return Promise.resolve(null);
}

module.exports = Response;