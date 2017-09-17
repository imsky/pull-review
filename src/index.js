'use strict';

var Promise = require('native-promise-only');

var github = require('./github');
var generatePlan = require('./generate-plan');
var Action = require('./models/action');
var GithubMessage = require('./models/messages/github');
var HubotMessage = require('./models/messages/hubot');

var defaultNotifyFn = function defaultNotifyFn(message) {
  console.info(message);
};

var generateNotification = function generateNotification(input) {
  input = input || {};
  var channel = input.channel.split(':');
  var source = channel[0];

  if (source === 'hubot') {
    return HubotMessage(input);
  } else {
    throw Error('Unsupported source: ' + source);
  }
};

module.exports = function PullReview(options) {
  options = options || {};
  var actions;
  var dryRun = Boolean(options.dryRun);
  var notifyFn = options.notifyFn || defaultNotifyFn;

  return generatePlan(options)
    .then(function(res) {
      actions = res;

      if (dryRun) {
        return;
      }

      var transaction = [];

      actions = actions.map(Action);
      actions.forEach(function(action) {
        switch (action.type) {
        case 'ASSIGN_USERS_TO_PULL_REQUEST':
          transaction.push(github.assignUsersToPullRequest(action.payload.pullRequest, action.payload.assignees));
          break;
        case 'UNASSIGN_USERS_FROM_PULL_REQUEST':
          transaction.push(github.unassignUsersFromPullRequest(action.payload.pullRequest, action.payload.assignees));
          break;
        case 'NOTIFY':
          if (action.payload.channel === 'github') {
            transaction.push(
                github.postPullRequestComment(action.payload.pullRequest, GithubMessage(action.payload))
              );
          } else {
            transaction.push(
                new Promise(function(resolve, reject) {
                  try {
                    var notification = generateNotification(action.payload);
                    resolve(notifyFn(notification));
                  } catch (e) {
                    console.error(e);
                    reject(Error('Failed to notify'));
                  }
                })
              );
          }
          break;
        default:
          throw Error('Unhandled action: ' + action.type);
        }
      });

      return Promise.resolve().then(function() {
        return transaction.reduce(function(promise, fn) {
          return promise.then(fn);
        }, Promise.resolve());
      });
    })
    .then(function() {
      return actions;
    });
};
