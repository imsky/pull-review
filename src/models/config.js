var yaml = require('js-yaml');

var SUPPORTED_CONFIG_VERSIONS = [1];

module.exports = function PullReviewConfig(input) {
  var PUBLIC_MODE = process.env.PUBLIC_MODE;

  if (typeof input === 'string') {
    input = yaml.safeLoad(input);
  }

  if (!input) {
    throw Error('Invalid config');
  }

  if (
    !input.version ||
    SUPPORTED_CONFIG_VERSIONS.indexOf(input.version) === -1
  ) {
    throw Error(
      'Missing or unsupported config version. Supported versions include: ' +
        SUPPORTED_CONFIG_VERSIONS.join(', ')
    );
  }

  /**
   * @param  value - config parameter
   * @param  defaultValue - what to use as a default value for config parameter
   */
  function get(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  }

  var minReviewers = get(input.min_reviewers, 1);
  var maxReviewers = get(input.max_reviewers, 2);
  var maxFiles = get(input.max_files, 5);
  var maxFilesPerReviewer = get(input.max_files_per_reviewer, 0);
  var maxLinesPerReviewer = get(input.max_lines_per_reviewer, 0);
  var assignMinReviewersRandomly = get(
    input.assign_min_reviewers_randomly,
    true
  );
  var minAuthorsOfChangedFiles = get(input.min_authors_of_changed_files, 0);
  var minLinesChangedForExtraReviewer = get(
    input.min_lines_changed_for_extra_reviewer,
    0
  );
  var minPercentAuthorshipForExtraReviewer = get(input.min_percent_authorship_for_extra_reviewer, 0);
  var reviewers = get(input.reviewers, {});
  var reviewBlacklist = get(input.review_blacklist, []);
  var reviewPathFallbacks = get(input.review_path_fallbacks, null);
  var requireNotification = get(input.require_notification, true);
  var fileBlacklist = get(input.file_blacklist, []);
  var reviewPathAssignments = get(input.review_path_assignments, null);
  var labelWhitelist = get(input.label_whitelist, []);
  var labelBlacklist = get(input.label_blacklist, []);
  var useReviewRequests = get(input.use_review_requests, false);
  var notificationChannels = get(input.notification_channels, ['github', 'chat']);

  if (minReviewers < 1) {
    throw Error('Invalid number of minimum reviewers');
  } else if (maxReviewers < 0) {
    throw Error('Invalid number of maximum reviewers');
  } else if (minReviewers > maxReviewers) {
    throw Error('Minimum reviewers exceeds maximum reviewers');
  } else if (maxFiles < 0) {
    throw Error('Invalid number of maximum files');
  } else if (
    maxFilesPerReviewer < 0 ||
    (maxFilesPerReviewer > 0 && maxFilesPerReviewer < 1)
  ) {
    throw Error('Invalid number of maximum files per reviewer');
  } else if (
    maxLinesPerReviewer < 0 ||
    (maxLinesPerReviewer > 0 && maxLinesPerReviewer < 1)
  ) {
    throw Error('Invalid number of maximum lines per reviewer');
  } else if (minAuthorsOfChangedFiles < 0) {
    throw Error('Invalid number of minimum authors of changed files');
  } else if (minLinesChangedForExtraReviewer < 0) {
    throw Error('Invalid number of minimum lines changed for extra reviewer');
  }  else if (minPercentAuthorshipForExtraReviewer < 0 || minPercentAuthorshipForExtraReviewer > 100) {
    throw Error('Invalid minimum percentage of authorship for extra reviewer')
  } else if (!Array.isArray(reviewBlacklist)) {
    throw Error('Review blacklist must be an array');
  } else if (!Array.isArray(fileBlacklist)) {
    throw Error('File blacklist must be an array');
  } else if (Object(reviewers) !== reviewers) {
    throw Error('Invalid reviewers specification, expected object');
  }

  if (PUBLIC_MODE) {
    return Object.freeze({
      minReviewers: Math.min(minReviewers, 3),
      maxReviewers: Math.min(maxReviewers, 5),
      maxFiles: Math.min(maxFiles, 10),
      maxFilesPerReviewer: Math.max(maxFilesPerReviewer, 10),
      maxLinesPerReviewer: Math.max(maxLinesPerReviewer, 500),
      minAuthorsOfChangedFiles: 0,
      minLinesChangedForExtraReviewer: 0,
      minPercentAuthorshipForExtraReviewer: 0,
      reviewers: reviewers,
      reviewBlacklist: reviewBlacklist,
      reviewPathAssignments: [],
      reviewPathFallbacks: [],
      requireNotification: requireNotification,
      assignMinReviewersRandomly: false,
      fileBlacklist: fileBlacklist,
      labelWhitelist: labelWhitelist,
      labelBlacklist: labelBlacklist,
      useReviewRequests: useReviewRequests,
      notificationChannels: notificationChannels
    });
  }

  return Object.freeze({
    minReviewers: minReviewers,
    maxReviewers: maxReviewers,
    maxFiles: maxFiles,
    maxFilesPerReviewer: maxFilesPerReviewer,
    maxLinesPerReviewer: maxLinesPerReviewer,
    minAuthorsOfChangedFiles: minAuthorsOfChangedFiles,
    minLinesChangedForExtraReviewer: minLinesChangedForExtraReviewer,
    minPercentAuthorshipForExtraReviewer: minPercentAuthorshipForExtraReviewer,
    reviewers: reviewers,
    reviewBlacklist: reviewBlacklist,
    reviewPathAssignments: reviewPathAssignments,
    reviewPathFallbacks: reviewPathFallbacks,
    requireNotification: requireNotification,
    assignMinReviewersRandomly: assignMinReviewersRandomly,
    fileBlacklist: fileBlacklist,
    labelWhitelist: labelWhitelist,
    labelBlacklist: labelBlacklist,
    useReviewRequests: useReviewRequests,
    notificationChannels: notificationChannels
  });
};
