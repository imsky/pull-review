var nock = require('nock');

var api = nock('https://api.github.com');

module.exports = function(options) {
  options = options || {};

  if (options.config) {
    api.get('/repos/OWNER/REPO/contents/.pull-review').reply(200, {
      name: '.pull-review',
      path: '.pull-review',
      encoding: 'base64',
      content: new Buffer(options.config || '', 'utf8').toString('base64')
    });
  }

  //todo: this is a one-off, refactor
  if (options.reviewRequests) {
    api
      .post(
        '/repos/OWNER/REPO/issues/1/comments',
        '{"body":"@charlie, @bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)"}\n'
      )
      .reply(200);

    api
      .post('/graphql', {
        query:
          'query ($owner: String!, $repo: String!, $pull: Int!) {\n  repository(owner: $owner, name: $repo) {\n    pullRequest(number: $pull) {\n      id\n    }\n  }\n}\n',
        variables: {owner: 'OWNER', repo: 'REPO', pull: 1}
      })
      .reply(200, {
        data: {
          repository: {
            pullRequest: {
              id: 'deadbeef'
            }
          }
        }
      });

    api.post('/graphql', {
      query: 'query ($owner: String!, $repo: String!, $pull: Int!) {\n  repository(owner: $owner, name: $repo) {\n    pullRequest(number: $pull) {\n      reviewRequests(first: 100) {\n        nodes {\n          requestedReviewer {\n            ... on User {\n              id\n              login\n            }\n            # todo: confirm Team works\n            ... on Team {\n              id\n              name\n              organization {\n                login\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}\n',
      variables: {owner: 'OWNER', repo: 'REPO', pull: 1}
    })
    .reply(200, {
      data: {
        repository: {
          pullRequest: {
            reviewRequests: {
              nodes:(options.assignees || []).map(function (assignee) {
              return {
                requestedReviewer: {
                  id: 'foobar',
                  login: assignee
                }
              }
            })
          }
          }
        }
      }
    });

    api.post('/graphql', {
      query: 'mutation ($pullRequestId: ID!, $userIds: [ID!], $teamIds: [ID!]) {\n  requestReviews(input: {pullRequestId: $pullRequestId, userIds: $userIds, teamIds: $teamIds, union: false}) {\n    pullRequest {\n      id\n    }\n  }\n}\n',
      variables: {pullRequestId: 'deadbeef', userIds: ['foobar']}
    }).reply(200, {
      data: {}
    });
  }

  function mockPullRequest(options) {
    var number = options.number || 1;
    api.get('/repos/OWNER/REPO/pulls/' + number).reply(200, {
      html_url: 'https://github.com/OWNER/REPO/pull/' + number,
      number: number,
      state: options.state || 'open',
      title: options.title || 'Hello world',
      body:
        options.body ||
        '### Description\n\nThe quick brown fox jumps over the lazy dog.\n\n* Feature X\n* Feature Y\n* Bug Z\n\nCheck out [GitHub.com](https://github.com) and [imsky.co](http://imsky.co)',
      assignee: options.assignee,
      assignees: options.assignees,
      user: options.user || {
        login: 'alice',
        html_url: 'https://github.com/alice'
      },
      base: {
        sha: 'c0ded0c'
      }
    });

    api.get('/repos/OWNER/REPO/issues/' + number + '/labels').reply(
      200,
      options.labels || [
        {
          name: 'review'
        }
      ]
    );

    var assignees = options.assignees || [options.assignee].filter(Boolean);

    api
      .get('/repos/OWNER/REPO/pulls/' + number + '/requested_reviewers')
      .reply(200, {
        users: assignees
      });

    api
      .post('/repos/OWNER/REPO/pulls/' + number + '/requested_reviewers')
      .reply(200);

    api
      .delete(
        '/repos/OWNER/REPO/pulls/' +
          number +
          '/requested_reviewers?reviewers=' +
          encodeURIComponent(
            JSON.stringify(
              assignees.map(function(a) {
                return a.login;
              })
            )
          )
      )
      .reply(200);
  }

  function mockPullRequestFiles(options) {
    var number = options.number || 1;

    api.get('/repos/OWNER/REPO/pulls/' + number + '/files?per_page=100').reply(
      200,
      options.files || [
        {
          filename: 'MOST_CHANGES',
          status: 'modified',
          additions: 20,
          deletions: 30,
          changes: 50
        },
        {
          filename: 'LEAST_CHANGES',
          status: 'modified',
          changes: 10,
          additions: 5,
          deletions: 5
        },
        {
          filename: 'JUST_ADDED',
          status: 'added',
          changes: 10,
          additions: 10,
          deletions: 0
        },
        {
          filename: 'JUST_DELETED',
          status: 'removed',
          changes: 20,
          additions: 0,
          deletions: 20
        }
      ]
    );
  }

  function mockPullRequestCommits(options) {
    var number = options.number || 1;

    api
      .get('/repos/OWNER/REPO/pulls/' + number + '/commits?per_page=100')
      .reply(
        200,
        options.commits || [
          {
            author: {
              login: 'alice'
            }
          }
        ]
      );
  }

  api.get('/repos/OWNER/REPO/pulls/404').reply(404, {
    message: 'Not Found'
  });

  api.post('/repos/OWNER/REPO/issues/1/assignees').reply(200);
  api.post('/repos/OWNER/REPO/issues/2/assignees').reply(200);

  api.delete('/repos/OWNER/REPO/issues/1/assignees').reply(200);

  api
    .post(
      '/repos/OWNER/REPO/issues/1/comments',
      '{"body":"@bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)"}\n'
    )
    .reply(200);
  api
    .post(
      '/repos/OWNER/REPO/issues/2/comments',
      '{"body":"@bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)"}\n'
    )
    .reply(200);
  api
    .post(
      '/repos/OWNER/REPO/issues/1/comments',
      '{"body":"@dee: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)"}\n'
    )
    .reply(200);
    api
    .post(
      '/repos/OWNER/REPO/issues/999/comments',
      '{"body":"@charlie, @bob: please review this pull request.\\n\\n> Powered by [pull-review](https://github.com/imsky/pull-review)"}\n'
    )
    .reply(200);

  mockPullRequest({
    number: 1,
    state: options.state,
    assignee: options.assignee,
    assignees: options.assignees
  });

  mockPullRequest({
    number: 2,
    body: 'https://www.example.com/image.png'
  });

  mockPullRequestFiles({
    number: 1
  });

  mockPullRequestFiles({
    number: 2
  });

  mockPullRequestCommits({
    number: 1,
    commits: options.commits
  });

  mockPullRequestCommits({
    number: 2
  });

  mockPullRequest({
    number: 999,
    state: options.state,
    assignee: options.assignee,
    assignees: options.assignees
  });

  mockPullRequestCommits({
    number: 999,
    commits: options.commits
  });

  mockPullRequestFiles({
    number: 999
  });

  api.get('/repos/OWNER/REPO/pulls/1/files?per_page=100').reply(200, [
    {
      filename: 'MOST_CHANGES',
      status: 'modified',
      changes: 3
    },
    {
      filename: 'LEAST_CHANGES',
      status: 'modified',
      changes: 1
    },
    {
      filename: 'JUST_ADDED',
      status: 'added',
      changes: 10
    },
    {
      filename: 'JUST_DELETED',
      status: 'removed',
      changes: 20
    }
  ]);

  function mockGitBlame(options) {
    var file = options.file || 'README';
    api
      .post('/graphql', {
        query:
          'query($owner: String!, $repo: String!, $sha: String!, $path: String!) {\n  repository(owner: $owner, name: $repo) {\n    object(expression: $sha) {\n      ...blame\n    }\n  }\n}\n\nfragment blame on Commit {\n  blame(path: $path) {\n    ranges {\n      startingLine\n      endingLine\n      age\n      commit {\n        oid\n        author {\n          name\n          user {\n            email\n            login\n          }\n        }\n      }\n    }\n  }\n}\n',
        variables: {owner: 'OWNER', repo: 'REPO', sha: 'c0ded0c', path: file}
      })
      .times(5)
      .reply(200, {
        data: {
          repository: {
            object: {
              blame: {
                ranges: [
                  {
                    startingLine: 1,
                    endingLine: 5,
                    age: 1,
                    commit: {
                      author: {
                        user: {
                          login: 'alice'
                        }
                      }
                    }
                  },
                  {
                    startingLine: 6,
                    endingLine: 8,
                    age: 3,
                    commit: {
                      author: {
                        user: {
                          login: 'bob'
                        }
                      }
                    }
                  },
                  {
                    startingLine: 9,
                    endingLine: 12,
                    age: 2,
                    commit: {
                      author: {
                        user: {
                          login: 'charlie'
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
    mockGitBlame({file: 'MOST_CHANGES'});
    mockGitBlame({file: 'LEAST_CHANGES'});
    mockGitBlame({file: 'JUST_DELETED'});
    mockGitBlame({file: 'JUST_ADDED'});
  }

  return api;
};
