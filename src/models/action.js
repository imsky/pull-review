var SUPPORTED_ACTIONS = ['COMMIT', 'NOTIFY', 'ASSIGN_USERS_TO_PULL_REQUEST', 'UNASSIGN_USERS_FROM_PULL_REQUEST'];

module.exports = function Action(input) {
  input = input || {};
  var type = input.type;
  var payload = input.payload;

  if (!type || !payload) {
    throw Error('Missing action data');
  } else if (SUPPORTED_ACTIONS.indexOf(type) === -1) {
    throw Error('Unsupported action: ' + type);
  }

  return input;
};
