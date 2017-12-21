exports.generateChatUserMap = function(rawUsers, adapter) {
  rawUsers = rawUsers || {};
  var chatUserMap = {};

  if (adapter !== 'slack') {
    return chatUserMap;
  }

  Object.keys(rawUsers).forEach(function(userId) {
    var user = rawUsers[userId];

    if (user.real_name && !chatUserMap[user.real_name]) {
      chatUserMap[user.real_name] = userId;
    }

    if (user.name && !chatUserMap[user.name]) {
      chatUserMap[user.name] = userId;
    }
  });

  return chatUserMap;
};

exports.createUserMappingFn = function(chatUserMap, adapter) {
  chatUserMap = chatUserMap || {};

  return function userMappingFn(lookupUser, defaultUser) {
    if (typeof lookupUser !== 'string') {
      return;
    } else if (adapter !== 'slack') {
      return lookupUser;
    }

    if (lookupUser.indexOf('@') === 0) {
      return lookupUser;
    } else if (chatUserMap[lookupUser] !== undefined) {
      return '<@' + chatUserMap[lookupUser] + '>';
    } else if (defaultUser !== undefined) {
      return '@' + defaultUser;
    } else {
      throw Error('Could not map user: ' + lookupUser);
    }
  };
};
