var nock = require('nock');

var generatePlan = require('../src/generate-plan');

var driver = require('./driver');
var githubMock = driver.githubMock;
var config = driver.config;

describe('#generatePlan', function() {
  afterEach(function() {
    process.env.PULL_REVIEW_REQUIRED_ROOMS = '';
    nock.cleanAll();
  });

  it('fails if pull request is not found', function() {
    return generatePlan({
      config: config,
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    }).should.eventually.be.rejectedWith(
      Error,
      'Failed to get pull request: https://github.com/OWNER/REPO/pull/1'
    );
  });

  it('works without blame', function() {
    githubMock({
      noBlame: true
    });

    return generatePlan({
      config: config,
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    }).then(function(actions) {
      actions.should.have.lengthOf(2);
      actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
      actions[0].payload.assignees[0].should.not.equal('alice');
      actions[0].payload.reviewers[0].source.should.equal('random');
      actions[1].type.should.equal('NOTIFY');
      actions[1].payload.channel.should.equal('github');
    });
  });

  it('works with blame', function() {
    githubMock();

    return generatePlan({
      config: config,
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    }).then(function(actions) {
      actions.should.have.lengthOf(2);
      actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
      actions[0].payload.assignees[0].should.equal('bob');
      actions[0].payload.reviewers[0].source.should.equal('blame');
    });
  });

  it('reassigns reviewers', function() {
    githubMock({
      assignees: [{login: 'charlie'}]
    });

    return generatePlan({
      config: config,
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
      retryReview: true
    }).then(function(actions) {
      actions.should.have.lengthOf(3);
      actions[0].type.should.equal('UNASSIGN_USERS_FROM_PULL_REQUEST');
      actions[0].payload.assignees[0].should.equal('charlie');
    });
  });

  it('reassigns reviewers using review requests', function() {
    githubMock({
      reviewRequests: {
        users: [{login: 'charlie'}]
      }
    });

    return generatePlan({
      config: {
        version: 1,
        use_review_requests: true,
        reviewers: {
          alice: {},
          bob: {},
          charlie: {}
        }
      },
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
      retryReview: true
    }).then(function(actions) {
      actions.should.have.lengthOf(3);
      actions[0].type.should.equal('DELETE_REVIEW_REQUESTS');
    });
  });

  it('fails without a pull request URL', function() {
    return function() {
      generatePlan();
    }.should.throw('Missing pull request URL');
  });

  it('fails with an invalid pull request URL', function() {
    return function() {
      generatePlan({
        pullRequestURL: 'http://example.com'
      });
    }.should.throw('Invalid pull request URL');
  });

  it('fails without config', function() {
    githubMock();

    return generatePlan({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    }).should.eventually.be.rejectedWith(Error, 'Missing configuration');
  });

  it('fails with the wrong chat room', function() {
    githubMock({
      config: config
    });

    process.env.PULL_REVIEW_REQUIRED_ROOMS = 'not-test';

    (function() {
      generatePlan({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
        chatRoom: 'test',
        isChat: true
      });
    }.should.throw('Review requests are disabled from room test'));
  });

  it('fails with closed pull requests', function() {
    githubMock({
      config: config,
      state: 'closed'
    });

    return generatePlan({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
      chatRoom: 'test',
      isChat: true
    }).should.eventually.be.rejectedWith(
      Error,
      'Pull request is not open: https://github.com/OWNER/REPO/pull/1'
    );
  });
});
