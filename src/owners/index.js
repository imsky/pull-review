/* References:
https://chromium.googlesource.com/chromium/src/+/HEAD/docs/code_reviews.md
https://help.github.com/articles/about-codeowners/
https://github.com/bkeepers/OWNERS
*/

function normalizePath(path) {
  if (typeof path !== 'string') {
    throw Error('Invalid path, expecting a string');
  } else if (!path.length) {
    throw Error('Empty path provided');
  }

  if (path[0] === '/') {
    path = path.slice(1);
  }

  path = path.trim();

  var chunks = path.split('/');

  return {
    path: path,
    chunks: chunks
  };
}

function getCodeOwners(ownersFiles, filePaths) {
  if (!Array.isArray(ownersFiles)) {
    throw Error('OWNERS files must be provided as an array');
  } else if (!Array.isArray(filePaths)) {
    throw Error('File paths must be provided as an array');
  } else if (!ownersFiles.length) {
    throw Error('No OWNERS files provided');
  } else if (!filePaths.length) {
    throw Error('No file paths provided');
  }

  var ownersLocationMap = {};

  ownersFiles.forEach(function (file) {
    if (typeof file.content !== 'string') {
      throw Error('OWNERS file is missing content');
    }

    var np = normalizePath(file.path);

    if (!np.path.length) {
      throw Error('OWNERS file path is empty');
    }

    var basename = np.chunks[np.chunks.length - 1];

    if (basename !== 'OWNERS' && basename !== 'CODEOWNERS') {
      throw Error('OWNERS file has an unexpected name: "' + basename + '"');
    }

    var dir = np.chunks.slice(0, -1).join('/');
    ownersLocationMap[dir] = file;
  });

  var fileOwnersMap = {};

  filePaths.forEach(function (path) {
    var np = normalizePath(path);

    if (!np.path.length || !np.chunks.join('').length) {
      throw Error('File path is empty');
    }

    var stack = np.chunks.slice(0, -1);
    var dir = stack.join('/');

    while (stack.length) {
      var joined = stack.join('/');

      if (ownersLocationMap[joined]) {
        fileOwnersMap[dir] = fileOwnersMap[dir] || [];
        fileOwnersMap[dir].push(ownersLocationMap[joined]);
      }

      stack.pop();
    }

    console.log(ownersLocationMap, fileOwnersMap)
  });
}

module.exports = getCodeOwners;
