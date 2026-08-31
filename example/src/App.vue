<template>
    <div class="page">
        <h1>PickyLibrary</h1>
        <p class="lede">
            Every control below is themed by the CSS variables in the toolbar — no JavaScript
            configuration, no Tailwind in this project. Icons come from Lucide and Simple Icons
            through a single resolver.
        </p>

        <div class="controls">
            <BaseSelect v-model="shadow" :options="shadowOptions" label="Shadow" size="sm" />
            <BaseSelect v-model="radius" :options="radiusOptions" label="Radius" size="sm" />
            <label class="label" for="accent">Accent</label>
            <input id="accent" v-model="accent" type="color" />
            <BaseSwitch v-model="dark" aria-label="Dark mode" icon="moon" icon-off="sun" />
        </div>

        <h2>Button</h2>
        <div v-for="variant in variants" :key="variant" class="row">
            <span class="label">{{ variant }}</span>
            <BaseButton
                v-for="color in colors"
                :key="color"
                :variant="variant"
                :color="color"
                :label="color"
            />
        </div>
        <div class="row">
            <span class="label">sizes</span>
            <BaseButton v-for="s in sizes" :key="s" :size="s" :label="s" />
        </div>
        <div class="row">
            <span class="label">states</span>
            <BaseButton label="Disabled" disabled />
            <BaseButton label="Link" href="https://example.com" target="_blank" variant="outline" />
            <BaseButton label="Copy" temp-label="Copied!" variant="outline" color="gray">
                <template #prefix><BaseIcon code="copy" /></template>
                Copy
            </BaseButton>
        </div>

        <h2>Input</h2>
        <div class="row">
            <span class="label">states</span>
            <BaseInput v-model="text" label="Email" placeholder="you@example.com" />
            <BaseInput v-model="text" label="With hint" hint="We never share this." />
            <BaseInput v-model="text" label="With error" error="That address looks wrong." />
            <BaseInput model-value="Read only" label="Read only" readonly />
        </div>
        <div class="row">
            <span class="label">affixes</span>
            <BaseInput v-model="text" label="Search" placeholder="Search…">
                <template #prefix><BaseIcon code="magnifying-glass" /></template>
            </BaseInput>
            <BasePasswordInput v-model="password" />
        </div>

        <h2>Selection</h2>
        <div class="row">
            <span class="label">controls</span>
            <BaseCheckbox v-model="checked" label="Remember me" />
            <BaseCheckbox :model-value="true" label="Disabled" disabled />
            <BaseSwitch v-model="checked" aria-label="Notifications" />
            <BaseSelect v-model="fruit" :options="fruitOptions" label="Fruit" />
        </div>

        <h2>Feedback</h2>
        <div class="row">
            <span class="label">pills</span>
            <BasePill v-for="c in pillColors" :key="c" :color="c" :label="c" />
        </div>
        <div class="row">
            <span class="label">alerts</span>
            <div style="display: grid; gap: 0.5rem; flex: 1">
                <BaseAlert
                    v-for="type in alertTypes"
                    :key="type"
                    :type="type"
                    :title="`This is a ${type} alert`"
                    description="With a short description underneath."
                    dismissible
                />
            </div>
        </div>
        <div class="row">
            <span class="label">toasts</span>
            <BaseButton label="Polite" variant="outline" @click="notify('success')" />
            <BaseButton label="Urgent" variant="outline" color="danger" @click="notify('danger')" />
        </div>

        <h2>Modal</h2>
        <div class="row">
            <span class="label">dialog</span>
            <BaseButton label="Open modal" @click="modalOpen = true" />
        </div>

        <h2>Icons</h2>
        <div class="row">
            <span class="label">two sources</span>
            <!-- Lucide is stroke-based, Simple Icons fill-based. Both are
                 rendered correctly because BaseIcon respects the icon's own paint
                 instead of forcing fill="currentColor" onto it. -->
            <BaseIcon code="check" size="lg" />
            <BaseIcon code="moon" size="lg" />
            <BaseIcon code="circle-check" size="lg" />
            <BaseIcon code="github" variant="brands" size="lg" label="GitHub" />
        </div>

        <BaseModal v-model="modalOpen" title="A native dialog">
            <p>
                Focus is trapped by the browser, Escape closes it, and the page behind cannot
                scroll. Nested selects still paint above it.
            </p>
            <BaseSelect v-model="fruit" :options="fruitOptions" label="Pick one" />
            <template #footer>
                <BaseButton label="Cancel" variant="text" color="gray" @click="modalOpen = false" />
                <BaseButton label="Confirm" @click="modalOpen = false" />
            </template>
        </BaseModal>

        <ToastContainer />
    </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import {
    BaseAlert, BaseButton, BaseCheckbox, BaseIcon, BaseInput, BaseModal, BasePasswordInput,
    BasePill, BaseSelect, BaseSwitch, ToastContainer, applyReadableTextColors, provideIcons, useToast,
} from 'pickylibrary';
import type { AlertType, Color } from 'pickylibrary';
import { resolveIcon } from './icons';

// The only line of configuration PickyLibrary asks for.
provideIcons(resolveIcon);

const variants = ['full', 'outline', 'text'] as const;
const colors = ['primary', 'secondary', 'success', 'danger', 'gray'] as const;
const sizes = ['xs', 'sm', 'md', 'lg'] as const;
const pillColors = [...colors] as const;
const alertTypes = ['info', 'success', 'warning', 'error'] as AlertType[];

const text = ref('');
const password = ref('');
const checked = ref(true);
const fruit = ref('apple');
const modalOpen = ref(false);

const fruitOptions = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry (sold out)', value: 'cherry', disabled: true },
    { label: 'Damson', value: 'damson' },
];

const shadow = ref<'soft' | 'hard' | 'none'>('soft');
const shadowOptions = [
    { label: 'Soft', value: 'soft' as const },
    { label: 'Hard', value: 'hard' as const },
    { label: 'None', value: 'none' as const },
];

const radius = ref('rounded');
const radiusOptions = [
    { label: 'Rounded', value: 'rounded' },
    { label: 'Square', value: 'square' },
    { label: 'Pill', value: 'pill' },
];

const radiusValues: Record<string, [string, string, string]> = {
    rounded: ['0.5rem', '1rem', '0.375rem'],
    square: ['0px', '0px', '0px'],
    pill: ['9999px', '1.5rem', '9999px'],
};

const accent = ref('#3b82f6');
const dark = ref(false);

// Theming is pure CSS: set some variables, plus one attribute for the shadow.
watchEffect(() => {
    const root = document.documentElement;
    root.dataset.pickyShadow = shadow.value;

    // Both classes, always. `.dark` alone is not enough: without `.light`, a
    // machine whose OS is in dark mode still matches
    // `@media (prefers-color-scheme: dark)` and renders dark colours on a light
    // page. Toggling only `.dark` is the obvious thing to write and it is wrong.
    root.classList.toggle('dark', dark.value);
    root.classList.toggle('light', !dark.value);

    const [button, container, small] = radiusValues[radius.value]!;
    root.style.setProperty('--picky-radius-button', button);
    root.style.setProperty('--picky-radius-container', container);
    root.style.setProperty('--picky-radius-small', small);

    // One accent drives fill, hover, border and the text variant, because the
    // stylesheet mixes those from it rather than reaching for a fixed shade.
    root.style.setProperty('--picky-color-primary-500', accent.value);
    root.style.setProperty('--picky-color-focus-ring', accent.value);

    // The one thing CSS cannot decide: black or white text on that accent.
    applyReadableTextColors(root);
});

const { addToast } = useToast();

function notify(style: Color) {
    addToast({
        title: style === 'danger' ? 'Something went wrong' : 'Saved',
        description:
            style === 'danger'
                ? 'Urgent toasts land in the assertive region.'
                : 'Routine toasts land in the polite region.',
        style,
        icon: style === 'danger' ? 'triangle-exclamation' : 'circle-check',
    });
}
</script>
