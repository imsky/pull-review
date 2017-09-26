var Promise = require('native-promise-only');

var client = require('github-graphql-client');

/**
 * Promisified wrapper over github-graphql-client
 * @param {Object} options - GraphQL request options
 */
function Request(options) {
  return new Promise(function(resolve, reject) {
    client(options, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

module.exports = Request;
