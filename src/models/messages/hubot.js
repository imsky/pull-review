module.exports = function (input) {
  var users = input.users;
  var channel = input.channel;
  var pullRequestRecord = input.pullRequestRecord;

  if (!users) {
    throw Error('Missing users');
  } else if (!channel) {
    throw Error('Missing channel');
  } else if (!pullRequestRecord) {
    throw Error('Missing pull request record');
  }

  if (channel === 'hubot:generic') {
    users = users.map(function (user) {
      return '@' + user;
    });

    return users.join(', ') + ': please review this pull request - ' + pullRequestRecord.data.html_url;
  }
};
