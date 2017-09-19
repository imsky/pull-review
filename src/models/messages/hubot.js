var url = require('../../url');

var GITHUB_ICON_URL = 'https://assets-cdn.github.com/pinned-octocat.svg';

module.exports = function (input) {
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

  users = users.map(function (user) {
    return '@' + user;
  });

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
      .replace(/\[([^\\]+)\]\((.*?\..*?)\)/gm, '<$2|$1>');

    var attachment = {
      title: repoName + ': ' + title,
      title_link: pullRequestRecord.data.html_url,
      text: imagesInBody ? '' : bodyToSlackMarkdown,
      author_name: authorName,
      author_link: pullRequestRecord.data.user.html_url,
      fallback: title + ' by ' + authorName + ': ' + pullRequestRecord.data.html_url,
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
