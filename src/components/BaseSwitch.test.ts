import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseSwitch from './BaseSwitch.vue';
import BaseCheckbox from './BaseCheckbox.vue';

const named = { ariaLabel: 'Dark mode' };

describe('BaseSwitch interaction', () => {
    // Regressie, en de ernstigste bug uit de audit: de vorige versie handelde
    // keydown en touch zelf af maar had geen click-handler, dus met een muis
    // gebeurde er niets. Nu is het een echte <button>, dus dit kán niet meer stuk.
    it('toggles on a mouse click', async () => {
        const w = mount(BaseSwitch, { props: { ...named, modelValue: false } });
        await w.trigger('click');
        expect(w.emitted('update:modelValue')?.[0]).toEqual([true]);
    });

    it('toggles on Enter and Space through native button behaviour', () => {
        const w = mount(BaseSwitch, { props: { ...named, modelValue: false } });
        expect(w.element.tagName).toBe('BUTTON');
        expect(w.attributes('type')).toBe('button');
    });

    it('does not toggle when disabled', async () => {
        const w = mount(BaseSwitch, { props: { ...named, modelValue: false, disabled: true } });
        await w.trigger('click');
        expect(w.emitted('update:modelValue')).toBeUndefined();
    });

    it('reports its state to assistive technology', async () => {
        const w = mount(BaseSwitch, { props: { ...named, modelValue: false } });
        expect(w.attributes('role')).toBe('switch');
        expect(w.attributes('aria-checked')).toBe('false');
        await w.setProps({ modelValue: true });
        expect(w.attributes('aria-checked')).toBe('true');
    });
});

describe('BaseSwitch naming', () => {
    it('accepts a name through ariaLabel or labelledBy', () => {
        expect(mount(BaseSwitch, { props: named }).attributes('aria-label')).toBe('Dark mode');
        expect(
            mount(BaseSwitch, { props: { labelledBy: 'heading-1' } }).attributes('aria-labelledby')
        ).toBe('heading-1');
    });

    // Een naamloze schakelaar is voor een schermlezer betekenisloos, en dat merk je
    // zelf nooit. Dev moet er dus over klagen.
    it('warns in development when it has no accessible name', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mount(BaseSwitch, { props: { modelValue: false } });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'));
        warn.mockRestore();
    });
});

describe('BaseCheckbox', () => {
    it('emits the new checked state', async () => {
        const w = mount(BaseCheckbox, { props: { label: 'Accept', modelValue: false } });
        await w.find('input').setValue(true);
        expect(w.emitted('update:modelValue')?.[0]).toEqual([true]);
    });

    it('associates the label with the native control', () => {
        const w = mount(BaseCheckbox, { props: { label: 'Accept' } });
        expect(w.element.tagName).toBe('LABEL');
        expect(w.find('input[type="checkbox"]').exists()).toBe(true);
    });

    // Regressie: het echte vakje is sr-only, dus de globale :focus-visible landde op
    // een weggeklipt element van 1×1px. Een toetsenbordgebruiker zag helemaal niets.
    it('shows a focus ring on the visible box', () => {
        const box = mount(BaseCheckbox, { props: { label: 'x' } }).findAll('span')[0]!;
        expect(box.classes().join(' ')).toContain('group-has-[:focus-visible]:outline-2');
    });

    it('lets the indicator be replaced without forking', () => {
        const w = mount(BaseCheckbox, {
            props: { label: 'x', modelValue: true },
            slots: { indicator: '<i data-mine />' },
        });
        expect(w.find('i[data-mine]').exists()).toBe(true);
    });

    it('does not toggle when disabled', () => {
        const w = mount(BaseCheckbox, { props: { label: 'x', disabled: true } });
        expect(w.find('input').attributes('disabled')).toBeDefined();
    });
});
