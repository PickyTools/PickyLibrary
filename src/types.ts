/*
 * Re-export of src/core/types.ts.
 *
 * The types live in core because they are framework-free. This file stays so that
 * the components -- and existing consumer imports -- do not all have to change
 * when core eventually becomes a package of its own.
 */
export type {
    Size,
    Color,
    HasSize,
    HasDisabled,
    HasColor,
    BaseComponentProps,
} from './core/types';
