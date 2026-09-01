# Styling contract

PickyLibrary ships plain CSS. Components render **semantic class names and data
attributes**; the stylesheet decides what they look like. Nothing about a
component's appearance is computed in JavaScript.

That split is deliberate. The stylesheet is the one layer that is not tied to a
framework, so keeping every visual decision there is what lets a React or Angular
package later reuse this styling byte for byte instead of reimplementing it.

## Two ways to override

### 1. Tokens — for theming

Every visual decision is a CSS custom property in the `--picky-*` namespace. Set
them anywhere in your own CSS:

```css
:root {
    --picky-color-primary-500: #f97316;
    --picky-radius-button: 0.75rem;
}
```

Your overrides win regardless of stylesheet order: PickyLibrary's own rules live
in a cascade layer, and unlayered CSS always beats layered CSS.

**One accent is enough.** Hover, borders and the text variant are not separate
tokens you have to keep in step -- they are mixed from the accent with
`color-mix()`, and adapt per theme: pushed towards black on a light page, towards
white on a dark one. Set `--picky-color-primary-500` to your own orange and the
outline variant becomes a readable dark orange rather than staying blue.

Each colour has an accent and a text colour that goes on it:

| Accent | Text on it |
|---|---|
| `--picky-color-primary` (follows `-500`) | `--picky-color-primary-text` |
| `--picky-color-secondary` (follows `-500`) | `--picky-color-secondary-text` |
| `--picky-color-success` | `--picky-color-success-text` |
| `--picky-color-danger` | `--picky-color-danger-text` |
| `--picky-color-warning` | `--picky-color-warning-text` |
| `--picky-color-info` | `--picky-color-info-text` |
| `--picky-color-gray` | `--picky-color-gray-text` |

The text colour is the one thing that cannot be derived. CSS has no way, at the
browser versions this library supports, to ask whether black or white reads better
on a colour it was handed. So either set it yourself, or let the library work it
out:

```js
import { applyReadableTextColors } from 'pickylibrary';

document.documentElement.style.setProperty('--picky-color-primary-500', '#f97316');
applyReadableTextColors();
```

Skip both and a development build warns, naming the pair and the ratio it
measured. White on that orange is 2.80:1; black is 7.49:1.

#### Typography

Two tokens cover the titles the library renders itself -- a toast's, a modal's and
an alert's:

```css
:root {
    --picky-font-heading: 'Poppins', system-ui;
    --picky-font-weight-heading: 700;
}
```

They default to `inherit` and `600`, so without them a title simply follows the
page. Loading the font file is yours to do; the tokens only say which family to
ask for.

### 2. Class names — for everything else

When no token covers what you need, target the component directly. No
`!important`, no specificity fights — the cascade layer handles it:

```css
.picky-button__inner {
    text-transform: uppercase;
}

.picky-button[data-variant='outline'][data-size='lg'] {
    border-width: 2px;
}
```

## What is public

| | Public | Example |
|---|---|---|
| Tokens | yes | `--picky-color-primary-500` |
| Root class | yes | `.picky-button` |
| Part classes | yes | `.picky-button__inner` |
| Variant attributes | yes | `data-variant`, `data-size`, `data-color` |
| State attributes | yes | `data-state`, `data-disabled` |
| Component tokens | yes | `--picky-btn-fill` |
| Element structure | **no** | nesting depth, element types |

Component tokens like `--picky-btn-fill` are the cheapest override point: set one
and every variant that reads it follows.

## The palette

The colour ramps PickyLibrary uses — `neutral`, `green`, `red`, `yellow`, `blue`,
`teal`, plus `white` and `black` — are declared by the library itself, not
inherited from Tailwind. Every shade from `50` to `950` is always emitted, so
`--picky-color-green-600` is guaranteed to exist and is safe to build on.

This is deliberate. Those ramps used to come from Tailwind's default theme, which
only emits the variables that a utility class actually references. Once the
components stopped using utility classes, every one of those tokens would have
silently disappeared — and a `var()` that resolves to nothing produces no error,
just an invisible element. Owning the palette makes it a fixed contract instead of
a side effect of what happens to still be in the markup.

## Naming rules

- `.picky-<component>` — the root element.
- `.picky-<component>__<part>` — a part inside it.
- `data-<name>` — a variant or state on a library element. Always used together
  with a `.picky-*` class in the stylesheet, so it can never collide with your own
  attributes.
- `data-picky-<name>` — an input you set yourself, on any ancestor. Prefixed
  because it is read outside of a library element. Currently only
  `data-picky-shadow`.

## Writing a component stylesheet

One file per component in `src/styles/components/`, wrapped in
`@layer picky-components`, in this order:

Plain CSS — there is no preprocessor and no utility framework. Lightning CSS
compiles native nesting away at build time, so nesting is safe to use here even
though the supported browsers do not all have it.

1. **Structure** — layout that does not depend on any prop.
2. **Sizes** — per `data-size`.
3. **Variants** — rules that read tokens and never name a colour.
4. **Colours** — blocks that only *set* tokens.

Keeping colours out of steps 1–3 is what stops the rules from multiplying: a
variant is written once instead of once per colour, and a new colour is a handful
of tokens with no new rules.

### Where a component's styles live

| File | Covers |
|---|---|
| `alert.css` | BaseAlert |
| `button.css` | BaseButton |
| `checkbox.css` | BaseCheckbox |
| `close-button.css` | the dismiss button shared by alert, toast and modal |
| `icon.css` | BaseIcon |
| `input.css` | BaseInput and BasePasswordInput |
| `modal.css` | BaseModal |
| `pill.css` | BasePill |
| `select.css` | BaseSelect |
| `switch.css` | BaseSwitch |
| `toast.css` | BaseToast and ToastContainer |

### Dark mode

Only ever override tokens, never whole rules. It has to be written twice, because
a media query and a class cannot live in one selector:

```css
.picky-button[data-color='success'] {
    --picky-btn-fill: var(--picky-color-green-600);

    @media (prefers-color-scheme: dark) {
        :root:not(.light) & {
            --picky-btn-fill: var(--picky-color-green-700);
        }
    }
    .dark & {
        --picky-btn-fill: var(--picky-color-green-700);
    }
}
```

`.light` on an ancestor forces light mode even when the OS asks for dark.

### Layers

Three, in this order: `picky-theme` holds the tokens, `picky-base` the shared
`.picky-reset` and `.picky-pressable`, and `picky-components` everything else. A
component rule therefore beats the shared ones with a single class, and your own
unlayered CSS beats all of them.

`picky-base` also neutralises the browser's default margins on the `<p>`, `<ul>`
and `<li>` elements the library renders itself. A new component that renders one
belongs in that list; a test fails if it is missing.
