import { tr } from 'e7n';

const FOO = tr('This is a localized string');
const BAR = 'This will be localized';

export function myFunc(name) {
  var baz = 'This is baz, $name$';
  return {
    bar: tr(BAR),
    baz: tr(baz, null, [name], {
      name: { content: '$1', example: 'Joe Bloggs' }
    }),
    other: tr('This is other text', 'other'),
    foo: FOO
  };
}
