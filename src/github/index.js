var fs = require('fs');
var path = require('path');

var Promise = require('native-promise-only');
var Github = require('github');
Github.Promise = Github.Promise || Promise;

var BlameRange = require('../models/blame-range');

var GraphQLRequest = require('./graphql');

var blameQuery = fs.readFileSync(path.join(__dirname, 'git-blame.graphql'), 'utf8');

var github;
var token;

function BlameRangeList(blame) {
  var ranges = blame.ranges;

  return ranges
    .filter(function (range) {
      return  range &&
              range.commit &&
              range.commit.author &&
              range.commit.author.user &&
              range.commit.author.user.login;
    })
    .map(function(range) {
      return BlameRange({
        age: range.age,
        count: range.endingLine - range.startingLine + 1,
        login: range.commit.author.user.login
      });
    })
    .filter(Boolean);
}

function parseGithubURL(url) {
  var githubUrlRe = /github\.com\/([^/]+)\/([^/]+)\/pull\/([0-9]+)/;
  var match = url.match(githubUrlRe);

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2],
    number: match[3]
  };
}

//NB: files are either added, modified, or removed
function getPullRequestFiles(resource) {
  return github.pullRequests
    .getFiles({
      owner: resource.owner,
      repo: resource.repo,
      number: resource.number,
      per_page: 100
    })
    .then(function(res) {
      return res.data;
    });
}

function getBlameForCommitFile(resource) {
  return GraphQLRequest({
    token: token,
    query: blameQuery,
    variables: {
      owner: resource.owner,
      repo: resource.repo,
      sha: resource.sha,
      path: resource.path
    }
  })
    .then(function(res) {
      return BlameRangeList(res.data.repository.object.blame);
    })
    .catch(function(e) {
      console.error('[pull-review] getBlameForCommitFile', e);
      return null;
    });
}

function assignUsersToPullRequest(resource, assignees) {
  return github.issues.addAssigneesToIssue({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    assignees: assignees
  });
}

function unassignUsersFromPullRequest(resource, assignees) {
  return github.issues.removeAssigneesFromIssue({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    body: {
      assignees: assignees
    }
  });
}

function postPullRequestComment(resource, body) {
  return github.issues.createComment({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    body: body
  });
}

function getRepoFile(resource, path) {
  return github.repos
    .getContent({
      owner: resource.owner,
      repo: resource.repo,
      path: path
    })
    .then(function(res) {
      var buffer = new Buffer(res.data.content, 'base64');
      return buffer.toString('utf8');
    });
}

function getPullRequest(options) {
  return github.pullRequests.get(options);
}

function getPullRequestCommits(resource) {
  return github.pullRequests
    .getCommits({
      owner: resource.owner,
      repo: resource.repo,
      number: resource.number,
      per_page: 100
    })
    .then(function(res) {
      return res.data;
    });
}

module.exports = function (githubToken) {
  token = process.env.NODE_ENV === 'test' ? 'test' : process.env.PULL_REVIEW_GITHUB_TOKEN || githubToken;

  github = new Github({
    protocol: 'https'
  });

  github.authenticate({
    type: 'token',
    token: token
  });

  return {
    blameQuery: blameQuery,
    getPullRequest: getPullRequest,
    getPullRequestFiles: getPullRequestFiles,
    getPullRequestCommits: getPullRequestCommits,
    getBlameForCommitFile: getBlameForCommitFile,
    getRepoFile: getRepoFile,
    assignUsersToPullRequest: assignUsersToPullRequest,
    postPullRequestComment: postPullRequestComment,
    unassignUsersFromPullRequest: unassignUsersFromPullRequest,
    parseGithubURL: parseGithubURL
  }
};
