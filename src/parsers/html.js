const cheerio = require('cheerio');

const ATTR_NAME = require('../constants').ATTR_NAME;

const PATTERN = '**/*.html';

const parse = (text, attrName = ATTR_NAME) => {
  const okTypes = new Set(['text', 'comment']);
  const $ = cheerio.load(text);
  const strings = [];
  const errors = [];
  $(`[${attrName}]`).each((_, elt) => {
    let $elt = $(elt);

    let badTypes = elt.children.filter(child => !okTypes.has(child.type));
    if (badTypes.length > 0) {
      errors.push(
        _formatError(
          $elt,
          `Element contains complex children types: ${badTypes.join(', ')}`
        )
      );
    } else {
      let text = $(elt)
        .text()
        .trim();
      if (!text) {
        errors.push(_formatError($elt, 'No text in element!'));
      } else {
        strings.push(text);
      }
    }
  });

  return { strings, errors };
};

const _formatError = ($elt, message) => {
  let sample = $elt
    .wrap('<div></div>')
    .parent()
    .html();
  let maxSample = 50;
  let tSample =
    sample.length > maxSample + 2
      ? sample.substring(0, maxSample) + '...'
      : sample;

  let shortMessage = message;
  message = `${message} at: ${sample}`;
  return { message, shortMessage, sample };
};

//
// ## Exports
//

module.exports = { PATTERN, parse };
