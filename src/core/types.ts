/*
 * Framework-free types. Nothing in src/core/ may import `vue` -- that is the one
 * rule holding this directory together, and eslint.config.js enforces it rather
 * than leaving it to discipline. If a React or Angular adapter ever arrives, this
 * is the directory that moves across unchanged.
 */

/** The sizes every component shares. */
export type Size = 'xs' | 'sm' | 'md' | 'lg';

/**
 * One semantic colour scale for the whole library.
 *
 * There used to be four separate unions side by side: `Color` knew five colours,
 * `ButtonColor` six, `CheckboxColor` three and `ToastStyle` seven, with the same
 * red variant called `warning`, `red` and `danger` in turn. That is exactly the
 * kind of divergence that multiplies once a second framework arrives.
 *
 * Every component that takes a colour now takes all seven, so a name means the
 * same thing everywhere.
 */
export type Color =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'gray';

export interface HasSize {
    size?: Size;
}

export interface HasDisabled {
    disabled?: boolean;
}

export interface HasColor {
    color?: Color;
}

export interface BaseComponentProps extends HasSize, HasDisabled {}
