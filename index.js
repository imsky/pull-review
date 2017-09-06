'use strict';

//todo: use https://assets-cdn.github.com/pinned-octocat.svg for Slack icon

var Review = require('./src/review');

module.exports = function (input) {
  var isHubot = input.name !== undefined && input.adapterName !== undefined && input.logger !== undefined && input.listen !== undefined && input.hear !== undefined;
  var isAPI = input.pullRequestURL !== undefined;

  if (isHubot) {
    //todo: set up robot.hear here
  } else if (isAPI) {
    return Review(input);
  } else {
    throw Error('Invalid input: either a review request or a Hubot reference must be provided');
  }
};