import { tr } from 'e7n';

const FOO = tr('This is a localized string');
const BAR = 'This will be localized';

const MULTI_LINE = tr(
  'This will be localized but it is a multi-line set of text that is combined ' +
    'via plus signs, so the program needs to know how to join those'
);

export function myFunc(name) {
  var baz = 'This is baz, $name$';
  return {
    bar: tr(BAR),
    baz: tr(baz, null, [name], {
      name: { content: '$1', example: 'Joe Bloggs' },
    }),
    other: tr('This is other text', 'other'),
    foo: FOO,
    html: tr(
      'Hello <a href="/foo">friends</a>',
      undefined,
      undefined,
      undefined,
      true
    ),
  };
}
