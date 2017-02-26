var SlackMessage = require('./slack');
var GenericMessage = require('./message');
var GitHubMessage = require('./github');

module.exports = {
  'SlackMessage': SlackMessage,
  'GenericMessage': GenericMessage,
  'GitHubMessage': GitHubMessage
};