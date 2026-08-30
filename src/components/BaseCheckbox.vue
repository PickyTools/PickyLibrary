<template>
    <label
        :class="[
            'picky:group picky:inline-flex picky:w-fit picky:items-start picky:select-none',
            gapMap[size],
            disabled ? 'picky:cursor-not-allowed picky:opacity-50' : 'picky:cursor-pointer',
        ]"
    >
        <input
            type="checkbox"
            class="picky:sr-only"
            :checked="modelValue"
            :disabled="disabled"
            :required="required"
            :name="name"
            @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        />

        <!-- Het echte vakje is sr-only, dus de focusring moet hier komen. Zonder dit
             landde de globale :focus-visible op een weggeklipt element van 1×1px en
             had een toetsenbordgebruiker geen enkele zichtbare indicatie (WCAG 2.4.7). -->
        <span
            :class="[
                'picky-pressable picky:relative picky:flex picky:shrink-0 picky:items-center picky:justify-center picky:border-2',
                'picky:motion-safe:transition-colors picky:motion-safe:duration-150',
                'picky:group-has-[:focus-visible]:outline-2 picky:group-has-[:focus-visible]:outline-offset-2 picky:group-has-[:focus-visible]:outline-[var(--picky-color-focus-ring)]',
                boxMap[size],
                modelValue ? checkedMap[color] : uncheckedClasses,
            ]"
            :style="{ borderRadius: 'var(--picky-radius-small)' }"
            aria-hidden="true"
        >
            <slot v-if="modelValue" name="indicator">
                <svg :class="[iconMap[size], 'picky:text-white']" viewBox="0 0 448 512" fill="currentColor">
                    <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
                </svg>
            </slot>
        </span>

        <span v-if="label || $slots.default" :class="['picky:text-text-body', textMap[size]]">
            <slot>{{ label }}</slot>
        </span>
    </label>
</template>

<script setup lang="ts">
import type { HasDisabled, HasSize, Size } from '../types';

type CheckboxColor = 'primary' | 'secondary' | 'danger';

defineOptions({ name: 'BaseCheckbox' });

withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                modelValue?: boolean;
                label?: string;
                color?: CheckboxColor;
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

const boxMap: Record<Size, string> = {
    xs: 'picky:h-3.5 picky:w-3.5 picky:mt-px',
    sm: 'picky:h-4 picky:w-4 picky:mt-0.5',
    md: 'picky:h-5 picky:w-5 picky:mt-0.5',
    lg: 'picky:h-6 picky:w-6 picky:mt-1',
};

const iconMap: Record<Size, string> = {
    xs: 'picky:h-2.5 picky:w-2.5',
    sm: 'picky:h-3 picky:w-3',
    md: 'picky:h-3.5 picky:w-3.5',
    lg: 'picky:h-4 picky:w-4',
};

const textMap: Record<Size, string> = {
    xs: 'picky:text-xs',
    sm: 'picky:text-sm',
    md: 'picky:text-base',
    lg: 'picky:text-lg',
};

const gapMap: Record<Size, string> = {
    xs: 'picky:gap-x-1.5',
    sm: 'picky:gap-x-2',
    md: 'picky:gap-x-2',
    lg: 'picky:gap-x-2.5',
};

const checkedMap: Record<CheckboxColor, string> = {
    primary:
        'picky:bg-primary-500 picky:group-hover:bg-primary-400 picky:border-transparent picky:[--picky-shadow-color:var(--picky-color-primary-500)]',
    secondary:
        'picky:bg-secondary-500 picky:group-hover:bg-secondary-400 picky:border-transparent picky:[--picky-shadow-color:var(--picky-color-secondary-500)]',
    danger: 'picky:bg-red-500 picky:group-hover:bg-red-400 picky:border-transparent picky:[--picky-shadow-color:var(--picky-color-red-500)]',
};

const uncheckedClasses =
    'picky:border-neutral-400 picky:bg-transparent picky:dark:border-dark-surface-500 picky:group-hover:border-neutral-500 picky:dark:group-hover:border-dark-surface-300 picky:[--picky-shadow-color:var(--picky-color-neutral-500)]';
</script>
