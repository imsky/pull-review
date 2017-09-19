# Pull Review

[![Build Status](https://travis-ci.org/imsky/pull-review.svg?branch=master)](https://travis-ci.org/imsky/pull-review) [![codecov](https://codecov.io/gh/imsky/pull-review/branch/master/graph/badge.svg)](https://codecov.io/gh/imsky/pull-review) [![npm](https://img.shields.io/npm/v/pull-review.svg)](https://www.npmjs.com/package/pull-review) [![license](https://img.shields.io/github/license/imsky/pull-review.svg)](https://github.com/imsky/pull-review/blob/master/LICENSE)

<!-- todo: screenshot -->

**Pull Review** assigns pull request reviewers intelligently.

Using [Git data](https://git-scm.com/docs/git-blame), Pull Review looks through the files changed by a pull request and assigns the most relevant users as reviewers. The most relevant users are calculated as those who have made the largest and most recent contributions to the changed files. The number of reviewers assigned, along with other parameters, can be easily configured. Pull Review works in chat using [Hubot](https://hubot.github.com/) and programmatically via API.

## Installation

`npm install pull-review`

## Usage

Make sure the `PULL_REVIEW_GITHUB_TOKEN` environment variable is set to the GitHub token you'd like to use.

### Hubot

Install `pull-review` with npm.

Make sure `pull-review` is listed in `external-scripts.json`:

```json
[
  "pull-review"
]
```

Afterwards, you can request review assignments like this:

```
review https://github.com/imsky/pull-review/pull/1 please
```

If you've already requested review and the reviewers are not responding, you can try again with:

```
review https://github.com/imsky/pull-review/pull/1 again please
```

### API

```js
var PullReview = require('pull-review');

PullReview({
  pullRequestURL: 'https://github.com/imsky/pull-review/pull/1',

  // if retryReview is set to true, any current assignees
  // will be unassigned and new reviewers will be assigned
  retryReview: false,

  // if dryRun is set to true, Pull Review will not
  // assign or notify reviewers, but will instead
  // provide a list of reviewers and the notification
  // channels it plans to use
  dryRun: false,

  // custom Pull Review configuration, overriding any
  // configuration that already exists in the repo
  config: {version: 1}
});
```

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

#### review_path_fallbacks

A map of lists, with the main keys being the path prefixes, and the lists including the users to assign to those path prefixes. Example:

```yaml
review_path_fallbacks:
  web/ui:
  - alice
```

When Pull Review encounters a file whose path begins with `web/ui`, `alice` will be assigned if not enough Git blame information is available.

### Environment variables

* `PULL_REVIEW_GITHUB_TOKEN`: the GitHub token used to fetch pull request information. The token must have `repo` and `user` scopes. This environment variable is **required** when using Pull Review as a Hubot plugin.
* `PULL_REVIEW_CONFIG_PATH`: the location of the Pull Review config file in the pull request repo (default is `.pull-review`).
* `PULL_REVIEW_REQUIRED_ROOMS`: a comma-separated list of chat rooms where a review request may be made, for example: `dev,ops`.
* `PULL_REVIEW_CONFIG`: a JSON/YAML Pull Review configuration, which will override any configuration in the repository

## Algorithm

Pull Review was partly inspired by [mention-bot](https://github.com/facebook/mention-bot), however its algorithm is a bit different.

* Get all modified files for a pull request and take the [top 5 files](#max_files) with most changes
* Get information on which author changed what lines in these files using [Git blame](https://git-scm.com/docs/git-blame) data, filtering out older data
* Add up the lines written per individual author for the top modified files, and sort the authors by lines written
* Assign the authors with most lines written for the top modified files as the reviewers
* If there are [not enough reviewers](#min_reviewers), add more reviewers from [path fallback rules](review_path_fallbacks) and, if there are still not enough, from a [pool of all reviewers](#reviewers)

If more reviewers are necessary, limits can be set on [files per reviewer](#max_files_per_reviewer) and [lines of code per reviewer](#max_lines_per_reviewer).

## Support

Pull Review supports Node 0.10+.

## License

[MIT](http://opensource.org/licenses/MIT)

## Credits

Made by [Ivan Malopinsky](http://imsky.co).
