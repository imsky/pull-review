# hubot-review

[![Build Status](https://travis-ci.org/imsky/hubot-review.svg?branch=master)](https://travis-ci.org/imsky/hubot-review)

Assigns and notifies reviewers for GitHub pull requests.

`hubot-review` was designed to work with Hubot running on Slack.

See [`index.js`](index.js) for full documentation.

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

## NPM Module

https://www.npmjs.com/package/hubot-review

## License

[MIT](http://opensource.org/licenses/MIT)

## Credits

Made by [Ivan Malopinsky](http://imsky.co).