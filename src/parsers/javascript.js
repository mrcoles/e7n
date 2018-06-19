const acorn = require('acorn');
const walk = require('acorn/dist/walk');

const FN_NAME = require('../constants').FN_NAME;

const PATTERN = '**/*.js';

const parse = (text, fnName = FN_NAME) => {
  const ast = acorn.parse(text, { sourceType: 'module' });
  const globals = _getGlobals(ast);
  const { strings, errors } = _findStrings(ast, globals, fnName);
  return { strings, errors };
};

// d.body[1].body.body[0].expression.arguments[0]
// -> Node { type: 'Literal', start: 51, end: 61, value: 'yoyoyoyo', raw: '\'yoyoyoyo\'' }
//
// d.body[2].declaration.declarations[0].init.body.arguments[0].body.body[0].expression.arguments[0].arguments[0]
// -> Node { type: 'Identifier', start: 146, end: 150, name: 'BLAH' }

const _findStrings = (ast, globals, fnName) => {
  const localVars = {};
  const strings = [];
  const errors = [];

  walk.full(ast, node => {
    if (
      node.type === 'VariableDeclarator' &&
      node.init &&
      node.init.type === 'Literal'
    ) {
      let name = node.id.name;
      if (globals.nodes[name] !== node) {
        if (globals.nodes[name]) {
          errors.push(_formatError(node, text, 'Cannot override global val'));
        } else {
          localVars[name] = node.init.value;
        }
      }
    } else if (node.type === 'CallExpression' && node.callee.name === fnName) {
      let arg = node.arguments[0];

      switch (arg.type) {
        case 'Literal':
          strings.push(arg.value);
          break;
        case 'Identifier':
          let value = globals.vars[arg.name] || localVars[arg.name];
          if (value) {
            strings.push(value);
          } else {
            errors.push(
              _formatError(
                node,
                text,
                `No literal value found for var: ${arg.name}`
              )
            );
          }
          break;
        default:
          errors.push(
            _formatError(node, text, 'Invalid argument, not a string')
          );
          break;
      }
    }
  });

  return { strings, errors };
};

const _getGlobals = ast => {
  const vars = {};
  const nodes = {};

  ast.body
    .filter(node => node.type === 'VariableDeclaration')
    .forEach(varDec => {
      varDec.declarations
        .filter(
          node =>
            node.type === 'VariableDeclarator' &&
            node.init &&
            node.init.type === 'Literal'
        )
        .forEach(node => {
          let name = node.id.name;
          let val = node.init.value;
          vars[name] = val;
          nodes[name] = node;
        });
    });

  return { vars, nodes };
};

const _formatError = (node, text, message) => {
  let [line, char] = _getLineAndChar(text, node.start);
  let sample = text.substring(node.start, node.end);
  let maxSample = 20;
  let tSample =
    sample.length > maxSample + 2
      ? sample.substring(0, maxSample) + '...'
      : sample;

  let shortMessage = message;
  message = `${message} at line ${line} char ${char}: ${tSample}`;
  return { message, shortMessage, sample, line, char };
};

const _getLineAndChar = (text, pos) => {
  let line = 0;
  for (let lineText of text.split('\n')) {
    line++;
    if (lineText.length < pos) {
      pos -= lineText.length + 1;
    } else {
      break;
    }
  }
  return [line, pos];
};

//
// ## Exports
//

module.exports = { PATTERN, parse };
