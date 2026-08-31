import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BasePill from './BasePill.vue';

describe('BasePill', () => {
    it('renders the label', () => {
        expect(mount(BasePill, { props: { label: 'Beta' } }).text()).toBe('Beta');
    });

    it('lets the default slot override the label', () => {
        const w = mount(BasePill, { props: { label: 'Beta' }, slots: { default: 'Alpha' } });
        expect(w.text()).toBe('Alpha');
    });

    // Size and colour are data attributes, not class names. That is the public
    // contract pill.css selects on -- and a React version would too.
    it('exposes size and colour as data attributes', () => {
        const w = mount(BasePill, { props: { label: 'x', size: 'lg', color: 'danger' } });
        expect(w.classes()).toContain('picky-pill');
        expect(w.attributes('data-size')).toBe('lg');
        expect(w.attributes('data-color')).toBe('danger');
    });

    it('switches palette on a dark background', () => {
        const w = mount(BasePill, { props: { label: 'x', background: 'dark' } });
        expect(w.attributes('data-background')).toBe('dark');
    });

    // Fallthrough is easy to break with inheritAttrs; pin it per component.
    it('forwards class and arbitrary attributes to the root', () => {
        const w = mount(BasePill, { props: { label: 'x' }, attrs: { class: 'mine', 'data-x': '1' } });
        expect(w.classes()).toContain('mine');
        expect(w.attributes('data-x')).toBe('1');
    });
});
