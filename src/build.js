const cheerio = require('cheerio');
const path = require('path');

const fsutil = require('./fsutil');
const htmlParser = require('./parsers/html');
const jsParser = require('./parsers/javascript');
const util = require('./util');

const LOADERS = [htmlParser, jsParser];

const IGNORES = ['.git', 'node_modules'];

// Error name thrown during collect if errors are found in the collected strings
const COLLECT_ERROR = 'CollectError';

// Error name thrown while combining strings if a key collision of diff strings
const KEY_COLLISION_ERROR = 'KeyCollisionError';

// Error name thrown if manifest has a bad  or unset default locale value
const DEFAULT_LOCALE_ERROR = 'DefaultLocaleError';

const collect = async (root, opts) => {
  // TODO - things to improve in collect function
  //
  // *   break out the collect & combine steps to their own things
  // *   option to not throw on CollectError
  // *   option to delete orphaned "not_found" auto-generated keys from messages
  // *   option to do a dry-run
  //
  root = root || process.cwd();
  let srcPath = opts.srcPath || root;

  let strings = await gatherStrings(srcPath);

  // format: [{ string key, string value, array[string] filenames }, ... ]
  strings = combineStringsByKey(strings);

  let defaultLocale = await getDefaultLocale(root);
  let defaultLocalePath = getLocalePath(root, defaultLocale);

  // format: { string key: { string message, string description }, ... }
  let defaultLocaleData = await fsutil.readJson(defaultLocalePath);

  // gather all the messages we can find or create
  let autoMessages = strings.map(string => {
    let key = string.key;
    let data = defaultLocaleData[key];
    if (!data || !data.message) {
      data = data || {};
      data.message = string.value;
      if (!data.description) {
        data.description = `via ${string.filenames.join(', ')}`;
      }
    }
    delete defaultLocaleData[key];

    // we use `not_found` to track existing messages that are not found in the
    // code anymore, so delete it if we found it this time
    if (data && data.not_found !== undefined) {
      delete data.not_found;
    }

    return [key, data];
  });

  // gather left-overs from what we didn't find
  let leftOversManual = [];
  let leftOversAuto = [];

  Object.entries(defaultLocaleData).forEach(entry => {
    if (entry[0].startsWith('_')) {
      entry[1].not_found = true;
      leftOversAuto.push(entry);
    } else {
      leftOversManual.push(entry);
    }
  });

  [leftOversAuto, leftOversManual].forEach(arr =>
    arr.sort((a, b) => a[0].localeCompare(b[0]))
  );

  // generate new messages data
  let newMessages = {};

  let messagesArrs = [leftOversManual, autoMessages, leftOversAuto];

  messagesArrs.forEach(messagesArr => {
    messagesArr.forEach(([key, data]) => {
      newMessages[key] = data;
    });
  });

  // check rep - make sure no overlaps between 3 lists
  if (
    Object.keys(newMessages).length !==
    messagesArrs.reduce((acc, val) => acc + val.length, 0)
  ) {
    let error = new Error(
      'The messages arrays for `newMessages` contain dupes!'
    );
    error.name = 'CheckRep';
    throw error;
  }

  // write file
  await fsutil.writeFile(
    defaultLocalePath,
    JSON.stringify(newMessages, null, 2)
  );

  return newMessages;
};

//

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

const combineStringsByKey = strings => {
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

  combined.sort((a, b) => a.key.localeCompare(b.key));

  return combined;
};

const getDefaultLocale = async root => {
  let manifestPath = path.join(root, 'manifest.json');
  let data = await fsutil.readJson(manifestPath);
  let defaultLocale = data.default_locale;
  if (!defaultLocale || typeof defaultLocale !== 'string') {
    let error = new Error(
      `Bad default locale ${typeof defaultLocale}: ${defaultLocale}`
    );
    error.name = DEFAULT_LOCALE_ERROR;
    throw error;
  }
  return defaultLocale;
};

const getLocalePath = (root, locale) => {
  return path.join(root, '_locales', locale, 'messages.json');
};

// helpers

const _files = pattern => fsutil.glob(pattern, { ignore: IGNORES });

//
// ## Exports
//

module.exports = { collect, COLLECT_ERROR };
