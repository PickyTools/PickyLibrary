# PickyLibrary

Accessible, themeable Vue 3 base components. **No Tailwind required, no icon set bundled,
no JavaScript configuration.**

> Status: pre-alpha. The public API is still moving.

## Install

```bash
npm i pickylibrary
```

```js
import 'pickylibrary/style.css';
import { BasePill } from 'pickylibrary';
```

That's the whole setup. There is no preset to register, no build step to configure, and no
content/`@source` globbing to get right.

## Theming

Every visual decision is a CSS custom property in the `--picky-*` namespace. Override them
anywhere in your own CSS:

```css
:root {
    --picky-color-primary-500: #f97316;
    --picky-radius-button: 0.75rem;
}
```

Your overrides win regardless of stylesheet order — PickyLibrary's own tokens live in a
cascade layer, and unlayered CSS always beats layered CSS.

Building a theme by hand is optional: [ColorPicky](https://colorpicky.com) generates a
ready-to-paste `--picky-*` block for you.

## Dark mode

Works on the system preference out of the box. To control it yourself, put `.dark` or
`.light` on any ancestor — `.light` wins even when the OS asks for dark.

## Icons

PickyLibrary ships no icons, so you are free to use any source — an icon library, an SVG
folder, or your own components. Register a resolver once:

```js
import { provideIcons } from 'pickylibrary';

// Return a URL, a raw SVG string, or a Vue component. Whatever suits your setup.
provideIcons((code, variant) => `/icons/${variant ?? 'solid'}/${code}.svg`);
```

Components that don't render icons need no resolver at all.

## Browser support

Modern evergreen browsers. The stylesheet uses cascade layers and `color-mix()`.

## License

MIT
