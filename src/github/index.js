var fs = require('fs');
var path = require('path');

var Promise = require('native-promise-only');
var Github = require('github');
Github.Promise = Github.Promise || Promise;
var debug = require('debug');

var BlameRange = require('../models/blame-range');

var GraphQLRequest = require('./graphql');

var log = debug('pull-review');

var graphQLQueries = ['git-blame', 'get-pull-request', 'get-user', 'get-review-requests', 'request-reviews'].reduce(function (map, file) {
  map[file] = fs.readFileSync(path.join(__dirname, file + '.graphql'), 'utf8');
  return map;
}, {});

var blameQuery = graphQLQueries['git-blame'];
var getPullRequestQuery = graphQLQueries['get-pull-request'];
var getUserQuery = graphQLQueries['get-user'];
var getReviewRequestsQuery = graphQLQueries['get-review-requests'];
var requestReviewsMutation = graphQLQueries['request-reviews'];

var github;
var token;

/**
 * Convert raw blame data into BlameRanges
 * @param {Object} blame - GitHub blame data
 * @returns {Array} list of BlameRanges
 */
function BlameRangeList(blame) {
  var ranges = blame.ranges;

  return ranges
    .filter(function(range) {
      return (
        range &&
        range.commit &&
        range.commit.author &&
        range.commit.author.user &&
        range.commit.author.user.login
      );
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

/**
 * Helper that converts URLs into GitHub resource objects
 * compatible with node-github
 * @param  {String} url - A GitHub resource URL
 * @return {Object} GitHub resource parsed from URL
 */
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

/**
 * NB: files are either added, modified, or removed
 * @param  {Object} resource - A GitHub resource
 * @return {Array} An array of pull request files
 */
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

/**
 * @param  {Object} resource - A GitHub resource
 * @return {BlameRangeList} list of Git blames in a file
 */
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
      log('[pull-review] getBlameForCommitFile', e);
      return null;
    });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {Array} assignees - An array of usernames to assign
 */
function assignUsersToPullRequest(resource, assignees) {
  return github.issues.addAssigneesToIssue({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    assignees: assignees
  });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {Array} assignees - An array of usernames to unassign
 */
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

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {String} body - Comment body
 */
function postPullRequestComment(resource, body) {
  return github.issues.createComment({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    body: body
  });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {String} path - A repo-root-relative file path
 * @return {String} UTF-8 encoded representation of the file at <path>
 */
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

/**
 * @param  {Object} resource - A GitHub resource
 */
function getPullRequest(resource) {
  return github.pullRequests.get(resource).then(function(res) {
    return res.data;
  });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @return {Array} A list of commits in a pull request
 */
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

/**
 * @param  {Object} resource - A GitHub resource
 * @return {Array} A list of pull request labels
 */
function getPullRequestLabels(resource) {
  return github.issues
    .getIssueLabels({
      owner: resource.owner,
      repo: resource.repo,
      number: resource.number
    })
    .then(function(res) {
      return res.data;
    });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @return {Array} A list of pull request review requests
 */
function getReviewRequests(resource) {
  return github.pullRequests
    .getReviewRequests({
      owner: resource.owner,
      repo: resource.repo,
      number: resource.number
    })
    .then(function(res) {
      return res.data;
    });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {Array} reviewers - List of GitHub usernames requested to review the resource
 * @return {Object} Updated GitHub resource
 */
function createReviewRequest(resource, reviewers) {
  return github.pullRequests.createReviewRequest({
    owner: resource.owner,
    repo: resource.repo,
    number: resource.number,
    reviewers: reviewers
  });
}

/**
 * @param  {Object} resource - A GitHub resource
 * @param  {Array} reviewers - List of GitHub usernames to remove from reviewing the resource
 * @return {Object} Updated GitHub resource
 */
function deleteReviewRequest(resource, reviewers) {
  /* The github package deleteReviewRequest method does not work here
   * because it serializes the parameters (i.e. reviewers) as query string
   * instead of as JSON payload. This is due to the github package's API
   * spec being out of date with the GitHub API as of October 2019.
   * Eventually, the latest octokit/rest package will be used instead.
   * Until then, deleting review requests is re-implemented with GraphQL.
   * GraphQL is used for all calls, ignoring node IDs in REST API responses.
   */

  var promises = [
    GraphQLRequest({
      token: token,
      query: getPullRequestQuery,
      variables: {
        owner: resource.owner,
        repo: resource.repo,
        pull: resource.number
      }
    }),
    GraphQLRequest({
      token: token,
      query: getReviewRequestsQuery,
      variables: {
        owner: resource.owner,
        repo: resource.repo,
        pull: resource.number
      }
    })
  ];

  var pullRequestId;

  return Promise.all(promises)
    .then(function (res) {
      pullRequestId = res[0].data.repository.pullRequest.id;
      var reviewRequests = res[1].data.repository.pullRequest.reviewRequests.nodes.map(function (res) {
        if (res.requestedReviewer.organization) {
          throw Error('Teams not yet supported for review requests');
        }

        return res.requestedReviewer.login;
      });

      var reviewersToKeep = reviewRequests.filter(function (existingReviewer) {
        return reviewers.indexOf(existingReviewer) === -1;
      });

      var reviewersToKeepIds = reviewersToKeep.map(function (reviewer) {
        return GraphQLRequest({
          token: token,
          query: getUserQuery,
          variables: {
            login: reviewer
          }
        })
          .then(function (res) {
            return res.data.user.id;
          })
      });

      return Promise.all(reviewersToKeepIds);
    })
    .then(function (res) {
      return GraphQLRequest({
        token: token,
        query: requestReviewsMutation,
        variables: {
          pullRequestId: pullRequestId,
          userIds: res
        }
      });
    });
}

/**
 * @param  {String} githubToken - A GitHub token with user and repo scopes
 */
module.exports = function(githubToken) {
  token =
    process.env.NODE_ENV === 'test'
      ? 'test'
      : process.env.PULL_REVIEW_GITHUB_TOKEN || githubToken;

  github = new Github({
    protocol: 'https'
  });

  github.authenticate({
    type: 'token',
    token: token
  });

  return {
    blameQuery: blameQuery,
    getPullRequestQuery: getPullRequestQuery,
    getUserQuery: getUserQuery,
    getReviewRequestsQuery: getReviewRequestsQuery,
    requestReviewsMutation: requestReviewsMutation,
    getPullRequest: getPullRequest,
    getPullRequestFiles: getPullRequestFiles,
    getPullRequestCommits: getPullRequestCommits,
    getBlameForCommitFile: getBlameForCommitFile,
    getRepoFile: getRepoFile,
    assignUsersToPullRequest: assignUsersToPullRequest,
    postPullRequestComment: postPullRequestComment,
    unassignUsersFromPullRequest: unassignUsersFromPullRequest,
    parseGithubURL: parseGithubURL,
    getPullRequestLabels: getPullRequestLabels,
    getReviewRequests: getReviewRequests,
    createReviewRequest: createReviewRequest,
    deleteReviewRequest: deleteReviewRequest
  };
};
