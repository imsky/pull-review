var nock = require('nock');

var driver = require('./driver');
var githubMock = driver.githubMock;
var config = driver.config;

var pullReview = require('../index');

describe('pull-review', function () {
  afterEach(function () {
    return nock.cleanAll();
  });

  it('works with no assignees', function () {
    githubMock({
      'config': config
    });
    return pullReview({
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1'
    });
  });

  it('works with an assignee', function () {
    githubMock({
      'assignee': { 'login': 'charlie' },
      'config': config
    });
    return pullReview({
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1',
      'retryReview': true
    });
  });
});
