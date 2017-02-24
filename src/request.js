var url = require('./url');
var parseURL = url.parseURL;
var extractURLs = url.extractURLs;

function Request (options) {
  var text = options.text;

  var URLs = extractURLs(text);

  if (!URLs.length) {
    return;
  }

  var githubURLs = URLs.map(function (u) {
    var uo = parseURL(u);
    return uo.hostname === 'github.com' ? uo : false;
  }).filter(Boolean);

  var isReview = false;

  for (var i = 0; i < githubURLs.length; i++) {
    if (text.indexOf('review ' + githubURLs[i].href) !== -1) {
      isReview = true;
      break;
    }
  }

  return {
    'isReview': isReview,
    'githubURLs': githubURLs
  }
}

module.exports = Request;