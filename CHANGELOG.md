# Changelog

The public API is still moving. In `0.x` a minor bump is the one that carries
breaking changes.

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
