const fs = require('fs');
const _glob = require('glob');

const readFile = (path, options) =>
  new Promise((resolve, reject) =>
    fs.readFile(
      path,
      options === undefined ? 'utf8' : options,
      (err, data) => (err ? reject(err) : resolve(data))
    )
  );

const glob = (pattern, options) =>
  new Promise((resolve, reject) => {
    _glob(
      pattern,
      options,
      (err, files) => (err ? reject(err) : resolve(files))
    );
  });

//
// ## Exports
//

module.exports = { glob, readFile };
