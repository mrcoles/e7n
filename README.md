# e7n: Chrome Extension Internationalization

A tool to auto-populate `_locales/<default_locale>/messages.json` with strings found in a Chrome extension project, and to provide conversion from those strings into localized text.

## Identify localizable strings

In HTML files mark tags with a `data-e7n` tag. Such tags should only contain text (or comments):

```html
<div>
    <span data-e7n>Hello!</span>
    <img src="foo.png" />
</div>
```

In JavaScript files use the `tr` function to signify text that is a localizable string. Use string literals or variables that are string literals. (TODO: what if string literals concatted with plus?)

```javascript
import { tr } from 'e7n';

const FOO = tr('This is a localized string.');
```

## Convert strings

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
