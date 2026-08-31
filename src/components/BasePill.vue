<template>
    <span
        class="picky-pill"
        :data-size="size"
        :data-color="color"
        :data-background="background"
    >
        <slot>{{ label }}</slot>
    </span>
</template>

<script setup lang="ts">
import type { BaseComponentProps, Color } from '../types';

/*
 * All styling lives in styles/components/pill.css. This component only decides
 * which data attributes go on the element -- no class name is computed here. That
 * is deliberate: it makes the stylesheet the shared truth, so a React or Angular
 * version can later use exactly the same one.
 */
defineOptions({ name: 'BasePill' });

defineSlots<{
    /** Replaces the label. */
    default?(): unknown;
}>();

/** Tunes the colours for a light or dark surface. */
type Background = 'light' | 'dark';

withDefaults(
    defineProps<
        BaseComponentProps & {
            /** Text in the pill. Ignored when you fill the default slot. */
            label?: string;
            color?: Color;
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
</script>
