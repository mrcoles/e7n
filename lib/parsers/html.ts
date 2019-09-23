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

    // if [data-e7n-html] exists too, then grab as HTML instead of text
    const allowHtml = $elt.prop(`${attrName}-html`) !== undefined;

    let isOk = true;

    if (allowHtml) {
      const e7nChildren = $elt.find(`[${attrName}]`);
      if (e7nChildren.length) {
        isOk = false;
        const samples = e7nChildren.map((_, elt) => $.html(elt)).get();
        errors.push(
          _formatError(
            $elt,
            `Element contains other e7n elements: ${samples.join('\n')}`
          )
        );
      }
    } else {
      const badTypes = elt.children.filter(child => !okTypes.has(child.type));
      if (badTypes.length > 0) {
        isOk = false;
        errors.push(
          _formatError(
            $elt,
            `Element contains complex children types: ${badTypes.join(', ')}`
          )
        );
      }
    }

    if (isOk) {
      let text = allowHtml ? $elt.html() || '' : $elt.text();
      text = text.trim().replace(/\s+/gi, ' ');
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
    path.join(__dirname, '../../samples/sample.html'),
    'utf8'
  );
  const result = parse(html);
  console.log('result', result);
}
