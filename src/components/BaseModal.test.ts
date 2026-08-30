import { describe, expect, it, beforeAll } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import BaseModal from './BaseModal.vue';

// happy-dom kent <dialog> maar implementeert showModal/close niet volledig.
beforeAll(() => {
    const proto = window.HTMLDialogElement?.prototype;
    if (proto && typeof proto.showModal !== 'function') {
        proto.showModal = function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        };
        proto.close = function (this: HTMLDialogElement) {
            this.removeAttribute('open');
        };
    }
});

describe('BaseModal identity', () => {
    // Regressie: de id-teller stond in <script setup> en werd dus per instance op 0
    // gezet, waardoor elke modal id="modal-title-1" kreeg. Twee modals in de DOM
    // betekende dubbele ids en een aria-labelledby die naar de verkeerde titel wees.
    it('gives every modal a distinct title id within one app', () => {
        const Host = defineComponent({
            components: { BaseModal },
            template: '<div><BaseModal model-value teleport-disabled title="A" /><BaseModal model-value teleport-disabled title="B" /></div>',
        });
        const w = mount(Host, { attachTo: document.body });
        const ids = w.findAll('dialog').map((d) => d.attributes('aria-labelledby'));

        expect(ids).toHaveLength(2);
        expect(ids[0]).toBeTruthy();
        expect(new Set(ids).size).toBe(2);

        for (const id of ids) {
            expect(w.find(`#${id}`).exists()).toBe(true);
        }
        w.unmount();
    });

    // Regressie: aria-labelledby verwees ook naar titleId wanneer er geen titel werd
    // gerenderd — een verwijzing naar een id dat niet bestaat.
    it('omits aria-labelledby when no title element is rendered', () => {
        const w = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true }, attachTo: document.body });
        expect(w.find('dialog').attributes('aria-labelledby')).toBeUndefined();
        w.unmount();
    });

    it('falls back to aria-label when there is no visible title', () => {
        const w = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true, ariaLabel: 'Settings' }, attachTo: document.body });
        expect(w.find('dialog').attributes('aria-label')).toBe('Settings');
        w.unmount();
    });
});

describe('BaseModal behaviour', () => {
    it('closes on the close button', async () => {
        const w = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true, title: 'x' }, attachTo: document.body });
        await w.find('button').trigger('click');
        expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false]);
        w.unmount();
    });

    it('hides the close button when not dismissible', () => {
        const w = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true, title: 'x', dismissible: false }, attachTo: document.body });
        expect(w.find('button').exists()).toBe(false);
        w.unmount();
    });

    it('takes its close label from a prop so it can be translated', () => {
        const w = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true, title: 'x', closeLabel: 'Sluiten' }, attachTo: document.body });
        expect(w.find('button').attributes('aria-label')).toBe('Sluiten');
        w.unmount();
    });

    it('renders title, body and footer slots', () => {
        const w = mount(BaseModal, {
            props: { modelValue: true, teleportDisabled: true },
            slots: { title: '<h2>Mine</h2>', default: 'Body', footer: '<button>OK</button>' },
            attachTo: document.body,
        });
        expect(w.find('h2').text()).toBe('Mine');
        expect(w.text()).toContain('Body');
        expect(w.text()).toContain('OK');
        w.unmount();
    });

    it('releases the scroll lock only when the last modal closes', async () => {
        const a = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true }, attachTo: document.body });
        const b = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true }, attachTo: document.body });

        expect(document.body.style.overflow).toBe('hidden');

        await a.setProps({ modelValue: false });
        expect(document.body.style.overflow).toBe('hidden');

        await b.setProps({ modelValue: false });
        expect(document.body.style.overflow).toBe('');
        a.unmount();
        b.unmount();
    });
});

describe('BaseModal teleport', () => {
    it('teleports to body by default and can be rendered in place', () => {
        const teleported = mount(BaseModal, { props: { modelValue: true, title: 'Away' }, attachTo: document.body });
        expect(document.body.querySelector('dialog')).not.toBeNull();
        expect(teleported.find('dialog').exists()).toBe(false);
        teleported.unmount();

        const inPlace = mount(BaseModal, { props: { modelValue: true, teleportDisabled: true, title: 'Here' } });
        expect(inPlace.find('dialog').exists()).toBe(true);
        inPlace.unmount();
    });
});
