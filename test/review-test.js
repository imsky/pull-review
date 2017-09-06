var nock = require('nock');

var Review = require('../src/review');

var driver = require('./driver');
var githubMock = require('./mock/github-mock');
var config = driver.config;

describe('review', function () {
  afterEach(function () {
    return nock.cleanAll();
  });

  it('works without blame', function () {
    githubMock({
      'noBlame': true
    });

    return Review({
      'config': config,
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1'
    })
      .then(function (actions) {
        actions.should.have.lengthOf(3);
        actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
        actions[0].payload.assignees[0].should.not.equal('alice');
        actions[0].payload.reviewers[0].source.should.equal('random');
        actions[1].type.should.equal('NOTIFY');
        actions[2].type.should.equal('COMMIT');
      });
  });

  it('works with blame', function () {
    githubMock();

    return Review({
      'config': config,
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1'
    })
      .then(function (actions) {
        actions.should.have.lengthOf(3);
        actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
        actions[0].payload.assignees[0].should.equal('bob');
        actions[0].payload.reviewers[0].source.should.equal('blame');
      })
  });

  it('reassigns reviewers', function () {
    githubMock({
      'assignees': [{ 'login': 'charlie' }]
    });

    return Review({
      'config': config,
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1',
      'retryReview': true
    })
      .then(function (actions) {
        actions.should.have.lengthOf(4);
        actions[0].type.should.equal('UNASSIGN_USERS_FROM_PULL_REQUEST');
        actions[0].payload.users[0].should.equal('charlie');
      });
  })

  it('fails without a pull request URL', function () {
    return (function () { Review() }).should.throw('Missing pull request URL');
  });

  it('fails without config', function () {
    githubMock();

    return Review({
      'pullRequestURL': 'https://github.com/OWNER/REPO/pull/1'
    }).should.eventually.be.rejectedWith(Error, 'No reviewers found: https://github.com/OWNER/REPO/pull/1');
  });
});