var Helper = require('hubot-test-helper');
var chai = require('chai');
chai.should();

var url = require('../src/url');
var github = require('../src/github');
var Request = require('../src/request');
var Response = require('../src/response');
var messages = require('../src/messages');
var GenericMessage = messages.GenericMessage;
var SlackMessage = messages.SlackMessage;

var helper = new Helper('../index.js');

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
    describe('#getGithubResources', function () {
      it('fetches resources correctly', function () {
        var r = Request({'text': 'https://github.com/abc/def/pull/1 and https://github.com/abc/def/pull/2 '});
        return github.getGithubResources(r.githubURLs)
          .then(function (resources) {
            resources.should.have.lengthOf(2);
            resources[1].number.should.equal('2');
          });
      });
    });
  });

  describe('generic message', function () {
    it('outputs an error when provided', function () {
      var message = GenericMessage({'error': 'test'});
      message.should.equal('test');
    });

    it('outputs a review message', function () {
       var r = Request({'text': 'https://github.com/abc/def/pull/1 and https://github.com/abc/def/pull/2 '});

       return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var reviewers = [{'login': 'foo'}, {'login': 'bar'}];
          var message = GenericMessage({
            'reviewers': reviewers,
            'resources': resources
          });

          message.should.equal('Assigning @foo, @bar to abc/def#1');
        });
    });
  });

  describe('Slack message', function () {
    var r = Request({'text': 'https://github.com/abc/def/pull/1 and https://github.com/abc/def/pull/2'});

    it('outputs a non-review message', function () {
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          var message = SlackMessage({
            'resources': resources
          });

          var attachments = message.attachments;
          attachments[0].fallback.should.equal('pull 1 by abc: gh.com/abc/def/pull/1');
          attachments[0].title.should.equal('abc/def: pull 1');
          attachments[1].fallback.should.equal('pull 2 by abc: gh.com/abc/def/pull/2');
          attachments[1].title.should.equal('abc/def: pull 2');
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
    })

    it('outputs a review message', function () {
      var r = Request({'text': 'review https://github.com/abc/def/pull/1'});
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

  describe('Response', function () {
    describe('using Slack', function () {
      describe('for non-review messages', function () {
        it('generates attachments if GitHub URLs are present', function () {
          var req = Request({'text': 'https://github.com/abc/def/pull/1'});
          Response({'adapter': 'slack', 'request': req})
            .then(function (res) {
              res.should.have.ownProperty('attachments');
              res.attachments.should.have.lengthOf(1);
              res.attachments[0].fallback.should.equal('pull 1 by abc: gh.com/abc/def/pull/1');
            });
        });

        it('does not generate attachments if no GitHub URLs are present', function () {
          var req = Request({'text': 'https://example.com'});
          Response({'adapter': 'slack', 'request': req})
            .then(function (res) {
              (res === null).should.be.true;
            });
        });
      });
    })
  });
});

describe('(integration)', function () {
  var room;

  beforeEach(function () {
    room = helper.createRoom();
  });

  afterEach(function () {
    return room.destroy();
  });
});