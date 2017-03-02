var Request = require('./request');
var Review = require('./review');
var Response = require('./response');

function HubotReview (options) {
  var text = options.text;
  var adapter = options.adapter;
  var room = options.room;

  var request = Request({
    'text': text
  });

  var review = Review({
    'request': request,
    'room': room
  });

  var response = Response({
    'adapter': adapter,
    'request': request,
    'review': review
  });

  return response;
}

module.exports = HubotReview;