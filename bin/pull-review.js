#!/usr/bin/env node

process.env.DEBUG = 'pull-review';

var cli = require('../src/cli');
var server = require('../src/server');

if (process.argv.length) {
  cli.parse(process.argv);
} else {
  server.start();
}
