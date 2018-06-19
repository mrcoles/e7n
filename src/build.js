const cheerio = require('cheerio');
const path = require('path');

const fsutil = require('./fsutil');
const util = require('./util');

const htmlParser = require('./parsers/html');
const jsParser = require('./parsers/javascript');

const LOADERS = [htmlParser, jsParser];

const IGNORES = ['.git', 'node_modules'];

// Name of error thrown during collect if errors are found
// inside the collected strings.
const COLLECT_ERROR = 'CollectError';

// Name of error thrown while combining strings if a key collision
// is found where the string values are different.
const KEY_COLLISION_ERROR = 'KeyCollisionError';

const collect = async opts => {
  let root = opts.root || process.cwd();
  let srcPath = opts.srcPath || root;

  let strings = await gatherStrings(srcPath);
  let combined = combineAndSort(strings);

  let defaultLocale = await getDefaultLocale(root);

  return combined;
};

const gatherStrings = async srcPath => {
  const baseDir = srcPath;

  let allErrors = [];
  let allStrings = [];

  for (let loader of LOADERS) {
    let pattern = path.join(baseDir, loader.PATTERN);
    let filenames = await _files(pattern);
    let parsed = await Promise.all(
      filenames.map(filename =>
        fsutil.readFile(filename).then(text => loader.parse(text))
      )
    );
    parsed.forEach(({ strings, errors }, i) => {
      let filename = filenames[i];
      if (filename.startsWith(baseDir)) {
        filename = filename.substring(baseDir.length);
      }

      allStrings = allStrings.concat(
        strings.map(string => {
          let key = util.asKey(string);
          return { value: string, filename, key };
        })
      );

      if (errors.length) {
        errors.forEach(error => {
          error.filename = filename;
          error.message = `${filename}: ${error.message}`;
        });
        allErrors = allErrors.concat(errors);
      }
    });
  }

  if (allErrors.length) {
    let error = new Error(`Found ${allErrors.length} issue(s)`);
    error.issues = allErrors;
    error.name = COLLECT_ERROR;
    throw error;
  }

  return allStrings;
};

const combineAndSort = strings => {
  // map keys to arrays of string objects
  let keyToStrings = new Map();
  strings.forEach(string => {
    if (!keyToStrings.has(string)) {
      keyToStrings.set(string.key, []);
    }
    keyToStrings.get(string.key).push(string);
  });

  // look for key collisions for non-matching values
  keyToStrings.forEach((strings, key) => {
    let uniqValues = new Set(strings.map(string => string.value));
    if (uniqValues.size !== 1) {
      let valsStr = Array.from(uniqValues.keys()).join(', ');
      let error = new Error(`Key ${key} collides for: ${valsStr}`);
      error.name = KEY_COLLISION_ERROR;
      throw error;
    }
  });

  let combined = Array.from(keyToStrings.entries()).map(([key, strings]) => ({
    key: strings[0].key,
    value: strings[0].value,
    filenames: strings.map(string => string.filename)
  }));

  combined.sort((a, b) => (a === b ? 0 : a.key > b.key ? 1 : -1));

  return combined;
};

const getDefaultLocale = async root => {
  let manifestPath = path.join(root, 'manifest.json');
  await fsutil.readFile(manifestPath);
};

// helpers

const _files = pattern => fsutil.glob(pattern, { ignore: IGNORES });

//
// ## Exports
//

module.exports = { collect, COLLECT_ERROR };
