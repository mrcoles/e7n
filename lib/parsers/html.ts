import cheerio from 'cheerio';

import { ATTR_NAME } from '../constants';

import { FormatError, ParseString } from './types';

export const PATTERN = '**/*.html';

export const parse = (text: string, attrName = ATTR_NAME) => {
  const okTypes = new Set(['text', 'comment']);
  const $ = cheerio.load(text);
  const strings: ParseString[] = [];
  const errors: FormatError[] = [];

  $(`[${attrName}]`).each((_, elt) => {
    const $elt = $(elt);

    let badTypes = elt.children.filter(child => !okTypes.has(child.type));
    if (badTypes.length > 0) {
      errors.push(
        _formatError(
          $elt,
          `Element contains complex children types: ${badTypes.join(', ')}`
        )
      );
    } else {
      const text = $elt.text().trim();
      const key = $elt.attr(attrName) || undefined;
      if (!text) {
        errors.push(_formatError($elt, 'No text in element!'));
      } else {
        strings.push({ text, key });
      }
    }
  });

  return { strings, errors };
};

const _formatError = ($elt: Cheerio, message: string): FormatError => {
  let sample =
    $elt
      .wrap('<div></div>')
      .parent()
      .html() || '';

  let maxSample = 50;
  let tSample =
    sample.length > maxSample + 2
      ? sample.substring(0, maxSample) + '...'
      : sample;

  let shortMessage = message;
  message = `${message} at: ${tSample}`;

  return { message, shortMessage, sample };
};

//
// ## Quick test...
//

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(
    path.join(__dirname, '../__tests__/sample.html'),
    'utf8'
  );
  const result = parse(html);
  console.log('result', result);
}
