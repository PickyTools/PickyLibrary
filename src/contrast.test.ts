// @vitest-environment node
//
// Reads the real stylesheets and checks every colour pair the library ships.
//
// This is here because the palette used to fail quietly: the default button was
// 3.68:1 against its own label, well under the 4.5 that WCAG 1.4.3 asks for, and
// nothing said so. Contrast is a property of the tokens, so it belongs in a test
// over the tokens -- not in a component test, and not in a reviewer's eye.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { blend, contrastRatio } from './core/contrast';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const theme = read('src/styles/index.css');
const buttonCss = read('src/styles/components/button.css');
const pillCss = read('src/styles/components/pill.css');
const checkboxCss = read('src/styles/components/checkbox.css');
const toastCss = read('src/styles/components/toast.css');
const alertCss = read('src/styles/components/alert.css');

/** The palette, keeping the first declaration of each token -- the light-mode one. */
const palette: Record<string, string> = {};
for (const [, name, value] of theme.matchAll(/(--picky-color-[a-z0-9-]+):\s*([^;]+);/g)) {
    if (name && value) palette[name] ??= value.trim();
}

/** Turns `var(--picky-color-green-700)` into the colour it stands for. */
function resolve(value: string): string {
    const reference = /var\((--picky-color-[a-z0-9-]+)\)/.exec(value);
    if (!reference) return value.trim();

    return paletteColour(reference[1] as string);
}

/** The body of a rule, braces balanced so nested media queries come along. */
function ruleBody(css: string, selector: string): string {
    const at = css.indexOf(selector);
    if (at < 0) throw new Error(`Selector not found: ${selector}`);

    const open = css.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
        if (css[i] === '{') depth += 1;
        else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i);
    }
    throw new Error(`Unbalanced rule: ${selector}`);
}

/**
 * A token's value inside a rule.
 *
 * Light mode takes the first declaration and dark mode the last, because the dark
 * overrides live in nested blocks further down. Crude, but it means this test reads
 * the stylesheet the components actually ship rather than a copy of its values.
 */
function token(body: string, name: string, mode: 'light' | 'dark' = 'light'): string {
    const found = [...body.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))]
        .map((match) => match[1])
        .filter((value): value is string => value !== undefined);

    const value = mode === 'light' ? found.at(0) : found.at(-1);
    if (value === undefined) throw new Error(`Token ${name} not declared`);
    return resolve(value);
}

/** A missing token is a mistake, not an empty string -- say so loudly. */
function paletteColour(name: string): string {
    const value = palette[name];
    if (!value) throw new Error(`Unknown colour token: ${name}`);
    return value;
}

const LIGHT_SURFACE = paletteColour('--picky-color-light-surface-50');
const DARK_SURFACE = paletteColour('--picky-color-dark-surface-900');

/** WCAG 1.4.3 for text, 1.4.11 for borders and other non-text boundaries. */
const TEXT = 4.5;
const NON_TEXT = 3;

const COLOURS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'gray'] as const;

function expectContrast(a: string, b: string, minimum: number, what: string) {
    const ratio = contrastRatio(a, b);
    expect(ratio, `${what}: ${a} on ${b} is ${ratio.toFixed(2)}, needs ${minimum}`).toBeGreaterThanOrEqual(minimum);
}

describe.each(COLOURS)('BaseButton colour "%s"', (colour) => {
    const body = ruleBody(buttonCss, `.picky-button[data-color='${colour}']`);

    // A filled button carries its own contrast: the label sits on the fill, not on
    // the page. So these pairs must hold in both themes, and the tokens do not
    // change between them.
    it('keeps the label readable on the fill, at rest and on hover', () => {
        const label = token(body, '--picky-btn-on-fill');
        expectContrast(label, token(body, '--picky-btn-fill'), TEXT, 'fill');
        expectContrast(label, token(body, '--picky-btn-fill-hover'), TEXT, 'fill on hover');
    });

    it('keeps the text variant readable on both surfaces', () => {
        expectContrast(token(body, '--picky-btn-accent'), LIGHT_SURFACE, TEXT, 'accent, light');
        expectContrast(token(body, '--picky-btn-accent', 'dark'), DARK_SURFACE, TEXT, 'accent, dark');
    });

    it('keeps the outline variant readable on both surfaces', () => {
        expectContrast(token(body, '--picky-btn-on-line'), LIGHT_SURFACE, TEXT, 'outline text, light');
        expectContrast(token(body, '--picky-btn-on-line', 'dark'), DARK_SURFACE, TEXT, 'outline text, dark');
    });

    // The border is what makes an outline button visible at all, so it falls under
    // 1.4.11 rather than being decorative.
    it('gives the outline border a visible edge on both surfaces', () => {
        expectContrast(token(body, '--picky-btn-line'), LIGHT_SURFACE, NON_TEXT, 'border, light');
        expectContrast(token(body, '--picky-btn-line', 'dark'), DARK_SURFACE, NON_TEXT, 'border, dark');
    });
});

describe.each(COLOURS)('BasePill colour "%s"', (colour) => {
    const light = ruleBody(pillCss, `.picky-pill[data-color='${colour}']`);
    const dark = ruleBody(pillCss, `.picky-pill[data-color='${colour}'][data-background='dark']`);
    const alpha = (body: string) => Number(token(body, '--picky-pill-alpha').replace('%', '')) / 100;

    it('keeps the label readable on its own tint', () => {
        const base = token(light, '--picky-pill-base');

        expectContrast(
            token(light, '--picky-pill-text'),
            blend(base, LIGHT_SURFACE, alpha(light)),
            TEXT,
            'pill on a light surface'
        );
        expectContrast(
            token(dark, '--picky-pill-text'),
            blend(base, DARK_SURFACE, alpha(dark)),
            TEXT,
            'pill on a dark surface'
        );
    });
});

describe.each(COLOURS)('BaseCheckbox colour "%s"', (colour) => {
    const body = ruleBody(checkboxCss, `.picky-checkbox[data-color='${colour}']`);

    it('keeps the tick visible on the fill, at rest and on hover', () => {
        // Only warning overrides the tick; the rest inherit the white default.
        const tick = /--picky-checkbox-check:/.test(body)
            ? token(body, '--picky-checkbox-check')
            : paletteColour('--picky-color-white');

        expectContrast(tick, token(body, '--picky-checkbox-accent'), TEXT, 'tick on fill');
        expectContrast(tick, token(body, '--picky-checkbox-accent-hover'), TEXT, 'tick on hover');
    });
});

describe.each(COLOURS)('BaseToast style "%s"', (style) => {
    const body = ruleBody(toastCss, `.picky-toast[data-style='${style}']`);

    it('keeps its text readable on the card', () => {
        expectContrast(
            token(body, '--picky-toast-text'),
            token(body, '--picky-toast-bg'),
            TEXT,
            'toast'
        );
    });
});

describe.each(['info', 'warning', 'error', 'success'])('BaseAlert type "%s"', (type) => {
    const body = ruleBody(alertCss, `.picky-alert[data-type='${type}']`);

    it('keeps its text readable on the panel', () => {
        expectContrast(
            token(body, '--picky-alert-text'),
            token(body, '--picky-alert-bg'),
            TEXT,
            'alert, light'
        );

        // In dark mode the panel is a 40% tint of the deepest shade over the page,
        // which lands close enough to the page itself to judge the text against it.
        expectContrast(
            token(body, '--picky-alert-text', 'dark'),
            DARK_SURFACE,
            TEXT,
            'alert, dark'
        );
    });
});

describe('the focus ring', () => {
    // WCAG 1.4.11 again: an indicator you cannot see is not an indicator.
    it('stands out against both surfaces', () => {
        const ring = paletteColour('--picky-color-focus-ring');
        expectContrast(ring, LIGHT_SURFACE, NON_TEXT, 'focus ring, light');
        expectContrast(ring, DARK_SURFACE, NON_TEXT, 'focus ring, dark');
    });
});
