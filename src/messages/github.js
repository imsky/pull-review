var Message = require('./message');

function templateFn (resources, reviewers) {
  if (!reviewers) {
    return;
  }

  return reviewers.join(', ') + ': please review this pull request';
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