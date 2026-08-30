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

    // Regressie: de knop had tabindex="-1" en was dus onbereikbaar per toetsenbord,
    // terwijl tonen/verbergen juist voor toetsenbordgebruikers waardevol is.
    it('keeps the toggle reachable by keyboard', () => {
        expect(mountPw().find('button').attributes('tabindex')).toBeUndefined();
    });

    it('takes its labels from props so they can be translated', async () => {
        const w = mountPw({ showLabel: 'Toon wachtwoord', hideLabel: 'Verberg wachtwoord' });
        expect(w.find('button').attributes('aria-label')).toBe('Toon wachtwoord');
        await w.find('button').trigger('click');
        expect(w.find('button').attributes('aria-label')).toBe('Verberg wachtwoord');
    });

    // Regressie: `size` was een gedeclareerde prop en viel daarmee buiten $attrs,
    // maar werd niet doorgegeven — <BasePasswordInput size="lg"> rendeerde md.
    it('forwards size to the underlying input', () => {
        const lg = mountPw({ size: 'lg' }).findAll('label').at(-1)!;
        const md = mountPw({ size: 'md' }).findAll('label').at(-1)!;
        expect(lg.classes()).toContain('picky:h-14');
        expect(md.classes()).toContain('picky:h-10');
    });
});
