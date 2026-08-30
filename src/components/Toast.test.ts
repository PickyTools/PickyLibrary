import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ToastContainer from './ToastContainer.vue';
import BaseAlert from './BaseAlert.vue';
import { useToast } from '../composables/useToast';
import { IconResolverKey } from '../icons';

const provide = { [IconResolverKey as symbol]: () => '<svg />' };
const { addToast, clearToasts, toasts } = useToast();

afterEach(() => clearToasts());

describe('useToast', () => {
    it('adds and removes toasts', () => {
        const id = addToast({ title: 'Saved' });
        expect(toasts.value).toHaveLength(1);
        useToast().removeToast(id);
        expect(toasts.value).toHaveLength(0);
    });

    it('auto-dismisses after the duration and clears its timer', () => {
        vi.useFakeTimers();
        addToast({ title: 'Saved', duration: 1000 });
        expect(toasts.value).toHaveLength(1);
        vi.advanceTimersByTime(1000);
        expect(toasts.value).toHaveLength(0);
        vi.useRealTimers();
    });

    it('keeps a toast with duration 0 until dismissed', () => {
        vi.useFakeTimers();
        addToast({ title: 'Stay', duration: 0 });
        vi.advanceTimersByTime(60_000);
        expect(toasts.value).toHaveLength(1);
        vi.useRealTimers();
    });

    it('treats danger as urgent by default, other styles as polite', () => {
        addToast({ title: 'Boom', style: 'danger' });
        addToast({ title: 'Fine', style: 'success' });
        expect(toasts.value.find((t) => t.title === 'Boom')?.assertive).toBe(true);
        expect(toasts.value.find((t) => t.title === 'Fine')?.assertive).toBe(false);
    });
});

describe('ToastContainer live regions', () => {
    // Regressie: elke toast droeg zelf role="alert" + aria-live="assertive" binnen een
    // polite container. Geneste live regions geven per schermlezer dubbele of juist
    // weggevallen aankondigingen; urgentie hoort op regioniveau te staan.
    it('routes toasts to a polite or an assertive region', () => {
        addToast({ title: 'Polite', style: 'info' });
        addToast({ title: 'Urgent', style: 'danger' });

        const w = mount(ToastContainer, { props: { disabled: true }, global: { provide } });
        const polite = w.find('[aria-live="polite"]');
        const assertive = w.find('[aria-live="assertive"]');

        expect(polite.text()).toContain('Polite');
        expect(polite.text()).not.toContain('Urgent');
        expect(assertive.text()).toContain('Urgent');
    });

    it('puts no live region on the individual toasts', () => {
        addToast({ title: 'Polite' });
        const w = mount(ToastContainer, { props: { disabled: true }, global: { provide } });
        const inner = w.findAll('[aria-live]');
        expect(inner).toHaveLength(2); // alleen de twee regio's
    });

    it('can render in place instead of teleporting', () => {
        addToast({ title: 'Here' });
        const w = mount(ToastContainer, { props: { disabled: true }, global: { provide } });
        expect(w.text()).toContain('Here');
    });
});

describe('BaseAlert', () => {
    it('renders title and description', () => {
        const w = mount(BaseAlert, { props: { title: 'Heads up', description: 'Details' }, global: { provide } });
        expect(w.text()).toContain('Heads up');
        expect(w.text()).toContain('Details');
    });

    it('is announced as an alert', () => {
        expect(mount(BaseAlert, { props: { title: 'x' }, global: { provide } }).attributes('role')).toBe('alert');
    });

    it('emits dismiss and takes its close label from a prop', async () => {
        const w = mount(BaseAlert, {
            props: { title: 'x', dismissible: true, closeLabel: 'Sluiten' },
            global: { provide },
        });
        expect(w.find('button').attributes('aria-label')).toBe('Sluiten');
        await w.find('button').trigger('click');
        expect(w.emitted('dismiss')).toBeTruthy();
    });

    it('lets the icon be replaced or removed without forking', () => {
        const replaced = mount(BaseAlert, {
            props: { title: 'x' },
            slots: { icon: '<i data-mine />' },
            global: { provide },
        });
        expect(replaced.find('i[data-mine]').exists()).toBe(true);
    });
});
