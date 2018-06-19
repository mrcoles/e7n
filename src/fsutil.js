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

const readJson = (path, options) => readFile(path, options).then(JSON.parse);

const writeFile = (file, data, options) =>
  new Promise((resolve, reject) =>
    fs.writeFile(
      file,
      data,
      options === undefined ? 'utf8' : options,
      err => (err ? reject(err) : resolve())
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

module.exports = { readFile, readJson, writeFile, glob };
