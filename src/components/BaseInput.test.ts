import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import BaseInput from './BaseInput.vue';

describe('BaseInput labelling', () => {
    it('links the label to the field', () => {
        const w = mount(BaseInput, { props: { label: 'Email' } });
        const id = w.find('input').attributes('id');
        expect(id).toBeTruthy();
        expect(w.find('label').attributes('for')).toBe(id);
    });

    // Twee velden binnen één app, want useId() telt per app-instance: losse mounts
    // zouden altijd v-0 opleveren en de test zou niets bewijzen.
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
    // Regressie: aria-describedby wees altijd naar de melding, ook wanneer die
    // helemaal niet gerenderd werd — een verwijzing naar een niet-bestaand id.
    it('omits aria-describedby when there is no hint or error', () => {
        expect(mount(BaseInput, { props: { label: 'x' } }).find('input').attributes('aria-describedby')).toBeUndefined();
    });

    it('points aria-describedby at the message that exists', () => {
        const w = mount(BaseInput, { props: { label: 'x', hint: 'Optional' } });
        const target = w.find('input').attributes('aria-describedby');
        expect(target).toBeTruthy();
        expect(w.find(`#${target}`).text()).toBe('Optional');
    });

    // Regressie: een foutmelding die na verzenden verscheen werd nergens
    // aangekondigd, dus schermlezergebruikers hoorden niets.
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
    // Regressie: readonly-velden kregen geen focusring terwijl ze wel focusbaar zijn,
    // dus de toetsenbordpositie verdween uit beeld (WCAG 2.4.7).
    it('keeps a focus ring in every state, readonly included', () => {
        const states: Array<Record<string, unknown>> = [
            { label: 'x' },
            { label: 'x', error: 'e' },
            { label: 'x', readonly: true },
        ];
        for (const props of states) {
            const wrapper = mount(BaseInput, { props }).findAll('label').at(-1)!;
            expect(wrapper.classes().join(' ')).toContain('focus-within:ring-2');
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
