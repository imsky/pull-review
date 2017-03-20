var TEST = process.env.NODE_ENV === 'test';

var Message = require('./message');

function templateFn (resources, reviewers) {
  if (!reviewers) {
    return;
  }

  var request = reviewers.join(', ') + ': please review this pull request';
  var message = request;

  if (!TEST) {
    message += '\n\n' + '> Powered by [hubot-review](https://github.com/imsky/hubot-review)';
  }

  return message;
}

function GitHubMessage (options) {
  return Message({
    'templateFn': templateFn,
    'error': options.error,
    'reviewers': options.reviewers,
    'resources': options.resources
  });
}

module.exports = GitHubMessage;