var program = require('commander');
var Promise = require('native-promise-only');

var npmPackage = require('../package.json');
var PullReview = require('../index');

var resolveCliPromise;
var cliPromise = new Promise(function (resolve) {
  resolveCliPromise = resolve;
});

module.exports = program;

program.cliPromise = cliPromise;
program.version(npmPackage.version)
  .usage('[options] <pull request URL>')
  .option('-r, --retry-review', 'Retry review')
  .option('-d, --dry-run', 'Dry run')
  .option('-t, --github-token <githubToken>', 'GitHub token')
  .command('*')
    .action(function (pullRequestURL) {
      return PullReview({
        pullRequestURL: pullRequestURL,
        retryReview: program.retryReview,
        dryRun: program.dryRun,
        githubToken: program.githubToken
      })
        .then(function (actions) {
          resolveCliPromise(actions);
          return cliPromise;
        });
    });
