import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseSelect from './BaseSelect.vue';
import { IconResolverKey } from '../icons';

const options = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana', disabled: true },
    { label: 'Cherry', value: 'cherry' },
];

const mountSelect = (props: Record<string, unknown> = {}) =>
    mount(BaseSelect, {
        props: { modelValue: 'apple', options, teleportDisabled: true, ...props },
        global: { provide: { [IconResolverKey as symbol]: () => '<svg />' } },
        attachTo: document.body,
    });

const openSelect = async () => {
    const w = mountSelect();
    await w.find('button').trigger('keydown', { key: 'ArrowDown' });
    return w;
};

describe('BaseSelect ARIA structure', () => {
    // Regressie: er waren twee geneste role="listbox" (een div én de ul erin),
    // terwijl een listbox alleen opties mag bevatten.
    it('exposes exactly one listbox', async () => {
        const w = await openSelect();
        expect(w.findAll('[role="listbox"]')).toHaveLength(1);
    });

    // Regressie: de knop verwees nergens naar zijn popup.
    it('points the trigger at its listbox', async () => {
        const w = await openSelect();
        const controls = w.find('button').attributes('aria-controls');
        expect(controls).toBeTruthy();
        expect(w.find(`#${controls}`).attributes('role')).toBe('listbox');
        expect(w.find('button').attributes('aria-haspopup')).toBe('listbox');
        expect(w.find('button').attributes('aria-expanded')).toBe('true');
    });

    it('reports collapsed state when closed', () => {
        const w = mountSelect();
        expect(w.find('button').attributes('aria-expanded')).toBe('false');
        expect(w.find('[role="listbox"]').exists()).toBe(false);
    });

    it('gives every option an id and a selected state', async () => {
        const w = await openSelect();
        const items = w.findAll('[role="option"]');
        expect(items).toHaveLength(3);
        expect(items.every((item) => Boolean(item.attributes('id')))).toBe(true);
        expect(items[0]!.attributes('aria-selected')).toBe('true');
        expect(items[1]!.attributes('aria-disabled')).toBe('true');
    });
});

describe('BaseSelect keyboard navigation', () => {
    // Regressie, en het zwaarste punt: tijdens pijltjesnavigatie bleef de focus op
    // de knop en veranderde alleen een CSS-klasse. Zonder aria-activedescendant
    // hoorde een schermlezergebruiker helemaal niets.
    it('announces the active option through aria-activedescendant', async () => {
        const w = await openSelect();
        const button = w.find('button');
        const first = button.attributes('aria-activedescendant');
        expect(first).toBeTruthy();

        await button.trigger('keydown', { key: 'ArrowDown' });
        const second = button.attributes('aria-activedescendant');
        expect(second).toBeTruthy();
        expect(second).not.toBe(first);
        expect(w.find(`#${second}`).attributes('role')).toBe('option');
    });

    it('skips disabled options while navigating', async () => {
        const w = await openSelect();
        const button = w.find('button');
        await button.trigger('keydown', { key: 'ArrowDown' });
        // Van Apple naar Cherry: Banana is disabled en wordt overgeslagen.
        expect(w.find(`#${button.attributes('aria-activedescendant')}`).text()).toBe('Cherry');
    });

    it('selects with Enter and closes', async () => {
        const w = await openSelect();
        const button = w.find('button');
        await button.trigger('keydown', { key: 'ArrowDown' });
        await button.trigger('keydown', { key: 'Enter' });
        expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['cherry']);
        expect(w.find('[role="listbox"]').exists()).toBe(false);
    });

    it('closes on Escape without selecting', async () => {
        const w = await openSelect();
        await w.find('button').trigger('keydown', { key: 'Escape' });
        expect(w.find('[role="listbox"]').exists()).toBe(false);
        expect(w.emitted('update:modelValue')).toBeUndefined();
    });

    it('jumps to an option by typing', async () => {
        const w = await openSelect();
        const button = w.find('button');
        await button.trigger('keydown', { key: 'c' });
        expect(w.find(`#${button.attributes('aria-activedescendant')}`).text()).toBe('Cherry');
    });

    it('supports Home and End', async () => {
        const w = await openSelect();
        const button = w.find('button');
        await button.trigger('keydown', { key: 'End' });
        expect(w.find(`#${button.attributes('aria-activedescendant')}`).text()).toBe('Cherry');
        await button.trigger('keydown', { key: 'Home' });
        expect(w.find(`#${button.attributes('aria-activedescendant')}`).text()).toBe('Apple');
    });
});

describe('BaseSelect selection', () => {
    it('selects on click and never selects a disabled option', async () => {
        const w = await openSelect();
        await w.findAll('[role="option"]')[2]!.trigger('click');
        expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['cherry']);

        const w2 = await openSelect();
        await w2.findAll('[role="option"]')[1]!.trigger('click');
        expect(w2.emitted('update:modelValue')).toBeUndefined();
    });

    it('shows the placeholder when nothing matches', () => {
        const w = mountSelect({ modelValue: 'none', placeholder: 'Pick one' });
        expect(w.find('button').text()).toContain('Pick one');
    });
});

describe('BaseSelect customisation', () => {
    it('accepts extra classes on the panel', async () => {
        const w = mountSelect({ dropdownClass: 'my-panel' });
        await w.find('button').trigger('keydown', { key: 'ArrowDown' });
        expect(w.find('[role="listbox"]').classes()).toContain('my-panel');
    });

    it('lets the whole dropdown be replaced', async () => {
        const w = mount(BaseSelect, {
            props: { modelValue: 'apple', options, teleportDisabled: true },
            slots: { dropdown: '<div data-mine>custom</div>' },
            global: { provide: { [IconResolverKey as symbol]: () => '<svg />' } },
            attachTo: document.body,
        });
        await w.find('button').trigger('keydown', { key: 'ArrowDown' });
        expect(w.find('[data-mine]').exists()).toBe(true);
    });
});
