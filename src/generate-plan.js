'use strict';

var Action = require('./models/action');
var github = require('./github');
var getReviewers = require('./get-reviewers');

module.exports = function generatePlan (options) {
  options = options || {};
  var actions = [];
  var config = process.env.PULL_REVIEW_CONFIG || options.config;
  var pullReviewConfigPath = process.env.PULL_REVIEW_CONFIG_PATH || options.pullReviewConfigPath || '.pull-review';
  var pullRequestURL = options.pullRequestURL;
  var retryReview = Boolean(options.retryReview);
  var isChat = Boolean(options.isChat);
  var chatRoom = Boolean(options.chatRoom);
  var requiredChatRooms = process.env.PULL_REVIEW_REQUIRED_ROOMS ? process.env.PULL_REVIEW_REQUIRED_ROOMS.split(',') : [];
  var chatChannel = options.chatChannel;
  var pullRequestRecord;
  var pullRequestFiles;
  var pullRequestCommits;
  var pullRequestAssignees;
  var newPullRequestAssignees;
  var repoPullReviewConfig;

  if (!pullRequestURL) {
    throw Error('Missing pull request URL');
  }

  var pullRequest = github.parseGithubURL(pullRequestURL);

  if (!pullRequest) {
    throw Error('Invalid pull request URL');
  } else if (isChat && chatRoom && requiredChatRooms.length && requiredChatRooms.indexOf(chatRoom) == -1) {
    throw Error('Review requests are disabled from this chat room');
  }

  return github.getPullRequest(pullRequest)
    .catch(function (e) {
      throw Error('Failed to get pull request: ' + pullRequestURL);
    })
    .then(function (res) {
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
              'assignees': pullRequestAssignees
            }
          }));
        }
      }

      return Promise.all([
        github.getPullRequestFiles(pullRequest),
        github.getPullRequestCommits(pullRequest),
        config ? null : github.getRepoFile(pullRequest, pullReviewConfigPath, 'utf8')
          .catch(function () { return null; })
      ]);
    })
    .then(function (res) {
      pullRequestFiles = res[0];
      pullRequestCommits = res[1];
      repoPullReviewConfig = res[2];
      config = config || repoPullReviewConfig;

      if (!config) {
        throw Error('Missing configuration');
      }

      return getReviewers({
        'config': config,
        'files': pullRequestFiles,
        'commits': pullRequestCommits,
        'authorLogin': pullRequestRecord.data.user.login,
        'assignees': retryReview ? [] : pullRequestAssignees,
        'getBlameForFile': function (file) {
          return github.getBlameForCommitFile({
            'owner': pullRequest.owner,
            'repo': pullRequest.repo,
            //since only modified files are analyzed, the blame for those files is looked up on the original branch
            //of course the files could change significantly on the branch, however this at least filters out otherwise
            //unusable blame data that just points to the branch author
            'sha': pullRequestRecord.data.base.sha,
            'path': file.filename
          });
        }
      });
    })
    .then(function (reviewers) {
      if (!reviewers || !reviewers.length) {
        throw Error('No reviewers found: ' + pullRequestURL);
      }

      newPullRequestAssignees = reviewers.map(function (reviewer) {
        return reviewer.login;
      });

      var channels = ['github'];

      if (isChat && chatChannel) {
        channels.push(chatChannel);
      }

      actions.push(Action({
        'type': 'ASSIGN_USERS_TO_PULL_REQUEST',
        'payload': {
          'pullRequest': pullRequest,
          'assignees': newPullRequestAssignees,
          'reviewers': reviewers
        }
      }));

      channels.forEach(function (channel) {
        var channelUsers = reviewers.map(function (reviewer) {
          if (channel === 'hubot:slack') {
            return reviewer.notify.slack;
          }

          return reviewer.login;
        });

        actions.push(Action({
          'type': 'NOTIFY',
          'payload': {
            'pullRequest': pullRequest,
            'pullRequestRecord': pullRequestRecord,
            'users': channelUsers,
            'channel': channel
          }
        }));
      });

      return actions;
    });
};
