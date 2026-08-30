/** Groottes die alle componenten delen. */
export type Size = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Semantische kleuren. Eén unie voor de hele library — in de ColorPicky-versie
 * heette dezelfde rode variant `warning` (BaseButton), `red` (BaseCheckbox) en
 * `danger` (BasePill). `danger` is de gangbare naam en wint.
 */
export type Color = 'primary' | 'secondary' | 'success' | 'danger' | 'gray';

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
