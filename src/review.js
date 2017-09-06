'use strict';

var Promise = require('native-promise-only');

var Action = require('./models/action');
var github = require('./github');
var PullReviewAssignment = require('./pull-review-assignment');

module.exports = function Review (options) {
  options = options || {};
  var actions = [];
  var config = process.env.PULL_REVIEW_CONFIG || options.config;
  var pullReviewConfigPath = process.env.PULL_REVIEW_CONFIG_PATH || options.pullReviewConfigPath || '.pull-review';
  var pullRequestURL = options.pullRequestURL;
  var retryReview = Boolean(options.retryReview);
  var dryRun = Boolean(options.dryRun);
  var pullRequestRecord;
  var pullRequestFiles;
  var pullRequestAssignees;
  var newPullRequestAssignees;
  var repoPullReviewConfig;

  if (!pullRequestURL) {
    throw Error('Missing pull request URL');
  }

  var pullRequest = github.parseGithubURL(pullRequestURL);

  if (!pullRequest) {
    throw Error('Invalid pull request');
  }

  return github.getPullRequest(pullRequest)
    .catch(function () {
      throw Error('Failed to get pull request: ' + pullRequestURL);
    })
    .then(function (res) {
      var unassignAssignees;
      pullRequestRecord = res;

      if (pullRequestRecord.data.state !== 'open') {
        throw Error('Pull request is not open: ' + pullRequestURL);
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
          actions.push(Action({
            'type': 'UNASSIGN_USERS_FROM_PULL_REQUEST',
            'payload': {
              'pullRequest': pullRequest,
              'users': pullRequestAssignees
            }
          }));
        }
      }

      return Promise.all([
        github.getPullRequestFiles(pullRequestRecord),
        config ? null : github.getRepoFile(pullRequestRecord, pullReviewConfigPath, 'utf8')
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
        'assignees': retryReview ? [] : pullRequestAssignees,
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
        throw Error('No reviewers found: ' + pullRequestURL);
      }

      newPullRequestAssignees = (reviewers || []).map(function (reviewer) {
        return reviewer.login;
      });

      actions.push(Action({
        'type': 'ASSIGN_USERS_TO_PULL_REQUEST',
        'payload': {
          'pullRequest': pullRequest,
          'users': newPullRequestAssignees
        }
      }));

      actions.push(Action({
        'type': 'NOTIFY',
        'payload': {
          'pullRequest': pullRequest,
          'users': newPullRequestAssignees
        }
      }));

      if (!dryRun) {
        actions.push(Action({
          'type': 'COMMIT',
          'payload': true
        }));
      }

      return actions;
    });
};