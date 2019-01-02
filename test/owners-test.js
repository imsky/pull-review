var getCodeOwners = require('../src/owners');

describe('owners', function () {
  it('works', function () {
    getCodeOwners([
      {
        path: 'a/b/c/OWNERS',
        content: 'foo'
      },
      {
        path: 'a/OWNERS',
        content: 'bar'
      }
    ], ['a/b/c/test.txt', 'a/b/'])
  });
});
