var shuffle = require('knuth-shuffle');
var Promise = require('native-promise-only');

var BlameRange = require('./models/blame-range');
var PullRequestFile = require('./models/pull-request-file');
var Config = require('./models/config');

module.exports = function PullReviewAssignment(options) {
  options = options || {};
  var config = options.config || {
    'version': 2
  };
  var files = options.files || [];
  var assignees = options.assignees || [];
  var authorLogin = options.authorLogin;
  var getBlameForFile = options.getBlameForFile;
  var currentReviewers = {};

  if (!getBlameForFile) {
    throw Error('No function provided for retrieving blame for a file');
  } else if (!authorLogin) {
    throw Error('No pull request author provided');
  }

  config = Config(config);

  files = files.map(PullRequestFile);

  var modifiedFiles = files.filter(function(file) {
    return file.status === 'modified';
  });

  modifiedFiles.sort(function(a, b) {
    return b.changes - a.changes;
  });

  var topModifiedFiles = config.maxFiles > 0 ? modifiedFiles.slice(0, config.maxFiles) : modifiedFiles;

  var maxReviewers = config.maxReviewers;
  var minReviewers = config.minReviewers;
  var maxFilesPerReviewer = config.maxFilesPerReviewer;

  assignees = assignees.filter(function(assignee) {
    return assignee !== authorLogin;
  });

  if (assignees.length >= maxReviewers) {
    throw Error('Pull request has maximum reviewers assigned');
  } else if (assignees.length >= minReviewers) {
    throw Error('Pull request has minimum reviewers assigned');
  }

  var unassignedReviewers = maxReviewers - assignees.length;
  var maxNeededReviewers = maxFilesPerReviewer > 0 ? Math.ceil(files.length / maxFilesPerReviewer) : unassignedReviewers;
  var maxReviewersAssignable = Math.min(unassignedReviewers, maxNeededReviewers);
  var minReviewersAssignable = maxFilesPerReviewer > 0 ? maxReviewersAssignable : minReviewers;

  function isEligibleReviewer(reviewer) {
    var isReviewerSelected = currentReviewers[reviewer];
    var isReviewerAuthor = reviewer === authorLogin;
    var isReviewerUnreachable = (config.requireNotification ? !config.reviewers[reviewer] : false);
    var isReviewerBlacklisted = config.reviewBlacklist && config.reviewBlacklist.indexOf(reviewer) !== -1;
    return !isReviewerSelected && !isReviewerAuthor && !isReviewerBlacklisted && !isReviewerUnreachable;
  }

  return Promise.all(topModifiedFiles.map(getBlameForFile))
    .then(function(blames) {
      var authorsLinesChanged = {};

      for (var i = 0; i < blames.length; i++) {
        var ranges = (blames[i] || []).map(BlameRange);

        ranges.sort(function(a, b) {
          return a.age - b.age;
        });

        var usableBlames = ranges.filter(function(range) {
          return isEligibleReviewer(range.login);
        });

        var recentBlames = usableBlames.slice(0, Math.ceil(usableBlames.length * 0.75));

        recentBlames.forEach(function (range) {
          var linesChanged = range.count;
          var author = range.login;

          if (!authorsLinesChanged[author]) {
            authorsLinesChanged[author] = 0;
          }

          authorsLinesChanged[author] += linesChanged;
        });
      }

      var authorBlames = [];

      Object.keys(authorsLinesChanged || {}).forEach(function (author) {
        authorBlames.push({
          'login': author,
          'count': authorsLinesChanged[author] || 0,
          'source': 'blame'
        });
      });

      authorBlames.sort(function(a, b) {
        return b.count - a.count;
      });

      return authorBlames.slice(0, maxReviewersAssignable);
    })
    .then(function(reviewers) {
      var fallbackReviewers = [];
      var randomReviewers = [];

      reviewers.forEach(function (reviewer) {
        currentReviewers[reviewer.login] = true;
      });

      if (reviewers.length < minReviewersAssignable && config.assignMinReviewersRandomly && config.reviewPathFallbacks) {
        Object.keys(config.reviewPathFallbacks || {}).forEach(function (prefix) {
          files.forEach(function (file) {
            if (file.filename.indexOf(prefix) === 0) {
              var fallbackAuthors = config.reviewPathFallbacks[prefix] || [];

              fallbackAuthors.forEach(function (author) {
                if (!isEligibleReviewer(author)) {
                  return;
                }

                fallbackReviewers.push({
                  'login': author,
                  'count': 0,
                  'source': 'fallback'
                });

                currentReviewers[author] = true;
              });
            }
          });
        });

        shuffle.knuthShuffle(fallbackReviewers);
        reviewers = reviewers.concat(fallbackReviewers.slice(0, minReviewersAssignable - reviewers.length));
      }

      if (reviewers.length < minReviewersAssignable && config.assignMinReviewersRandomly) {
        Object.keys(config.reviewers || {}).forEach(function (author) {
          if (!isEligibleReviewer(author)) {
            return;
          }

          randomReviewers.push({
            'login': author,
            'count': 0,
            'source': 'random'
          });

          currentReviewers[author] = true;
        });

        shuffle.knuthShuffle(randomReviewers);
        reviewers = reviewers.concat(randomReviewers.slice(0, minReviewersAssignable - reviewers.length));
      }

      return reviewers;
    })
    .then(function (reviewers) {
      return reviewers.map(function (reviewer) {
        reviewer.notify = config.reviewers[reviewer.login];
        return reviewer;
      });
    });
};