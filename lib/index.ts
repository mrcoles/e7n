import 'css.escape'; // polyfill

import { ATTR_NAME } from './constants';
import { asKey } from './util';

//
// ## JS handling
//

// TODO - support for placeholders? https://developer.chrome.com/extensions/i18n-messages

export const tr = (text: string, key?: string) => {
  key = key || asKey(text);
  return chrome.i18n.getMessage(key) || text;
};

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
    updateElt(elt, elt.getAttribute(attr) || undefined);
  });
};

export const updateElt = (elt: HTMLElement, key?: string) => {
  const text = elt.innerText.trim();
  key = key || asKey(text);
  const message = chrome.i18n.getMessage(key);
  if (message && message !== text) {
    // TODO - innerText or innerHTML? It seems like for more complex scenarios
    // we'll need to do innerHTML
    elt.innerText = message;
  }
};
