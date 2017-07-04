'use strict';

var Config = require('./src/pull-review-config');
var PullReviewAssignment = require('./src/pull-review-assignment');

//todo: jsdoc
//todo: AUTHORS/OWNERS integration
//todo: consider fixturing a real pull request
//todo: example usage
//todo: rename PullReview* vars to remove PullReview prefix

module.exports = {
  'PullReviewConfig': PullReviewConfig,
  'PullReviewAssignment': PullReviewAssignment
};
