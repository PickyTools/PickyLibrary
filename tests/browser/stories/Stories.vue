<template>
    <main>
        <!-- A select inside a modal, because that pairing has its own hazards: a
             <dialog> paints in the top layer, above every z-index on the page. -->
        <section class="story">
            <span class="story__name">select in modal</span>
            <BaseModal v-model="modalOpen" title="A native dialog" data-testid="modal">
                <BaseSelect
                    v-model="fruit"
                    label="Pick one"
                    :options="fruits"
                    data-testid="modal-select"
                />
            </BaseModal>
        </section>

        <section v-for="story in stories" :key="story.name" class="story">
            <span class="story__name">{{ story.name }}</span>
            <component :is="story.is" v-for="(props, i) in story.cases" :key="i" v-bind="props">
                {{ props.slot ?? undefined }}
            </component>
        </section>
    </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
    BaseAlert, BaseButton, BaseCheckbox, BaseIcon, BaseInput, BaseModal, BasePasswordInput,
    BasePill, BaseSelect, BaseSwitch, applyReadableTextColors, provideIcons,
    type Color,
} from 'pickylibrary';

/*
 * Every component in every variant, on one page.
 *
 * The theme comes from the query string so a test can drive it:
 *   ?theme=light | dark | system      which class goes on <html>, if any
 *   ?accent=%23f97316                 a custom accent, to prove theming still works
 *
 * `system` deliberately sets no class at all. That is the state that used to break:
 * on a machine whose OS is in dark mode it falls through to the media query, and any
 * component that only handled `.dark` rendered dark colours on a light page.
 */

const modalOpen = ref(false);
const fruit = ref('a');
const fruits = [
    { label: 'Apple', value: 'a' },
    { label: 'Banana', value: 'b' },
    { label: 'Cherry', value: 'c', disabled: true },
    { label: 'Damson', value: 'd' },
    { label: 'Elderberry', value: 'e' },
    { label: 'Fig', value: 'f' },
];

provideIcons(() => '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="currentColor"/></svg>');

const COLORS: Color[] = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'gray'];
const SIZES = ['xs', 'sm', 'md', 'lg'] as const;

const story = (name: string, is: unknown, cases: Record<string, unknown>[]) => ({ name, is, cases });

const stories = [
    ...(['full', 'outline', 'text'] as const).map((variant) =>
        story(`button/${variant}`, BaseButton, COLORS.map((color) => ({ variant, color, label: color })))
    ),
    story('button/sizes', BaseButton, SIZES.map((size) => ({ size, label: size }))),
    story('button/disabled', BaseButton, [{ label: 'disabled', disabled: true }]),
    story('button/link', BaseButton, [{ label: 'link', href: '#' }]),

    story('pill/light', BasePill, COLORS.map((color) => ({ color, label: color }))),
    story('pill/dark-surface', BasePill, COLORS.map((color) => ({ color, background: 'dark', label: color }))),

    story('alert', BaseAlert, (['info', 'warning', 'error', 'success'] as const).map((type) => ({
        type, title: `${type} title`, description: 'A sentence of supporting text.', dismissible: true,
    }))),

    story('input', BaseInput, [
        { label: 'Plain', modelValue: 'typed text' },
        { label: 'With hint', modelValue: '', hint: 'We never share this.' },
        { label: 'With error', modelValue: '', error: 'That address looks wrong.' },
        { label: 'Read only', modelValue: 'read only', readonly: true },
        { label: 'Disabled', modelValue: 'disabled', disabled: true },
    ]),
    story('password', BasePasswordInput, [{ modelValue: 'secret' }]),

    story('checkbox', BaseCheckbox, COLORS.map((color) => ({ color, label: color, modelValue: true }))),
    story('checkbox/unchecked', BaseCheckbox, [{ label: 'unchecked' }]),
    story('switch', BaseSwitch, [
        { ariaLabel: 'on', modelValue: true },
        { ariaLabel: 'off', modelValue: false },
    ]),

    story('select', BaseSelect, [{
        label: 'Fruit', modelValue: 'a',
        options: [{ label: 'Apple', value: 'a' }, { label: 'Banana', value: 'b' }],
    }]),

    story('icon', BaseIcon, SIZES.map((size) => ({ size, code: 'check', label: `icon ${size}` }))),
];

onMounted(() => {
    const params = new URLSearchParams(location.search);
    const root = document.documentElement;

    const theme = params.get('theme') ?? 'system';
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');

    const accent = params.get('accent');
    if (accent) {
        root.style.setProperty('--picky-color-primary-500', accent);
        root.style.setProperty('--picky-color-focus-ring', accent);
        applyReadableTextColors(root);
    }

    if (params.get('modal') === 'open') modalOpen.value = true;

    root.dataset.storiesReady = 'true';
});
</script>
