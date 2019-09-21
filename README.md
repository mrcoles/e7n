# 🌎 e7n: Chrome Extension Internationalization

**l10n ➡️ localization** “refers to the adaptation of a product, application or document content to meet the language, cultural and other requirements of a specific target market (a locale).” -W3C

**i18n ➡️ internationalization** “is the design and development of a product, application or document content that enables easy localization for target audiences that vary in culture, region, or language.” -W3C

**e7n ➡️ extension** “is a library for making it easier to use the `chrome.i18n` infrastructure” -@mrcoles

This tool auto-populates `_locales/<default_locale>/messages.json` with strings found in a Chrome extension project, and makes it easy to convert from those strings into localized text.

## 1. Mark up localizable strings

### HTML

Mark HTML tags with a `data-e7n` tag. Such tags should only contain text (or comments):

```html
<div>
  <span data-e7n>Hello!</span>
  <img src="foo.png" />
</div>
```

The i18n key is auto-derived from the text. You can also manually specify the key by setting a value on the data attr, e.g., `data-e7n="hello"`.

### JavaScript

Use the e7n `tr` JavaScript function to signify text that is a localizable string. Use string literals or variables that are string literals.

This can run in JavaScript, Typescript, and JSX code—it will look for files matching the glob `**/*.{js,jsx,ts,tsx}`.

```javascript
import { tr } from 'e7n';

// auto-generated key
const FOO = tr('This is a localized string.');

// manually specified key
const BAR = tr('This is also localized', 'bar');

// auto-generated key from concatenated string literals
const MULTI = tr('This is combined ' + 'via plus signs');

// with placeholders (you can also set the key 2nd arg to `null`)
const BAZ = tr(
  'Hi, $name$, your number is $number$.',
  'hiYourNumber',
  ['Alice', '10'],
  {
    name: { content: '$1', example: 'Alyssa P' },
    name: { content: '$2', example: '1' }
  }
);
```

## 2. Setup auto-conversion

In HTML files, auto-convert your marked tags with the `updateHtml` function:

```javascript
import { updateHtml } from 'e7n';

document.addEventListener('DOMContentLoaded', event => {
  updateHtml();
});

const update = () => {
  fetch('/something')
    .then(r => r.text())
    .then(html => {
      let elt = document.getElementById('something');
      elt.innerHTML = html;
      updateHtml(elt);
    });
};
```

In JavaScript files, the `tr` function will already convert messages for you.

### Pseudo-localization

You can enable pseudo-localization (sometimes called "pseudoloc") by setting the pseudoloc option to true.

```javascript
import { options as e7nOptions } from 'e7n';

e7nOptions.pseudoloc = true;
```

This can let you test to make sure parts of your UI are connected up properly without having to change your browser's language.

For example "Delete image" would get convrted to: "Ḓḗḗŀḗḗŧḗḗ īḿȧȧɠḗḗ".

## 3. Build project

Generate your `_locales/<default_locale>/messages.json` file via the following steps:

1.  Add a "default_locale" value to your extension’s manifest.json file, e.g., `"default_locale": "en",`
2.  Create a starting messages.json file: `mkdir -p _locales/en/ && echo '{}' > _locales/en/messages.json` (TODO: automate this more, so you don't need to create the directory or file)
3.  Run e7n: `e7n [path_to_src_directory_with_manifest]`

The build will fail if it encounters issues generating the messages. If it succeeds, it will print out the JSON for the new file and also update the file in place.

## Todos

- currently it HTML-escapes results in HTML, should this not happen?
- better error messages to grab sample bad text from source in parsers/javascript
