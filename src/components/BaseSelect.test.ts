import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import BaseSelect from './BaseSelect.vue';
import BaseButton from './BaseButton.vue';
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
    // Regression: there were two nested role="listbox" elements (a div and the ul
    // inside it), while a listbox may only contain options.
    it('exposes exactly one listbox', async () => {
        const w = await openSelect();
        expect(w.findAll('[role="listbox"]')).toHaveLength(1);
    });

    // Regression: the button pointed at its popup nowhere.
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
    // Regression, and the worst of them: during arrow-key navigation focus stayed on
    // the button and only a CSS class changed. Without aria-activedescendant, a
    // screen reader user heard nothing at all.
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
        // Apple to Cherry: Banana is disabled and gets skipped.
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

/*
 * A trigger whose `$el` is not its button: it renders a fragment, so the renderer
 * points the component vnode at the fragment's empty text anchor. That is the exact
 * shape a desynced hydration leaves behind, and the shape BaseSelect used to choke
 * on. `el` -- the template ref BaseButton now exposes -- still points at the button.
 */
const FragmentRootButton = defineComponent({
    name: 'BaseButton',
    inheritAttrs: false,
    setup(_props, { slots, attrs, expose }) {
        const el = ref<HTMLElement | null>(null);
        expose({ el });
        return () => [h('span'), h('button', { ...attrs, ref: el }, slots.default?.())];
    },
});

describe('BaseSelect trigger element', () => {
    // Regression: the trigger element used to be read off BaseButton's `$el`. A
    // component's `$el` is its vnode's `el`, which is the root element only while the
    // vnode tree and the DOM agree. Hydrating markup that no real SSR render produced
    // -- a snapshot of an already-rendered page, say -- desyncs that walk and leaves
    // `$el` on whatever node it landed on, in practice an empty text node. Opening
    // then died on `$el.closest is not a function`, taking the whole select with it.
    it('opens when the trigger vnode does not point at an element', async () => {
        const w = mount(BaseSelect, {
            props: { modelValue: 'apple', options, teleportDisabled: true },
            global: {
                provide: { [IconResolverKey as symbol]: () => '<svg />' },
                stubs: { BaseButton: FragmentRootButton },
            },
            attachTo: document.body,
        });
        expect(w.findComponent(FragmentRootButton).vm.$el.nodeType).not.toBe(Node.ELEMENT_NODE);

        await w.find('button').trigger('keydown', { key: 'ArrowDown' });

        expect(w.find('[role="listbox"]').exists()).toBe(true);
    });

    it('anchors to the trigger button itself', () => {
        const w = mountSelect();
        expect(w.findComponent(BaseButton).vm.el).toBe(w.find('button').element);
    });
});
