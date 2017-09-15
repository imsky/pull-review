var yaml = require('js-yaml');

var SUPPORTED_CONFIG_VERSIONS = [1, 2];

module.exports = function PullReviewConfig(input) {
  if (typeof input === 'string') {
    input = yaml.safeLoad(input);
  }

  if (!input) {
    throw Error('Invalid config');
  }

  if (!input.version || SUPPORTED_CONFIG_VERSIONS.indexOf(input.version) === -1) {
    throw Error('Missing or unsupported config version. Supported versions include: ' + SUPPORTED_CONFIG_VERSIONS.join(', '));
  }

  function get(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  }

  var minReviewers = get(input.min_reviewers, 1);
  var maxReviewers = get(input.max_reviewers, 2);
  var maxFiles = get(input.max_files, 5);
  var maxFilesPerReviewer = get(input.max_files_per_reviewer, 0);
  var maxLinesPerReviewer = get(input.max_lines_per_reviewer, 0);
  var assignMinReviewersRandomly = get(input.assign_min_reviewers_randomly, true);
  var reviewers = get(input.reviewers, {});
  var reviewBlacklist = get(input.review_blacklist, []);
  var reviewPathFallbacks = get(input.review_path_fallbacks, null);
  var requireNotification = get(input.require_notification, true);

  if (minReviewers < 0 || minReviewers === Infinity) {
    throw Error('Invalid number of minimum reviewers');
  } else if (maxReviewers < 0 || maxReviewers === Infinity) {
    throw Error('Invalid number of maximum reviewers');
  } else if (minReviewers > maxReviewers) {
    throw Error('Minimum reviewers exceeds maximum reviewers');
  } else if (maxFiles < 0 || maxFiles === Infinity) {
    throw Error('Invalid number of maximum files');
  } else if (maxFilesPerReviewer < 0 || maxFilesPerReviewer === Infinity || (maxFilesPerReviewer > 0 && maxFilesPerReviewer < 1)) {
    throw Error('Invalid number of maximum files per reviewer');
  } else if (maxLinesPerReviewer < 0 || maxLinesPerReviewer === Infinity || (maxLinesPerReviewer > 0 && maxLinesPerReviewer < 1)) {
    throw Error('Invalid number of maximum lines per reviewer');
  }

  return Object.freeze({
    'minReviewers': minReviewers,
    'maxReviewers': maxReviewers,
    'maxFiles': maxFiles,
    'maxFilesPerReviewer': maxFilesPerReviewer,
    'maxLinesPerReviewer': maxLinesPerReviewer,
    'reviewers': reviewers,
    'reviewBlacklist': reviewBlacklist,
    'reviewPathFallbacks': reviewPathFallbacks,
    'requireNotification': requireNotification,
    'assignMinReviewersRandomly': assignMinReviewersRandomly
  });
};
