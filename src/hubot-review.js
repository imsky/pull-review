var Request = require('./src/request');
var Review = require('./src/review');
var Response = require('./src/response');

function HubotReview (options) {
  var text = options.text;
  var adapter = options.adapter;

  var request = Request({
    'text': text
  });

  var review = Review({
    'request': request
  });

  var response = Response({
    'adapter': adapter,
    'request': request,
    'review': review
  });

  return response;
}

module.exports = HubotReview;