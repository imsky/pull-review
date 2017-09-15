var nock = require('nock');

var github = require('../../src/github');

var api = nock('https://api.github.com');

var blameQuery = github.blameQuery;

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
      'base': {
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
        'additions': 20,
        'deletions': 30,
        'changes': 50
      },
      {
        'filename': 'LEAST_CHANGES',
        'status': 'modified',
        'changes': 10,
        'additions': 5,
        'deletions': 5
      },
      {
        'filename': 'JUST_ADDED',
        'status': 'added',
        'changes': 10,
        'additions': 10,
        'deletions': 0
      },
      {
        'filename': 'JUST_DELETED',
        'status': 'deleted',
        'changes': 20,
        'additions': 0,
        'deletions': 20
      }
    ]);
  }

  function mockPullRequestCommits(options) {
    var number = options.number || 1;

    api.get('/repos/OWNER/REPO/pulls/' + number + '/commits?per_page=100')
      .reply(200, options.commits || [
        {
          'author': {
            'login': 'alice'
          }
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
  api.post('/repos/OWNER/REPO/issues/1/comments', "{\"body\":\"@dee: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)\"}\n").reply(200);

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

  mockPullRequestCommits({
    'number': 1,
    'commits': options.commits
  });

  mockPullRequestCommits({
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

  function mockGitBlame(options) {
    var file = options.file || 'README';
    api.post('/graphql', {"query":"query ($owner: String!, $repo: String!, $sha: String!, $path: String!) {\n  repository(owner: $owner, name: $repo) {\n    object(expression: $sha) {\n      ...blame\n    }\n  }\n}\n\nfragment blame on Commit {\n  blame(path: $path) {\n    ranges {\n      startingLine\n      endingLine\n      age\n      commit {\n        oid\n        author {\n          name\n          user {\n            email\n            login\n          }\n        }\n      }\n    }\n  }\n}","variables":{"owner":"OWNER","repo":"REPO","sha":"c0ded0c","path":file}}).times(5)
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

  if (!options.noBlame) {
    mockGitBlame({'file': 'MOST_CHANGES'});
    mockGitBlame({'file': 'LEAST_CHANGES'});
    mockGitBlame({'file': 'JUST_DELETED'});
    mockGitBlame({'file': 'JUST_ADDED'});
  }

  return api;
};
