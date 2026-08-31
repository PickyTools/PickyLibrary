import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseToast from './BaseToast.vue';
import { IconResolverKey } from '../icons';
import type { Toast } from '../core/toast';

const provide = { [IconResolverKey as symbol]: () => '<svg />' };

const toast = (overrides: Partial<Toast> = {}): Toast => ({
    id: 1,
    title: 'Saved',
    description: '',
    style: 'info',
    duration: 4000,
    assertive: false,
    ...overrides,
});

const mountToast = (t: Toast = toast()) =>
    mount(BaseToast, { props: { toast: t }, global: { provide } });

describe('BaseToast rendering', () => {
    it('renders the title, and the description only when there is one', () => {
        expect(mountToast().text()).toContain('Saved');
        expect(mountToast().find('.picky-toast__description').exists()).toBe(false);

        const withDescription = mountToast(toast({ description: 'Your changes are stored.' }));
        expect(withDescription.find('.picky-toast__description').text()).toBe(
            'Your changes are stored.'
        );
    });

    it('exposes the style so the stylesheet can colour the card', () => {
        expect(mountToast(toast({ style: 'danger' })).attributes('data-style')).toBe('danger');
    });

    it('renders an icon only when the toast carries one', () => {
        expect(mountToast().find('.picky-toast__icon').exists()).toBe(false);
        expect(mountToast(toast({ icon: 'check' })).find('.picky-toast__icon').exists()).toBe(true);
    });
});

describe('BaseToast dismissal', () => {
    it('emits close with its own id', async () => {
        const wrapper = mountToast(toast({ id: 42 }));
        await wrapper.find('button').trigger('click');
        expect(wrapper.emitted('close')).toEqual([[42]]);
    });

    it('gives the close button an accessible name', () => {
        expect(mountToast().find('button').attributes('aria-label')).toBe('Close');

        const dutch = mount(BaseToast, {
            props: { toast: toast(), closeLabel: 'Sluiten' },
            global: { provide },
        });
        expect(dutch.find('button').attributes('aria-label')).toBe('Sluiten');
    });
});

describe('BaseToast announcements', () => {
    // Regression: every toast used to carry role="alert" and aria-live itself,
    // inside a container that was already a live region. Nested live regions make
    // screen readers announce twice or not at all, so the container owns them and
    // the card stays silent.
    it('declares no live region of its own', () => {
        const wrapper = mountToast(toast({ assertive: true }));
        const html = wrapper.html();

        expect(html).not.toContain('aria-live');
        expect(wrapper.attributes('role')).toBeUndefined();
    });
});

describe('BaseToast slots', () => {
    it('lets the icon and the close icon be replaced', () => {
        const wrapper = mount(BaseToast, {
            props: { toast: toast({ icon: 'check' }) },
            slots: { icon: '<i data-mine />', 'close-icon': '<i data-close />' },
            global: { provide },
        });

        expect(wrapper.find('[data-mine]').exists()).toBe(true);
        expect(wrapper.find('[data-close]').exists()).toBe(true);
    });
});
