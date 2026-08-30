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

    it('applies size and colour classes', () => {
        const w = mount(BasePill, { props: { label: 'x', size: 'lg', color: 'danger' } });
        expect(w.classes()).toContain('picky:px-3');
        expect(w.classes()).toContain('picky:bg-red-500/15');
    });

    it('switches palette on a dark background', () => {
        const w = mount(BasePill, { props: { label: 'x', background: 'dark' } });
        expect(w.classes()).toContain('picky:bg-primary-500/30');
    });

    // Fallthrough is easy to break with inheritAttrs; pin it per component.
    it('forwards class and arbitrary attributes to the root', () => {
        const w = mount(BasePill, { props: { label: 'x' }, attrs: { class: 'mine', 'data-x': '1' } });
        expect(w.classes()).toContain('mine');
        expect(w.attributes('data-x')).toBe('1');
    });
});
