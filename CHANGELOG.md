# Changelog

The public API is still moving. In `0.x` a minor bump is the one that carries
breaking changes.

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
