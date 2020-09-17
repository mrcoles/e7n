# CHANGES

1.7.4 - 2020-09-17 - @dependabot updates

1.7.3 - 2019-10-03 - add "disabled" boolean to `options`, to allow disabling of translations

1.7.2 - 50b7100 - 2019-10-02 - fixed bugs related to handling of raw HTML in data-e7n-html tags

1.7.1 - 110be60 - 2019-09-23 - fixed bug with placeholders not getting passed into final file and add support for raw HTML via data-e7n-html tag

1.7.0 - adc45bc - 2019-09-21 - support concatenating string literals with plus signs

1.6.4 - 97bc946 - 2019-09-20 - fixed bug in placeholder code

1.6.3 - 4583895 - 2019-09-20 - updated README and using package.json "files" instead of .npmignore

1.6.1 - 046a585 - 2019-09-20 - switch to pseudo-localization lib, since other one had broken imports

1.6.0 - b431cca - 2019-09-20 - add pseudoloc support for testing - e.g., `import { options } from 'e7n'` and `options.pseudoloc = true`

1.5.0 - a8b4971 - 2019-09-20 - change javascript parser to also look for .jsx, .ts, and .tsx files in addition to .js.

1.4.0 - 64fbacf - 2019-09-19 - add support for placeholders

1.3.0 - 593161e - 2019-09-19 - rewrite into typescript, change javascript parser to use @babel/parser and estree-walker, so it can now support more complex JavaScript code (including Typescript and JSX).
