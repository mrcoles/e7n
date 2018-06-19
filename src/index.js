require('css.escape'); // polyfill

const util = require('./util');
const constants = require('./constants');

//
// ## JS handling
//

const tr = text => {
  let key = util.asKey(text);
  let message = chrome.i18n.getMessage(key);
  return message || text;
};

// check rep - avoid function name not matching
if (tr.name !== constants.FN_NAME) {
  let error = new Error(
    `Function name mismatch: ${tr.name} vs ${constants.FN_NAME}`
  );
  error.name = 'CheckRep';
  throw error;
}

//
// ## HTML handling
//

const updateHtml = (context = null, attr = constants.ATTR_NAME) => {
  context = context || document;
  let elts = context.querySelectorAll(`[${CSS.escape(attr)}]`);

  for (let elt of elts) {
    updateElt(elt);
  }
};

const updateElt = elt => {
  let text = elt.innerText;
  let key = util.asKey(text);
  let message = chrome.i18n.getMessage(key);
  if (message && message.trim() !== text.trim()) {
    // TODO - innerText or innerHTML? It seems like for more complex scenarios
    // we'll need to do innerHTML
    elt.innerText = message;
  }
};

//
// ## Exports
//

module.exports = { tr, updateHtml, updateElt };
