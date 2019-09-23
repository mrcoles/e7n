import 'css.escape'; // polyfill

import { localize } from 'pseudo-localization';

import { ATTR_NAME } from './constants';
import { asKey } from './util';

export const options = {
  pseudoloc: false
};

//
// ## JS handling
//

// TODO - support for placeholders? https://developer.chrome.com/extensions/i18n-messages

type Placeholders = {
  [placeholder_name: string]: { content: string; example?: string };
};

export const tr = (
  text: string,
  key?: string,
  data?: any[],
  placeholders?: Placeholders
) => {
  key = key || asKey(text);

  let message =
    chrome.i18n.getMessage(key, data) ||
    _addPlaceholders(text, data, placeholders);

  if (options.pseudoloc) {
    if (data && placeholders) {
      // HACK - do extra step to go back to original and extra parts
      // so we can *only* localize the text, not the placeholders
      message = text
        .split(/(\$[A-Za-z][A-Za-z0-9_]*\$)/)
        .map((val, i) => (i % 2 === 0 ? localize(val) : val))
        .join('');
      message = _addPlaceholders(message, data, placeholders);
    } else {
      message = localize(message);
    }
  }

  return message;
};

const _addPlaceholders = (
  text: string,
  data?: any[],
  placeholders?: Placeholders
) => {
  if (data && placeholders) {
    Object.entries(placeholders).forEach(([key, info]) => {
      const sp = info.content.split(/\$(\d+)/);
      for (let i = 1; i < sp.length; i += 2) {
        const index = parseInt(sp[i], 10);
        sp[i] = String(data[i - 1]);
      }
      text = text.replace(new RegExp(`\\$${key}\\$`, 'gi'), sp.join(''));
    });
  }
  return text;
};

/*
// sample:
tr('Hi, $name$, your number is $number$.', 'hiYourNumber', ['Alice', '10'], {
  name: { content: '$1', example: 'Alyssa P' },
  name: { content: '$2', example: '1' }
});
*/

// NOTE - this breaks from parcel builds, TODO adjust this
// to maybe only do the checkrep during the e7n build step?
// // check rep - avoid function name not matching
// if (tr.name !== constants.FN_NAME) {
//   let error = new Error(
//     `Function name mismatch: ${tr.name} vs ${constants.FN_NAME}`
//   );
//   error.name = 'CheckRep';
//   throw error;
// }

//
// ## HTML handling
//

export const updateHtml = (
  context: Document | HTMLElement | undefined | null = null,
  attr = ATTR_NAME
) => {
  context = context || document;
  const elts = context.querySelectorAll(`[${CSS.escape(attr)}]`) as NodeListOf<
    HTMLElement
  >;

  elts.forEach(elt => {
    updateElt(elt, elt.getAttribute(attr) || undefined, attr);
  });
};

export const updateElt = (elt: HTMLElement, key?: string, attr = ATTR_NAME) => {
  const text = elt.innerText.trim();
  key = key || asKey(text);

  const message = tr(text, key);
  if (message && message !== text) {
    if (elt.getAttribute(`[${attr}-html]`)) {
      elt.innerHTML = message;
    } else {
      elt.textContent = message;
    }
  }
};
