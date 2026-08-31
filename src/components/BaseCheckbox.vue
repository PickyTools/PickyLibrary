<template>
    <label class="picky-checkbox" :data-size="size" :data-color="color">
        <input
            type="checkbox"
            class="picky-checkbox__input"
            :checked="modelValue"
            :disabled="disabled"
            :required="required"
            :name="name"
            @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />

        <span class="picky-checkbox__box picky-pressable" aria-hidden="true">
            <slot v-if="modelValue" name="indicator">
                <svg class="picky-checkbox__check" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
                </svg>
            </slot>
        </span>

        <span v-if="label || $slots.default" class="picky-checkbox__label">
            <slot>{{ label }}</slot>
        </span>
    </label>
</template>

<script setup lang="ts">
import type { Color, HasDisabled, HasSize } from '../types';

/*
 * The real <input type="checkbox"> is visually hidden but still there: it provides
 * click, keyboard, disabled, required and taking part in native form submission.
 *
 * Checked, hover and disabled are read back off that input by checkbox.css using
 * :has(). So there is one source of truth for the state -- the DOM -- rather than
 * an input plus a set of classes that has to keep agreeing with it.
 */
defineOptions({ name: 'BaseCheckbox' });

defineSlots<{
    /** Replaces the label; it stays next to the box. */
    default?(): unknown;
    /** Replaces the tick. Only rendered when checked. */
    indicator?(): unknown;
}>();

withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                modelValue?: boolean;
                label?: string;
                color?: Color;
                required?: boolean;
                name?: string;
            }
    >(),
    {
        modelValue: false,
        label: '',
        size: 'md',
        disabled: false,
        color: 'primary',
        required: false,
        name: undefined,
    }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();
</script>
