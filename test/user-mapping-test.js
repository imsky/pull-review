var userMapping = require('../src/utilities/user-mapping');

describe('user mapping', function() {
  describe('#generateChatUserMap', function() {
    it('creates a default chat user map correctly', function() {
      var userMap = userMapping.generateChatUserMap();
      Object.keys(userMap).should.be.empty;
    });

    it('creates a Slack chat user map correctly', function() {
      var userMap = userMapping.generateChatUserMap(
        {
          foo: {
            real_name: 'Foo',
            name: 'foo'
          },
          bar: {
            real_name: 'Bar'
          },
          baz: {}
        },
        'slack'
      );

      userMap.Foo.should.equal('foo');
      userMap.foo.should.equal('foo');
      userMap.Bar.should.equal('bar');
    });
  });

  describe('#createUserMappingFn', function() {
    it('creates a default chat user mapping function correctly', function() {
      var userMappingFn = userMapping.createUserMappingFn();
      var noUser = userMappingFn();
      (noUser === undefined).should.be.true;

      userMappingFn = userMapping.createUserMappingFn('foo', 'bar');
      fooUser = userMappingFn('foo');
      fooUser.should.equal('foo');
    });

    it('creates a Slack chat user mapping function correctly', function() {
      var userMap = userMapping.generateChatUserMap(
        {
          foo: {
            real_name: 'Foo',
            name: 'foo'
          },
          bar: {
            real_name: 'Bar'
          },
          baz: {}
        },
        'slack'
      );

      var userMappingFn = userMapping.createUserMappingFn(userMap, 'slack');

      var atUser = userMappingFn('@foo');
      atUser.should.equal('@foo');

      var mappedUser = userMappingFn('Foo');
      mappedUser.should.equal('<@foo>');

      var defaultUser = userMappingFn('baz', 'quux');
      defaultUser.should.equal('@quux');

      (function() {
        userMappingFn('baz');
      }.should.throw('Could not map user: baz'));
    });
  });
});
