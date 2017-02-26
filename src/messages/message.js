function Message (options) {
  var error = options.error;
  var reviewers = options.reviewers;
  var resources = options.resources;
  var reviewerMap = options.reviewerMap || {};

  function templateFn (resources, reviewers) {
    if (!reviewers) {
      return;
    }

    var pullRequest = resources[0];
    var shorthand = pullRequest.owner + '/' + pullRequest.repo + '#' + pullRequest.number;
    if (reviewers.length) {
      return 'Assigning ' + reviewers.join(', ') + ' to ' + shorthand;
    }
  }

  if (options.templateFn) {
    templateFn = options.templateFn;
  }

  if (error) {
    return error;
  } else if (reviewers) {
    var usernames = reviewers.map(function (reviewer) {
      var username = reviewer.login;

      if (reviewerMap[username]) {
        username = reviewerMap[username];
      }

      return '@' + username;
    });

    return templateFn(resources, usernames);
  } else {
    return templateFn(resources);
  }
};

module.exports = Message;