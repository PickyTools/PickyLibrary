<template>
    <button
        type="button"
        role="switch"
        class="picky-reset picky-pressable picky-switch"
        :data-size="size"
        :aria-checked="modelValue"
        :aria-label="ariaLabel || undefined"
        :aria-labelledby="labelledBy || undefined"
        :disabled="disabled"
        @click="emit('update:modelValue', !modelValue)"
    >
        <span class="picky-switch__track">
            <span class="picky-switch__knob">
                <slot name="knob" :checked="modelValue">
                    <BaseIcon
                        v-if="icon"
                        :code="modelValue ? icon : iconOff || icon"
                        :size="size"
                        class="picky-switch__icon"
                    />
                </slot>
            </span>
        </span>
    </button>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import BaseIcon from './BaseIcon.vue';
import type { HasDisabled, HasSize } from '../types';

defineOptions({ name: 'BaseSwitch' });

defineSlots<{
    /** Contents of the knob, for example an icon per state. */
    knob?(props: { checked: boolean }): unknown;
}>();

/*
 * The switch is a real <button role="switch">, not a div with hand-rolled key
 * handling. That brings click, Enter, Space, focus and disabled from the platform.
 * An earlier version handled keyboard and touch itself but had no click handler, so
 * the switch did not work with a mouse at all.
 *
 * The state lives only in aria-checked, and switch.css reads it there. There is no
 * second source of truth for whether the switch is on.
 *
 * This comment sits here rather than in the template: a leading comment makes the
 * component multi-root, and then the root is no longer the button itself.
 */
const props = withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                modelValue?: boolean;
                /** Icon code for the knob. `iconOff` falls back to `icon`. */
                icon?: string;
                iconOff?: string;
                /** Name it through ariaLabel or labelledBy -- without one the switch stays unnamed. */
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

// An unnamed switch is meaningless to a screen reader, and it is exactly the kind
// of mistake you never notice yourself. Hence an explicit warning in development.
onMounted(() => {
    if (import.meta.env.DEV && !props.ariaLabel && !props.labelledBy) {
        console.warn(
            '[PickyLibrary] BaseSwitch has no accessible name. Pass ariaLabel or labelledBy, ' +
                'otherwise screen readers announce it as an unlabelled switch.'
        );
    }
});
</script>
