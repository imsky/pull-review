var getReviewers = require('../src/get-reviewers');

var driver = require('./driver');
var config = driver.config;

describe('#getReviewers', function () {
  it('fails without required parameters', function () {
    (function () {
      getReviewers({});
    }).should.throw();

    (function () {
      getReviewers({'getBlameForFile': function () {}});
    }).should.throw();
  });

  it('fails with too many assignees', function () {
    (function () {
      getReviewers({
        'authorLogin': 'mockuser',
        'getBlameForFile': function () {},
        'assignees': [1,2,3,4,5,6,7,8,9]
      });
    }).should.throw(Error, 'Pull request has maximum reviewers assigned');
  });

  it('does not assign reviewers if minimum is met by assignees', function () {
    (function () {
      getReviewers({
        'authorLogin': 'mockuser',
        'getBlameForFile': function () {},
        'assignees': [1]
      });
    }).should.throw(Error, 'Pull request has minimum reviewers assigned');
  });

  it('fails with bad file data', function () {
    (function () {
      getReviewers({
        'authorLogin': 'mockuser',
        'getBlameForFile': function () {},
        'files': [1,2,3]
      });
    }).should.throw(Error, 'Missing file data');
  });

  it('fails with bad blame data', function () {
    return getReviewers({
      'authorLogin': 'mockuser',
      'files': [
        {
          'filename': 'test',
          'status': 'modified',
          'changes': 1
        }
      ],
      'getBlameForFile': function () {
        return [
          {
            'login': 'mockuser'
          }
        ]
      }
    }).should.eventually.be.rejectedWith(Error, 'Missing blame range data');
  });

  it('filters out unreachable authors', function () {
    return getReviewers({
      'config': {
        'version': 1,
        'reviewers': {
          'testuser': {}
        }
      },
      'authorLogin': 'foo',
      'files': [
        {
          'filename': 'test',
          'status': 'modified',
          'changes': 2
        }
      ],
      'getBlameForFile': function () {
        return [
          {
            'login': 'mockuser',
            'count': 5,
            'age': 1
          },
          {
            'login': 'testuser',
            'count': 1,
            'age': 1
          }
        ]
      }
    })
      .then(function (reviewers) {
        reviewers = reviewers.map(function (r) { return r.login });
        reviewers.should.not.include('mockuser');
        reviewers.should.include('testuser');
      });
  });

  it.only('filters out all commit authors', function () {
    return getReviewers({
      'config': {
        'version': 2,
        'reviewers': {
          'bob': {},
          'charlie': {}
        },
      },
        'authorLogin': 'alice',
        'files': [
          {
            'filename': 'test',
            'status': 'modified',
            'changes': 10
          }
        ],
        'commits': [
          {
            'author': {
              'login': 'charlie'
            }
          }
        ],
        'getBlameForFile': function () {
          return [
            {
              'login': 'charlie',
              'count': 9,
              'age': 1
            },
            {
              'login': 'bob',
              'count': 1,
              'age': 10
            }
          ];
        }
    })
      .then(function (reviewers) {
        reviewers = reviewers.map(function (r) { return r.login });
        reviewers.should.not.include('charlie');
        reviewers.should.include('bob');
      });
  })

  it('works with blame correctly', function () {
    return getReviewers({
      'config': {
        'version': 1,
        'reviewers': {
          'alice': {},
          'bob': {},
          'charlie': {}
        }
      },
      'authorLogin': 'alice',
      'files': [
        {
          'filename': 'foo',
          'status': 'modified',
          'changes': 3
        },
        {
          'filename': 'bar',
          'status': 'modified',
          'changes': 2
        }
      ],
      'getBlameForFile': function (file) {
        if (file.filename === 'foo') {
          return [
            {
              'login': 'bob',
              'count': 5,
              'age': 1
            },
            {
              'login': 'charlie',
              'count': 10,
              'age': 10
            },
            {
              'login': 'bob',
              'count': 7,
              'age': 3
            }
          ];
        } else if (file.filename === 'bar') {
          return [
            {
              'login': 'charlie',
              'count': 1,
              'age': 1
            },
            {
              'login': 'bob',
              'count': 1,
              'age': 10
            }
          ];
        }
      }
    })
      .then(function (reviewers) {
        reviewers.should.have.lengthOf(2);
        reviewers[0].login.should.equal('bob');
        reviewers[0].count.should.equal(13);
        reviewers[1].login.should.equal('charlie');
        reviewers[1].count.should.equal(11);
      });
  });

  it('assigns minimum reviewers randomly', function () {
    return getReviewers({
      'config': {
        'version': 1,
        'reviewers': {
          'alice': {},
          'bob': {},
          'charlie': {}
        }
      },
      'authorLogin': 'alice',
      'files': [],
      'getBlameForFile': function () {
        return []
      }
    })
      .then(function (reviewers) {
        reviewers = reviewers.map(function (r) { return r.login });
        reviewers.should.have.lengthOf(1);
        reviewers.should.not.include('alice');
      });
  });

  it('uses fallback paths when assigning minimum reviewers randomly', function () {
    return getReviewers({
      'config': config,
      'authorLogin': 'alice',
      'files': [
        {
          'filename': 'app/web/index.js',
          'status': 'modified',
          'changes': 1
        },
        {
          'filename': 'app/api/index.js',
          'status': 'modified',
          'changes': 1
        }
      ],
      'getBlameForFile': function () {
        return [];
      }
    })
      .then(function (reviewers) {
        reviewers.should.have.lengthOf(1);
        reviewers[0].source.should.equal('fallback');
      });
  });

  describe('using max files per reviewer', function () {
    var options = {
      'config': config,
      'authorLogin': 'charlie',
      'getBlameForFile': function () {
        return [];
      }
    };

    it('assigns a minimum amount of reviewers', function () {
      options.files = [
        {
          'filename': 'one_file',
          'status': 'modified',
          'changes': 1
        }
      ];

      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(1);
        });
    });

    it('assigns up to a minimum amount of reviewers', function () {
      var files = [];

      for (var i = 0; i < 100; i++) {
        files.push({
          'filename': 'one_file',
          'status': 'modified',
          'changes': 1
        });
      }

      options.files = files;

      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(1);
        });
    });
  });
});
