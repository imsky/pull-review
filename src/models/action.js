module.exports = function Action(input) {
  var type = input.type;
  var payload = input.payload;

  if (!type || !payload) {
    throw Error('Missing action data');
  }

  return input;
};
