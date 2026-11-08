# Changelog

The public API is still moving. In `0.x` a minor bump is the one that carries
breaking changes.

## 0.4.0

### Fixed

- **`BaseInput` announced an error to nobody.** The message sat behind a `v-if`, so
  the element carrying `role="alert"` was created at the same moment as its text,
  and several screen readers announce nothing at all in that case: the text has to
  change inside a region that was already being watched.

  The error now has a region of its own, in the document from the first render,
  empty, with its role already on it. A hint no longer shares that element -- a
  static hint in a live region would be read out on page load, which is the other
  half of the same problem.

  Empty, the region is pulled out of the flow with the same visually-hidden recipe
  the checkbox's input uses, rather than with `display: none` or
  `visibility: hidden`. Both of those take an element out of the accessibility tree,
  which would leave a live region in the markup that nothing is watching -- the bug
  this was built to avoid. `src/styles.test.ts` guards that, because no DOM test can
  see it: happy-dom applies no stylesheets.

  Found by using the library in a real application rather than by reading it, which
  is the argument for having a second consumer. The regression test checks that the
  region is the *same element* before and after the error arrives; every other
  assertion about it passed while the bug was there.

  **Breaking, in the markup rather than the API.** No prop changed, but a hint's id
  is now `{id}-hint` where it was `{id}-message`, the error keeps `{id}-message`,
  and `.picky-input` always contains one more `<p>` than it used to. Anything
  selecting on either will need a look.

### Added

- **A Blade adapter.** `<x-picky::button>`, `<x-picky::pill>` and
  `<x-picky::input>` render the same markup as their Vue counterparts, from PHP,
  with no JavaScript on the page. Installed with `composer require
  pickytools/pickylibrary`; the stylesheet still comes from npm, because it is
  built from `src/styles/` and there should be exactly one of it.

  The reason is reach rather than novelty: a Laravel application is mostly Blade,
  and a base library that only covers the Vue islands dresses the smaller half of
  every page while the two halves drift apart.

  It cost almost nothing to add because the architecture already allowed for it.
  Ten of the twelve components need no `core/` module at all -- their appearance is
  decided by `data-` attributes in CSS rather than by computed class names -- so a
  Blade component is the same contract written in the one language a Blade page can
  execute. `BaseToast` and `BaseSelect` are the two with real behaviour, and theirs
  already sits framework-free in `src/core/`.

  Four things differ on this side, all because there is no JavaScript and no
  reactivity: `modelValue` is `value`, an input with a label needs an explicit
  `id`, and a button has no `tempLabel` and no `color="custom"`. See
  [BLADE.md](BLADE.md).

- **A conformance test, `src/blade.test.ts`.** Every case in
  `conformance/cases.json` is rendered by both adapters, reduced to one canonical
  form and compared. It catches a changed attribute, a misspelled class and a
  dropped `aria-*`.

  Two implementations of one contract drift, and nothing either suite already had
  could see it: the Vue tests pass with no Blade view in the repository at all. The
  canonical form is built in one language rather than on both sides, because two
  normalisers to keep in step would be the same problem one level down.

  CI installs PHP so the comparison always runs. Locally the file skips itself when
  PHP or `vendor/` is missing, and says why -- a silent skip is the one way these
  two could drift with a green build.

### Note

- **0.3.1 never reached npm.** It was committed and left there, so upgrading from
  the published `0.3.0` brings its select fix and its `el` on `BaseButton` along
  with everything above. Its own section below is unchanged.

## 0.3.1

### Fixed

- **A select whose trigger had lost its element stopped working entirely.** Opening
  threw `$el.closest is not a function`, and with the error thrown inside the click
  handler the dropdown never appeared -- on every instance on the page, for as long
  as the page lived.

  BaseSelect read its trigger element off BaseButton's `$el`. A component's `$el` is
  its vnode's `el`, and the renderer only keeps that pointing at the root element
  while the vnode tree and the DOM agree. Hydrating markup that no real SSR render
  produced breaks that agreement: a production build marks fragment and Teleport
  boundaries with empty text nodes, which serialise to nothing, so markup captured
  from an already-rendered page (a headless-browser prerender, say) is missing the
  anchors the hydration walk looks for. The walk then desyncs and leaves `$el` on
  whatever node it reached -- in practice an empty text node, which has no `closest`,
  no `focus` and no `getBoundingClientRect`. Floating UI failed on the same node one
  line later.

  BaseButton now exposes the element through a template ref, which the renderer
  assigns from the element it actually created, and BaseSelect anchors to that. The
  select survives a `$el` that has drifted; it no longer has an opinion about how the
  page was rendered.

### Added

- **`el` on BaseButton**, the rendered `<button>` or `<a>`, for callers that measure,
  focus or hit-test it. `el` on BaseInput has always meant this; the two now match.

## 0.3.0

### Added

- **Border weight.** `data-picky-border` on `<html>`, on an ancestor, or on a
  component picks one of three weights, the same way `data-picky-shadow` picks a
  shadow style. It sets `--picky-border-control` (input, outline button, and the
  transparent edge that keeps a filled button the same size) and
  `--picky-border-container` (alert, select panel). Without the attribute:
  `hairline`, which is what every component drew before, so nothing moves for a
  consumer who does not set it. See [STYLING.md](STYLING.md).

  `none` takes away a container's edge but never a control's: a field is
  transparent by default, so its border is the only thing marking where it is, and
  WCAG 1.4.11 asks 3:1 of exactly that edge. `--picky-border-control` therefore
  floors at `1px` in all three weights.

- **A visible edge on filled buttons**, `--picky-btn-edge`. The `full` variant already
  carried a transparent border to keep it the same size as an outline button; that
  border now has a colour -- the accent a few steps along its own ramp, darker in
  light mode and lighter in dark. Set the token to change it, or to `transparent` for
  the old look.

  This is an accessibility fix as much as a visual one. A mid-tone fill clears 3:1
  against the page but not against every surface a button sits on: on a raised
  surface in dark mode it lands at 2.70:1 and on a sunken one at 1.98:1, under what
  WCAG 1.4.11 asks of the boundary of a component. The edge is 6.62:1 and 4.86:1
  there, and 1.4.11 lets the boundary carry that contrast instead of the fill. The
  step is past the hover fill on purpose, so the edge does not vanish into the button
  exactly while you are pressing it.

  At `data-picky-border="none"` the edge goes transparent -- "no borders" means no
  borders, and unlike a field a filled button does not disappear without one. Its
  width stays, so nothing shifts. Only the opacity inherits and the mix happens on
  the button, the same arrangement the shadow style uses, so a nested subtree can
  still differ.

### Fixed

- An input's resting border was `neutral-400`, which is 2.55:1 on white and 2.66:1
  on a tinted panel -- under the 3:1 WCAG 1.4.11 asks of the boundary of a control,
  and the field has no fill of its own to fall back on. It is now `neutral-500`
  (4.13:1). Focus moved from `-500` to `-600` so focus still changes the border.
  Dark mode already cleared the bar at 3.68:1 and is unchanged.

## 0.2.1

### Fixed

- The polite toast region was a bare `<div>` carrying `aria-live="polite"` and an
  `aria-label`. ARIA forbids a name on an element with no role, so the label was
  invalid and axe flagged every page that mounted a container. It is now
  `role="status"`, which implies the polite live region and is allowed to be named.

- A switch's off-track was the one neutral with no dark-mode counterpart: it stayed
  on the light ramp in dark mode. It now follows `dark-surface` like the checkbox,
  input, modal and select neutrals do. At the default palette the two shades are
  within half a percent of each other, so nothing shifts for a consumer who has not
  themed the ramp -- but one who points `--picky-color-neutral-*` at their own
  colours no longer gets an off-track that can collide with the on-track.
- `--picky-font-heading` and `--picky-font-weight-heading` were declared but read
  by nothing, so setting them did nothing at all. The three titles the library
  renders -- toast, modal and alert -- now use them. The defaults are `inherit` and
  `600`, which is what those rules hard-coded before, so nothing changes until the
  tokens are set.

## 0.2.0

A large release. Everything visual changed, because the components stopped
computing class names and the stylesheet became the shared truth.

### Breaking

- **Every class name.** Components render semantic classes and data attributes --
  `class="picky-button" data-variant="outline" data-size="md"` -- instead of
  Tailwind utilities. Anything styled against `picky:*` no longer matches. The
  hooks that replace them are documented in [STYLING.md](STYLING.md).
- **`ToastStyle` is removed.** Use `Color`, which now has seven values instead of
  five and is shared by every component that takes a colour. There is no longer a
  separate `CheckboxColor` or `ButtonColor`.
- **Default colours are darker.** The old palette failed WCAG 1.4.3 across the
  board -- the default button sat at 3.68:1 against its own label, where 4.5 is
  required. Accents moved from `-500` to `-600`/`-700` shades and the primary ramp
  is one step deeper.
- **The browser floor is enforced by the build:** Chrome 111, Firefox 121, Safari
  16.2. Set by cascade layers, `color-mix()` and `:has()`, none of which can be
  compiled away.
- **Tailwind is no longer a dependency.** The stylesheet is plain CSS. Nothing
  changes for consumers who were not relying on the utilities.

### Added

- `provideToasts()`, `ToastStoreKey`, `ToastStore` and `createToastStore()`. Each
  request gets its own toast store, which server-side rendering requires: module
  scope outlives a request, so a shared store carried one visitor's toast to the
  next.
- A cap on how many toasts stay on screen, three by default:
  `createToastStore({ limit: 5 })`, or `0` to keep every one. A polite toast is
  dropped before an urgent one.
- `applyReadableTextColors()` and `checkThemeContrast()`, for themes that bring
  their own colours. Hover, borders and the text variant are now mixed from a
  single accent with `color-mix()`, so they follow your colour; the text on a
  filled surface is the one thing CSS cannot decide, and this decides it.
- [API.md](API.md), generated from the components, and
  [ARCHITECTURE.md](ARCHITECTURE.md).

### Fixed

- The active-state ring replaced the whole `box-shadow`, so the `hard` press
  shadow never rendered.
- The text variant's shadow was suppressed by a property nothing read, leaving a
  shadow in the text colour.
- Server-side rendering: the scroll lock reached for `document` unguarded, and
  toast state was shared between requests.
- A select's panel inside a modal sat behind the dialog and could not be clicked.
  It is now teleported into the dialog and shown as a popover, which puts it in
  the top layer and lets it extend past the modal.
- Buttons had no focus indicator of their own and relied on the browser default.
- A link styled as a button underlined itself in a colour unrelated to its text.
- The browser's default margins survived on the `<p>`, `<ul>` and `<li>` elements
  the library renders, pushing a field's error message a line and a half too low
  and insetting a select's options by 40px.
- Read-only fields showed a press animation and lit up on a plain click; the focus
  ring now waits for `:focus-visible`.
- `SelectOption` had dropped out of the published types.

## 0.1.0

First release. Twelve components, Vue 3 only.
