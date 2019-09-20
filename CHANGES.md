# CHANGES

1.6.1 - 2019-09-20 - switch to pseudo-localization lib, since other one had broken imports

1.6.0 - 2019-09-20 - add pseudoloc support for testing - e.g., `import { options } from 'e7n'` and `options.pseudoloc = true`

1.5.0 - 2019-09-20 - change javascript parser to also look for .jsx, .ts, and .tsx files in addition to .js.

1.4.0 - 2019-09-19 - add support for placeholders

1.3.0 - 2019-09-19 - rewrite into typescript, change javascript parser to use @babel/parser and estree-walker, so it can now support more complex JavaScript code (including Typescript and JSX).
