// @vitest-environment node
//
// Holds the Blade adapter to the Vue one.
//
// The two adapters render the same components in two languages, and the only way
// that stays true is a test that fails when they disagree. Both sides render every
// case in conformance/cases.json, the markup is canonicalised, and the two are
// compared. Vue is the reference: it is the adapter with the component tests, the
// a11y suite and the browser screenshots behind it, so when this fails it is
// normally the Blade view that has fallen behind.
//
// A case is deliberately not a snapshot of either side. A snapshot records what a
// component does; this records that two implementations agree, which is the one
// thing neither suite can see on its own.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { Window } from 'happy-dom';
import BaseButton from './components/BaseButton.vue';
import BaseInput from './components/BaseInput.vue';
import BasePill from './components/BasePill.vue';

type Case = {
    name: string;
    component: keyof typeof components;
    view: string;
    props?: Record<string, unknown>;
    slots?: Record<string, string>;
};

const components = { BaseButton, BaseInput, BasePill } satisfies Record<string, Component>;

const root = process.cwd();

const definition = JSON.parse(readFileSync(join(root, 'conformance/cases.json'), 'utf8')) as {
    aliases: Record<string, string>;
    cases: Case[];
};

const cases = definition.cases;

/**
 * Attributes whose value carries no meaning: present is true, absent is false.
 * Vue writes `disabled=""` and Blade writes `disabled="disabled"`, and both mean
 * the same thing to a browser.
 */
const BOOLEAN_ATTRIBUTES = new Set([
    'disabled', 'readonly', 'required', 'checked', 'selected', 'multiple', 'hidden', 'open',
]);

/** Attributes a renderer adds for its own bookkeeping, which say nothing about the component. */
const IGNORED_ATTRIBUTES = /^data-(v-|server-rendered)/;

/**
 * Attributes whose empty value is the same as not being there at all. An empty
 * style declaration styles nothing and an empty placeholder shows nothing, and
 * Vue's server renderer writes both where its client render writes neither.
 *
 * An allowlist and not every empty attribute, because `aria-label=""` is a
 * difference worth failing over: it takes an element's accessible name away.
 */
const EMPTY_MEANS_ABSENT = new Set(['style', 'class', 'placeholder']);

/*
 * Only what the walker below actually reads. happy-dom's nodes are not the DOM
 * lib's `Node`, and naming either one here would tie this file to a parser or to
 * a global type it has no other use for.
 */
type ParsedAttribute = { name: string; value: string };

type ParsedNode = {
    nodeType: number;
    textContent: string | null;
    tagName: string;
    attributes: Iterable<ParsedAttribute>;
    childNodes: Iterable<ParsedNode>;
};

/*
 * One canonical form, in one language. Normalising on both sides would mean two
 * normalisers to keep in step, which is the problem this test exists to catch,
 * one level down.
 */
function canonicalise(html: string): string {
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = html;

    const writeChildren = (nodes: ParsedNode[], depth: number): string => {
        const indent = '  '.repeat(depth);
        let written = '';
        let text = '';

        const flushText = () => {
            const collapsed = text.replace(/\s+/g, ' ').trim();
            if (collapsed !== '') written += `${indent}${collapsed}\n`;
            text = '';
        };

        for (const node of nodes) {
            // A comment renders nothing, and Vue's slot markers sit between the
            // pieces of what is one run of text on the page. Skipping them rather
            // than letting them break the run is what makes three text nodes and
            // one compare equal.
            if (node.nodeType === 8) continue;

            if (node.nodeType === 3) {
                text += node.textContent ?? '';
                continue;
            }

            if (node.nodeType !== 1) continue;

            flushText();
            written += writeElement(node, depth);
        }

        flushText();

        return written;
    };

    const writeElement = (element: ParsedNode, depth: number): string => {
        const indent = '  '.repeat(depth);
        const tag = element.tagName.toLowerCase();

        const attributes = [...element.attributes]
            .filter((attribute) => !IGNORED_ATTRIBUTES.test(attribute.name))
            .filter(
                (attribute) =>
                    !(EMPTY_MEANS_ABSENT.has(attribute.name) && attribute.value.trim() === '')
            )
            .map((attribute) => {
                if (BOOLEAN_ATTRIBUTES.has(attribute.name)) return attribute.name;

                // Class order is a formatting detail, not a difference.
                const value =
                    attribute.name === 'class'
                        ? attribute.value.split(/\s+/).filter(Boolean).sort().join(' ')
                        : attribute.value.replace(/\s+/g, ' ').trim();

                return `${attribute.name}="${value}"`;
            })
            .sort();

        const open = [tag, ...attributes].join(' ');
        const children = writeChildren([...element.childNodes], depth + 1);

        return children === ''
            ? `${indent}<${open} />\n`
            : `${indent}<${open}>\n${children}${indent}</${tag}>\n`;
    };

    return writeChildren([...document.body.childNodes] as unknown as ParsedNode[], 0);
}

async function renderWithVue(testCase: Case): Promise<string> {
    const component = components[testCase.component];

    if (!component) throw new Error(`Unknown component [${testCase.component}] in ${testCase.name}.`);

    const slots = testCase.slots
        ? Object.fromEntries(
              Object.entries(testCase.slots).map(([slot, content]) => [slot, () => content])
          )
        : undefined;

    const app = createSSRApp({
        render: () => h(component, { ...(testCase.props ?? {}) }, slots),
    });

    return renderToString(app);
}

function renderWithBlade(): Record<string, string> {
    const output = execFileSync('php', [join(root, 'conformance/render-blade.php')], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
    });

    return JSON.parse(output) as Record<string, string>;
}

function phpIsAvailable(): boolean {
    if (!existsSync(join(root, 'vendor/autoload.php'))) return false;

    try {
        execFileSync('php', ['-v'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

const canRunBlade = phpIsAvailable();

describe('the cases', () => {
    it('has one', () => {
        expect(cases.length).toBeGreaterThan(0);
    });

    it('names a component that exists', () => {
        for (const testCase of cases) {
            expect(components[testCase.component], `${testCase.name}`).toBeTruthy();
        }
    });

    it('has no two cases under one name', () => {
        expect(new Set(cases.map((one) => one.name)).size).toBe(cases.length);
    });

    // Vue falls back to useId() and Blade has no equivalent that is stable between
    // a rendered page and a test, so a case that leaves the id out would compare
    // one generated id against another and fail for the wrong reason.
    it('gives every input an id of its own', () => {
        for (const testCase of cases.filter((one) => one.component === 'BaseInput')) {
            expect(testCase.props?.id, `${testCase.name} needs an explicit id`).toBeTruthy();
        }
    });
});

describe.skipIf(!canRunBlade)('the Blade adapter', () => {
    const blade = canRunBlade ? renderWithBlade() : {};

    it('answers for every case', () => {
        expect(Object.keys(blade).sort()).toEqual(cases.map((one) => one.name).sort());
    });

    for (const testCase of cases) {
        it(`renders ${testCase.name} exactly as Vue does`, async () => {
            const fromVue = canonicalise(await renderWithVue(testCase));
            const fromBlade = canonicalise(blade[testCase.name] ?? '');

            expect(fromBlade, `resources/views/components/${testCase.view}.blade.php has drifted from src/components/${testCase.component}.vue`).toBe(fromVue);
        });
    }
});

// A skip is quiet, and the point of this file is that it is not optional. CI
// installs PHP so it always runs there; locally it says why it did not.
describe.runIf(!canRunBlade)('the Blade adapter', () => {
    it('is not being checked, because PHP or vendor/ is missing', () => {
        console.warn(
            '\n  Blade conformance was skipped. Install PHP and run `composer install` to check it.\n'
        );
        expect(canRunBlade).toBe(false);
    });
});
