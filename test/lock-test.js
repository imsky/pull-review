var Lock = require('../src/lock');

describe('lock', function () {
  it('returns a locked state before TTL expires', function (done) {
    var lock = Lock({ ttl: 1 });
    var retval = lock('foo');
    retval.isLocked.should.be.false;
    setTimeout(function () {
      retval = lock('foo');
      retval.isLocked.should.be.true;
      done();
    }, 500);
  });

  it('returns an unlocked state after TTL expires', function (done) {
    var lock = Lock({ ttl: 1 });
    var retval = lock('foo');
    retval.isLocked.should.be.false;
    setTimeout(function () {
      retval = lock('foo');
      retval.isLocked.should.be.false;
      done();
    }, 1500);
  });
});
