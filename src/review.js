'use strict';

var Promise = require('native-promise-only');

var github = require('./github');
var PullReviewAssignment = require('./pull-review-assignment');

module.exports = function Review (options) {
  options = options || {};
  var config = process.env.PULL_REVIEW_CONFIG || options.config;
  var pullRequestUrl = options.pullRequestUrl;
  var retryReview = Boolean(options.retryReview);
  var pullRequestRecord;
  var pullRequestFiles;
  var pullRequestAssignees;
  var newPullRequestAssignees;
  var repoPullReviewConfig;

  if (!pullRequestUrl) {
    throw Error('Missing pull request URL');
  }

  var pullRequest = github.parseGithubURL(pullRequestUrl);

  if (!pullRequest) {
    throw Error('Invalid pull request');
  }

  return github.getPullRequest(pullRequest)
    .catch(function () {
      throw Error('Failed to get pull request: ' + pullRequestUrl);
    })
    .then(function (res) {
      var unassignAssignees;
      pullRequestRecord = res;

      if (pullRequestRecord.data.state !== 'open') {
        throw Error('Pull request is not open: ' + pullRequestUrl);
      }

      if (pullRequestRecord.data.assignees) {
        pullRequestAssignees = pullRequestRecord.data.assignees;
      } else if (pullRequestRecord.data.assignee) {
        pullRequestAssignees = [pullRequestRecord.data.assignee];
      }

      if (pullRequestAssignees && pullRequestAssignees.length) {
        pullRequestAssignees = pullRequestAssignees.map(function (assignee) {
          return assignee.login;
        });

        if (retryReview) {
          unassignAssignees = github.unassignUsersFromPullRequest(pullRequest, pullRequestAssignees);
          pullRequestAssignees = [];
        }
      }

      return Promise.all([
        github.getPullRequestFiles(pullRequestRecord),
        config ? null : github.getRepoFile(pullRequestRecord, '.pull-review', 'utf8')
          .catch(function () { return null; }),
        unassignAssignees
      ]);
    })
    .then(function (res) {
      pullRequestFiles = res[0];
      repoPullReviewConfig = res[1];
      config = config || repoPullReviewConfig;

      return PullReviewAssignment({
        'config': config,
        'files': pullRequestFiles,
        'authorLogin': pullRequestRecord.data.user.login,
        'assignees': pullRequestAssignees,
        'getBlameForFile': function (file) {
          return github.getBlameForCommitFile({
            'owner': pullRequest.owner,
            'repo': pullRequest.repo,
            'sha': pullRequestRecord.data.head.sha,
            'path': file.filename
          });
        }
      });
    })
    .then(function (reviewers) {
      if (!reviewers || !reviewers.length) {
        throw Error('No reviewers found: ' + pullRequestUrl);
      }

      newPullRequestAssignees = (reviewers || []).map(function (reviewer) {
        return reviewer.login;
      });

      return github.assignUsersToResource(pullRequest, newPullRequestAssignees);
    })
    .then(function () {
      console.log('TODO: post a comment');
    });
};
