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

    // Regressie: eerder rendeerde een disabled link nog steeds <a href> en navigeerde
    // gewoon, terwijl aria-disabled tegen schermlezers "niet beschikbaar" zei.
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

    // Regressie: de oude klassen `!active:ring-0` / `!focus:ring-0` genereerden geen
    // CSS in Tailwind v4, dus disabled onderdrukte de ring nooit.
    it('applies working important utilities when disabled', () => {
        const inner = mount(BaseButton, { props: { label: 'x', disabled: true } }).find('span');
        expect(inner.classes()).toContain('picky:cursor-not-allowed!');
        expect(inner.classes()).toContain('picky:opacity-50');
    });
});

describe('BaseButton focus behaviour', () => {
    // Regressie: de knop riep blur() aan na elke klik, waardoor toetsenbordgebruikers
    // hun plek in de tabvolgorde verloren (WCAG 2.4.3).
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
    // De vorm van de schaduw komt uit CSS (data-picky-shadow); het component levert
    // alleen de kleur. Zo is thematiseren mogelijk zonder een regel JavaScript.
    it('contributes only a shadow colour token', () => {
        const inner = mount(BaseButton, { props: { label: 'x' } }).find('span');
        expect(inner.classes()).toContain('picky-pressable');
        expect(inner.classes().join(' ')).toContain('--picky-shadow-color:var(--picky-color-primary-500)');
    });

    it('mirrors the colour prop in the shadow token', () => {
        const inner = mount(BaseButton, { props: { label: 'x', color: 'danger' } }).find('span');
        expect(inner.classes().join(' ')).toContain('--picky-shadow-color:var(--picky-color-red-500)');
    });

    it('suppresses the shadow entirely for the text variant', () => {
        const inner = mount(BaseButton, { props: { label: 'x', variant: 'text' } }).find('span');
        expect(inner.classes().join(' ')).toContain('--picky-shadow:none');
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
        expect(light.find('span').attributes('style')).toContain('color: #000000');
        expect(dark.find('span').attributes('style')).toContain('color: #ffffff');
    });
});
