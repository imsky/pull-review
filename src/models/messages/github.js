module.exports = function (input) {
  var users = input.users;

  if (!users) {
    throw Error('Missing users');
  }

  users = users.map(function (user) {
    return '@' + user;
  });

  return users.join(', ') + ': please review this pull request.\n\n> Powered by [pull-review](https://github.com/imsky/pull-review)';
};
