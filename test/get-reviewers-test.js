var getReviewers = require('../src/get-reviewers');

var driver = require('./driver');
var config = driver.config;

var DEFAULT_FILES = [
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
];

describe('#getReviewers', function () {
  it('fails without required parameters', function () {
    (function () {
      getReviewers()
    }).should.throw(Error, 'No function provided for retrieving blame for a file');

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
        ];
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
        ];
      }
    })
      .then(function (reviewers) {
        reviewers = reviewers.map(function (r) { return r.login; });
        reviewers.should.not.include('mockuser');
        reviewers.should.include('testuser');
      });
  });

  it('filters out all commit authors', function () {
    return getReviewers({
      'config': {
        'version': 1,
        'reviewers': {
          'bob': {},
          'charlie': {}
        }
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
        reviewers = reviewers.map(function (r) { return r.login; });
        reviewers.should.not.include('charlie');
        reviewers.should.include('bob');
      });
  });

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
        return [];
      }
    })
      .then(function (reviewers) {
        reviewers = reviewers.map(function (r) { return r.login; });
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

  it('ignores existing reviewers when retrying review', function () {
    return getReviewers({
      'config': {
        'version': 1,
        'reviewers': {
          'alice': {},
          'bob': {},
          'charlie': {},
          'dee': {}
        }
      },
      'authorLogin': 'alice',
      'assignees': ['bob', 'charlie'],
      'getBlameForFile': function () {
        return [];
      },
      'retryReview': true
    })
      .then(function (reviewers) {
        reviewers.should.have.lengthOf(1);
        reviewers[0].login.should.equal('dee');
        reviewers[0].source.should.equal('random');
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

    it('works with max files defined', function () {
      return getReviewers({
        'config': {
          'version': 1,
          'reviewers': {
            'alice': {},
            'bob': {},
            'charlie': {},
            'dee': {}
          },
          'max_files_per_reviewer': 1
        },
        'files': DEFAULT_FILES,
        'authorLogin': 'wally',
        'getBlameForFile': function () {
          return [];
        }
      })
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(2);
        });
    });
  });

  describe('using max lines per reviewer', function () {
    var options = {
      'config': {
        'version': 1,
        'reviewers': {
          'alice': {},
          'bob': {},
          'charlie': {},
          'dee': {}
        },
        'max_lines_per_reviewer': 0
      },
      'files': DEFAULT_FILES,
      'authorLogin': 'wally',
      'getBlameForFile': function () {
        return [];
      }
    };

    it('assigns a minimum of reviewers', function () {
      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(1);
        });
    });

    it('assigns a maximum of reviewers', function () {
      options.config.max_lines_per_reviewer = 4;
      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(2);
        });
    });
  });

  describe('using both max files and max lines per reviewer', function () {
    var options = {
      'config': {
        'version': 1,
        'reviewers': {
          'alice': {},
          'bob': {},
          'charlie': {},
          'dee': {}
        },
        'max_lines_per_reviewer': 4,
        'max_files_per_reviewer': 4
      },
      'files': DEFAULT_FILES,
      'authorLogin': 'wally',
      'getBlameForFile': function () {
        return [];
      }
    };

    it('assigns the minimum of the two', function () {
      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(1);
        });
    });

    it('does not assign a number below the minimum of reviewers', function () {
      options.config.max_lines_per_reviewer = 1000;
      return getReviewers(options)
        .then(function (reviewers) {
          reviewers.should.have.lengthOf(1);
        });
    });
  });

  describe('using minimum authors of changed files', function () {
    it('unassigns existing reviewers if the minimum of distinct authors is not met', function () {
      return getReviewers({
        'config': {
          'version': 1,
          'reviewers': {
            'alice': {},
            'bob': {},
            'charlie': {}
          },
          'min_authors_of_changed_files': 2
        },
        'files': [
          {
            'filename': 'TEST',
            'status': 'modified',
            'changes': 100,
            'additions': 100,
            'deletions': 0
          }
        ],
        'authorLogin': 'alice',
        'getBlameForFile': function () {
          return [
            {
              'login': 'bob',
              'count': 100,
              'age': 1
            }
          ];
        }
      })
        .then(function (reviewers) {
          var reviewerLogins = reviewers.map(function (r) {
            return r.login;
          });
          reviewerLogins.should.not.include('bob');
          reviewers.should.have.lengthOf(1);
          reviewers[0].source.should.equal('random');
        });
    });
  });

  it('works even if there are not enough reviewers to meet min reviewers specified');
});
