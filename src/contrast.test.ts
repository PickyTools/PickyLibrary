// @vitest-environment node
//
// Checks the contrast the library guarantees on its own: the seven semantic
// accents against the text that sits on them, and the surfaces they land on.
//
// This is where the palette used to fail quietly -- the default button sat at
// 3.68:1 against its own label, well under the 4.5 WCAG 1.4.3 asks for, and
// nothing said so.
//
// Derived values -- hover, borders, the text variant's ink -- are mixed by the
// browser with color-mix() and are covered by the Playwright suite, which resolves
// the real cascade instead of guessing at it here.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio } from './core/contrast';
import { applyReadableTextColors, findThemeContrastIssues, THEME_COLORS } from './core/theme';

const theme = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8');

/** The palette, keeping the first declaration of each token -- the light-mode one. */
const palette: Record<string, string> = {};
for (const [, name, value] of theme.matchAll(/(--picky-color-[a-z0-9-]+):\s*([^;]+);/g)) {
    if (name && value) palette[name] ??= value.trim();
}

/** Follows `var(--x)` chains until an actual colour comes out. */
function resolve(name: string, depth = 0): string {
    const value = palette[name];
    if (!value) throw new Error(`Unknown colour token: ${name}`);
    if (depth > 5) throw new Error(`Token loop at ${name}`);

    const reference = /^var\((--picky-color-[a-z0-9-]+)\)$/.exec(value);
    return reference?.[1] ? resolve(reference[1], depth + 1) : value;
}

const LIGHT_SURFACE = resolve('--picky-color-light-surface-50');
const DARK_SURFACE = resolve('--picky-color-dark-surface-900');

/** WCAG 1.4.3 for text, 1.4.11 for borders and other non-text boundaries. */
const TEXT = 4.5;
const NON_TEXT = 3;


function expectContrast(a: string, b: string, minimum: number, what: string) {
    const ratio = contrastRatio(a, b);
    expect(
        ratio,
        `${what}: ${a} on ${b} is ${ratio.toFixed(2)}, needs ${minimum}`
    ).toBeGreaterThanOrEqual(minimum);
}

describe.each(THEME_COLORS)('the "%s" accent', (color) => {
    const accent = () => resolve(`--picky-color-${color}`);
    const text = () => resolve(`--picky-color-${color}-text`);

    // Every filled surface in the library -- button, toast, checkbox tick -- puts
    // this text on this accent, so one check covers all of them.
    it('carries its own text colour', () => {
        expectContrast(text(), accent(), TEXT, `${color} filled`);
    });

    // Borders and the text variant deliberately do NOT use the raw accent: they use
    // `--picky-btn-ink`, which the stylesheet mixes towards the surface so a light
    // accent such as yellow still reads. Checking the raw accent here would be
    // testing something the library does not do. The browser suite covers the
    // mixed value, because only a browser can resolve color-mix().
    it('is a colour the maths can read', () => {
        expect(contrastRatio(accent(), LIGHT_SURFACE)).toBeGreaterThan(0);
        expect(contrastRatio(accent(), DARK_SURFACE)).toBeGreaterThan(0);
    });
});

describe('the semantic text colours', () => {
    it('read against the surface they belong to', () => {
        for (const role of ['heading', 'body', 'muted', 'caption']) {
            expectContrast(resolve(`--picky-color-text-${role}`), LIGHT_SURFACE, TEXT, `text-${role}`);
        }
    });
});

describe('the focus ring', () => {
    // WCAG 1.4.11: an indicator you cannot see is not an indicator.
    it('stands out against both surfaces', () => {
        const ring = resolve('--picky-color-focus-ring');
        expectContrast(ring, LIGHT_SURFACE, NON_TEXT, 'focus ring, light');
        expectContrast(ring, DARK_SURFACE, NON_TEXT, 'focus ring, dark');
    });
});

describe('helping consumers who bring their own colours', () => {
    /** Stands in for getComputedStyle over a set of tokens. */
    const reader = (tokens: Record<string, string>) => ({
        getPropertyValue: (property: string) => tokens[property] ?? '',
    });

    it('reports a custom accent that cannot be read', () => {
        // A mid-tone orange is 2.80:1 against white and 7.49:1 against black.
        const issues = findThemeContrastIssues(
            reader({ '--picky-color-primary': '#f97316', '--picky-color-primary-text': '#ffffff' })
        );

        expect(issues).toHaveLength(1);
        expect(issues[0]?.color).toBe('primary');
        expect(issues[0]?.ratio).toBeLessThan(4.5);
    });

    it('stays quiet when the pair reads', () => {
        expect(
            findThemeContrastIssues(
                reader({ '--picky-color-primary': '#f97316', '--picky-color-primary-text': '#000000' })
            )
        ).toEqual([]);
    });

    it('picks a readable text colour for any accent', () => {
        const written: Record<string, string> = {};
        const target = { style: { setProperty: (k: string, v: string) => (written[k] = v) } };

        applyReadableTextColors(
            reader({ '--picky-color-primary': '#f97316', '--picky-color-info': '#0f766e' }),
            target
        );

        expect(written['--picky-color-primary-text']).toBe('#000000');
        expect(written['--picky-color-info-text']).toBe('#ffffff');
    });
});

describe('the reset for elements the library renders itself', () => {
    // Shipping no global reset means the browser's own margins survive. The rule in
    // index.css names the elements to neutralise, and a component that renders a new
    // <p> or <ul> without being added there inherits `margin: 1em 0` -- which is how
    // a field's error message ended up a line and a half too low.
    //
    // Checked against the source rather than the browser, so a component that is not
    // on the story page yet is still covered.
    it('names every flow element the components render', () => {
        const covered = new Set(
            [...theme.matchAll(/\.(picky-[a-z]+__[a-z-]+)/g)]
                .map((match) => match[1])
                .filter((name): name is string => name !== undefined)
        );

        const rendered = new Set<string>();
        for (const file of readdirSync(join(process.cwd(), 'src/components'))) {
            if (!file.endsWith('.vue')) continue;

            const source = readFileSync(join(process.cwd(), 'src/components', file), 'utf8');
            for (const [, classes] of source.matchAll(/<(?:p|ul|ol|li)\b[^>]*class="([^"]*)"/g)) {
                for (const name of (classes ?? '').split(/\s+/)) {
                    if (name.startsWith('picky-') && name !== 'picky-reset') rendered.add(name);
                }
            }
        }

        expect(rendered.size).toBeGreaterThan(0);
        for (const name of rendered) {
            expect([...covered], `${name} renders a flow element but is not reset`).toContain(name);
        }
    });
});
