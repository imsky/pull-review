var url = require('../src/url');

describe('url', function () {
  it('returns an empty list if no URLs are found', function () {
    var urls = url.extractURLs('');
    urls.should.have.lengthOf(0);
  });

  it('returns a list of URLs', function () {
    var urls = url.extractURLs('https://github.com');
    urls.should.have.lengthOf(1);
    urls[0].should.equal('https://github.com');
  })
});
