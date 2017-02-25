function BlameRangeList (options) {
  var blame = options.blame || {};
  var ranges = blame.ranges || [];

  return ranges.map(function (range) {
    if (!range.commit.author.user) {
      return null;
    }

    return {
      'age': range.age,
      'count': range.endingLine - range.startingLine + 1,
      'login': range.commit.author.user.login
    };
  }).filter(Boolean);
}

module.exports = BlameRangeList;