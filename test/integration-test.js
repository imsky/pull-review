var nock = require('nock');
var Helper = require('hubot-test-helper');

var pullReview = require('../index');

var driver = require('./driver');
var githubMock = driver.githubMock;
var config = driver.config;
var helper = new Helper('../index.js');

describe('pull-review', function () {
  afterEach(function () {
    nock.cleanAll();
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

  it('fails with invalid arguments', function () {
    (function () { pullReview(); }).should.throw('Invalid input: either a review request or a Hubot reference must be provided');
  });

  describe('chat mode', function () {
    var room;

    beforeEach(function () {
      githubMock({
        'config': config
      });

      room = helper.createRoom({
        'name': 'test'
      });
    })

    afterEach(function () {
      nock.cleanAll();
      return room.destroy();
    });

    it('works', function (done) {
      room.user.say('alice', 'review https://github.com/OWNER/REPO/pull/1 please')
        .then(function () {
          setTimeout(function () {
            room.messages.should.have.lengthOf(2);
            room.messages[1][0].should.equal('hubot');
            room.messages[1][1].should.equal('@bob: please review this pull request - https://github.com/OWNER/REPO/pull/1');
            done();
          }, 100);
        });
    });
  });
});
