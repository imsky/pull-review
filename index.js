// Description:
//   Assign pull request reviewers intelligently
//
// Commands:
//   [hubot] review <GitHub PR URL> - assign and notify reviewers for GitHub PR
//   [hubot] review <GitHub PR URL> again - reassign and notify reviewers for GitHub PR
//
// Configuration:
//   PULL_REVIEW_GITHUB_TOKEN - GitHub token to use with Pull Review (must have repo and user scopes)
//   PULL_REVIEW_REQUIRED_ROOMS - comma-separated list of chat rooms where a review request may be made (e.g. dev,ops)
//   PULL_REVIEW_CONFIG_PATH - location of Pull Review config in the pull request repo (defaults to /.pull-review)
//   PULL_REVIEW_CONFIG - JSON/YAML Pull Review configuration that overrides all other configuration
//
// Author:
//   Ivan Malopinsky

process.env.DEBUG = 'pull-review';

var PullReview = require('./src/index');
var hubot = require('./src/hubot');

module.exports = function(input) {
  input = input || {};
  var isHubot =
    input.name !== undefined &&
    input.adapterName !== undefined &&
    input.logger !== undefined &&
    input.listen !== undefined &&
    input.hear !== undefined;

  if (isHubot) {
    hubot(input);
  } else {
    return PullReview(input);
  }
};
