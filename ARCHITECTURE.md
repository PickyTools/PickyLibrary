# Architecture

PickyLibrary is a Vue library today, built so a React or Angular package can be
added later without reimplementing — or re-breaking — anything that matters.

Three layers:

```
src/core/       framework-free TypeScript: behaviour, keyboard, ARIA, types
src/styles/     one plain stylesheet: everything visual
src/components/ the Vue adapter: refs, templates, DOM
```

## The one rule

**Nothing in `src/core/` may import a framework.** That is the whole architecture,
and it is enforced by `eslint.config.js` rather than by discipline — a `vue` import
there fails the lint with an explanation.

The rule matters because core is the part a second adapter would reuse unchanged.
The moment a `ref` sneaks in, that stops being true, and you find out a year later
when you start writing the React package.

## What belongs where

Not every component needs a core module. Most do not.

| | Core | Adapter |
|---|---|---|
| Button, Pill, Alert, Icon | types only | everything |
| Checkbox, Switch | types only — state is read from the DOM by CSS | everything |
| Input | types only | everything |
| Toast | the store (`core/toast.ts`) | reactivity wrapper, markup |
| Select | behaviour + ARIA (`core/select.ts`) | refs, positioning, focus, markup |
| Modal | — the platform's `<dialog>` does the work | everything |

The presentational components need no core because their appearance is decided by
`data-` attributes in CSS, not by computed class names. Checkbox and Switch need
none because their state lives in the DOM — a real `<input>`, a real
`aria-checked` — where the stylesheet reads it directly.

Reach for a core module only when there is real behaviour to protect: a keyboard
map, a state machine, shared state. Two components out of twelve qualify.

## The shape of a core module

`core/select.ts` is the reference. It exports four kinds of thing:

1. **Pure functions** — `nextEnabledIndex`, `matchTypeahead`. No state, trivially
   testable.
2. **A small stateful helper** — `createTypeahead`, with an injectable clock so
   tests never touch the runner's timers.
3. **A decision function** — `selectKeydown` takes a key and the current state and
   returns an *intent* (`{ type: 'activate', index: 2 }`). It changes nothing; the
   adapter applies the result. That is what keeps the WAI-ARIA keyboard table out
   of three separate implementations.
4. **A connect function** — `connectSelect` returns the attributes for each part.
   An adapter spreads them over its own markup and needs to know nothing about
   ARIA.

The payoff is visible in the tests: `core/select.test.ts` covers the full keyboard
table and every ARIA attribute in 7ms, with no DOM and no component mounted.

## Rules that exist for a second framework

These cost nothing today and are expensive to retrofit:

- **Ids come from the adapter.** `createSelectIds(uid)` takes a uid; it never
  generates one. Vue's `useId` and React's `useId` agree between server and client,
  and a home-grown counter does not — the mismatch lands on exactly the `aria-*`
  wiring that carries the accessibility.
- **No shared state at module scope.** `createToastStore()` makes an instance;
  `provideToasts()` hands one to the component tree. Module scope on a server
  outlives a single request, so a singleton leaks one visitor's data to the next.
- **Nothing in core touches the DOM at import time**, and `src/ssr.test.ts` runs in
  plain Node to prove it.
- **Be sparing with scoped slots.** Every one is a puzzle in Angular, where generic
  types do not flow through templates. Before adding one, ask whether a `data-`
  attribute and a CSS rule would do — that costs nothing in any framework.

## Adding a framework later

Split the package into `@picky/core`, `@picky/styles` and one package per
framework. The boundaries already exist; only the packaging changes.

The one thing to build at that point is a `normalizeProps` step between core and
the adapter. Core returns plain objects with DOM attribute names; Vue and React
both accept those nearly as-is, but Angular binds events differently. Today that
step would be the identity function, which is why it is not there yet.
