# hubot-review

[![Build Status](https://travis-ci.org/imsky/hubot-review.svg?branch=master)](https://travis-ci.org/imsky/hubot-review)

Assigns and notifies reviewers for GitHub pull requests.

`hubot-review` is designed to work with Hubot running on Slack, however it should work with other platforms.

See [`index.js`](index.js) for full documentation.

## Usage

`hubot-review` operates in two modes: passive and active. In passive mode, links to GitHub issues and GitHub pull requests are given more context. In active mode, a link to a GitHub pull request will trigger a review assignment, which will assign the right users on GitHub and notify them on both GitHub and the requesting medium (i.e. if the review request came from Slack, the reviewers will be notified there).

In order to request a review, write `review <link-to-github-pull-request-here>`:

```
alice: please review https://github.com/alice/project/pull/123
hubot: @bob, @charlie: please review https://github.com/alice/project/pull/123
```

## Installation

In hubot project repo, run:

`npm install hubot-review --save`

Then add **hubot-review** to your `external-scripts.json`:

```json
[
  "hubot-review"
]
```

## Configuration

`hubot-review` uses [pull-review](https://github.com/imsky/pull-review) and the GitHub GraphQL API to determine reviewer assignment. Make sure to [enable the GraphQL API for your user/organization](https://github.com/prerelease/agreement) before using `hubot-review`.

Set up a `.pull-review` file in the root of your reviewed repository, and make sure to add notification information.

## License

[MIT](http://opensource.org/licenses/MIT)

## Credits

Made by [Ivan Malopinsky](http://imsky.co).