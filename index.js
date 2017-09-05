'use strict';

var PullReviewConfig = require('./src/models/config');
var PullReviewAssignment = require('./src/pull-review-assignment');

//todo: jsdoc
//todo: consider fixturing a real pull request
//todo: example usage
//todo: rename PullReview* vars to remove PullReview prefix

module.exports = {
  'PullReviewConfig': PullReviewConfig,
  'PullReviewAssignment': PullReviewAssignment
};
