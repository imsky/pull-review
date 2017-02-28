require('native-promise-only');

var github = require('./github');
var BlameRangeList = github.BlameRangeList;

function Review (options) {
  var request = options.request;

  var isReview = request.isReview;
  var githubURLs = request.githubURLs || [];

  if (!isReview) {
    return Promise.resolve(null);
  }

  var pullRequest, pullRequestAuthorLogin;
  var maxFilesToReview = 10;
  var maxReviewers = 5;

  return Promise.resolve(true)
    .then(function () {
      if (!githubURLs.length) {
        throw Error('No GitHub URLs');
      } else if (githubURLs.length > 1) {
        throw Error('Only one GitHub URL can be reviewed at a time');
      }

      return github.getGithubResources(githubURLs)
    })
    .then(function (resources) {
      var resource = resources[0];

      if (resource.type !== 'pull') {
        throw Error('Reviews for resources other than pull requests are not supported');
      }

      pullRequest = resource;

      if (pullRequest.data.state !== 'open') {
        throw Error('Pull request is not open');
      }

      pullRequestAuthorLogin = pullRequest.data.user.login;

      var assignees = [];

      if (pullRequest.data.assignees) {
        assignees = pullRequest.data.assignees;
      } else if (pullRequest.data.assignee) {
        assignees.push(pullRequest.data.assignee);
      }

      assignees = assignees.filter(function (assignee) {
        return assignee.login !== pullRequestAuthorLogin;
      });

      if (assignees.length >= maxReviewers) {
        throw Error('Pull request already has reviewers assigned');
      }

      maxReviewers = maxReviewers - assignees.length;

      var getConfig = github.getRepoFile(resource, '.pull-review', 'utf8').catch(function () { return null; })

      return Promise.all([getConfig, github.getPullRequestFiles(pullRequest)]);
    })
    .then(function (res) {
      var config = res[0];
      var files = res[1];

      files = files || [];

      files = files.filter(function (file) {
        return file.status === 'modified';
      });

      files.sort(function (a, b) {
        return b.changes - a.changes;
      });

      var topChangedFiles = files.slice(0, maxFilesToReview);

      return Promise.all(topChangedFiles.map(function (file) {
        return github.getBlameForCommitFile({
          'owner': pullRequest.owner,
          'repo': pullRequest.repo,
          'sha': pullRequest.data.head.sha,
          'path': file.filename
        });
      }));
    })
    .then(function (blames) {
      //todo: factor this block out into separate file
      var authorsLinesChanged = {};

      for (var i = 0; i < blames.length; i++) {
        var blame = blames[i] || {};

        var ranges = BlameRangeList({
          'blame': blame
        });

        ranges.sort(function (a, b) {
          return a.age - b.age;
        });

        var nonAuthorBlames = ranges.filter(function (range) {
          return range.login !== pullRequestAuthorLogin;
        });

        var recentBlames = nonAuthorBlames.slice(0, Math.ceil(nonAuthorBlames.length * 0.75));

        for(var j = 0; j < recentBlames.length; j++) {
          var range = recentBlames[j];
          var linesChanged = range.count;
          var author = range.login;

          if (!authorsLinesChanged[author]) {
            authorsLinesChanged[author] = 0;
          }

          authorsLinesChanged[author] += linesChanged;
        }
      }

      var authorBlames = [];

      for(var author in authorsLinesChanged) {
        if (authorsLinesChanged.hasOwnProperty(author)) {
          authorBlames.push({
            'login': author,
            'count': authorsLinesChanged[author] || 0
          });
        }
      }

      authorBlames.sort(function (a, b) {
        return b.count - a.count;
      });

      return authorBlames.slice(0, maxReviewers);
    })
      .then(function (reviewers) {
        if (!reviewers.length) {
          throw Error('No reviewers found');
        }

        return {
          'reviewers': reviewers,
          'config': null
        };
      });

    //todo: filter out blacklisted authors, filter out authors that can't be notified
}

module.exports = Review;