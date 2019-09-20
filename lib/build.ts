import { join } from 'path';

import { readJson, writeFile, readFile, glob } from './fsutil';
import { FormatError } from './parsers/types';
import * as htmlParser from './parsers/html';
import * as jsParser from './parsers/javascript';
import { asKey, promiseSerialMap } from './util';

type LocaleFileDataValue = {
  message: string;
  description: string;
  not_found?: boolean;
  placeholders?: {
    [placeholder_name: string]: {
      // e.g. url: { ... }
      content: string; // e.g., "$1"
      example: string; // e.g., "https://developer.mozilla.org"
    };
  };
};
type LocaleFileData = {
  [key: string]: LocaleFileDataValue;
};

const LOADERS = [htmlParser, jsParser];

const IGNORES = ['.git', 'node_modules'];

// Error name thrown during collect if errors are found in the collected strings
export const COLLECT_ERROR = 'CollectError';

// Error name thrown while combining strings if a key collision of diff strings
const KEY_COLLISION_ERROR = 'KeyCollisionError';

// Error name thrown if manifest has a bad  or unset default locale value
const DEFAULT_LOCALE_ERROR = 'DefaultLocaleError';

export const collect = async (
  root: string, // root path fo the project
  opts: {
    srcPath?: string; // path to source directory
    manifestPath?: string; // path to the manifest file (used to find the default locale file)
    defaultLocalePath?: string; //path to the default locale file or '!' if ignore
    print?: boolean; // print the result to stdout instead of updating the file
  }
): Promise<LocaleFileData> => {
  // TODO - things to improve in collect function
  //
  // *   break out the collect & combine steps to their own things
  // *   option to not throw on CollectError
  // *   option to delete orphaned "not_found" auto-generated keys from messages
  // *   option to do a dry-run
  //
  root = root || process.cwd();

  const srcPath = opts.srcPath || root;

  // this is the main work to read and get all the stuff
  const strings = await gatherStrings(srcPath);

  // format: [{ key: string, value: string, filenames: array[string] }, ... ]
  const groupedStrings = combineStringsByKey(strings);

  let defaultLocalePath = opts.defaultLocalePath;
  if (!defaultLocalePath) {
    const manifestPath = opts.manifestPath || join(root, 'manifest.json');
    const defaultLocale = await getDefaultLocale(manifestPath);
    defaultLocalePath = getLocalePath(root, defaultLocale);
  }

  // format: { key: { message: string, description: string }, ... }
  let defaultLocaleData: LocaleFileData = {};
  if (defaultLocalePath !== '!') {
    defaultLocaleData = (await readJson(defaultLocalePath)) as LocaleFileData;
  }

  // gather all the messages we can find or create
  let autoMessages: [string, LocaleFileDataValue][] = groupedStrings.map(
    string => {
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
    }
  );

  // gather left-overs from what we didn't find
  let leftOversManual: [string, LocaleFileDataValue][] = [];
  let leftOversAuto: [string, LocaleFileDataValue][] = [];

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
  let newMessages: LocaleFileData = {};

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

  const output = JSON.stringify(newMessages, null, 2);

  // write it out
  if (opts.print) {
    console.log(output);
  } else {
    await writeFile(defaultLocalePath, output);
  }

  return newMessages;
};

//

type GatheredString = {
  key: string;
  value: string;
  placeholders?: any; // TODO - stricter type checking, e.g., index -> Placeholders
  filename: string;
};
type GatheredError = FormatError & { filename: string };

const gatherStrings = async (srcPath: string): Promise<GatheredString[]> => {
  const baseDir = srcPath;

  let allErrors: GatheredError[] = [];
  let allStrings: GatheredString[] = [];

  for (let loader of LOADERS) {
    let pattern = join(baseDir, loader.PATTERN);
    let filenames = await _files(pattern);

    const loadAndParseFile = async (filename: string) => {
      const text = await readFile(filename);
      let strings, errors;
      try {
        const result = loader.parse(text);
        strings = result.strings;
        errors = result.errors;
      } catch (err) {
        err.message += ` (while parsing: ${filename})`;
        throw err;
      }

      if (filename.startsWith(baseDir)) {
        filename = filename.substring(baseDir.length);
      }

      allStrings = allStrings.concat(
        strings.map(({ text, key }) => {
          key = key || asKey(text);
          return { value: text, filename, key };
        })
      );

      if (errors.length) {
        allErrors = allErrors.concat(
          errors.map(error => ({
            ...error,
            filename,
            message: `${filename}: ${error.message}`
          }))
        );
      }
    };

    await promiseSerialMap(filenames, loadAndParseFile);
  }

  if (allErrors.length) {
    const error = new Error(`Found ${allErrors.length} issue(s)`);
    throw Object.assign(error, { name: COLLECT_ERROR, issues: allErrors });
  }

  return allStrings;
};

const combineStringsByKey = (
  strings: GatheredString[]
): {
  key: string;
  value: string;
  filenames: string[];
  placeholders?: any;
}[] => {
  // map keys to arrays of string objects
  let keyToStrings = new Map<string, GatheredString[]>();
  strings.forEach(string => {
    if (!keyToStrings.has(string.key)) {
      keyToStrings.set(string.key, []);
    }
    const group = keyToStrings.get(string.key);
    if (group) {
      group.push(string);
    }
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
    key,
    value: strings[0].value,
    placeholders: strings[0].placeholders,
    filenames: strings.map(string => string.filename)
  }));

  combined.sort((a, b) => a.key.localeCompare(b.key));

  return combined;
};

const getDefaultLocale = async (manifestPath: string) => {
  let data = await readJson(manifestPath);
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

const getLocalePath = (root: string, locale: string) => {
  return join(root, '_locales', locale, 'messages.json');
};

// helpers

const _files = (pattern: string) => glob(pattern, { ignore: IGNORES });
