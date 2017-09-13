var nock = require('nock');

var api = nock('https://api.github.com');

module.exports = function (options) {
  options = options || {};

  if (options.config) {
    api.get('/repos/OWNER/REPO/contents/.pull-review').reply(200, {
      'name': '.pull-review',
      'path': '.pull-review',
      'encoding': 'base64',
      'content': (new Buffer(options.config || '', 'utf8')).toString('base64')
    });
  }

  function mockPullRequest(options) {
    var number = options.number || 1;
    api.get('/repos/OWNER/REPO/pulls/' + number)
    .reply(200, {
      'html_url': 'https://github.com/OWNER/REPO/pull/' + number,
      'number': number,
      'state': options.state || 'open',
      'title': options.title || 'Hello world',
      'body': options.body || '### Description\n\n The quick brown fox jumps over the lazy dog. Check out [GitHub.com](https://github.com)',
      'assignee': options.assignee,
      'assignees': options.assignees,
      'user': options.user || {
        'login': 'alice',
        'html_url': 'https://github.com/alice'
      },
      'head': {
        'sha': 'c0ded0c'
      }
    });
  }

  function mockPullRequestFiles(options) {
    var number = options.number || 1;

    api.get('/repos/OWNER/REPO/pulls/' + number + '/files?per_page=100')
    .reply(200, options.files || [
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
  }

  api.get('/repos/OWNER/REPO/pulls/404').reply(404, {
    'message': 'Not Found'
  });

  api.post('/repos/OWNER/REPO/issues/1/assignees').reply(200);
  api.post('/repos/OWNER/REPO/issues/2/assignees').reply(200);

  api.delete('/repos/OWNER/REPO/issues/1/assignees').reply(200);

  api.post('/repos/OWNER/REPO/issues/1/comments', "{\"body\":\"@bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)\"}\n").reply(200);
  api.post('/repos/OWNER/REPO/issues/2/comments', "{\"body\":\"@bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)\"}\n").reply(200);

  mockPullRequest({
    'number': 1,
    'assignee': options.assignee,
    'assignees': options.assignees
  });

  mockPullRequest({
    'number': 2,
    'body': 'https://www.example.com/image.png'
  });

  mockPullRequestFiles({
    'number': 1
  });

  mockPullRequestFiles({
    'number': 2
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

  if (!options.noBlame) {
    api.post('/graphql')
      .reply(200, {
        'data': {
          'repository': {
            'object': {
              'blame': {
                'ranges': [
                  {
                    'startingLine': 1,
                    'endingLine': 5,
                    'age': 1,
                    'commit': {
                      'author': {
                        'user': {
                          'login': 'alice'
                        }
                      }
                    }
                  },
                  {
                    'startingLine': 6,
                    'endingLine': 8,
                    'age': 3,
                    'commit': {
                      'author': {
                        'user': {
                          'login': 'bob'
                        }
                      }
                    }
                  },
                  {
                    'startingLine': 9,
                    'endingLine': 12,
                    'age': 2,
                    'commit': {
                      'author': {
                        'user': {
                          'login': 'charlie'
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      });
  }

  if (options.configFile) {
    api.get('/repos/OWNER/REPO/contents/.pull-review')
      .reply(200, {
        'name': '.pull-review',
        'path': '.pull-review',
        'encoding': 'base64',
        'content': (new Buffer(options.configFile, 'utf8')).toString('base64')
      });
  }

  return api;
};
