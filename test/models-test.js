var Action = require('../src/models/action');
var BlameRange = require('../src/models/blame-range');
var GithubMessage = require('../src/models/messages/github');
var HubotMessage = require('../src/models/messages/hubot');

describe('models', function() {
  describe('Action', function() {
    it('works', function() {
      (function() {
        Action();
      }.should.throw('Missing action data'));

      (function() {
        Action({
          type: 'TEST',
          payload: {}
        });
      }.should.throw(Error, 'Unsupported action: TEST'));
    });
  });

  describe('BlameRange', function() {
    it('works', function() {
      (function() {
        BlameRange({
          login: 'alice',
          count: -1,
          age: 1
        });
      }.should.throw(Error, 'Blame range count is below 1'));
    });
  });

  describe('GithubMessage', function() {
    it('works', function() {
      (function() {
        GithubMessage();
      }.should.throw(Error, 'Missing users'));

      GithubMessage({
        users: ['alice', 'bob']
      }).should.equal(
        '@alice, @bob: please review this pull request.\n\n> Powered by [pull-review](https://github.com/imsky/pull-review)'
      );
    });
  });

  describe('HubotMessage', function() {
    it('works', function() {
      (function() {
        HubotMessage();
      }.should.throw(Error, 'Missing users'));

      (function() {
        HubotMessage({
          users: []
        });
      }.should.throw(Error, 'Missing channel'));

      (function() {
        HubotMessage({
          users: [],
          channel: 'test'
        });
      }.should.throw(Error, 'Missing pull request record'));

      HubotMessage({
        users: ['alice', 'bob'],
        channel: 'hubot:generic',
        pullRequestRecord: {
          html_url: 'https://github.com/OWNER/REPO/pull/1'
        }
      }).should.equal(
        '@alice, @bob: please review https://github.com/OWNER/REPO/pull/1'
      );

      HubotMessage({
        users: ['alice'],
        channel: 'hubot:slack',
        pullRequest: {
          owner: 'OWNER',
          repo: 'REPO'
        },
        pullRequestRecord: {
          title: 'hello world',
          html_url: 'https://github.com/OWNER/REPO/pull/1',
          body: 'hello [world] [link](http://example.com)\n```js\nconsole.log(123)\n```',
          user: {
            login: 'bob',
            html_url: 'www.bob.com'
          }
        }
      }).should.deep.equal({
        text: '@alice: please review https://github.com/OWNER/REPO/pull/1',
        attachments: [
          {
            author_link: 'www.bob.com',
            author_name: 'bob',
            color: '#24292e',
            fallback:
              'hello world by bob: https://github.com/OWNER/REPO/pull/1',
            footer: 'GitHub',
            footer_icon:
              'https://imsky.github.io/pull-review/pull-review-github-icon.png',
            mrkdwn_in: ['text', 'pretext', 'fields'],
            text: 'hello [world] <http://example.com|link>\n```\nconsole.log(123)\n```',
            title: 'OWNER/REPO: hello world',
            title_link: 'https://github.com/OWNER/REPO/pull/1'
          }
        ]
      });
    });
  });
});
