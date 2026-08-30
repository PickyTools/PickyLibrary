<template>
    <span :class="[baseClasses, sizeClasses, colorClasses]">
        <slot>{{ label }}</slot>
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BaseComponentProps, Color, Size } from '../types';

type Background = 'light' | 'dark';

const props = withDefaults(
    defineProps<
        BaseComponentProps & {
            /** Tekst in de pill. Negeerbaar wanneer je de default slot vult. */
            label?: string;
            color?: Color;
            /** Stemt de kleuren af op een lichte of donkere ondergrond. */
            background?: Background;
        }
    >(),
    {
        label: '',
        size: 'md',
        color: 'primary',
        background: 'light',
    }
);

const baseClasses = 'picky:inline-block picky:rounded-small';

const sizeMap: Record<Size, string> = {
    xs: 'picky:py-[1px] picky:px-1.5 picky:text-[10px] picky:font-semibold',
    sm: 'picky:py-[2px] picky:px-2 picky:text-xs picky:font-semibold',
    md: 'picky:py-1 picky:px-2 picky:text-sm picky:font-semibold',
    lg: 'picky:py-1 picky:px-3 picky:text-base picky:font-semibold',
};

const colorMap: Record<Color, Record<Background, string>> = {
    primary: {
        light: 'picky:bg-primary-500/15 picky:text-primary-500',
        dark: 'picky:bg-primary-500/30 picky:text-primary-400',
    },
    secondary: {
        light: 'picky:bg-secondary-500/15 picky:text-secondary-500',
        dark: 'picky:bg-secondary-500/30 picky:text-secondary-400',
    },
    success: {
        light: 'picky:bg-green-500/15 picky:text-green-500',
        dark: 'picky:bg-green-500/30 picky:text-green-300',
    },
    danger: {
        light: 'picky:bg-red-500/15 picky:text-red-500',
        dark: 'picky:bg-red-500/20 picky:text-red-500',
    },
    gray: {
        light: 'picky:bg-neutral-500/15 picky:text-neutral-500',
        dark: 'picky:bg-neutral-500/40 picky:text-neutral-400',
    },
};

const sizeClasses = computed(() => sizeMap[props.size]);
const colorClasses = computed(() => colorMap[props.color][props.background]);

defineOptions({ name: 'BasePill' });
</script>
