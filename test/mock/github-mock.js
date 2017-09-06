var nock = require('nock');

var api = nock('https://api.github.com');

module.exports = function (scenario) {
  api.get('/repos/OWNER/REPO/pulls/1')
    .reply(200, {
      'html_url': 'https://github.com/OWNER/REPO/pull/1',
      'number': 1,
      'state': 'open',
      'title': 'Hello world',
      'body': 'The quick brown fox jumps over the lazy dog.',
      'assignee': undefined,
      'assignees': undefined,
      'user': {
        'login': 'alice',
        'html_url': 'https://github.com/alice'
      },
      'head': {
        'sha': 'c0ded0c'
      }
    });

  api.get('/repos/OWNER/REPO/pulls/1/files?per_page=100')
    .reply(200, [
      {
        'filename': 'MOST_CHANGES',
        'status': 'modified',
        'changes': 3
      },
      {
        'filename': 'LEAST_CHANGES',
        'status': 'modified',
        'changes': 1
      },
      {
        'filename': 'JUST_ADDED',
        'status': 'added',
        'changes': 10
      },
      {
        'filename': 'JUST_DELETED',
        'status': 'deleted',
        'changes': 20
      }
    ]);
};