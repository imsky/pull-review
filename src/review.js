require('native-promise-only');

var github = require('./github');

function Review (options) {
  var request = options.request;

  var isReview = request.isReview;
  var githubURLs = request.githubURLs || [];

  if (!isReview) {
    return Promise.resolve(null);
  }

  if (!githubURLs.length) {
    throw Error('No GitHub URLs');
  } else if (githubURLs.length > 1) {
    throw Error('Only one GitHub URL can be reviewed at a time');
  }

  var pullRequest;
  var maxFilesToReview = 10;
  var maxReviewers = 5;

  //todo: get config file from pull request repo

  return github.getGithubResources(githubURLs)
    .then(function (resources) {
      if (!resources.length) {
        throw Error('Could not find GitHub resources');
      }

      var resource = resources[0];

      if (resource.type !== 'pull') {
        throw Error('Reviews for resources other than pull requests are not supported');
      }

      if (resource.data.state !== 'open') {
        throw Error('GitHub resource state is not open');
      }

      pullRequest = resource;
      return github.getPullRequestFiles(pullRequest);
    })
    .then(function (files) {
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
      var authorsLinesChanged = {};
      //todo: error out if login is not available
      var pullRequestAuthorLogin = pullRequest.data.user.login;

      for (var i = 0; i < blames.length; i++) {
        var blame = blames[i] || {};
        var ranges = blame.ranges || [];

        ranges.sort(function (a, b) {
          return a.age - b.age;
        });

        var nonAuthorBlames = ranges.filter(function (range) {
          if (range.commit.author.user) {
            return range.commit.author.user.login !== pullRequestAuthorLogin;
          }
        })

        var recentBlames = nonAuthorBlames.slice(0, Math.floor(nonAuthorBlames.length * 0.75));

        for(var j = 0; j < recentBlames.length; j++) {
          var range = recentBlames[j];
          var linesChanged = range.endingLine - range.startingLine + 1;
          var author = range.commit.author.user.login;

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
        console.log(reviewers)
      });

    //todo: filter out blacklisted authors, filter out authors that can't be notified
    //todo: assign up to max number of reviewers, post comment on github tagging reviewers
}

module.exports = Review;