'use strict';

var Promise = require('native-promise-only');
var debug = require('debug');

var Github = require('./github');
var generatePlan = require('./generate-plan');
var Action = require('./models/action');
var GithubMessage = require('./models/messages/github');
var HubotMessage = require('./models/messages/hubot');

var log = debug('pull-review');

var defaultNotifyFn = function defaultNotifyFn(message) {
  log(message);
};

/**
 * Generate a plan of actions and execute it
 * @param  {Object} options
 * @param  {Boolean} options.dryRun - do not assign or notify reviewers
 * @param  {Function} options.notifyFn - custom notifying function
 * @param  {String} options.githubToken - GitHub token with user and repo scopes
 * @return {[type]}
 */
module.exports = function PullReview(options) {
  var actions;
  var plannedEvents = [];
  var dryRun = Boolean(options.dryRun);
  var notifyFn = options.notifyFn || defaultNotifyFn;
  var github = Github(options.githubToken);
  options.github = github;

  log('started on ' + options.pullRequestURL);

  return generatePlan(options)
    .then(function(res) {
      actions = res;

      var transaction = [];

      actions = actions.map(Action);
      actions.forEach(function(action) {
        switch (action.type) {
          case 'ASSIGN_USERS_TO_PULL_REQUEST':
            transaction.push(function() {
              return github.assignUsersToPullRequest(
                action.payload.pullRequest,
                action.payload.assignees
              );
            });
            plannedEvents.push(
              'assign ' + action.payload.assignees.join(', ')
            );
            break;
          case 'UNASSIGN_USERS_FROM_PULL_REQUEST':
            transaction.push(function() {
              return github.unassignUsersFromPullRequest(
                action.payload.pullRequest,
                action.payload.assignees
              );
            });
            plannedEvents.push(
              'unassign ' + action.payload.assignees.join(', ')
            );
            break;
          case 'CREATE_REVIEW_REQUEST':
            transaction.push(function() {
              return github.createReviewRequest(
                action.payload.pullRequest,
                action.payload.assignees
              );
            });
            if (action.payload.assignees.length) {
              plannedEvents.push(
                'request a review from ' + action.payload.assignees.join(', ')
              );
            }
            break;
          case 'DELETE_REVIEW_REQUESTS':
            transaction.push(function() {
              return github.deleteReviewRequest(
                action.payload.pullRequest,
                action.payload.assignees
              );
            });

            if (action.payload.assignees.length) {
              plannedEvents.push(
                'remove review request' + (action.payload.assignees.length > 1 ? 's' : '') + ' from ' + action.payload.assignees.join(', ')
              );
            }
            break;
          case 'NOTIFY':
            if (action.payload.channel === 'github') {
              transaction.push(function() {
                return github.postPullRequestComment(
                  action.payload.pullRequest,
                  GithubMessage(action.payload)
                );
              });
              plannedEvents.push('post GitHub comment');
            } else {
              transaction.push(function() {
                return new Promise(function(resolve) {
                  try {
                    var notification = HubotMessage(action.payload);
                    resolve(notifyFn(notification));
                  } catch (e) {
                    log(e);
                    resolve();
                  }
                });
              });
            }
            break;
        }
      });

      log('will ' + plannedEvents.join(', ') + ' on ' +
      options.pullRequestURL);

      return Promise.resolve().then(function() {
        return transaction.reduce(function(promise, fn) {
          return promise.then(function () {
            return dryRun ? null : fn();
          });
        }, Promise.resolve());
      });
    })
    .then(function () {
      /**
       * GitHub API calls for a PR with two files:
       * getPullRequest: 1
       * getPullRequestFiles: 1
       * getPullRequestCommits: 1
       * getPullRequestLabels: 1
       * getReviewRequests: 1
       * getRepoFile: 1 (.pull-review)
       * getBlameForCommitFile: 2
       * assignUsersToPullRequest: 1
       * postPullRequestComment: 1
       */
      if (!dryRun) {
        log('did ' + plannedEvents.join(', ') + ' on ' +
      options.pullRequestURL);
      }
      return actions;
    });
};
