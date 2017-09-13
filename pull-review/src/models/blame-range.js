module.exports = function BlameRange(input) {
  var login = input.login;
  var count = input.count;
  var age = input.age;

  if (!login || !count || !age) {
    throw Error('Missing blame range data');
  } else if (count < 1) {
    throw Error('Blame range count is below 1')
  }

  return input;
};
