'use strict';

var Promise = require('native-promise-only');

var github = require('./github');
var generatePlan = require('./generate-plan');
var Action = require('./models/action');
var GithubMessage = require('./models/messages/github');

var defaultNotifyFn = function defaultNotifyFn(message) {
  console.info(message);
};

module.exports = function PullReview(options) {
  options = options || {};
  var actions;
  var dryRun = Boolean(options.dryRun);
  var notifyFn = options.notifyFn || defaultNotifyFn;

  return generatePlan(options)
    .then(function (res) {
      actions = res;

      if (dryRun) {
        return;
      }

      var transaction = [];

      actions = actions.map(Action)
        .forEach(function (action) {
          switch (action.type) {
            case 'ASSIGN_USERS_TO_PULL_REQUEST':
              transaction.push(github.assignUsersToPullRequest(action.payload.pullRequest, action.payload.assignees));
              break;
            case 'UNASSIGN_USERS_FROM_PULL_REQUEST':
              transaction.push(github.unassignUsersFromPullRequest(action.payload.pullRequest, action.payload.assignees));
              break;
            case 'NOTIFY':
              if (action.payload.channel === 'github') {
                transaction.push(github.postPullRequestComment(action.payload.pullRequest, GithubMessage(action.payload)));
              } else {
                transaction.push(new Promise(function (resolve) {
                  resolve(notifyFn(action.payload));
                }));
              }
              break;
            default:
              throw Error('Unhandled action: ' + action.type);
          }
        });

      return Promise.resolve()
        .then(function () {
          return transaction.reduce(function (promise, fn) {
            return promise.then(fn);
          }, Promise.resolve());
        });
    })
    .then(function () {
      return actions;
    });
};
