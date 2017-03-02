var url = require('./url');
var parseURL = url.parseURL;
var extractURLs = url.extractURLs;

function Request (options) {
  var REQUIRED_ROOMS = process.env.HUBOT_REVIEW_REQUIRED_ROOMS || '';

  var text = options.text;
  var room = options.room;

  var URLs = extractURLs(text) || [];
  var requiredRooms = REQUIRED_ROOMS.split(',').filter(Boolean);

  if (requiredRooms.length && room !== undefined) {
    if (requiredRooms.indexOf(room) === -1) {
      throw Error('Review requests from this room are disabled');
    }
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
  };
}

module.exports = Request;