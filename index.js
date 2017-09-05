'use strict';

//todo: use https://assets-cdn.github.com/pinned-octocat.svg for Slack icon

var Review = require('./src/review');

module.exports = function (input) {
  var isHubot = input.name !== undefined && input.adapterName !== undefined && input.logger !== undefined && input.listen !== undefined && input.hear !== undefined;
  var isReview = input.pullRequestURL !== undefined;

  if (isHubot) {
    //todo: set up robot.hear here
    //todo: start server
  } else if (isReview) {
    return Review(input);
  } else {
    //todo: run in server mode only
  }
};
