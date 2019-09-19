import { tr } from 'e7n';

const FOO = tr('This is a localized string');
const BAR = 'This will be localized';

export function myFunc() {
  var baz = 'This is baz';
  return {
    bar: tr(BAR),
    baz: tr(baz),
    other: tr('This is other text', 'other'),
    foo: FOO
  };
}
