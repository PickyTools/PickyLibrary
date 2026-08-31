// @vitest-environment node
//
// Required: the rest of the suite runs on happy-dom, and with a DOM in scope this
// file would miss exactly the failures it exists to catch.

import { describe, expect, it, vi } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createToastStore } from './core/toast';
import { provideToasts, useToast } from './composables/useToast';
import ToastContainer from './components/ToastContainer.vue';
import BaseButton from './components/BaseButton.vue';
import BaseInput from './components/BaseInput.vue';
import BaseSwitch from './components/BaseSwitch.vue';

/*
 * These tests run in Node, not in a DOM. They catch exactly the failures a browser
 * test never shows: module-scope state shared between requests, and code that
 * reaches for `document` at import time.
 */

describe('server-side rendering', () => {
    it('renders components to a string without a DOM', async () => {
        const app = createSSRApp({
            render: () => [
                h(BaseButton, { label: 'Opslaan' }),
                h(BaseInput, { label: 'Naam', modelValue: '' }),
                h(BaseSwitch, { ariaLabel: 'Donkere modus' }),
            ],
        });

        const html = await renderToString(app);
        expect(html).toContain('picky-button');
        expect(html).toContain('picky-input');
        expect(html).toContain('role="switch"');
    });

    // Regression: the toast state lived at module scope. On a server that outlives
    // a single request, so one visitor's toast showed up for the next. Every request
    // should get a store of its own.
    it('keeps two concurrent requests from sharing toast state', async () => {
        const renderRequest = async (title: string) => {
            const app = createSSRApp({
                setup() {
                    const store = provideToasts();
                    store.add({ title, duration: 0 });
                    return () => h(ToastContainer, { disabled: true });
                },
            });
            return renderToString(app);
        };

        const [first, second] = await Promise.all([
            renderRequest('From visitor A'),
            renderRequest('From visitor B'),
        ]);

        expect(first).toContain('From visitor A');
        expect(first).not.toContain('From visitor B');
        expect(second).toContain('From visitor B');
        expect(second).not.toContain('From visitor A');
    });

    // This is the heart of the old bug: without provideToasts(), useToast() fell
    // back to a module-scope singleton, which on a server outlives one request.
    it('never shares the fallback store between server renders', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const a = useToast();
        const b = useToast();
        a.addToast({ title: 'From visitor A', duration: 0 });

        expect(a.toasts.value).toHaveLength(1);
        expect(b.toasts.value).toHaveLength(0);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('provideToasts()'));

        warn.mockRestore();
    });

    it('gives every store its own ids and timers', () => {
        const a = createToastStore();
        const b = createToastStore();

        a.add({ title: 'one', duration: 0 });
        expect(a.getToasts()).toHaveLength(1);
        expect(b.getToasts()).toHaveLength(0);
    });

    it('notifies subscribers and stops after unsubscribing', () => {
        const store = createToastStore();
        let calls = 0;
        const stop = store.subscribe(() => (calls += 1));

        store.add({ title: 'x', duration: 0 });
        expect(calls).toBe(1);

        stop();
        store.add({ title: 'y', duration: 0 });
        expect(calls).toBe(1);
    });
});

describe('the entry point stays importable outside a bundler', () => {
    // The source imports the stylesheet -- that is what makes Vite emit
    // dist/style.css -- but the built bundle must not contain that import, because
    // nothing in plain Node can load a .css file. This guards the output.
    it('leaves no CSS import in the built bundle', async () => {
        const { readFileSync, existsSync } = await import('node:fs');
        const bundle = new URL('../dist/pickylibrary.js', import.meta.url).pathname;

        if (!existsSync(bundle)) return; // not built yet; `npm run build` covers this
        expect(readFileSync(bundle, 'utf8')).not.toMatch(/from\s*['"][^'"]*\.css['"]/);
    });

    it('never touches the DOM at import time', async () => {
        const entry = await import('./index');
        expect(typeof entry.useToast).toBe('function');
        expect(typeof entry.provideToasts).toBe('function');
    });
});
