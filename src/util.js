const normalize = text =>
  text
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^A-z0-9-]/g, '');

const asKey = text => `_${normalize(text)}`;

//
// ## Exports
//

module.exports = { normalize, asKey };

// TESTS...
//
// *   multiple words
// *   repeated spaces
