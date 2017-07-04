var yaml = require('js-yaml');

var SUPPORTED_CONFIG_VERSIONS = [1];

module.exports = function PullReviewConfig(input) {
  var config = input;

  if (typeof input === 'string') {
    config = yaml.safeLoad(input);
  }

  if (!config) {
    throw Error('Invalid config');
  }

  if (!config.version || SUPPORTED_CONFIG_VERSIONS.indexOf(config.version) === -1) {
    throw Error('Missing or unsupported config version. Supported versions include: ' + SUPPORTED_CONFIG_VERSIONS.join(', '));
  }

  function get(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  }

  var minReviewers = get(config.min_reviewers, 1);
  var maxReviewers = get(config.max_reviewers, 2);
  var maxFiles = get(config.max_files, 5);
  var maxFilesPerReviewer = get(config.max_files_per_reviewer, 0);
  var assignMinReviewersRandomly = get(config.assign_min_reviewers_randomly, true);
  var reviewers = get(config.reviewers, {});
  var reviewBlacklist = get(config.review_blacklist, []);
  var reviewPathFallbacks = get(config.review_path_fallbacks, null);
  var requireNotification = get(config.require_notification, true);

  if (minReviewers < 0 || minReviewers === Infinity) {
    throw Error('Invalid number of minimum reviewers');
  } else if (maxReviewers < 0 || maxReviewers === Infinity) {
    throw Error('Invalid number of maximum reviewers');
  } else if (minReviewers > maxReviewers) {
    throw Error('Minimum reviewers exceeds maximum reviewers');
  } else if (maxFiles < 0 || maxFiles === Infinity) {
    throw Error('Invalid number of maximum files');
  } else if (maxFilesPerReviewer < 0 || maxFilesPerReviewer === Infinity) {
    throw Error('Invalid number of maximum files per reviewer');
  }

  config = {
    'minReviewers': minReviewers,
    'maxReviewers': maxReviewers,
    'maxFiles': maxFiles,
    'maxFilesPerReviewer': maxFilesPerReviewer,
    'reviewers': reviewers,
    'reviewBlacklist': reviewBlacklist,
    'reviewPathFallbacks': reviewPathFallbacks,
    'requireNotification': requireNotification,
    'assignMinReviewersRandomly': assignMinReviewersRandomly
  };

  return Object.freeze(config);
};
