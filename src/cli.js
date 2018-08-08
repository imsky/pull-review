var program = require('commander');
var Promise = require('native-promise-only');
var debug = require('debug');

var npmPackage = require('../package.json');
var PullReview = require('../index');

var log = debug('pull-review');

var resolveCliPromise;
var cliPromise = new Promise(function(resolve) {
  resolveCliPromise = resolve;
});

module.exports = program;

program.cliPromise = cliPromise;
program
  .version(npmPackage.version)
  .usage('[options] <pull request URL>')
  .option('-r, --retry-review', 'Retry review')
  .option('-d, --dry-run', 'Do not assign or notify reviewers')
  .option('-t, --github-token <githubToken>', 'GitHub token to use')
  .option('-c, --config-path <configPath>', 'Pull Review configuration path in repo')
  .command('*', null, {noHelp: true, isDefault: true})
  .action(function(pullRequestURL) {
    return PullReview({
      pullRequestURL: pullRequestURL,
      retryReview: program.retryReview,
      dryRun: program.dryRun,
      githubToken: program.githubToken,
      pullReviewConfigPath: program.configPath
    }).then(function(actions) {
      resolveCliPromise(actions);
      return cliPromise;
    }).catch(function (err) {
      log(err);
    });
  });
