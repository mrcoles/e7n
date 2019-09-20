# 🌎 e7n: 🌍 Chrome Extension Internationalization 🌏

A tool to auto-populate `_locales/<default_locale>/messages.json` with strings found in a Chrome extension project, and to provide conversion from those strings into localized text.

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

```javascript
import { tr } from 'e7n';

// auto-generated key
const FOO = tr('This is a localized string.');

// manually specified key
const BAR = tr('This is also localized', 'bar');

// with placeholders (you can also set the key 2nd arg to `null`)
const BAZ = tr('Hi, $name$, your number is $number$.', 'hiYourNumber', ['Alice', '10'], {
  name: { content: '$1', example: 'Alyssa P' },
  name: { content: '$2', example: '1' }
});
```

TODO:

- fails on string literals that are concatted with plus?
- currently it HTML-escapes results in HTML, should this not happen?
- currently ony supports \*.js files

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

## 3. Build project

Generate your `_locales/<default_locale>/messages.json` file via the following steps:

1.  Add a "default_locale" value to your extension’s manifest.json file, e.g., `"default_locale": "en",`
2.  Create a starting messages.json file: `mkdir -p _locales/en/ && echo '{}' > _locales/en/messages.json` (TODO: automate this more, so you don't need to create the directory or file)
3.  Run e7n: `e7n [path_to_src_directory_with_manifest]`

The build will fail if it encounters issues generating the messages. If it succeeds, it will print out the JSON for the new file and also update the file in place.
