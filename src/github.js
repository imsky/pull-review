var Github = require('github');

var config =  require('./config');

var TEST = config.TEST;

var github = new Github({
  'protocol': 'https'
});

if (!TEST) {
  github.authenticate({
    'type': 'token',
    'token': config.GITHUB_TOKEN
  }); 
}

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

  if (TEST) {
    return nothing;
  }

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

module.exports = {
  'getGithubResources': getGithubResources
};
