# pull-review

[![Build Status](https://travis-ci.org/imsky/pull-review.svg?branch=master)](https://travis-ci.org/imsky/pull-review) [![codecov](https://codecov.io/gh/imsky/pull-review/branch/master/graph/badge.svg)](https://codecov.io/gh/imsky/pull-review)

`pull-review` helps figure out who should be assigned to review a pull request.

While it's built for use with GitHub, it's entirely platform- and client-agnostic. Adapters can be written to use `pull-review` with GitLab, Bitbucket, local Git repositories, and so on.

This repository hosts the algorithm *only*. It's meant to be used as a library in a larger application running in an environment that works best for your use case, whether it's a chat bot, a continuous integration system, or a webhook.

## Algorithm

`pull-review` is inspired by Facebook's [mention-bot](https://github.com/facebook/mention-bot). There are additional tweaks to the `mention-bot` algorithm that help with assignment logic. The algorithm is as follows:

* Get a set of files changed in a pull request
* Filter out any files that are only added or deleted
* Sort files in descending order by lines changed
* Leave only X top files (X is configurable)
* For each file, get the git blame information
* Sort blame "ranges" (sets of lines changed by a user) in order of most recent first, filter out oldest blame "ranges"
* For every blame "range", add up the number of lines changed for every user who has changed lines in the file
* Leave only Y top authors by lines changed (Y is configurable)

## Implementations

* [hubot-review](https://github.com/imsky/hubot-review) enables using `pull-review` from [Hubot](https://hubot.github.com/), a chat bot that works with Slack, HipChat, etc.

## Configuration

Configuration for `pull-review` is conventionally assumed to be a YAML/JSON file named `.pull-review` at the root of the repository.

Check out `.pull-review` for a documented example of a config file.

## License

[MIT](http://opensource.org/licenses/MIT)

## Credits

Made by [Ivan Malopinsky](http://imsky.co).