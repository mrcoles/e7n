const cheerio = require('cheerio');
const path = require('path');

const fsutil = require('./fsutil');
const htmlParser = require('./parsers/html');
const jsParser = require('./parsers/javascript');
const util = require('./util');

const LOADERS = [htmlParser, jsParser];

const IGNORES = ['.git', 'node_modules'];

// Name of error thrown during collect if errors are found
// inside the collected strings.
const COLLECT_ERROR = 'CollectError';

// Name of error thrown while combining strings if a key collision
// is found where the string values are different.
const KEY_COLLISION_ERROR = 'KeyCollisionError';

const DEFAULT_LOCALE_ERROR = 'DefaultLocaleError';

const collect = async (root, opts) => {
  // TODO - things to improve in collect function
  //
  // *   return something more cli-friendly?
  // *   break out the collect & combine steps to their own things
  //
  // *   do not throw on CollectError
  // *   delete orphaned auto-generated keys from messages
  // *   dry-run
  //
  root = root || process.cwd();
  let srcPath = opts.srcPath || root;

  let strings = await gatherStrings(srcPath);

  // format: [{ string key, string value, array[string] filenames }, ... ]
  strings = combineStringsByKey(strings);

  let defaultLocale = await getDefaultLocale(root);
  let defaultLocalePath = getLocalePath(root, defaultLocale);
  let defaultLocaleData = await fsutil.readJson(defaultLocalePath);

  // format: { string key: { string message, string description }, ... }
  let messages = Object.entries(defaultLocaleData).map(([key, msgData]) => {});

  // gather all the messages we can find or create
  let autoMessages = strings.map(string => {
    let key = string.key;
    let data = messages[key];
    if (!data || !data.message) {
      data = data || {};
      data.message = string.value;
      if (!data.description) {
        data.description = `via ${string.filenames.join(', ')}`;
      }
    }
    delete messages[key];
    return [key, data];
  });

  // gather left-overs from what we didn't find
  let leftOversManual = [];
  let leftOversAuto = [];

  Object.entries(defaultLocaleData).forEach(entry => {
    if (entry[0].startsWith('_')) {
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

  [leftOversManual, autoMessages, leftOversAuto].forEach(messagesArr => {
    messagesArr.forEach(([key, data]) => {
      newMessages[key] = data;
    });
  });

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
