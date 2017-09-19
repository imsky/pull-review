var Action = require('../src/models/action');
var BlameRange = require('../src/models/blame-range');
var GithubMessage = require('../src/models/messages/github');
var HubotMessage = require('../src/models/messages/hubot');

describe('models', function () {
  describe('Action', function () {
    it('works', function () {
      (function () {
        Action();
      }).should.throw('Missing action data');

      (function () {
        Action({
          type: 'TEST',
          payload: {}
        });
      }).should.throw(Error, 'Unsupported action: TEST');
    });
  });

  describe('BlameRange', function () {
    it('works', function () {
      (function () {
        BlameRange({
          login: 'alice',
          count: -1,
          age: 1
        });
      }).should.throw(Error, 'Blame range count is below 1');
    });
  });

  describe('GithubMessage', function () {
    it('works', function () {
      (function () {
        GithubMessage();
      }).should.throw(Error, 'Missing users');

      GithubMessage({
        users: ['alice', 'bob']
      }).should.equal('@alice, @bob: please review this pull request.\n\n> Powered by [pull-review](https://github.com/imsky/pull-review)');
    });
  });

  describe('HubotMessage', function () {
    (function () {
      HubotMessage();
    }).should.throw(Error, 'Missing users');

    (function () {
      HubotMessage({
        users: []
      });
    }).should.throw(Error, 'Missing channel');

    (function () {
      HubotMessage({
        users: [],
        channel: 'test'
      });
    }).should.throw(Error, 'Missing pull request record');

    HubotMessage({
      users: ['alice', 'bob'],
      channel: 'hubot:generic',
      pullRequestRecord: {
        data: {
          html_url: 'https://github.com/OWNER/REPO/pull/1'
        }
      }
    }).should.equal('@alice, @bob: please review this pull request - https://github.com/OWNER/REPO/pull/1')
  });
});
