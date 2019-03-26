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

  const _resolve = arg => {
    switch (arg.type) {
      case 'Literal':
        return [null, arg.value];
      case 'Identifier':
        let value = globals.vars[arg.name] || localVars[arg.name];
        if (value) {
          return [null, value];
        } else {
          return [
            _formatError(
              node,
              text,
              `No literal value found for var: ${arg.name}`
            )
          ];
        }
      default:
        return [_formatError(node, text, 'Invalid argument, not a string')];
    }
  };

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
      const arg0 = node.arguments[0];
      const arg1 = node.arguments[1];

      const [err0, val0] = _resolve(arg0);
      const [err1, val1] = arg1 ? _resolve(arg1) : [null, undefined];

      if (err0) {
        errors.push(err0);
      } else if (err1) {
        errors.push(err1);
      } else {
        strings.push({ text: val0, key: val1 || undefined });
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

//
// ## Quick test...
//

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const js = fs.readFileSync(
    path.join(__dirname, '../__tests__/sample.js'),
    'utf8'
  );
  const result = parse(js);
  console.log('result', result);
}
