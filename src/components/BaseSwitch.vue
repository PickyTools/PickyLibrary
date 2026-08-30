<template>
    <button
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="ariaLabel || undefined"
        :aria-labelledby="labelledBy || undefined"
        :disabled="disabled"
        :class="[
            'picky-reset picky-pressable picky:group picky:relative picky:flex picky:h-fit picky:w-fit picky:items-center',
            'picky:focus-visible:outline-2 picky:focus-visible:outline-offset-2 picky:focus-visible:outline-[var(--picky-color-focus-ring)]',
            disabled ? 'picky:cursor-not-allowed picky:opacity-50' : 'picky:cursor-pointer',
            modelValue
                ? 'picky:[--picky-shadow-color:var(--picky-color-primary-500)]'
                : 'picky:[--picky-shadow-color:var(--picky-color-neutral-500)]',
        ]"
        :style="{ borderRadius: 'var(--picky-radius-switch-track)' }"
        @click="emit('update:modelValue', !modelValue)"
    >
        <span
            :class="[
                'picky:relative picky:flex picky:shrink-0 picky:items-center picky:motion-safe:transition-colors picky:motion-safe:duration-150',
                trackMap[size],
                modelValue
                    ? 'picky:bg-primary-500 picky:group-hover:bg-primary-400'
                    : 'picky:bg-neutral-500 picky:group-hover:bg-neutral-600',
            ]"
            :style="{ borderRadius: 'var(--picky-radius-switch-track)' }"
        >
            <span
                :class="[
                    'picky:absolute picky:flex picky:items-center picky:justify-center picky:motion-safe:transition-transform picky:motion-safe:duration-150',
                    knobMap[size],
                    modelValue
                        ? `${translateMap[size]} picky:bg-white`
                        : 'picky:translate-x-0 picky:bg-white',
                ]"
                :style="{ borderRadius: 'var(--picky-radius-switch-knob)' }"
            >
                <slot name="knob" :checked="modelValue">
                    <BaseIcon
                        v-if="icon"
                        :code="modelValue ? icon : iconOff || icon"
                        :size="size"
                        class="picky:text-neutral-700"
                    />
                </slot>
            </span>
        </span>
    </button>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import BaseIcon from './BaseIcon.vue';
import type { HasDisabled, HasSize, Size } from '../types';

defineOptions({ name: 'BaseSwitch' });

defineSlots<{
    /** Inhoud van de knop, bijvoorbeeld een icoon per stand. */
    knob(props: { checked: boolean }): unknown;
}>();

/*
 * De schakelaar is een echte <button role="switch">, geen div met handmatige
 * toetsafhandeling. Daarmee komen klik, Enter, Space, focus en disabled van het
 * platform. De vorige versie regelde toetsenbord en touch zelf maar had geen
 * click-handler, waardoor de schakelaar met een muis niet werkte.
 *
 * Dit commentaar staat hier en niet in de template: een leidende comment maakt de
 * component multi-root, en dan is de wortel niet meer de knop zelf.
 */

const props = withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                modelValue?: boolean;
                /** Icooncode voor de knop. `iconOff` valt terug op `icon`. */
                icon?: string;
                iconOff?: string;
                /** Geef een naam mee via ariaLabel óf labelledBy — zonder blijft de schakelaar naamloos. */
                ariaLabel?: string;
                labelledBy?: string;
            }
    >(),
    {
        modelValue: false,
        size: 'md',
        disabled: false,
        icon: '',
        iconOff: '',
        ariaLabel: '',
        labelledBy: '',
    }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

// Een naamloze schakelaar is voor een schermlezer betekenisloos, en het is precies
// het soort fout dat je zelf nooit opmerkt. Daarom een expliciete melding in dev.
onMounted(() => {
    if (import.meta.env.DEV && !props.ariaLabel && !props.labelledBy) {
        console.warn(
            '[PickyLibrary] BaseSwitch has no accessible name. Pass ariaLabel or labelledBy, ' +
                'otherwise screen readers announce it as an unlabelled switch.'
        );
    }
});

const trackMap: Record<Size, string> = {
    xs: 'picky:h-6 picky:w-10 picky:p-1',
    sm: 'picky:h-6 picky:w-10 picky:p-1',
    md: 'picky:h-8 picky:w-14 picky:p-1.5',
    lg: 'picky:h-10 picky:w-18 picky:p-1.5',
};

const knobMap: Record<Size, string> = {
    xs: 'picky:left-1 picky:inset-y-1 picky:aspect-square',
    sm: 'picky:left-1 picky:inset-y-1 picky:aspect-square',
    md: 'picky:left-1.5 picky:inset-y-1.5 picky:aspect-square',
    lg: 'picky:left-1.5 picky:inset-y-1.5 picky:aspect-square',
};

const translateMap: Record<Size, string> = {
    xs: 'picky:translate-x-4',
    sm: 'picky:translate-x-4',
    md: 'picky:translate-x-6',
    lg: 'picky:translate-x-8',
};
</script>
