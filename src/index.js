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
 * @param  {Boolean} options.isChat - the request is made from a chat context
 * @param  {Function} options.notifyFn - custom notifying function
 * @param  {String} options.githubToken - GitHub token with user and repo scopes
 * @return {[type]}
 */
module.exports = function PullReview(options) {
  var actions;
  var loggedEvents = [];
  var dryRun = Boolean(options.dryRun);
  var isChat = Boolean(options.isChat);
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
          loggedEvents.push(
              'assigned ' + action.payload.assignees.join(', ')
            );
          break;
        case 'UNASSIGN_USERS_FROM_PULL_REQUEST':
          transaction.push(function() {
            return github.unassignUsersFromPullRequest(
                action.payload.pullRequest,
                action.payload.assignees
              );
          });
          loggedEvents.push(
              'unassigned ' + action.payload.assignees.join(', ')
            );
          break;
        case 'NOTIFY':
          if (action.payload.channel === 'github') {
            transaction.push(function() {
              return github.postPullRequestComment(
                  action.payload.pullRequest,
                  GithubMessage(action.payload)
                );
            });
            loggedEvents.push('posted GitHub comment');
          } else {
            transaction.push(function() {
              return new Promise(function(resolve, reject) {
                try {
                  var notification = HubotMessage(action.payload);
                  resolve(notifyFn(notification));
                } catch (e) {
                  log(e);
                  reject(Error('Failed to notify'));
                }
              });
            });
          }
          break;
        }
      });

      return Promise.resolve().then(function() {
        return transaction.reduce(function(promise, fn) {
          return promise.then(dryRun ? null : fn());
        }, Promise.resolve());
      });
    })
    .then(function() {
      log(
        (dryRun ? 'would have ' : '') +
          loggedEvents.join(', ') +
          ' on ' +
          options.pullRequestURL
      );

      return actions;
    })
    .catch(function(err) {
      log(err);
      throw err;
    });
};
