function damerauLevenshtein(a, b, costs) {
  costs = costs || {
    delete: 1,
    insert: 1,
    substitute: 1,
    transpose: 1
  };

  var d = Array(a.length + 1);

  for (var j = 0; j <= b.length; j++) {
    d[j] = Array(b.length + 1);
    d[j][0] = j;
    for (var i = 1; i < d[j].length; i++) {
      d[j][i] = 0;
    }
  }

  for (var i = 0; i <= a.length; i++) {
    d[0][i] = i;
  }

  for (var j = 1; j <= b.length; j++) {
    for (var i = 1; i <= a.length; i++) {
      var indicator = a[i - 1] === b[j - 1] ? 0 : costs.substitute;
      d[j][i] = Math.min(
        d[j][i - 1] + costs.delete,
        d[j - 1][i] + costs.insert,
        d[j - 1][i - 1] + indicator);

      if (j > 1 && i > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[j][i] = Math.min(d[j][i], d[j - 2][i - 2] + costs.transpose);
      }
    }
  }

  return d[b.length][a.length];
}

exports.correctSpelling = function correctSpelling(string, words) {
  if (typeof string !== 'string') {
    throw Error('Expected string to be a string');
  } else if (!Array.isArray(words)) {
    throw Error('Expected words to be an array');
  }

  var costs = {
    delete: 2,
    insert: 2,
    substitute: 2,
    transpose: 1
  };

  return string.replace(/\b([a-z]+)\b/ig, function (m) {
    for (var i = 0; i < words.length; i++) {
      if (damerauLevenshtein(words[i], m, costs) < 2) {
        return words[i];
      }
    }
    return m;
  });
};
