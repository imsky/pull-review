var fs = require('fs');
var path = require('path');

require('native-promise-only');

var Github = require('github');

var GraphQLRequest = require('./graphql');

var TEST = process.env.NODE_ENV === 'test';
var GITHUB_TOKEN = TEST ? 'test' : process.env.GITHUB_TOKEN;

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

function parseGithubPath (path) {
  var parts = path.split('/').filter(function (p) {
    return p.length > 0;
  });

  var type = parts[2];

  if (type === 'issues') {
    type = 'issue';
  }

  return {
    'owner': parts[0],
    'repo': parts[1],
    'type': type,
    'number': parts[3]
  };
}

function getGithubResource(type, req) {
  var nothing = Promise.resolve({});

  if (type === 'pull') {
    return github.pullRequests.get(req);
  } else if (type === 'issue') {
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
      var blame = res.data.repository.object.blame;
      return BlameRangeList({'blame': blame});
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

module.exports = {
  'getGithubResources': getGithubResources,
  'getPullRequestFiles': getPullRequestFiles,
  'getBlameForCommitFile': getBlameForCommitFile,
  'getRepoFile': getRepoFile,
  'assignUsersToResource': assignUsersToResource,
  'postPullRequestComment': postPullRequestComment
};
