var Promise =  require('native-promise-only');

var github = require('./github');
var pullReview = require('pull-review');

var PullReviewAssignment = pullReview.PullReviewAssignment;

function Review (options) {
  var PULL_REVIEW_CONFIG = process.env.HUBOT_REVIEW_PULL_REVIEW_CONFIG;

  var request = options.request;

  var isReview = request.isReview;
  var reviewAgain = request.reviewAgain;
  var githubURLs = request.githubURLs || [];

  if (!isReview) {
    return Promise.resolve(null);
  }

  var pullRequest;
  var pullRequestAuthorLogin;
  var assignees = [];

  return Promise.resolve()
    .then(function () {
      if (!githubURLs.length) {
        throw Error('No GitHub URLs');
      } else if (githubURLs.length > 1) {
        throw Error('Only one GitHub URL can be reviewed at a time');
      }

      return github.getGithubResources(githubURLs);
    })
    .then(function (resources) {
      var resource = resources[0];
      var unassignReviewers;

      if (resource.type !== 'pull') {
        throw Error('Reviews for resources other than pull requests are not supported');
      }

      pullRequest = resource;

      if (pullRequest.data.state !== 'open') {
        throw Error('Pull request is not open');
      }

      pullRequestAuthorLogin = pullRequest.data.user.login;

      if (pullRequest.data.assignees) {
        assignees = pullRequest.data.assignees;
      } else if (pullRequest.data.assignee) {
        assignees.push(pullRequest.data.assignee);
      }

      if (reviewAgain && assignees.length) {
        unassignReviewers = github.unassignUsersFromResource(resource, assignees);
      }

      var getConfig = github.getRepoFile(resource, '.pull-review', 'utf8')
        .catch(function () { return null; });

      return Promise.all([
        getConfig,
        github.getPullRequestFiles(pullRequest),
        unassignReviewers
      ]);
    })
    .then(function (res) {
      var config = PULL_REVIEW_CONFIG || res[0];
      var files = res[1] || [];
      var unassignReviewers = res[2];

      if (unassignReviewers) {
        assignees = [];
      }

      return PullReviewAssignment({
        'config': config,
        'files': files,
        'authorLogin': pullRequestAuthorLogin,
        'assignees': assignees.map(function (assignee) {
          return assignee.login;
        }),
        'getBlameForFile': function (file) {
          return github.getBlameForCommitFile({
            'owner': pullRequest.owner,
            'repo': pullRequest.repo,
            'sha': pullRequest.data.head.sha,
            'path': file.filename
          });
        }
      });
    })
      .then(function (reviewers) {
        if (!reviewers.length) {
          throw Error('No reviewers found');
        }

        return {
          'reviewers': reviewers
        };
      });
}

module.exports = Review;
