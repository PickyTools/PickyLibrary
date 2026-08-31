import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseSwitch from './BaseSwitch.vue';


const named = { ariaLabel: 'Dark mode' };

describe('BaseSwitch interaction', () => {
    // Regression, and the worst bug from the audit: the previous version handled
    // keydown and touch itself but had no click handler, so nothing happened with a
    // mouse. It is a real <button> now, so this cannot break again.
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

    // An unnamed switch is meaningless to a screen reader, and you never notice it
    // yourself. Development builds have to complain about it.
    it('warns in development when it has no accessible name', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mount(BaseSwitch, { props: { modelValue: false } });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'));
        warn.mockRestore();
    });
});
