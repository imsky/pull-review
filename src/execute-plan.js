'use strict';

var Promise = require('native-promise-only');

var github = require('./github');

var Action = require('./models/action');

module.exports = function executePlan(actions) {
  actions = actions || [];

  if (!Array.isArray(actions)) {
    throw Error('Actions must be an array');
  }

  var transaction = [];
  var commitTransaction = false;

  actions = actions.map(Action)
    .forEach(function (action) {
      switch (action.type) {
        case 'ASSIGN_USERS_TO_PULL_REQUEST':
          transaction.push(github.assignUsersToPullRequest(action.payload.pullRequest, action.payload.assignees));
          break;
        case 'UNASSIGN_USERS_FROM_PULL_REQUEST':
          transaction.push(github.unassignUsersFromPullRequest(action.payload.pullRequest, action.payload.assignees));
        case 'NOTIFY':
          //todo: implement
          transaction.push(function () { });
        case 'COMMIT':
          commitTransaction = true;
          break;
        default:
          throw Error('Unhandled action: ' + action.type);
      }
    });

  return Promise.resolve()
    .then(function () {
      if (commitTransaction) {
        return transaction.reduce(function (promise, fn) {
          return promise.then(fn);
        }, Promise.resolve());
      }
    })
    .then(function () {
      return actions;
    });
};
