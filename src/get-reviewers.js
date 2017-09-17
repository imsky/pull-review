var shuffle = require('knuth-shuffle');
var Promise = require('native-promise-only');

var BlameRange = require('./models/blame-range');
var PullRequestFile = require('./models/pull-request-file');
var Config = require('./models/config');

module.exports = function getReviewers (options) {
  options = options || {};
  var config = options.config || {
    'version': 2
  };
  var files = options.files || [];
  var commits = options.commits || [];
  var assignees = options.assignees || [];
  var authorLogin = options.authorLogin;
  var getBlameForFile = options.getBlameForFile;

  if (!getBlameForFile) {
    throw Error('No function provided for retrieving blame for a file');
  } else if (!authorLogin) {
    throw Error('No pull request author provided');
  }

  config = Config(config);

  var maxReviewers = config.maxReviewers;
  var minReviewers = config.minReviewers;
  var maxFilesPerReviewer = config.maxFilesPerReviewer;
  var maxLinesPerReviewer = config.maxLinesPerReviewer;
  var maxReviewersAssignedDynamically = maxFilesPerReviewer > 0 || maxLinesPerReviewer > 0;
  var minAuthorsOfChangedFiles = config.minAuthorsOfChangedFiles;

  files = files.map(PullRequestFile);

  var nonRemovedFiles = files.filter(function (file) {
    return files.status !== 'removed';
  });

  var changedLines = Math.abs(nonRemovedFiles.reduce(function (sum, file) {
    return sum + (file.additions - file.deletions);
  }, 0));

  var modifiedFiles = files.filter(function(file) {
    return file.status === 'modified';
  });

  modifiedFiles.sort(function(a, b) {
    return b.changes - a.changes;
  });

  var topModifiedFiles = config.maxFiles > 0 ? modifiedFiles.slice(0, config.maxFiles) : modifiedFiles;

  var currentReviewers = {};
  var excludedReviewers = {};
  var currentCommitters = {};

  commits.forEach(function (commit) {
    currentCommitters[commit.author.login] = true;
  });

  assignees = assignees.filter(function(assignee) {
    return assignee !== authorLogin;
  });

  if (assignees.length >= maxReviewers) {
    throw Error('Pull request has maximum reviewers assigned');
  } else if (assignees.length >= minReviewers) {
    throw Error('Pull request has minimum reviewers assigned');
  }

  var unassignedReviewers = maxReviewers - assignees.length;
  var maxNeededReviewers = unassignedReviewers;

  var maxReviewersUsingLines = maxLinesPerReviewer > 0 ? Math.ceil(changedLines / maxLinesPerReviewer) : 0;
  var maxReviewersUsingFiles = maxFilesPerReviewer > 0 ? Math.ceil(files.length / maxFilesPerReviewer) : 0;

  if (maxReviewersAssignedDynamically) {
    if (!maxFilesPerReviewer && maxLinesPerReviewer) {
      maxNeededReviewers = maxReviewersUsingLines;
    } else if (!maxLinesPerReviewer && maxFilesPerReviewer) {
      maxNeededReviewers = maxReviewersUsingFiles;
    } else {
      maxNeededReviewers = Math.min(maxReviewersUsingLines, maxReviewersUsingFiles);
    }
  }

  var maxReviewersAssignable = Math.min(unassignedReviewers, maxNeededReviewers);
  var minReviewersAssignable = maxReviewersAssignedDynamically ? maxReviewersAssignable : minReviewers;
  var uniqueAuthors = 0;

  function isEligibleReviewer(reviewer) {
    var isReviewerSelected = currentReviewers[reviewer];
    var isReviewerCurrentCommitter = currentCommitters[reviewer];
    var isReviewerAuthor = reviewer === authorLogin;
    var isReviewerUnreachable = (config.requireNotification ? !config.reviewers[reviewer] : false);
    var isReviewerBlacklisted = config.reviewBlacklist && config.reviewBlacklist.indexOf(reviewer) !== -1;
    var isReviewerExcluded = excludedReviewers[reviewer];
    return !isReviewerCurrentCommitter &&
      !isReviewerUnreachable &&
      !isReviewerBlacklisted &&
      !isReviewerExcluded &&
      !isReviewerSelected &&
      !isReviewerAuthor;
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

      uniqueAuthors = Object.keys(authorsLinesChanged).length;

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

      if (uniqueAuthors < minAuthorsOfChangedFiles && reviewers.length >= minReviewersAssignable && reviewers.length) {
        //unassign one random reviewer if there are already enough reviewers
        reviewers = reviewers.slice(0, maxReviewersAssignable);
        var excludedReviewerIndex = Math.floor(Math.random() * reviewers.length);
        excludedReviewers[reviewers[excludedReviewerIndex].login] = true;
        reviewers[excludedReviewerIndex] = null;
        reviewers = reviewers.filter(Boolean);
      }

      reviewers.forEach(function (reviewer) {
        currentReviewers[reviewer.login] = true;
      });

      if (reviewers.length < minReviewersAssignable && config.assignMinReviewersRandomly) {
        Object.keys(config.reviewPathFallbacks || {})
          .sort(function (a, b) {
            return b.length - a.length;
          })
          .forEach(function (prefix) {
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
