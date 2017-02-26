var Helper = require('hubot-test-helper');
var nock = require('nock');
var chai = require('chai');
chai.should();

var url = require('../src/url');
var github = require('../src/github');
var Request = require('../src/request');
var Response = require('../src/response');
var HubotReview = require('../src/hubot-review');
var messages = require('../src/messages');
var GenericMessage = messages.GenericMessage;
var SlackMessage = messages.SlackMessage;
var GitHubMessage = messages.GitHubMessage;

var helper = new Helper('../index.js');

var ghapi = nock('https://api.github.com');

function mockGitHubPullRequest(api, url, options) {
  var split = url.split('/');
  var owner = split[2];
  var repo = split[3];
  var number = split[5];
  options = options || {};

  var login = options.login || 'mockuser';

  return api.get(url).reply(200, {
    'html_url': ['https://mockhub.com', owner, repo, 'pull', number].join('/'),
    'number': number,
    'state': options.state || 'open',
    'title': 'Lorem ipsum',
    'body': options.body || 'Hello world',
    'assignees': options.assignees || undefined,
    'user': {
      'login': login,
      'html_url': ['https://mockhub.com', login].join('/')
    },
    'head': {
      'sha': 'deadbeef'
    }
  });
};

describe('(unit)', function () {
  describe('url', function () {
    describe('#parseURL', function () {
      it('parses URLs correctly', function () {
        var uo = url.parseURL('https://example.com/abc/xyz?123#foo');
        uo.host.should.equal('example.com');
      });
    });

    describe('#extractURLs', function () {
      it('extracts URLs correctly', function () {
        var text = 'go to http://example.com, then go to https://foobar.xyz?abc=123.';
        var urls = url.extractURLs(text);
        urls[0].should.equal('http://example.com');
        urls[1].should.equal('https://foobar.xyz/?abc=123');
      });
    });
  });

  describe('Request', function () {
    it('identifies reviews correctly', function () {
      var r = Request({'text': 'review https://github.com/abc/pull/1'});
      r.should.have.ownProperty('isReview');
      r.isReview.should.be.true;
      r.githubURLs[0].href.should.equal('https://github.com/abc/pull/1');
    });

    it('identifies non-reviews correctly', function () {
      var r = Request({'text': 'https://github.com/abc/pull/1, https://github.com/xyz/pull/2'});
      r.isReview.should.be.false;
      r.githubURLs.should.have.lengthOf(2);

      var r = Request({'text': 'review https://example.com/xyz/pull/2'});
      r.isReview.should.be.false;
      r.githubURLs.should.be.empty;
    });
  });

  describe('github', function () {
    beforeEach(function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/2');
    });

    it('#getGithubResources', function () {
      var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1 and https://github.com/OWNER/REPO/pull/2 '});
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          resources.should.have.lengthOf(2);
          resources[1].number.should.equal('2');
        });
    });

    it('#getPullRequestFiles');
    it('#getBlameForCommitFile');
    it('#assignUsersToResource');
    it('#postPullRequestComment');
  });

  describe('generic message', function () {
    var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1 and https://github.com/OWNER/REPO/pull/2 '});
    var reviewers = [{'login': 'foo'}, {'login': 'bar'}];

    beforeEach(function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/2');
    });

    it('outputs an error when provided', function () {
      var message = GenericMessage({'error': 'test'});
      message.should.equal('test');
    });

    it('outputs a review message', function () {
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = GenericMessage({
            'reviewers': reviewers,
            'resources': resources
          });

          message.should.equal('Assigning @foo, @bar to OWNER/REPO#1');
        });
    });

    it('outputs a review message using a reviewer map', function () {
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = GenericMessage({
            'reviewers': reviewers,
            'resources': resources,
            'reviewerMap': {
              'foo': 'uvw',
              'bar': 'xyz'
            }
          });

          message.should.equal('Assigning @uvw, @xyz to OWNER/REPO#1');
        });
    })
  });

  describe('Slack message', function () {
    var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1 and https://github.com/OWNER/REPO/pull/2'});

    beforeEach(function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/2');
    });

    it('outputs a non-review message', function () {
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = SlackMessage({
            'resources': resources
          });

          var attachments = message.attachments;
          attachments[0].fallback.should.equal('Lorem ipsum by mockuser: https://mockhub.com/OWNER/REPO/pull/1');
          attachments[0].title.should.equal('OWNER/REPO: Lorem ipsum');
          attachments[1].fallback.should.equal('Lorem ipsum by mockuser: https://mockhub.com/OWNER/REPO/pull/2');
          attachments[1].title.should.equal('OWNER/REPO: Lorem ipsum');
        });
    });

    it('outputs an image if one is available in PR body', function () {
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          resources = resources.map(function (resource) {
            resource.data = {
              'user': {},
              'body': 'http://example.com/example.png'
            };

            return resource;
          });

          var message = SlackMessage({
            'resources': resources
          });

          var attachments = message.attachments;
          attachments[0].text.should.equal('');
          attachments[0].image_url.should.equal('http://example.com/example.png');
        });
    });

    it('outputs a review message', function () {
      var r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1'});
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var reviewers = [{'login': 'foo'}, {'login': 'bar'}];
          var message = SlackMessage({
            'resources': resources,
            'reviewers': reviewers
          });

          message.text.should.equal('@foo, @bar: please review this pull request');
          message.should.have.ownProperty('attachments');
        });
    });
  });

  describe('GitHub message', function () {
    beforeEach(function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
    });

    it('does not output a non-review message', function () {
      var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1'});

      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = GitHubMessage({
            'resources': resources
          });

          (message === undefined).should.be.true;
        });
    });

    it('outputs a review message', function () {
      var r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1'});
      var reviewers = [{'login': 'foo'}, {'login': 'bar'}];

      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = GitHubMessage({
            'resources': resources,
            'reviewers': reviewers
          });

          message.should.equal('@foo, @bar: please review this pull request');
        });
    });
  });
});

describe('(integration)', function () {
  describe('HubotReview', function () {
    describe('using default adapter', function () {
      beforeEach(function () {
        mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      });

      it('works correctly', function () {
        return HubotReview({'text': 'review https://github.com/OWNER/REPO/pull/1'})
          .then(function (res) {
            console.log(res);
            res.should.contain('Assigning');
          })
      });
    });
  });

  describe('Hubot', function () {
    var room;

    beforeEach(function () {
      room = helper.createRoom();
    });

    afterEach(function () {
      return room.destroy();
    });
  });
});