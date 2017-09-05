var fs = require('fs');
var path = require('path');

var chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();

var config = fs.readFileSync(path.join(__dirname, '..', '.pull-review'), 'utf8');

module.exports = {
  'chai': chai,
  'config': config
};
