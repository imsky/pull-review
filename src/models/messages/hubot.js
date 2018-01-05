var url = require('../../url');

var GITHUB_ICON_URL =
  'https://imsky.github.io/pull-review/pull-review-github-icon.png';

module.exports = function(input) {
  input = input || {};
  var users = input.users;
  var channel = input.channel;
  var pullRequestRecord = input.pullRequestRecord;
  var pullRequest = input.pullRequest;

  if (!users) {
    throw Error('Missing users');
  } else if (!channel) {
    throw Error('Missing channel');
  } else if (!pullRequestRecord) {
    throw Error('Missing pull request record');
  }

  if (channel === 'hubot:generic') {
    users = users.map(function(user) {
      return '@' + user;
    });
  } else if (channel === 'hubot:slack') {
    users = users.map(function(user) {
      if (user.indexOf('<') !== 0 && user.indexOf('@') !== 0) {
        return '@' + user;
      }

      return user;
    });
  }

  var message = users.join(', ') + ': please review this pull request';

  if (channel === 'hubot:generic') {
    return message + ' - ' + pullRequestRecord.data.html_url;
  } else if (channel === 'hubot:slack') {
    var repoName = pullRequest.owner + '/' + pullRequest.repo;
    var title = pullRequestRecord.data.title;
    var body = pullRequestRecord.data.body;
    var authorName = pullRequestRecord.data.user.login;
    var imagesInBody = false;
    var keyImage;

    var urls = url.extractURLs(body);

    for (var i = 0; i < urls.length; i++) {
      if (urls[i].match(/\.(jpg|jpeg|png|gif|svg)$/)) {
        imagesInBody = true;
        keyImage = urls[i];
        break;
      }
    }

    var bodyToSlackMarkdown = body
      //convert atx headers to bold text
      .replace(/^#{1,6} (.*?)$/gm, '*$1*')
      //convert markdown links with titles to slack links
      .replace(/\[([^\\\[]+?)\]\((http.*?)\)/gm, '<$2|$1>')
      //convert asterisk-led lists to use bullet points
      .replace(/^\* /gm, '• ');

    var attachment = {
      title: repoName + ': ' + title,
      title_link: pullRequestRecord.data.html_url,
      text: imagesInBody ? '' : bodyToSlackMarkdown,
      author_name: authorName,
      author_link: pullRequestRecord.data.user.html_url,
      fallback:
        title + ' by ' + authorName + ': ' + pullRequestRecord.data.html_url,
      mrkdwn_in: ['text', 'pretext', 'fields'],
      color: '#24292e',
      footer: 'GitHub',
      footer_icon: GITHUB_ICON_URL
    };

    if (imagesInBody) {
      attachment.image_url = keyImage;
    }

    return {
      text: message,
      attachments: [attachment]
    };
  }
};
