var fs = require('fs');
var path = require('path');

require('native-promise-only');

var Github = require('github');

var config = require('../config');

var GraphQLRequest = require('./graphql');
var BlameRangeList = require('./blame-range-list');

var TEST = config.TEST;
var GITHUB_TOKEN = TEST ? 'test' : config.GITHUB_TOKEN;

var queries = ['git-blame'];

queries = queries.reduce(function (map, name) {
  map[name] = fs.readFileSync(path.join(__dirname, name + '.graphql'), 'utf8');
  return map;
}, {});

var github = new Github({
  'protocol': 'https'
});

github.authenticate({
  'type': 'token',
  'token': GITHUB_TOKEN
});

function parseGithubPath (path) {
  var parts = path.split('/').filter(function (p) {
    return p.length > 0;
  });

  return {
    'owner': parts[0],
    'repo': parts[1],
    'type': parts[2],
    'number': parts[3]
  };
}

function getGithubResource(type, req) {
  var nothing = Promise.resolve({});

  if (type === 'pull') {
    return github.pullRequests.get(req);
  } else if (type === 'issues') {
    return github.issues.get(req);
  }

  return nothing;
}

function fetchGithubResourceData (resource) {
  var req = {
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number
  };

  var ret = Promise.resolve(null);

  if (resource.number !== undefined) {
    ret = getGithubResource(resource.type, req);
  }

  return ret.then(function (response) {
    if (!response) {
      return response;
    }

    resource.data = response.data;
    return resource;
  });
}

function getGithubResources (githubURLs) {
  var githubResources = githubURLs.map(function (uo) {
    return parseGithubPath(uo.path);
  });

  return Promise.all(githubResources.map(fetchGithubResourceData));
}

function getPullRequestFiles (resource) {
  return github.pullRequests.getFiles({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'per_page': 100
  })
    .then(function (res) {
      return res.data;
    });
}

function getBlameForCommitFile (resource) {
  var query = queries['git-blame'];

  return GraphQLRequest({
    'token': GITHUB_TOKEN,
    'query': query,
    'variables': {
      'owner': resource.owner,
      'repo': resource.repo,
      'sha': resource.sha,
      'path': resource.path
    }
  })
    .then(function (res) {
      return res.data.repository.object.blame;
    })
    .catch(function (err) {
      return null;
    });
}

function assignUsersToResource (resource, assignees) {
  return github.issues.addAssigneesToIssue({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'assignees': assignees
  });
}

function postPullRequestComment (resource, body) {
  return github.pullRequests.createComment({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'body': body
  });
}

module.exports = {
  'getGithubResources': getGithubResources,
  'getPullRequestFiles': getPullRequestFiles,
  'getBlameForCommitFile': getBlameForCommitFile,
  'assignUsersToResource': assignUsersToResource,
  'postPullRequestComment': postPullRequestComment,
  'BlameRangeList': BlameRangeList
};
