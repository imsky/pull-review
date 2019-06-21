var spelling = require('../src/utilities/spelling');

describe('spelling', function () {
  describe('#correctSpelling', function () {
    it('corrects misspelled "review" and "again"', function () {
      var messages = [
        {
          input: 'foo bar baz',
          output: 'foo bar baz'
        },
        {
          input: ' ',
          output: ' '
        },
        {
          input: 'a  a',
          output: 'a  a'
        },
        {
          input: 'review XYZ again',
          output: 'review XYZ again'
        },
        {
          input: 'reivew XYZ',
          output: 'review XYZ'
        },
        {
          input: 'reviwe XYZ',
          output: 'review XYZ'
        },
        {
          input: ' please rveiew XYZ  agian',
          output: ' please review XYZ  again'
        },
        {
          input: 'review reivew rievew erview roview',
          output: 'review review rievew review roview'
        }
      ];

      for (var i = 0; i < messages.length; i++) {
        var output = spelling.correctSpelling(messages[i].input, ['review', 'again']);
        output.should.equal(messages[i].output, JSON.stringify(messages[i]));
      }
    });

    it('fails with invalid input', function () {
      (function () {
        spelling.correctSpelling();
      }.should.throw(Error, 'Expected string to be a string'));

      (function () {
        spelling.correctSpelling('abc');
      }.should.throw(Error, 'Expected words to be an array'));
    });
  });
});
