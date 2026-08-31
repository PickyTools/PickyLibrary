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

One accent is enough. Hover, borders and the text variant are mixed from it with
`color-mix()`, so they follow your colour instead of falling back to ours.

The one thing CSS cannot work out is whether text on a filled surface should be black or
white. Call `applyReadableTextColors()` once after setting your accents and it decides for
you; skip it and a development build warns, with the ratio it measured.

```js
import { applyReadableTextColors } from 'pickylibrary';

document.documentElement.style.setProperty('--picky-color-primary-500', '#f97316');
applyReadableTextColors();
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

## Server-side rendering

Components render to a string in plain Node with no DOM. One thing to set up:
give each request its own toast store, so a notification raised while rendering
one visitor's page cannot appear on another's.

```js
import { provideToasts } from 'pickylibrary';

// In the setup of your root component
provideToasts();
```

In the browser this is optional — without it `useToast()` falls back to a single
shared store, which is what you want on the client.

At most three toasts stay on screen; a fourth pushes the oldest off, preferring to
drop a polite one so an urgent message is not displaced by a routine confirmation.
Change it, or turn the cap off with `0`:

```js
import { createToastStore, provideToasts } from 'pickylibrary';

provideToasts(createToastStore({ limit: 5 }));
```

## Components

`BaseButton`, `BaseInput`, `BasePasswordInput`, `BaseCheckbox`, `BaseSwitch`, `BaseSelect`,
`BaseModal`, `BaseAlert`, `BasePill`, `BaseIcon`, `BaseToast` and `ToastContainer`, plus the
`useToast` composable.

Every component that takes a colour takes the same seven: `primary`, `secondary`,
`success`, `danger`, `warning`, `info` and `gray`. `BaseButton` adds `custom` for
an arbitrary CSS colour, picking readable text for it automatically.

Every component types its slots, so replacing a part — an alert's icon, a select's whole
dropdown, a checkbox's tick — is autocompleted rather than guessed.

Props, events, slots and template refs for all twelve are listed in
[API.md](API.md), which is generated from the components themselves.

## Example

`example/` is a working consumer app: a kitchen sink of every component, with live controls
for shadow style, corner radius, accent colour and dark mode. It pulls icons from two sources
at once — Lucide components and raw Simple Icons SVG — to show that one resolver covers both.

```bash
cd example && npm install && npm run dev
```

## Contributing

`npm run verify:all` is the full gate: lint, types, unit tests, a build, the
example app's own typecheck, and the browser suite. GitHub Actions runs it on every
push and pull request. `npm run verify` is the same without the browser, which is
what `prepublishOnly` uses.

Screenshot comparisons run locally only — the baselines are machine-specific, so on
a CI runner they report font rendering rather than anything anyone changed. Use
`npm run test:browser:update` after an intentional visual change.

The behaviour, the styling and the Vue layer are deliberately separate; see
[ARCHITECTURE.md](ARCHITECTURE.md) before adding a component.

## Styling

Components render semantic class names and data attributes; the shipped stylesheet
decides what they look like. Nothing about their appearance is computed in
JavaScript, so you can restyle any part from your own CSS without fighting
specificity. See [STYLING.md](STYLING.md) for the full contract.

## Browser support

Chrome 111+, Firefox 121+, Safari 16.2+ — the floor set by cascade layers,
`color-mix()` and `:has()`, which the stylesheet relies on and which cannot be
compiled away. Those versions are enforced by the build rather than only
documented here.

## Releasing

An npm version can never be replaced, only superseded, so the version number is
part of the release rather than an afterthought.

1. Note what changed in [CHANGELOG.md](CHANGELOG.md), breaking changes first.
2. Set the version: `npm version minor` for a breaking change, `patch` otherwise.
   In `0.x` the minor is what carries breaking changes.
3. `npm publish` — `prepublishOnly` runs `verify` first.
4. `git push --follow-tags`.

`npm version` writes the tag as well, so do not bump the version by hand unless
you intend to tag it yourself.

## License

MIT
