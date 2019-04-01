require('css.escape'); // polyfill

const util = require('./util');
const constants = require('./constants');

//
// ## JS handling
//

const tr = (text, key) => {
  key = key || util.asKey(text);
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

const updateHtml = (context = null, attr = constants.ATTR_NAME) => {
  context = context || document;
  const elts = context.querySelectorAll(`[${CSS.escape(attr)}]`);

  for (const elt of elts) {
    updateElt(elt, elt.getAttribute(attr) || undefined);
  }
};

const updateElt = (elt, key) => {
  const text = elt.innerText.trim();
  key = key || util.asKey(text);
  const message = chrome.i18n.getMessage(key);
  if (message && message !== text) {
    // TODO - innerText or innerHTML? It seems like for more complex scenarios
    // we'll need to do innerHTML
    elt.innerText = message;
  }
};

//
// ## Exports
//

module.exports = { tr, updateHtml, updateElt };
