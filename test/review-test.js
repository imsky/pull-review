var nock = require('nock');

var Review = require('../src/review');

var driver = require('./driver');
var githubMock = require('./mock/github-mock');
var config = driver.config;

describe('review', function () {
  afterEach(function () {
    console.log('clearing API mocks')
    return nock.cleanAll();
  });

  it('works without blame', function () {
    githubMock();
    return Review({
      'config': config,
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1'
    })
      .then(function (actions) {
        actions.should.have.lengthOf(3);
        actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
        actions[0].payload.assignees[0].should.equal('bob');
        actions[0].payload.reviewers[0].source.should.equal('random');
        actions[1].type.should.equal('NOTIFY');
        actions[2].type.should.equal('COMMIT');
      });
  });
});