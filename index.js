var yaml = require('js-yaml');
var Promise = require('native-promise-only');

var SUPPORTED_CONFIG_VERSIONS = [1];

//todo: jsdoc
//todo: AUTHORS/OWNERS integration
//todo: review stategy: blame/random

function BlameRange (input) {
  var login = input.login;
  var count = input.count;
  var age = input.age;

  if (!login || !count || !age) {
    throw Error('Missing blame range data');
  }

  return input;
}

function PullRequestFile(input) {
  var filename = input.filename;
  var status = input.status;
  var changes = input.changes;

  if (!filename || !status || changes === undefined) {
    throw Error('Missing file data');
  }

  return input;
}

function PullReviewConfig (input) {
  var config = input;
  var yamlParseError, jsonParseError;

  if (typeof input === 'string') {
    config = yaml.safeLoad(input);
  }

  if (!config) {
    throw Error('Invalid config');
  }

  if (!config.version || SUPPORTED_CONFIG_VERSIONS.indexOf(config.version) === -1) {
    throw Error('Missing or unsupported config version. Supported versions include: ' + SUPPORTED_CONFIG_VERSIONS.join(', '));
  }

  function get (value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  }

  var minReviewers = get(config.min_reviewers, 1);
  var maxReviewers = get(config.max_reviewers, 2);
  var assignMinReviewersRandomly = get(config.assign_min_reviewers_randomly, true);
  var maxFiles = get(config.max_files, 5);
  var reviewers = get(config.reviewers, {});
  var reviewBlacklist = get(config.review_blacklist, []);
  var requireNotification = get(config.require_notification, true);

  if (minReviewers < 0) {
    throw Error('Invalid number of minimum reviewers');
  } else if (maxReviewers < 0) {
    throw Error('Invalid number of maximum reviewers');
  } else if (minReviewers > maxReviewers) {
    throw Error('Minimum reviewers exceeds maximum reviewers');
  } else if (maxFiles < 0) {
    throw Error('Invalid number of maximum files');
  }

  config = {
    'minReviewers': minReviewers,
    'maxReviewers': maxReviewers,
    'maxFiles': maxFiles,
    'reviewers': reviewers,
    'reviewBlacklist': reviewBlacklist,
    'requireNotification': requireNotification,
    'assignMinReviewersRandomly': assignMinReviewersRandomly
  };

  return config;
}

function PullReviewAssignment (options) {
  var config = options.config || {'version': 1};
  var files = options.files || [];
  var assignees = options.assignees || [];
  var authorLogin = options.authorLogin;
  var getBlameForFile = options.getBlameForFile;

  if (!getBlameForFile) {
    throw Error('No function provided for retrieving blame for a file');
  } else if (!authorLogin) {
    throw Error('No pull request author provided');
  }

  config = PullReviewConfig(config);

  files = files.map(PullRequestFile);

  files = files.filter(function (file) {
    return file.status === 'modified';
  });

  files.sort(function (a, b) {
    return b.changes - a.changes;
  });

  var topChangedFiles = config.maxFiles > 0 ? files.slice(0, config.maxFiles) : files;

  var maxReviewers = config.maxReviewers;

  assignees = assignees.filter(function (assignee) {
    return assignee !== authorLogin;
  });

  if (assignees.length >= maxReviewers) {
    throw Error('Pull request has max reviewers assigned');
  }

  maxReviewers = maxReviewers - assignees.length;

  return Promise.all(topChangedFiles.map(getBlameForFile))
    .then(function (blames) {
      var authorsLinesChanged = {};

      for (var i = 0; i < blames.length; i++) {
        var ranges = (blames[i] || []).map(BlameRange);

        ranges.sort(function (a, b) {
          return a.age - b.age;
        });

        var usableBlames = ranges.filter(function (range) {
          var blameAuthorIsPullRequestAuthor = range.login === authorLogin;
          var blameAuthorIsBlacklisted = false;
          var blameAuthorIsUnreachable = false;

          if (config && config.reviewBlacklist) {
            blameAuthorIsBlacklisted = config.reviewBlacklist.indexOf(range.login) !== -1;
          } 

          if (config && config.reviewers) {
            blameAuthorIsUnreachable = !config.reviewers[range.login];
          }

          var blameIsUnusable = blameAuthorIsPullRequestAuthor || blameAuthorIsBlacklisted || (config.requireNotification && blameAuthorIsUnreachable);

          return !blameIsUnusable;
        });

        var recentBlames = usableBlames.slice(0, Math.ceil(usableBlames.length * 0.75));

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
      .then(function(reviewers) {
        return reviewers.map(function (reviewer) {
          reviewer.notify = config.reviewers[reviewer.login];
          return reviewer;
        });
      });
}

module.exports = {
  'PullReviewConfig': PullReviewConfig,
  'PullReviewAssignment': PullReviewAssignment
};