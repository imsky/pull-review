require('native-promise-only');

var PULL_REVIEW_CONFIG = process.env.PULL_REVIEW_CONFIG;

if (PULL_REVIEW_CONFIG) {
  console.info('Using review config override', PULL_REVIEW_CONFIG);
}

var github = require('./github');
var pullReview = require('pull-review');

var PullReviewAssignment = pullReview.PullReviewAssignment;

function Review (options) {
  var request = options.request;

  var isReview = request.isReview;
  var githubURLs = request.githubURLs || [];

  if (!isReview) {
    return Promise.resolve(null);
  }

  var pullRequest, pullRequestAuthorLogin, assignees = [];

  return Promise.resolve(true)
    .then(function () {
      if (!githubURLs.length) {
        throw Error('No GitHub URLs');
      } else if (githubURLs.length > 1) {
        throw Error('Only one GitHub URL can be reviewed at a time');
      }

      return github.getGithubResources(githubURLs)
    })
    .then(function (resources) {
      var resource = resources[0];

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

      var getConfig = github.getRepoFile(resource, '.pull-review', 'utf8')
        .catch(function () { return null; })

      return Promise.all([getConfig, github.getPullRequestFiles(pullRequest)]);
    })
    .then(function (res) {
      var config = PULL_REVIEW_CONFIG || res[0];
      var files = res[1] || [];

      return PullReviewAssignment({
        'config': config,
        'files': files,
        'authorLogin': pullRequestAuthorLogin,
        'assignees': assignees.map(function (assignee) {
          return assignee.login
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