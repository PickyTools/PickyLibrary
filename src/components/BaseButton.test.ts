import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from './BaseButton.vue';

describe('BaseButton rendering', () => {
    it('renders a button by default and an anchor with href', () => {
        expect(mount(BaseButton, { props: { label: 'Go' } }).element.tagName).toBe('BUTTON');
        expect(mount(BaseButton, { props: { label: 'Go', href: '/x' } }).element.tagName).toBe('A');
    });

    it('shows the temporary label after a click and restores it', async () => {
        vi.useFakeTimers();
        const w = mount(BaseButton, { props: { label: 'Copy', tempLabel: 'Copied!', tempLabelDuration: 1000 } });
        await w.trigger('click');
        expect(w.text()).toBe('Copied!');
        vi.advanceTimersByTime(1000);
        await w.vm.$nextTick();
        expect(w.text()).toBe('Copy');
        vi.useRealTimers();
    });

    it('forwards class and arbitrary attributes to the root', () => {
        const w = mount(BaseButton, { props: { label: 'x' }, attrs: { class: 'mine', 'data-x': '1' } });
        expect(w.classes()).toContain('mine');
        expect(w.attributes('data-x')).toBe('1');
    });
});

describe('BaseButton disabled handling', () => {
    it('does not emit click when disabled', async () => {
        const w = mount(BaseButton, { props: { label: 'x', disabled: true } });
        await w.trigger('click');
        expect(w.emitted('click')).toBeUndefined();
    });

    // Regression: a disabled link used to still render <a href> and navigate as
    // normal, while aria-disabled told screen readers it was unavailable.
    it('strips href from a disabled link so it cannot navigate', () => {
        const w = mount(BaseButton, { props: { label: 'x', href: '/somewhere', disabled: true } });
        expect(w.attributes('href')).toBeUndefined();
        expect(w.attributes('aria-disabled')).toBe('true');
        expect(w.attributes('role')).toBe('link');
        expect(w.attributes('tabindex')).toBe('-1');
    });

    it('keeps href on an enabled link', () => {
        const w = mount(BaseButton, { props: { label: 'x', href: '/somewhere' } });
        expect(w.attributes('href')).toBe('/somewhere');
        expect(w.attributes('tabindex')).toBeUndefined();
    });

    // The disabled styling comes from button.css, which selects on :disabled and on
    // [aria-disabled]. Both have to be present, because an <a> has no :disabled.
    it('marks the disabled state on the root for the stylesheet', () => {
        const w = mount(BaseButton, { props: { label: 'x', disabled: true } });
        expect(w.attributes('disabled')).toBeDefined();
        expect(w.attributes('aria-disabled')).toBe('true');
    });
});

describe('BaseButton focus behaviour', () => {
    // Regression: the button called blur() after every click, so keyboard users lost
    // their place in the tab order (WCAG 2.4.3).
    it('keeps focus after activation', async () => {
        const w = mount(BaseButton, { props: { label: 'x' }, attachTo: document.body });
        const el = w.element as HTMLButtonElement;
        el.focus();
        expect(document.activeElement).toBe(el);
        await w.trigger('click');
        expect(document.activeElement).toBe(el);
        w.unmount();
    });
});

describe('BaseButton accessible name', () => {
    it('leaves aria-label off when the label is visible text', () => {
        expect(mount(BaseButton, { props: { label: 'Save' } }).attributes('aria-label')).toBeUndefined();
    });

    it('falls back to label when the slot holds non-text content', () => {
        const w = mount(BaseButton, { props: { label: 'Save' }, slots: { default: '<svg />' } });
        expect(w.attributes('aria-label')).toBe('Save');
    });

    it('never overrides an explicit aria-label', () => {
        const w = mount(BaseButton, { props: { label: 'Save' }, slots: { default: '<svg />' }, attrs: { 'aria-label': 'Mine' } });
        expect(w.attributes('aria-label')).toBe('Mine');
    });
});

describe('BaseButton shadow styling', () => {
    // The shadow's shape and colour both come from CSS: the shape from
    // data-picky-shadow, the colour from data-color. The component only provides the
    // hook .picky-pressable attaches to, and not a single computed class.
    it('opts the inner element into the shared pressable styling', () => {
        const inner = mount(BaseButton, { props: { label: 'x' } }).find('span');
        expect(inner.classes()).toContain('picky-button__inner');
        expect(inner.classes()).toContain('picky-pressable');
    });

    it('exposes the colour so the stylesheet can pick the shadow colour', () => {
        const w = mount(BaseButton, { props: { label: 'x', color: 'danger' } });
        expect(w.attributes('data-color')).toBe('danger');
    });

    it('exposes the variant so the text variant can drop its shadow', () => {
        const w = mount(BaseButton, { props: { label: 'x', variant: 'text' } });
        expect(w.attributes('data-variant')).toBe('text');
    });

    it('scopes an explicit shadow prop to the element itself', () => {
        const w = mount(BaseButton, { props: { label: 'x', shadow: 'hard' } });
        expect(w.attributes('data-picky-shadow')).toBe('hard');
    });

    it('sets no attribute when the shadow should be inherited', () => {
        const w = mount(BaseButton, { props: { label: 'x' } });
        expect(w.attributes('data-picky-shadow')).toBeUndefined();
    });
});

describe('BaseButton custom colour', () => {
    it('picks black text on a light custom colour and white on a dark one', () => {
        const light = mount(BaseButton, { props: { label: 'x', color: 'custom', customColor: '#ffff00' } });
        const dark = mount(BaseButton, { props: { label: 'x', color: 'custom', customColor: '#101010' } });
        expect(light.attributes('style')).toContain('--picky-btn-on-fill: #000000');
        expect(dark.attributes('style')).toContain('--picky-btn-on-fill: #ffffff');
    });

    // A custom colour sets exactly the tokens button.css sets for the fixed colours,
    // which is why `custom` needs no CSS rules of its own.
    it('fills the same tokens the stylesheet uses for fixed colours', () => {
        const w = mount(BaseButton, { props: { label: 'x', color: 'custom', customColor: '#ff0000' } });
        const style = w.attributes('style') ?? '';
        expect(style).toContain('--picky-btn-fill: #ff0000');
        expect(style).toContain('--picky-shadow-color: #ff0000');
    });

    it('leaves the tokens to the stylesheet for the fixed colours', () => {
        const w = mount(BaseButton, { props: { label: 'x', color: 'primary' } });
        expect(w.attributes('style')).toBeUndefined();
    });
});
