var TEST = process.env.NODE_ENV === 'test';
var GITHUB_TOKEN = process.env.GITHUB_TOKEN;
var GITHUB_ICON_URL = process.env.GITHUB_ICON_URL || 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/240px-Octicons-mark-github.svg.png';

module.exports = {
  'TEST': TEST,
  'GITHUB_TOKEN': GITHUB_TOKEN,
  'GITHUB_ICON_URL': GITHUB_ICON_URL
};