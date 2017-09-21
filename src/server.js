var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('native-promise-only');

var debug = require('debug');

var npmPackage = require('../package.json');
var PullReview = require('./index');

var log = debug('pull-review');
var app = express();

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.redirect(npmPackage.homepage);
});

app.post('/', function (req, res) {
  Promise.resolve(req.body || {})
    .then(function (payload) {
      if (payload.action === 'created' && payload.comment && payload.comment.body.indexOf('/review') === 0) {
        var pullRequestURL = payload.pull_request.html_url;
        var retryReview = payload.comment.body.indexOf('/review again') === 0;

        return PullReview({
          pullRequestURL: pullRequestURL,
          retryReview: retryReview
        });
      }
    })
    .then(function (actions) {
      if (actions) {
        res.status(201).json(actions);
      } else {
        res.status(200).end();
      }
    })
    .catch(function (err) {
      log(err);
      res.status(400).send('Failed to parse request');
    });
});

app.listen(8080, function () {
  log('started server on 8080');
});

module.exports = app;
