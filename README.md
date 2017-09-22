# Pull Review

[![codecov](https://codecov.io/gh/imsky/pull-review/branch/master/graph/badge.svg)](https://codecov.io/gh/imsky/pull-review) [![Build Status](https://travis-ci.org/imsky/pull-review.svg?branch=master)](https://travis-ci.org/imsky/pull-review) [![Docker Build Statu](https://img.shields.io/docker/build/imsky/pull-review.svg)](https://hub.docker.com/r/imsky/pull-review/) [![npm](https://img.shields.io/npm/v/pull-review.svg)](https://www.npmjs.com/package/pull-review) [![license](https://img.shields.io/github/license/imsky/pull-review.svg)](https://github.com/imsky/pull-review/blob/master/LICENSE)

<!-- todo: screenshot -->

**Pull Review** assigns pull request reviewers intelligently.

Using [Git data](https://git-scm.com/docs/git-blame), Pull Review looks through the files changed by a pull request and assigns the most relevant users as reviewers. The most relevant users are calculated as those who have made the largest and most recent contributions to the changed files. The number of reviewers assigned, along with other parameters, can be easily configured.

You can use Pull Review through [GitHub comments](#github), from chat rooms in Slack/HipChat/etc. using [Hubot](#hubot), on the [command line](#cli), via [API](#api), or as a [Docker image](#docker).

## Installation

```
npm install pull-review
```

[![Deploy Pull Review to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/imsky/pull-review)

## Usage

First, add a `.pull-review` configuration file in your repository. Here is a minimal `.pull-review` file:

```yaml
version: 1

reviewers:
  your_github_username: {}
```

For details on configuration options, check out the [configuration](#configuration) section.

### GitHub

* In your GitHub repository, go to **Settings**→**Webhooks**
* Click **Add webhook**
* Set **Payload URL** to the Pull Review server URL (<https://pull-review.herokuapp.com/>)
  * The public Pull Review server does not allow [random assignment](#assign_min_reviewers_randomly).
  * However, you can easily [run your own Pull Review server](#server).
* Set **Content type** to `application/json`
* Choose **Let me select individual events**
* Pick the **Issue comment** event
* Click **Add webhook**

To assign reviewers on a pull request, post `/review`. To re-assign reviewers post `/review again`.

### Hubot


Make sure `pull-review` is listed in `external-scripts.json`:

```json
[
  "pull-review"
]
```

Make sure the `PULL_REVIEW_GITHUB_TOKEN` environment variable is set to the GitHub token you'd like to use.

Afterwards, you can request review assignments like this:

```
review https://github.com/imsky/pull-review/pull/1 please
```

You can re-run Pull Review on a pull request like this:

```
review https://github.com/imsky/pull-review/pull/1 again please
```

`"review...again"` is equivalent to using the `--retry-review` flag with the CLI or the `retryReview` API option.

### CLI

```bash
# install Pull Review globally
npm install --global pull-review

# run Pull Review on a pull request
pull-review https://github.com/imsky/pull-review/pull/1

# run Pull Review on a pull request, but do not assign or notify reviewers
pull-review --dry-run https://github.com/imsky/pull-review/pull/1

# run Pull Review on a pull request, unassigning current reviewers first
pull-review --retry-review https://github.com/imsky/pull-review/pull/1

# run Pull Review with a specific GitHub token
pull-review --github-token YOUR_GITHUB_TOKEN https://github.com/imsky/pull-review/pull/1
```
### API

```js
var PullReview = require('pull-review');

PullReview({
  pullRequestURL: 'https://github.com/imsky/pull-review/pull/1',

  // run Pull Review on a pull request, unassigning current reviewers first
  retryReview: true,

  // run Pull Review on a pull request, but do not assign or notify reviewers
  dryRun: true,

  // run Pull Review with a specific GitHub token
  githubToken: 'YOUR_GITHUB_TOKEN'

  // run Pull Review with a custom Pull Review configuration
  config: {version: 1}
});
```

### Docker

```bash
# get the Pull Review image
docker pull imsky/pull-review

# run Pull Review on a pull request
docker run -it -e PULL_REVIEW_GITHUB_TOKEN imsky/pull-review https://github.com/imsky/pull-review/pull/1

# run Pull Review with a specific GitHub token
docker run -it imsky/pull-review https://github.com/imsky/pull-review/pull/1 --github-token YOUR_GITHUB_TOKEN
```

### Server

You can run your own Pull Review server [on Heroku](https://heroku.com/deploy?template=https://github.com/imsky/pull-review) or another host. You can start the server by running `npm start`.

## Configuration

Configuration for Pull Review is conventionally assumed to be a YAML/JSON file named `.pull-review` at the root of the repository.

Check out [.pull-review](.pull-review) for a documented example of a config file.

#### max_files

Maximum number of files to evaluate in order to assign reviewers. Default is 5. Set to 0 for no maximum.

#### min_reviewers

Minimum number of reviewers to assign to a pull request. Default is 1.

#### max_reviewers

Maximum number of reviewers to assign to a pull request. Default is 2.

#### max_files_per_reviewer

Maximum number of files per reviewer. If the number of files is over this limit, more reviewers will be assigned up to the [maximum number of reviewers](#max_reviewers). Default is 0. Set to 0 for no maximum.

#### max_lines_per_reviewer

Maximum number of lines changed across added and modified files per reviewer. If the number of lines is over this limit, more reviewers will be assigned up to the [maximum number of reviewers](#max_reviewers). If both `max_files_per_reviewer` and `max_lines_per_reviewer` are defined, the assignment with the fewest reviewers will be used. Default is 0. Set to 0 for no maximum.

#### assign_min_reviewers_randomly

If the [minimum number of reviewers](#min_reviewers) isn't found, assign reviewers using [path fallbacks](review_path_fallbacks) and/or at random. Default is true.

#### min_authors_of_changed_files

If the pull request changes code with fewer authors than this minimum, replace any already assigned reviewers with a random reviewer. This option is useful in preventing "review loops" where the same people are reviewing the same area of code. Default is 0.

#### require_notification

Require a user to be listed in the [reviewers](#reviewers) section in order to be assigned as a reviewer. Default is true.

#### reviewers

A map of maps, with the main keys being the GitHub usernames of users, and the child keys providing application-specific contact information. Example:

```yaml
reviewers:
  alice:
    slack: alice_slack
```

When Pull Review sends its notification, it will notify `@alice` on GitHub and `@alice_slack` on Slack.

Currently only Slack is supported.

#### review_blacklist

A list of usernames to never notify. This is useful to exclude machine users and users who are on vacation or otherwise unavailable for reviews.

#### review_path_assignments

A map of lists, where the keys are [minimatch](https://github.com/isaacs/minimatch) (glob) patterns, and the lists include the users to assign. Example:


```yaml
review_path_assignments:
  web/server/**:
  - bob
```

When a file whose path begins with `web/server` is found, `bob` will be assigned ahead of other reviewers.

#### review_path_fallbacks

A map of lists, where the keys are [minimatch](https://github.com/isaacs/minimatch) (glob) patterns, and the lists include the users to assign. Example:

```yaml
review_path_fallbacks:
  web/ui/**:
  - alice
```

When a file whose path begins with `web/ui` is found, `alice` will be assigned if more reviewers are required.

#### file_blacklist

An array of [minimatch](https://github.com/isaacs/minimatch) (glob) patterns that should be filtered out when retrieving files for a pull request. Blacklisted files will not be considered in Git blame processing, in [fallback path processing](#review_path_fallbacks), or in [max files per reviewer](#max_files_per_reviewer) or [max lines per reviewer](#max_lines_per_reviewer) calculations. Example:

```yaml
file_blacklist:
  - web/ui/*.js
```

### Environment variables

* `PULL_REVIEW_GITHUB_TOKEN`: the GitHub token used to fetch pull request information. The token must have `repo` and `user` scopes. This environment variable is **required** when using Pull Review as a Hubot plugin or when running Pull Review in server mode.
* `PULL_REVIEW_CONFIG_PATH`: the location of the Pull Review config file in the pull request repo (default is `.pull-review`).
* `PULL_REVIEW_CONFIG`: a JSON/YAML Pull Review configuration, which will override any configuration in the repository
* `PULL_REVIEW_REQUIRED_ROOMS`: a comma-separated list of chat rooms where a review request may be made, for example: `dev,ops`.

## Algorithm

Pull Review was partly inspired by [mention-bot](https://github.com/facebook/mention-bot), however its algorithm is a bit different.

* Get all modified files for a pull request and take the [top 5 files](#max_files) with most changes
* Get information on which author changed what lines in these files using [Git blame](https://git-scm.com/docs/git-blame) data, filtering out older data
* Add up the lines written per individual author for the top modified files, and sort the authors by lines written
* Assign [authors who have precedence for particular paths](#review_path_assignments)
* Assign authors with most lines written for the top modified files as the reviewers
* If there are [not enough reviewers](#min_reviewers), add more reviewers from [path fallback rules](review_path_fallbacks)
* If there are still not enough reviewers, add reviewers randomly from a [pool of all reviewers](#reviewers)

If more reviewers are necessary, limits can be set on [files per reviewer](#max_files_per_reviewer) and [lines of code per reviewer](#max_lines_per_reviewer).

## Support

Pull Review supports Node 0.10+.

## License

[MIT](http://opensource.org/licenses/MIT)

## Credits

Made by [Ivan Malopinsky](http://imsky.co).
