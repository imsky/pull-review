var PullReviewConfig = require('../src/models/config');

var driver = require('./driver');
var config = driver.config;

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

    PullReviewConfig(JSON.stringify({'version': 1}));
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
