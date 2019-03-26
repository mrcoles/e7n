const normalize = text =>
  text
    .trim()
    .replace(/[\s\-_]+/g, '_')
    .replace(/[^A-Za-z0-9-]/g, '');

const asKey = text => `_${normalize(text)}`;

//
// ## Exports
//

module.exports = { normalize, asKey };

// TESTS...
//
// *   multiple words
// *   repeated spaces
// *   'foo\bar' -> 'foobar' (previous [A-z] bug)
