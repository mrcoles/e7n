import { parse as babelParse } from '@babel/parser';
import { walk } from 'estree-walker';

import {
  Identifier,
  Node,
  Program,
  Statement,
  VariableDeclaration,
  VariableDeclarator,
  ModuleDeclaration,
  ObjectExpression
} from 'estree';

import { FN_NAME } from '../constants';

import { FormatError, ParseString } from './types';

type Globals = {
  vars: { [name: string]: string };
  nodes: { [name: string]: VariableDeclarator };
};

const isVariableDeclaration = (arg: any): arg is VariableDeclaration => {
  return arg && arg.type === 'VariableDeclaration';
};

const isIdentifier = (arg: any): arg is Identifier => {
  return arg && arg.type === 'Identifier';
};

export const PATTERN = '**/*.{js,jsx,ts,tsx}'; // HARDCODED - in README.md

export const parse = (text: string, fnName = FN_NAME) => {
  const file = babelParse(text, {
    sourceType: 'module',
    plugins: ['estree', 'jsx', 'typescript', 'classProperties']
  });
  const program: Program = (file.program as unknown) as Program;
  // avoid the "estree" plugin, because unclear how to change the type to match...
  const globals = _getGlobals(program);
  const { strings, errors } = _findStrings(program, globals, fnName);
  return { strings, errors };
};

// d.body[1].body.body[0].expression.arguments[0]
// -> Node { type: 'Literal', start: 51, end: 61, value: 'yoyoyoyo', raw: '\'yoyoyoyo\'' }
//
// d.body[2].declaration.declarations[0].init.body.arguments[0].body.body[0].expression.arguments[0].arguments[0]
// -> Node { type: 'Identifier', start: 146, end: 150, name: 'BLAH' }

const _findStrings = (ast: Program, globals: Globals, fnName: string) => {
  const localVars: { [name: string]: string } = {};
  const strings: ParseString[] = [];
  const errors: FormatError[] = [];

  const _resolve = (node: Node, arg: Node): [FormatError | null, any?] => {
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
              value,
              `No literal value found for var: ${arg.name}`
            )
          ];
        }
      default:
        return [_formatError(node, '', 'Invalid argument, not a string')];
    }
  };

  walk(ast, {
    enter(node: Node, parent: Node, key: string, index: number) {
      switch (node.type) {
        case 'VariableDeclarator': {
          if (
            node.init &&
            node.init.type === 'Literal' &&
            typeof node.init.value === 'string' &&
            node.id &&
            node.id.type === 'Identifier'
          ) {
            const name = node.id.name;
            if (globals.nodes[name] !== node) {
              if (globals.nodes[name]) {
                errors.push(
                  _formatError(node, name, 'Cannot override global val')
                );
              } else {
                localVars[name] = node.init.value;
              }
            }
          }
          return;
        }
        case 'CallExpression': {
          if (isIdentifier(node.callee) && node.callee.name === fnName) {
            const arg0 = node.arguments[0];
            const arg1 = node.arguments[1];
            const arg2 = node.arguments[2];
            const arg3 = node.arguments[3];

            const [err0, val0] = _resolve(node, arg0);

            const [err1, val1] = arg1
              ? _resolve(node, arg1)
              : [null, undefined];

            const err2 =
              arg2 && arg2.type !== 'ArrayExpression'
                ? _formatError(
                    arg2,
                    `3rd arg must be an ArrayExpression, but got ${arg2.type}`,
                    ''
                  )
                : null;

            let err3 = null;
            let val3 = undefined;
            if (arg3 && arg3.type === 'ObjectExpression') {
              val3 = _parseObjectExpression(arg3);
            }

            if (err0) {
              errors.push(err0);
            } else if (err1) {
              errors.push(err1);
            } else if (typeof val0 === 'string') {
              strings.push({
                text: val0,
                key: val1 || undefined,
                placeholders: val3
              });
            } else {
              errors.push(
                _formatError(
                  node,
                  `invalid literal type: ${typeof val0}`,
                  String(val0)
                )
              );
            }
          }
          return;
        }
      }
    }
  });

  return { strings, errors };
};

type NestedObj = { [key: string]: NestedObj | string };

const _parseObjectExpression = (
  obj: ObjectExpression,
  ignoreErrors = false
) => {
  const ret: NestedObj = {};
  for (let prop of obj.properties) {
    if (isIdentifier(prop.key)) {
      let key = prop.key.name;
      let valueNode = prop.value;
      if (valueNode.type === 'Literal') {
        ret[key] = String(valueNode.value);
      } else if (valueNode.type === 'ObjectExpression') {
        ret[key] = _parseObjectExpression(valueNode);
      } else {
        if (!ignoreErrors) {
          throw new Error(`Invalid object expression value: ${valueNode.type}`);
        }
      }
    } else {
      if (!ignoreErrors) {
        throw new Error(`Unknown object expression key type! ${prop.key.type}`);
      }
    }
  }
  return ret;
};

const _getGlobals = (ast: Program): Globals => {
  const vars: Globals['vars'] = {};
  const nodes: Globals['nodes'] = {};

  ast.body.forEach(node => {});

  ast.body
    .filter(
      (node: Statement | ModuleDeclaration): node is VariableDeclaration =>
        isVariableDeclaration(node)
    )
    .forEach(varDec => {
      varDec.declarations.forEach(node => {
        if (
          node.init &&
          node.init.type === 'Literal' &&
          typeof node.init.value === 'string'
        ) {
          if (isIdentifier(node.id)) {
            let name = node.id.name;
            let val = node.init.value;
            vars[name] = val;
            nodes[name] = node;
          }
        }
      });
    });

  return { vars, nodes };
};

type StartEnd = { start: number; end: number };

const isStartEnd = (node: any): node is StartEnd => {
  return (
    node &&
    typeof node === 'object' &&
    typeof node.start === 'number' &&
    typeof node.end === 'number'
  );
};

const _formatError = (node: Node, text: string, message: string) => {
  const { start, end } = isStartEnd(node) ? node : { start: 0, end: 0 };
  let [line, char] = _getLineAndChar(text, start);
  let sample = text.substring(start, end);
  let maxSample = 20;
  let tSample =
    sample.length > maxSample + 2
      ? sample.substring(0, maxSample) + '...'
      : sample;

  let shortMessage = message;
  message = `${message} at line ${line} char ${char}: ${tSample}`;
  return { message, shortMessage, sample, line, char };
};

const _getLineAndChar = (text: string, pos: number) => {
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
// ## Quick test...
//

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const js = fs.readFileSync(
    path.join(__dirname, '../../samples/sample.js'),
    'utf8'
  );
  const result = parse(js);
  console.log('result', JSON.stringify(result, null, 2));
}
