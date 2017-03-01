var url = require('../url');

var Message = require('./message');

var extractURLs = url.extractURLs;

var GITHUB_ICON_URL = process.env.GITHUB_ICON_URL || 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/240px-Octicons-mark-github.svg.png';

function generateSlackAttachmentFromGithubResource (resource) {
  var data = resource.data;

  if (!data) {
    throw Error('Missing resource data');
  }

  var repoName = resource.owner + '/' + resource.repo;
  var body = data.body;
  var imagesInBody = false;
  var keyImage;

  var bodyURLs = extractURLs(body);

  for (var i = 0; i < bodyURLs.length; i++) {
    if (bodyURLs[i].match(/\.(jpg|jpeg|png|gif)$/)) {
      imagesInBody = true;
      keyImage = bodyURLs[i];
      break;
    }
  }

  var attachment = {
    'fallback': data.title + ' by ' + data.user.login + ': ' + data.html_url,
    'author_name': data.user.login,
    'author_link': data.user.html_url,
    'title': repoName + ': ' + data.title,
    'title_link': data.html_url,
    'text': imagesInBody ? '' : body,
    'mrkdwn_in': ['text', 'pretext', 'fields'],
    'color': '#24292e',
    'footer': 'GitHub',
    'footer_icon': GITHUB_ICON_URL
  };

  if (imagesInBody) {
    attachment.image_url = keyImage;
  }

  return attachment;
}

function templateFn (resources, reviewers) {
  var attachments = resources.map(generateSlackAttachmentFromGithubResource);

  if (!reviewers || !reviewers.length) {
    return {
      'text': '',
      'attachments': attachments
    };
  }

  return {
    'text': reviewers.join(', ') + ': please review this pull request',
    'attachments': attachments
  };
}

function SlackMessage (options) {
  return Message({
    'templateFn': templateFn,
    'error': options.error,
    'reviewers': options.reviewers,
    'resources': options.resources,
    'reviewerMap': options.reviewerMap
  });
}

module.exports = SlackMessage;
