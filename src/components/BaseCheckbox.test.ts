import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import BaseCheckbox from './BaseCheckbox.vue';

// Vitest runs from the project root; import.meta.url is not a file URL under happy-dom.
const checkboxCss = readFileSync(join(process.cwd(), 'src/styles/components/checkbox.css'), 'utf8');

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

    // Regression: the real box is visually hidden, so the global :focus-visible
    // landed on a clipped 1x1px element. A keyboard user saw nothing at all.
    it('renders a visible box alongside the clipped input', () => {
        const w = mount(BaseCheckbox, { props: { label: 'x' } });
        expect(w.find('input.picky-checkbox__input').exists()).toBe(true);
        expect(w.find('.picky-checkbox__box').exists()).toBe(true);
    });

    // The ring has to land on the visible box, not on the clipped input. That rule
    // lives in checkbox.css and is checked there.
    it('aims the focus ring at the visible box in the stylesheet', () => {
        expect(checkboxCss).toContain(
            '.picky-checkbox:has(.picky-checkbox__input:focus-visible) .picky-checkbox__box'
        );
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

describe('BaseCheckbox form participation', () => {
    // The visible box is decorative; the real input is what a form submits, what a
    // screen reader announces, and what carries required/disabled.
    it('forwards name, required and disabled to the real input', () => {
        const input = mount(BaseCheckbox, {
            props: { label: 'Terms', name: 'terms', required: true, disabled: true },
        }).find('input');

        expect(input.attributes('name')).toBe('terms');
        expect(input.attributes('required')).toBeDefined();
        expect(input.attributes('disabled')).toBeDefined();
    });

    it('emits the new value when toggled', async () => {
        const wrapper = mount(BaseCheckbox, { props: { label: 'Terms' } });
        await wrapper.find('input').setValue(true);
        expect(wrapper.emitted('update:modelValue')).toEqual([[true]]);
    });

    it('hides the decorative box from screen readers', () => {
        const box = mount(BaseCheckbox, { props: { label: 'Terms' } }).find('.picky-checkbox__box');
        expect(box.attributes('aria-hidden')).toBe('true');
    });
});

describe('BaseCheckbox rendering', () => {
    it('shows the tick only when checked', () => {
        expect(mount(BaseCheckbox, { props: { label: 'x' } }).find('svg').exists()).toBe(false);
        expect(
            mount(BaseCheckbox, { props: { label: 'x', modelValue: true } }).find('svg').exists()
        ).toBe(true);
    });

    it('omits the label element entirely when there is nothing to show', () => {
        expect(mount(BaseCheckbox).find('.picky-checkbox__label').exists()).toBe(false);
        expect(
            mount(BaseCheckbox, { props: { label: 'x' } }).find('.picky-checkbox__label').exists()
        ).toBe(true);
    });

    it('exposes size and colour as data attributes', () => {
        const wrapper = mount(BaseCheckbox, { props: { label: 'x', size: 'lg', color: 'danger' } });
        expect(wrapper.attributes('data-size')).toBe('lg');
        expect(wrapper.attributes('data-color')).toBe('danger');
    });
});
