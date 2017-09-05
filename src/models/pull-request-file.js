module.exports = function PullRequestFile(input) {
  var filename = input.filename;
  var status = input.status;
  var changes = input.changes;

  if (!filename || !status || changes === undefined) {
    throw Error('Missing file data');
  }

  return input;
};
