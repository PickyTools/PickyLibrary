import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BasePasswordInput from './BasePasswordInput.vue';
import { IconResolverKey } from '../icons';

const mountPw = (props: Record<string, unknown> = {}) =>
    mount(BasePasswordInput, {
        props,
        global: { provide: { [IconResolverKey as symbol]: () => '<svg />' } },
    });

describe('BasePasswordInput', () => {
    it('starts masked and toggles to text', async () => {
        const w = mountPw();
        expect(w.find('input').attributes('type')).toBe('password');
        await w.find('button').trigger('click');
        expect(w.find('input').attributes('type')).toBe('text');
    });

    it('reports its state through aria-pressed', async () => {
        const w = mountPw();
        expect(w.find('button').attributes('aria-pressed')).toBe('false');
        await w.find('button').trigger('click');
        expect(w.find('button').attributes('aria-pressed')).toBe('true');
    });

    // Regression: the button had tabindex="-1" and so was unreachable by keyboard,
    // even though show/hide is most valuable to keyboard users.
    it('keeps the toggle reachable by keyboard', () => {
        expect(mountPw().find('button').attributes('tabindex')).toBeUndefined();
    });

    it('takes its labels from props so they can be translated', async () => {
        const w = mountPw({ showLabel: 'Toon wachtwoord', hideLabel: 'Verberg wachtwoord' });
        expect(w.find('button').attributes('aria-label')).toBe('Toon wachtwoord');
        await w.find('button').trigger('click');
        expect(w.find('button').attributes('aria-label')).toBe('Verberg wachtwoord');
    });

    // Regression: `size` was a declared prop and so fell outside $attrs, but was
    // never passed on -- <BasePasswordInput size="lg"> rendered md.
    it('forwards size to the underlying input', () => {
        expect(mountPw({ size: 'lg' }).attributes('data-size')).toBe('lg');
        expect(mountPw({ size: 'md' }).attributes('data-size')).toBe('md');
    });
});
