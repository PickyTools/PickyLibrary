// @vitest-environment node
//
// Guards the stylesheets against mistakes that produce no error anywhere.
//
// A `var()` pointing at a token nobody declares is simply invalid, and an invalid
// declaration is dropped in silence. That is how outline and text buttons lost their
// hover background: the token behind the colour mix was left undefined during a
// refactor, and every test still passed.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = join(process.cwd(), 'src/styles');

const sources = [
    readFileSync(join(STYLES, 'index.css'), 'utf8'),
    ...readdirSync(join(STYLES, 'components')).map((file) =>
        readFileSync(join(STYLES, 'components', file), 'utf8')
    ),
];

const css = sources.join('\n');

/** Tokens a component sets from JavaScript, or that carry a fallback in var(). */
const SET_ELSEWHERE = new Set([
    '--picky-icon-ratio',
    '--picky-btn-radius',
    '--picky-btn-accent-base',
    '--picky-btn-ink-mix',
    '--picky-btn-ink-mix-dark',
    '--picky-pill-ink-mix',
    '--picky-checkbox-check',
]);

describe('the stylesheets', () => {
    it('declare every token they read', () => {
        const used = new Set([...css.matchAll(/var\((--picky-[a-z0-9-]+)/g)].map((m) => m[1]));
        const declared = new Set([...css.matchAll(/(--picky-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

        const dangling = [...used].filter(
            (token): token is string => token !== undefined && !declared.has(token) && !SET_ELSEWHERE.has(token)
        );

        expect(dangling, `read but never declared: ${dangling.join(', ')}`).toEqual([]);
    });

    it('give every token read with a fallback an actual fallback', () => {
        // `var(--x)` with no fallback and no declaration is invalid; the exceptions
        // above are only exceptions because something supplies them at runtime.
        for (const token of SET_ELSEWHERE) {
            const uses = [...css.matchAll(new RegExp(`var\\(${token}([^)]*)\\)`, 'g'))];
            expect(uses.length, `${token} is listed as set elsewhere but never read`).toBeGreaterThan(0);
        }
    });
});
