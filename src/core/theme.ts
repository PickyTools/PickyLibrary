import { contrastRatio, readableTextColor } from './contrast';

/*
 * Helpers for consumers who bring their own colours.
 *
 * The accents drive everything through color-mix(), so a custom colour already
 * produces a matching hover, border and text variant. The one decision CSS cannot
 * make at this browser floor is whether text on a filled surface should be black
 * or white -- and that is exactly where a custom accent tends to fail: a mid-tone
 * orange reads at 2.8:1 against white and 7.5:1 against black.
 *
 * Framework-free by design: an adapter passes in the element to read from.
 */

/** The seven semantic colours, each with an accent token and a text token. */
export const THEME_COLORS = [
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'info',
    'gray',
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];

export interface ThemeContrastIssue {
    color: ThemeColor;
    accent: string;
    text: string;
    ratio: number;
}

interface StyleTarget {
    style: { setProperty(property: string, value: string): void };
}

interface ComputedSource {
    getPropertyValue(property: string): string;
}

/**
 * Reads the accent tokens and returns the pairs that fall below `minimum`.
 *
 * `read` is whatever resolves a custom property -- in a browser that is
 * `getComputedStyle(element)`. Anything the maths cannot parse is skipped rather
 * than reported, so an unusual colour notation never produces a false alarm.
 */
export function findThemeContrastIssues(
    read: ComputedSource,
    minimum = 4.5
): ThemeContrastIssue[] {
    const issues: ThemeContrastIssue[] = [];

    for (const color of THEME_COLORS) {
        const accent = read.getPropertyValue(`--picky-color-${color}`).trim();
        const text = read.getPropertyValue(`--picky-color-${color}-text`).trim();
        if (!accent || !text) continue;

        const ratio = contrastRatio(accent, text);
        if (ratio > 0 && ratio < minimum) issues.push({ color, accent, text, ratio });
    }

    return issues;
}

/**
 * Sets each `--picky-color-<name>-text` to whichever of black or white reads
 * better on that accent.
 *
 * Call it once after applying your own accents. It only writes the text tokens,
 * so your accents stay exactly as you set them.
 */
export function applyReadableTextColors(read: ComputedSource, target: StyleTarget): void {
    for (const color of THEME_COLORS) {
        const accent = read.getPropertyValue(`--picky-color-${color}`).trim();
        if (!accent) continue;

        target.style.setProperty(`--picky-color-${color}-text`, readableTextColor(accent));
    }
}
