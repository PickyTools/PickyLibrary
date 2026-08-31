import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import BaseInput from './BaseInput.vue';

// Vitest runs from the project root; import.meta.url is not a file URL under happy-dom.
const inputCss = readFileSync(join(process.cwd(), 'src/styles/components/input.css'), 'utf8');

describe('BaseInput labelling', () => {
    it('links the label to the field', () => {
        const w = mount(BaseInput, { props: { label: 'Email' } });
        const id = w.find('input').attributes('id');
        expect(id).toBeTruthy();
        expect(w.find('label').attributes('for')).toBe(id);
    });

    // Twee velden binnen één app, want useId() telt per app-instance: losse mounts
    // would always produce v-0 and the test would prove nothing.
    it('gives every instance a distinct id within one app', () => {
        const Host = defineComponent({
            components: { BaseInput },
            template: '<div><BaseInput label="A" /><BaseInput label="B" /></div>',
        });
        const ids = mount(Host).findAll('input').map((i) => i.attributes('id'));
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
    });

    it('respects a caller-supplied id', () => {
        expect(mount(BaseInput, { props: { label: 'x', id: 'mine' } }).find('input').attributes('id')).toBe('mine');
    });

    it('falls back to the placeholder for a name when there is no label', () => {
        const w = mount(BaseInput, { props: { placeholder: 'Search' } });
        expect(w.find('input').attributes('aria-label')).toBe('Search');
    });
});

describe('BaseInput messages', () => {
    // Regression: aria-describedby always pointed at the message, even when no
    // message was rendered -- a reference to an id that did not exist.
    it('omits aria-describedby when there is no hint or error', () => {
        expect(mount(BaseInput, { props: { label: 'x' } }).find('input').attributes('aria-describedby')).toBeUndefined();
    });

    it('points aria-describedby at the message that exists', () => {
        const w = mount(BaseInput, { props: { label: 'x', hint: 'Optional' } });
        const target = w.find('input').attributes('aria-describedby');
        expect(target).toBeTruthy();
        expect(w.find(`#${target}`).text()).toBe('Optional');
    });

    // Regression: an error appearing after submit was announced nowhere, so screen
    // reader users heard nothing.
    it('announces an error but not a plain hint', () => {
        expect(mount(BaseInput, { props: { label: 'x', error: 'Invalid' } }).find('p').attributes('role')).toBe('alert');
        expect(mount(BaseInput, { props: { label: 'x', hint: 'Optional' } }).find('p').attributes('role')).toBeUndefined();
    });

    it('marks the field invalid when there is an error', () => {
        expect(mount(BaseInput, { props: { label: 'x', error: 'Invalid' } }).find('input').attributes('aria-invalid')).toBe('true');
    });

    it('prefers the error over the hint', () => {
        const w = mount(BaseInput, { props: { label: 'x', hint: 'Optional', error: 'Invalid' } });
        expect(w.find('p').text()).toBe('Invalid');
    });
});

describe('BaseInput model', () => {
    it('emits string values', async () => {
        const w = mount(BaseInput, { props: { label: 'x' } });
        const input = w.find('input');
        (input.element as HTMLInputElement).value = 'hello';
        await input.trigger('input');
        expect(w.emitted('update:modelValue')?.[0]).toEqual(['hello']);
    });

    it('emits numbers for a number field', async () => {
        const w = mount(BaseInput, { props: { label: 'x', type: 'number' } });
        const input = w.find('input');
        (input.element as HTMLInputElement).value = '42';
        await input.trigger('input');
        expect(w.emitted('update:modelValue')?.[0]).toEqual([42]);
    });

    it('renders a textarea for type=textarea', () => {
        const w = mount(BaseInput, { props: { label: 'x', type: 'textarea' } });
        expect(w.find('textarea').exists()).toBe(true);
        expect(w.find('input').exists()).toBe(false);
    });
});

describe('BaseInput attribute routing', () => {
    it('puts class on the root and other attributes on the field', () => {
        const w = mount(BaseInput, { props: { label: 'x' }, attrs: { class: 'mine', 'data-x': '1' } });
        expect(w.classes()).toContain('mine');
        expect(w.find('input').attributes('data-x')).toBe('1');
    });
});

describe('BaseInput focus indication', () => {
    // Regression: readonly fields got no focus ring even though they are focusable,
    // so the keyboard position disappeared from view (WCAG 2.4.7).
    it('labels each state so the stylesheet can tell them apart', () => {
        const states = [
            [{ label: 'x' }, 'default'],
            [{ label: 'x', error: 'e' }, 'error'],
            [{ label: 'x', readonly: true }, 'readonly'],
        ] as const;

        for (const [props, state] of states) {
            expect(mount(BaseInput, { props }).attributes('data-state')).toBe(state);
        }
    });

    // The ring itself lives in input.css and is checked there: happy-dom applies no
    // stylesheets, so a DOM assertion would prove nothing here.
    it('gives every state a visible focus ring in the stylesheet', () => {
        expect(inputCss).toContain('.picky-input__control:focus-within');

        const rings = inputCss.match(/--picky-input-ring:[^;]+/g) ?? [];
        expect(rings).toHaveLength(3);
        for (const ring of rings) {
            expect(ring).toContain('var(--picky-color-');
        }
    });
});

describe('BaseInput imperative handle', () => {
    it('exposes focus, blur and select', () => {
        const w = mount(BaseInput, { props: { label: 'x' }, attachTo: document.body });
        const vm = w.vm as unknown as { focus: () => void; blur: () => void; select: () => void };
        vm.focus();
        expect(document.activeElement).toBe(w.find('input').element);
        vm.blur();
        expect(document.activeElement).not.toBe(w.find('input').element);
        expect(typeof vm.select).toBe('function');
        w.unmount();
    });
});
