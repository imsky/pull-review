#!/usr/bin/env node

process.env.DEBUG = 'pull-review';

if (process.argv.length > 2) {
  var cli = require('../src/cli');
  cli.parse(process.argv);
} else {
  var server = require('../src/server');
}
