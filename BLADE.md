# The Blade adapter

The same components, server-rendered by PHP. No JavaScript, no build step for the
markup, and the same stylesheet the Vue adapter uses.

It exists because a Laravel application is mostly Blade. A base library that only
reaches the Vue islands dresses the smaller half of every page, and the two halves
then drift: a button in a Blade layout and a button in a Vue panel end up two
buttons that nearly match.

> Status: the first three components. `BaseButton`, `BasePill` and `BaseInput` are
> available as `<x-picky::button>`, `<x-picky::pill>` and `<x-picky::input>`.

## Install

```bash
composer require pickytools/pickylibrary
npm i pickylibrary
```

Both, and that is deliberate. The stylesheet is built from `src/styles/` with
lightningcss, which resolves the native nesting the sources are written in, so the
file a browser should get is the built one and there is exactly one of it. Composer
delivers the views; npm delivers the stylesheet every adapter shares.

```js
// resources/js/app.js, or wherever your bundler starts
import 'pickylibrary/style.css';
```

Laravel discovers the service provider, so there is nothing to register and nothing
to publish.

## Use

```blade
<x-picky::button label="Opslaan" html-type="submit" />

<x-picky::button label="Open de kaart" href="/map" variant="outline" color="gray" />

<x-picky::pill label="Concept" color="warning" size="sm" />

<x-picky::input
    id="name"
    name="name"
    label="Naam"
    :value="old('name')"
    :error="$errors->first('name')"
    hint="Zoals het in het spel heet"
    required
/>
```

A prop is written in kebab-case on the tag and read in camelCase in the view, which
is Laravel's own conversion: `html-type` is the `htmlType` prop. The names are
otherwise the ones in [API.md](API.md), because they are the same components.

Slots work as they do on the Vue side:

```blade
<x-picky::button label="Volgende">
    Volgende
    <x-slot:suffix>&rarr;</x-slot:suffix>
</x-picky::button>
```

## Where this side differs, and why

Four differences, all of them because a Blade page runs no JavaScript and has no
reactivity. Everything else about the two adapters is identical, and a test holds
them to that.

| | |
|---|---|
| `modelValue` is `value` | A server-rendered field is handed a value and prints it. There is nothing to model. |
| `id` is required on an input with a label, hint or error | Those are wired to the field by id. Vue falls back to `useId()`; Blade has no equivalent that is stable between a rendered page and a test. |
| No `tempLabel` on a button | Swapping the label for a moment after a click is behaviour, and there is nothing here to run it. |
| No `color="custom"` on a button | Readable text on an arbitrary colour is a luminance calculation, and it lives in `src/core/contrast.ts`. Porting a pure function is the obvious next step; guessing black or white in a template is not. |

## How the two are kept in step

`src/blade.test.ts`. Every case in `conformance/cases.json` is rendered by both
adapters, the markup is reduced to one canonical form, and the two are compared. It
fails on a changed attribute, a misspelled class and a dropped `aria-*` alike.

Vue is the reference. It is the adapter with the component tests, the accessibility
suite and the browser screenshots behind it, so a failure here normally means the
Blade view has fallen behind rather than the other way round.

```bash
composer install          # once
npx vitest run src/blade.test.ts
```

Without PHP, or without `vendor/`, that file skips itself and says so. CI installs
both, so the comparison always runs there. A skip is the one way these two could
drift with a green build, which is why it is loud rather than silent.

The canonical form ignores three things on purpose: the order of attributes, the
order of class names, and an empty `style`, `class` or `placeholder`, which Vue's
server renderer writes where its client render writes nothing. It does not ignore an
empty `aria-label`, because that takes an element's accessible name away.

## Adding a component

1. Write `resources/views/components/<name>.blade.php`. Read the Vue component for
   the contract: the root class, the `data-` attributes, the ARIA. Compute no class
   names, the same rule the Vue adapter follows.
2. Add cases to `conformance/cases.json` -- the default, every attribute at once, and
   each state the component has.
3. Run the conformance test and make it pass.
4. Note it in [CHANGELOG.md](CHANGELOG.md) and in the list at the top of this file.

A component lands in both adapters or in neither. One that is added to Vue alone is
how the Blade track starts falling behind, and the conformance cases are what make
that a failure rather than an omission nobody notices.

The two that need more than markup are `BaseToast` and `BaseSelect`: they have real
behaviour, and it already lives framework-free in `src/core/`. That is what that
layer is for, and a small vanilla adapter over it is the way in -- not a second
implementation in PHP.
