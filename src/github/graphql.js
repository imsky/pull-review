var https = require('https');

require('native-promise-only');

function Request (options) {
  var token = options.token;
  var query = options.query;
  var variables = options.variables || {};

  if (!token) {
    throw Error('Missing GitHub token');
  } else if (!query) {
    throw Error('Missing query');
  }

  var payload = {
    'query': query,
    'variables': variables
  };

  return new Promise(function (resolve, reject) {
    var payloadString = JSON.stringify(payload);

    var req = https.request({
      'hostname': 'api.github.com',
      'path': '/graphql',
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
        'Content-Length': payloadString.length,
        'Authorization': 'bearer ' + token,
        'User-Agent': 'GitHub GraphQL Client'
      }
    }, function (res) {
      var chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk.toString('utf8'));
      });

      res.on('end', function () {
        if (res.statusCode !== 200) {
          reject(res.statusMessage);
          return;
        }

        var response = chunks.join('');

        try  {
          resolve(JSON.parse(response));
        } catch (e) {
          reject('GitHub GraphQL API response is not able to be parsed as JSON');
        }
      });
    });

    req.on('error', reject);
    req.write(payloadString);
    req.end();
  });
}

module.exports = Request;