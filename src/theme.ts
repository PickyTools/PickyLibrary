import {
    applyReadableTextColors as applyToTarget,
    findThemeContrastIssues,
    type ThemeContrastIssue,
} from './core/theme';

export type { ThemeColor, ThemeContrastIssue } from './core/theme';
export { THEME_COLORS } from './core/theme';

/**
 * Sets every `--picky-color-<name>-text` to whichever of black or white reads
 * better on the accent currently in force.
 *
 * Call it once after applying your own accents:
 *
 *     document.documentElement.style.setProperty('--picky-color-primary-500', '#f97316');
 *     applyReadableTextColors();
 *
 * Everything else about a custom accent already adapts on its own -- hover,
 * borders and the text variant are mixed from it in CSS. Text on a filled surface
 * is the one thing CSS cannot decide yet, which is why this exists.
 */
export function applyReadableTextColors(root: HTMLElement = document.documentElement): void {
    applyToTarget(getComputedStyle(root), root);
}

/** The accent/text pairs currently below `minimum`. Empty means everything reads. */
export function checkThemeContrast(
    root: HTMLElement = document.documentElement,
    minimum = 4.5
): ThemeContrastIssue[] {
    return findThemeContrastIssues(getComputedStyle(root), minimum);
}

let checked = false;

/**
 * Warns once, in development only, when a themed colour cannot be read against
 * its own text colour.
 *
 * Runs automatically from the first button that mounts. A custom accent that
 * fails is invisible until someone squints at a screenshot, and it is exactly the
 * mistake this library should not let pass quietly.
 */
export function warnAboutThemeContrastOnce(): void {
    if (checked || typeof document === 'undefined') return;
    checked = true;

    const issues = checkThemeContrast();
    if (issues.length === 0) return;

    const lines = issues
        .map((i) => `  ${i.color}: ${i.accent} on ${i.text} is ${i.ratio.toFixed(2)}:1`)
        .join('\n');

    console.warn(
        '[PickyLibrary] These themed colours fall below the 4.5:1 that WCAG 1.4.3 asks for:\n' +
            `${lines}\n` +
            'Call applyReadableTextColors() after setting your accents, or set the ' +
            '--picky-color-<name>-text tokens yourself.'
    );
}
