'use strict';

var generatePlan = require('./generate-plan');
var executePlan = require('./execute-plan');

module.exports = function PullReview(options) {
  options = options || {};
  return generatePlan(options).then(executePlan);
};
