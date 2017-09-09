var fs = require('fs');
var path = require('path');

var Github = require('github');

var GraphQLRequest = require('./graphql');

var GITHUB_TOKEN = process.env.NODE_ENV === 'test' ? 'test' : process.env.PULL_REVIEW_GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw Error('Missing GitHub token');
}

//todo: remove queries
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

//todo: use BlameRange
function BlameRangeList (options) {
  var blame = options.blame || {};
  var ranges = blame.ranges || [];

  return ranges.map(function (range) {
    if (!range.commit.author.user) {
      return null;
    }

    return {
      'age': range.age,
      'count': range.endingLine - range.startingLine + 1,
      'login': range.commit.author.user.login
    };
  }).filter(Boolean);
}

function parseGithubURL (url) {
  var githubUrlRe = /github\.com\/([^/]+)\/([^/]+)\/pull\/([0-9]+)/;
  var match = url.match(githubUrlRe);

  if (!match) {
    return null;
  }

  return {
    'owner': match[1],
    'repo': match[2],
    'number': match[3]
  };
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
      var blame = res.data.repository.object.blame;
      return BlameRangeList({'blame': blame});
    })
    .catch(function () {
      return null;
    });
}

function assignUsersToPullRequest (resource, assignees) {
  assignees = assignees || [];

  for(var i = 0; i < assignees.length; i++) {
    if (typeof assignees[i] !== 'string') {
      throw Error('Assignees must be specified as strings');
    }
  }

  return github.issues.addAssigneesToIssue({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'assignees': assignees
  });
}


function unassignUsersFromPullRequest (resource, assignees) {
  assignees = assignees || [];

  return github.issues.removeAssigneesFromIssue({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'body': {
      'assignees': assignees
    }
  });
}

function postPullRequestComment (resource, body) {
  return github.issues.createComment({
    'owner': resource.owner,
    'repo': resource.repo,
    'number': resource.number,
    'body': body
  });
}

function getRepoFile (resource, path, encoding) {
  return github.repos.getContent({
    'owner': resource.owner,
    'repo': resource.repo,
    'path': path
  })
    .then(function (res) {
      if (encoding) {
        var buffer = new Buffer(res.data.content, 'base64');
        return buffer.toString(encoding);
      }

      return res.data.content;
    });
}

function getPullRequest(options) {
  return github.pullRequests.get(options);
}

module.exports = {
  'getPullRequest': getPullRequest,
  'getPullRequestFiles': getPullRequestFiles,
  'getBlameForCommitFile': getBlameForCommitFile,
  'getRepoFile': getRepoFile,
  'assignUsersToPullRequest': assignUsersToPullRequest,
  'postPullRequestComment': postPullRequestComment,
  'unassignUsersFromPullRequest': unassignUsersFromPullRequest,
  'parseGithubURL': parseGithubURL
};
