var url = require('./url');
var parseURL = url.parseURL;
var extractURLs = url.extractURLs;

function Request (options) {
  var REQUIRED_ROOMS = process.env.HUBOT_REVIEW_REQUIRED_ROOMS || '';

  var text = options.text;
  var room = options.room;

  var URLs = extractURLs(text) || [];
  var requiredRooms = REQUIRED_ROOMS.split(',').filter(Boolean);

  var urlMap = {};

  var githubURLs = URLs.map(function (u) {
    if (urlMap[u]) {
      return false;
    }

    urlMap[u] = true;
    var uo = parseURL(u);
    return uo.hostname === 'github.com' ? uo : false;
  }).filter(Boolean);

  var isReview = false;
  var reviewAgain = false;

  for (var i = 0; i < githubURLs.length; i++) {
    var reviewRequest = text.indexOf('review ' + githubURLs[i].href) !== -1;
    var reviewAgainRequest = text.indexOf('review ' + githubURLs[i].href + ' again') !== -1;

    if (reviewRequest || reviewAgainRequest) {
      isReview = true;
    }

    if (reviewAgainRequest) {
      reviewAgain = true;
    }
  }

  if (isReview && requiredRooms.length && room !== undefined) {
    if (requiredRooms.indexOf(room) === -1) {
      throw Error('Review requests from this room are disabled');
    }
  }

  return {
    'isReview': isReview,
    'reviewAgain': reviewAgain,
    'githubURLs': githubURLs
  };
}

module.exports = Request;