var client = require('github-graphql-client');

require('native-promise-only');

function Request(options) {
  return new Promise(function (resolve, reject) {
    client(options, function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

module.exports = Request;