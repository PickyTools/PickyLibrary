// @vitest-environment node
//
// Keeps API.md honest.
//
// Hand-written API tables drift: a prop gets renamed, the table does not, and the
// documentation starts lying without anyone noticing. API.md is generated from the
// components, and this test fails the moment the checked-in file no longer matches
// what the generator produces.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error -- plain JS build script, no types of its own
import { generate } from '../scripts/generate-api-docs.mjs';

describe('API.md', () => {
    it('matches what the generator produces', () => {
        const committed = readFileSync(join(process.cwd(), 'API.md'), 'utf8');
        expect(committed, 'API.md is out of date -- run `npm run docs:api`').toBe(generate());
    });

    it('documents every component the package exports', () => {
        const docs = readFileSync(join(process.cwd(), 'API.md'), 'utf8');
        const entry = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');

        const exported = [...entry.matchAll(/export \{ default as (\w+) \}/g)].map((m) => m[1]);
        expect(exported.length).toBeGreaterThan(0);

        for (const component of exported) {
            expect(docs, `${component} is exported but not documented`).toContain(`## ${component}`);
        }
    });
});
