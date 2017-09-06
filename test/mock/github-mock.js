var nock = require('nock');

var api = nock('https://api.github.com');

module.exports = function (options) {
  options = options || {};

  api.get('/repos/OWNER/REPO/pulls/404').reply(404, {
    'message': 'Not Found'
  });

  api.get('/repos/OWNER/REPO/pulls/1')
    .reply(200, {
      'html_url': 'https://github.com/OWNER/REPO/pull/1',
      'number': 1,
      'state': 'open',
      'title': 'Hello world',
      'body': 'The quick brown fox jumps over the lazy dog.',
      'assignee': options.assignee,
      'assignees': options.assignees,
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
};