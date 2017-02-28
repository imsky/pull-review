var Helper = require('hubot-test-helper');
var nock = require('nock');
var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var url = require('../src/url');
var github = require('../src/github');
var Request = require('../src/request');
var Response = require('../src/response');
var Review = require('../src/review');
var HubotReview = require('../src/hubot-review');
var messages = require('../src/messages');
var GenericMessage = messages.GenericMessage;
var SlackMessage = messages.SlackMessage;
var GitHubMessage = messages.GitHubMessage;

var helper = new Helper('../index.js');

var ghapi = nock('https://api.github.com');

function mockNotFound(api, url) {
  return api.get(url).reply(404, {
    'message': 'Not Found'
  });
}

function mockGitHubPullRequest(api, url, options) {
  var split = url.split('/');
  var owner = split[2];
  var repo = split[3];
  var number = split[5];
  options = options || {};

  var login = options.login || 'mockuser';
  var state = options.state || 'open';

  return api.get(url).reply(200, {
    'html_url': ['https://mockhub.com', owner, repo, 'pull', number].join('/'),
    'number': number,
    'state': state,
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

function mockGitHubPullRequestFiles(api, url, options) {
  var split = url.split('/');
  var owner = split[2];
  var repo = split[3];
  var number = split[5];
  options = options || {};

  return api.get(url).reply(200, [
    {
      'filename': 'added_file.txt',
      'status': 'added',
      'changes': 999
    },
    {
      'filename': 'modified_file_1.txt',
      'status': 'modified',
      'changes': 1
    },
    {
      'filename': 'modified_file_2.txt',
      'status': 'modified',
      'changes': 2
    },

    {
      'filename': 'modified_file_3.txt',
      'status': 'modified',
      'changes': 3
    },
    {
      'filename': 'deleted_file.txt',
      'status': 'deleted',
      'changes': 999
    }
  ]);
}

function mockGraphQLBlame(api, url, options) {
  options = options || {};

  return api.post(url).reply(200, {
    'data': {
      'repository': {
        'object': {
          'blame': {
            'ranges': [
              {
                'startingLine': 1,
                'endingLine': 10,
                'age': 1,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser'
                    }
                  }
                }
              },
              {
                'startingLine': 11,
                'endingLine': 12,
                'age': 10,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser2'
                    }
                  }
                }
              },
              {
                'startingLine': 13,
                'endingLine': 15,
                'age': 2,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser'
                    }
                  }
                }
              },
              {
                'startingLine': 16,
                'endingLine': 16,
                'age': 1,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser2'
                    }
                  }
                }
              },
              {
                'startingLine': 17,
                'endingLine': 25,
                'age': 3,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser'
                    }
                  }
                }
              },
              {
                'startingLine': 25,
                'endingLine': 26,
                'age': 9,
                'commit': {
                  'author': {
                    'user': {
                      'login': 'mockuser3'
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  })
}

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
    it('#getGithubResources', function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/2');

      var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1 and https://github.com/OWNER/REPO/pull/2 '});
      return github.getGithubResources(r.githubURLs)
        .then(function (resources) {
          resources.should.have.lengthOf(2);
          resources[1].number.should.equal('2');
        });
    });

    it('#getPullRequestFiles', function () {
      mockGitHubPullRequestFiles(ghapi, '/repos/OWNER/REPO/pulls/1/files?per_page=100');

      return github.getPullRequestFiles({
        'owner': 'OWNER',
        'repo': 'REPO',
        'number': 1
      })
        .then(function (files) {
          files.should.not.be.empty;
          files.should.have.lengthOf(5);
        });
    });

    it('#getBlameForCommitFile');
    it('#assignUsersToResource');
    it('#postPullRequestComment');
  });

  describe('Review', function () {
    it('bails when input request is not a review', function () {
      var r = Request({'text': 'https://github.com/OWNER/REPO/pull/1'});
      var review = Review({'request': r});
      return review.then(function (res) {
        (res === null).should.be.true;
      });
    });

    it('fails with PRs that are not found', function () {
      mockNotFound(ghapi, '/repos/OWNER/REPO/pulls/1');
      var r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1'});
      var review = Review({'request': r});
      return review.should.eventually.be.rejectedWith(Error, '{"message":"Not Found"}');
    });

    it('fails without exactly one open GitHub pull request with user data', function () {
      var r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1  https://github.com/OWNER/REPO/pull/2'});

      var tooManyPRs = Review({'request': r});

      r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1'});
      r.githubURLs = [];

      var notEnoughPRs = Review({'request': r});

      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1', {
        'state': 'closed'
      });

      r = Request({'text': 'review https://github.com/OWNER/REPO/pull/1'});
      var closedPR = Review({'request': r});

      return Promise.all([
        tooManyPRs.should.eventually.be.rejectedWith(Error, 'Only one GitHub URL can be reviewed at a time'),
        notEnoughPRs.should.eventually.be.rejectedWith(Error, 'No GitHub URLs'),
        closedPR.should.eventually.be.rejectedWith(Error, 'Pull request is not open')
      ]);
    });

    it('fails with enough assigned reviewers');
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
    });

    it('outputs nothing without reviewers', function () {
      var message = GenericMessage({'reviewers': null});
      (message === undefined).should.be.true;
    });
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
      it('works correctly', function () {
        mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
        mockGitHubPullRequestFiles(ghapi, '/repos/OWNER/REPO/pulls/1/files?per_page=100');
        mockGraphQLBlame(ghapi, '/graphql');
        mockGraphQLBlame(ghapi, '/graphql');
        mockGraphQLBlame(ghapi, '/graphql');
        ghapi.post('/repos/OWNER/REPO/issues/1/assignees').reply(200);
        ghapi.post('/repos/OWNER/REPO/issues/1/comments', "{\"body\":\"@mockuser2, @mockuser3: please review this pull request\"}\n").reply(200);

        return HubotReview({'text': 'review https://github.com/OWNER/REPO/pull/1'})
          .then(function (res) {
            res.should.contain('Assigning @mockuser2, @mockuser3 to OWNER/REPO#1');
          })
      });

      it('fails for issues', function () {
        mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/issues/1');
        mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/issues/1');

        return HubotReview({'text': 'review https://github.com/OWNER/REPO/issues/1'})
          .then(function (res) {
            (res instanceof Error).should.be.true;
            res.message.should.equal('Reviews for resources other than pull requests are not supported');
          });
      });

      it('fails for inaccessible PRs', function () {
        mockNotFound(ghapi, '/repos/OWNER/REPO/pulls/404');
        mockNotFound(ghapi, '/repos/OWNER/REPO/pulls/404');

        return HubotReview({'text': 'review https://github.com/OWNER/REPO/pull/404'})
          .then(function (res) {
            (res instanceof Error).should.be.true;
            res.message.should.equal('{"message":"Not Found"}');
          });
      });
    });

    describe('using Slack adapter', function () {
      beforeEach(function () {
        mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
        mockGitHubPullRequestFiles(ghapi, '/repos/OWNER/REPO/pulls/1/files?per_page=100');
        mockGraphQLBlame(ghapi, '/graphql');
        mockGraphQLBlame(ghapi, '/graphql');
        mockGraphQLBlame(ghapi, '/graphql');
        ghapi.post('/repos/OWNER/REPO/issues/1/assignees').reply(200);
        ghapi.post('/repos/OWNER/REPO/issues/1/comments', "{\"body\":\"@mockuser2, @mockuser3: please review this pull request\"}\n").reply(200);
      });

      it('works correctly', function () {
        return HubotReview({'adapter': 'slack', 'text': 'review https://github.com/OWNER/REPO/pull/1'})
          .then(function (res) {
            res.should.have.ownProperty('text');
            res.text.should.equal('@mockuser2, @mockuser3: please review this pull request');
            res.should.have.ownProperty('attachments');
            res.attachments.should.have.lengthOf(1);
          })
      });
    })
  });

  describe('Hubot', function () {
    var room;

    beforeEach(function () {
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequest(ghapi, '/repos/OWNER/REPO/pulls/1');
      mockGitHubPullRequestFiles(ghapi, '/repos/OWNER/REPO/pulls/1/files?per_page=100');
      mockGraphQLBlame(ghapi, '/graphql');
      mockGraphQLBlame(ghapi, '/graphql');
      mockGraphQLBlame(ghapi, '/graphql');
      ghapi.post('/repos/OWNER/REPO/issues/1/assignees').reply(200);
      ghapi.post('/repos/OWNER/REPO/issues/1/comments', "{\"body\":\"@mockuser2, @mockuser3: please review this pull request\"}\n").reply(200);

      room = helper.createRoom();
    });

    afterEach(function () {
      return room.destroy();
    });

    it('works', function (done) {
      return room.user.say('alice', 'review https://github.com/OWNER/REPO/pull/1 please')
        .then(function () {
          setTimeout(function () {
            room.messages.should.have.lengthOf(2);
            room.messages[1][1].should.equal('Assigning @mockuser2, @mockuser3 to OWNER/REPO#1');
            done();
          }, 500);
        });
    });
  });
});