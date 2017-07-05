var fs = require('fs');
var path = require('path');

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var config = fs.readFileSync(path.join(__dirname, '..', '.pull-review'), 'utf8');

var pullReview = require('../index');
var PullReviewConfig = pullReview.PullReviewConfig;
var PullReviewAssignment = pullReview.PullReviewAssignment;

describe('pull-review', function () {
  describe('config', function () {
    it('parses YAML correctly', function () {
      var c = PullReviewConfig(config);
      c.should.have.ownProperty('reviewers');
      c.reviewers.should.have.ownProperty('alice');
    });

    it('fails with bad input', function () {
      (function () {
        PullReviewConfig(' ');
      }).should.throw(Error, 'Invalid config');

      (function () {
        PullReviewConfig(123);
      }).should.throw();

      PullReviewConfig(JSON.stringify({"version": 1}))
    });

    it('fails with bad settings', function () {
      (function () {
        PullReviewConfig({
          'version': 1,
          'min_reviewers': -1
        });
      }).should.throw(Error, 'Invalid number of minimum reviewers');

      (function () {
        PullReviewConfig({
          'version': 1,
          'max_reviewers': -1
        });
      }).should.throw(Error, 'Invalid number of maximum reviewers');

      (function () {
        PullReviewConfig({
          'version': 1,
          'min_reviewers': 1,
          'max_reviewers': 0
        });
      }).should.throw(Error, 'Minimum reviewers exceeds maximum reviewers');

      (function () {
        PullReviewConfig({
          'version': 1,
          'max_files': -1
        });
      }).should.throw(Error, 'Invalid number of maximum files');

      (function () {
        PullReviewConfig({
          'version': 1,
          'max_files_per_reviewer': -1
        });
      }).should.throw(Error, 'Invalid number of maximum files per reviewer');
    });
  });

  describe('assignment', function () {
    it('fails without required parameters', function () {
      (function () {
        PullReviewAssignment({});
      }).should.throw();

      (function () {
        PullReviewAssignment({'getBlameForFile': function () {}});
      }).should.throw();
    });

    it('fails with too many assignees', function () {
      (function () {
        PullReviewAssignment({
          'authorLogin': 'mockuser',
          'getBlameForFile': function () {},
          'assignees': [1,2,3,4,5,6,7,8,9]
        });
      }).should.throw(Error, 'Pull request has maximum reviewers assigned');
    });

    it('does not assign reviewers if minimum is met by assignees', function () {
      (function () {
        PullReviewAssignment({
          'authorLogin': 'mockuser',
          'getBlameForFile': function () {},
          'assignees': [1]
        });
      }).should.throw(Error, 'Pull request has minimum reviewers assigned');
    });

    it('fails with bad file data', function () {
      (function () {
        PullReviewAssignment({
          'authorLogin': 'mockuser',
          'getBlameForFile': function () {},
          'files': [1,2,3]
        });
      }).should.throw(Error, 'Missing file data');
    });

    it('fails with bad blame data', function () {
      return PullReviewAssignment({
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
      return PullReviewAssignment({
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

    it('works with blame correctly', function () {
      return PullReviewAssignment({
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
      return PullReviewAssignment({
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
      return PullReviewAssignment({
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

        return PullReviewAssignment(options)
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

        return PullReviewAssignment(options)
          .then(function (reviewers) {
            reviewers.should.have.lengthOf(1);
          });
      });
    });
  });
});
