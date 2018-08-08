var nock = require('nock');
var Helper = require('hubot-test-helper');
var request = require('superagent');

var pullReview = require('../index');
var cli = require('../src/cli');
var server = require('../src/server');

var driver = require('./driver');
var githubMock = driver.githubMock;
var config = driver.config;
var helper = new Helper('../index.js');

describe('pull-review', function() {
  afterEach(function() {
    nock.cleanAll();
  });

  it('works in dry run mode', function() {
    githubMock({
      config: config
    });

    return pullReview({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
      dryRun: true
    });
  });

  it('works with no assignees', function() {
    githubMock({
      config: config
    });
    return pullReview({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    });
  });

  it('works with an assignee', function() {
    githubMock({
      assignee: {login: 'charlie'},
      config: config
    });
    return pullReview({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
      retryReview: true
    });
  });

  it('filters out committers', function() {
    githubMock({
      config: config,
      commits: [
        {
          author: {
            login: 'bob'
          }
        }
      ]
    });
    return pullReview({
      pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
    }).then(function(actions) {
      actions.should.have.lengthOf(2);
      actions[0].payload.assignees.should.not.include('bob');
    });
  });

  describe('using review requests', function() {
    var reviewRequestConfig = JSON.stringify({
      version: 1,
      use_review_requests: true,
      reviewers: {
        alice: {},
        bob: {},
        charlie: {}
      }
    });

    it('works without a review request', function() {
      githubMock({
        config: reviewRequestConfig,
        reviewRequests: true
      });

      return pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/1'
      }).then(function(actions) {
        actions.should.have.lengthOf(2);
        actions[0].type.should.equal('CREATE_REVIEW_REQUEST');
      });
    });

    it('works with a review request', function() {
      githubMock({
        config: reviewRequestConfig,
        assignees: [{login: 'charlie'}]
      });

      return pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
        retryReview: true
      }).then(function(actions) {
        actions.should.have.lengthOf(3);
        actions[0].type.should.equal('DELETE_REVIEW_REQUESTS');
        actions[1].type.should.equal('CREATE_REVIEW_REQUEST');
        actions[1].payload.assignees.should.not.include('charlie');
      });
    });
  });

  it('fails with invalid arguments', function() {
    (function() {
      pullReview();
    }.should.throw('Missing pull request URL'));
  });

  describe('with Slack notifications', function() {
    it('works with default notifyFn', function() {
      githubMock({
        config: config
      });

      return pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
        chatRoom: 'test',
        chatChannel: 'hubot:slack',
        isChat: true
      });
    });

    it('works with Markdown', function() {
      githubMock({
        config: config
      });

      var message;

      return pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/1',
        chatRoom: 'test',
        chatChannel: 'hubot:slack',
        isChat: true,
        notifyFn: function(m) {
          message = m;
        },
        userMappingFn: function(user) {
          return '<@U123>';
        }
      }).then(function() {
        message.text.should.equal(
          '<@U123>: please review https://github.com/OWNER/REPO/pull/1'
        );
        message.attachments.should.have.lengthOf(1);
        var attachment = message.attachments[0];
        attachment.title.should.equal('OWNER/REPO: Hello world');
        attachment.title_link.should.equal(
          'https://github.com/OWNER/REPO/pull/1'
        );
        attachment.text.should.equal(
          '*Description*\n\nThe quick brown fox jumps over the lazy dog.\n\n• Feature X\n• Feature Y\n• Bug Z\n\nCheck out <https://github.com|GitHub.com> and <http://imsky.co|imsky.co>'
        );
        attachment.fallback.should.equal(
          'Hello world by alice: https://github.com/OWNER/REPO/pull/1'
        );
      });
    });

    it('works with images', function(done) {
      githubMock({
        config: config
      });

      pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/2',
        chatRoom: 'test',
        chatChannel: 'hubot:slack',
        isChat: true,
        notifyFn: function(message) {
          message.attachments.should.have.lengthOf(1);
          var attachment = message.attachments[0];
          attachment.image_url.should.equal('https://example.com/image.png');
          done();
        }
      });
    });

    it('does not crash due to notification errors', function() {
      githubMock({
        config: config
      });

      return pullReview({
        pullRequestURL: 'https://github.com/OWNER/REPO/pull/2',
        chatRoom: 'test',
        chatChannel: 'hubot:slack',
        isChat: true,
        notifyFn: function(message) {
          throw Error();
        }
      });
    });
  });

  describe('using Hubot', function() {
    var room;

    beforeEach(function() {
      githubMock({
        config: config,
        assignee: 'bob'
      });

      room = helper.createRoom({
        name: 'test',
        httpd: false
      });
    });

    afterEach(function() {
      nock.cleanAll();
      return room.destroy();
    });

    it('works for reviews', function(done) {
      room.user
        .say('alice', 'review https://github.com/OWNER/REPO/pull/2 please')
        .then(function() {
          setTimeout(function() {
            room.messages.should.have.lengthOf(2);
            room.messages[1][0].should.equal('hubot');
            room.messages[1][1].should.equal(
              '@bob: please review https://github.com/OWNER/REPO/pull/2'
            );
            done();
          }, 100);
        });
    });

    it('works for retrying reviews', function(done) {
      room.user
        .say(
          'alice',
          'review https://github.com/OWNER/REPO/pull/1/ again please'
        )
        .then(function() {
          setTimeout(function() {
            room.messages.should.have.lengthOf(2);
            room.messages[1][0].should.equal('hubot');
            room.messages[1][1].should.equal(
              '@bob: please review https://github.com/OWNER/REPO/pull/1'
            );
            done();
          }, 100);
        });
    });

    it('does nothing without a pull request URL', function(done) {
      room.user
        .say('alice', 'https://github.com/imsky/pull-review https://google.com')
        .then(function() {
          setTimeout(function() {
            room.messages.should.have.lengthOf(1);
            done();
          }, 100);
        });
    });

    it('fails when no reviewers are found', function(done) {
      nock.cleanAll();
      githubMock({
        config: JSON.stringify({
          version: 1,
          reviewers: {}
        })
      });

      room.user
        .say('alice', 'review https://github.com/OWNER/REPO/pull/1 please')
        .then(function() {
          setTimeout(function() {
            room.messages.should.have.lengthOf(2);
            room.messages[1][1].should.equal(
              '[pull-review] Error: No reviewers found: https://github.com/OWNER/REPO/pull/1'
            );
            done();
          }, 100);
        });
    });
  });

  describe('using CLI', function() {
    it('works', function() {
      githubMock({
        config: config
      });

      cli.parse([
        'node',
        'pull-review',
        'https://github.com/OWNER/REPO/pull/1'
      ]);
      return cli.cliPromise.then(function(actions) {
        actions.should.have.lengthOf(2);
        actions[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
      });
    });
  });

  describe('in server mode', function() {
    var baseURL = 'http://localhost';

    before(function(done) {
      var app = server.listen(0, function() {
        baseURL += ':' + app.address().port;
        done();
      });
    });

    it('works with valid GitHub issue_comment payload', function() {
      githubMock({
        config: config
      });

      return request
        .post(baseURL)
        .set('Content-Type', 'application/json')
        .send({
          action: 'created',
          issue: {
            pull_request: {
              html_url: 'https://github.com/OWNER/REPO/pull/1'
            }
          },
          comment: {
            body: '/review'
          }
        })
        .then(function(response) {
          response.status.should.equal(201);
          response.body.should.have.lengthOf(2);
          response.body[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
          response.body[1].type.should.equal('NOTIFY');
        });
    });

    it('works with valid GitHub pull_request_review_comment payload', function() {
      githubMock({
        config: config
      });

      return request
        .post(baseURL)
        .set('Content-Type', 'application/json')
        .send({
          action: 'created',
          pull_request: {
            html_url: 'https://github.com/OWNER/REPO/pull/1'
          },
          comment: {
            body: '/review'
          }
        })
        .then(function(response) {
          response.status.should.equal(201);
          response.body.should.have.lengthOf(2);
          response.body[0].type.should.equal('ASSIGN_USERS_TO_PULL_REQUEST');
          response.body[1].type.should.equal('NOTIFY');
        });
    });

    it('fails if pull request data is missing', function() {
      return request
        .post(baseURL)
        .set('Content-Type', 'application/json')
        .send({
          action: 'created',
          comment: {
            body: '/review'
          }
        })
        .catch(function(response) {
          response.response.badRequest.should.be.true;
        });
    });

    it('redirects on root route', function() {
      return request.get(baseURL).then(function(response) {
        response.redirects.should.include(
          'https://github.com/imsky/pull-review'
        );
      });
    });

    it('does nothing without a valid GitHub webhook payload', function() {
      return request.post(baseURL).then(function(response) {
        response.ok.should.be.true;
      });
    });

    it('fails with invalid GitHub webhook payload', function() {
      return request
        .post(baseURL)
        .set('Content-Type', 'application/json')
        .send({
          action: 'created',
          pull_request: {
            html_url: ''
          },
          comment: {
            body: '/review'
          }
        })
        .catch(function(response) {
          response.status.should.equal(400);
        });
    });
  });
});
