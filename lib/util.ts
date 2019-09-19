export const normalize = (text: string) =>
  text
    .trim()
    .replace(/[\s\-_]+/g, '_')
    .replace(/[^A-Za-z0-9-]/g, '');

export const asKey = (text: string) => `_${normalize(text)}`;

export const promiseSerialMap = async <O extends any, R extends any>(
  objs: O[],
  promFn: (arg: O) => Promise<R> | R
): Promise<R | undefined> => {
  let numObjs = objs.length;
  let objIsProm = promFn === undefined;

  const _serialMap = (i: number, lastResult: R | undefined): R | undefined => {
    if (i >= numObjs) {
      return lastResult;
    }
    let prom = objIsProm ? objs[i]() : promFn(objs[i]);
    return prom && typeof prom === 'object' && prom.then
      ? prom.then((nextResult: R) => _serialMap(i + 1, nextResult))
      : _serialMap(i + 1, prom);
  };

  return _serialMap(0, undefined);
};

// TESTS...
//
// *   multiple words
// *   repeated spaces
// *   'foo\bar' -> 'foobar' (previous [A-z] bug)
