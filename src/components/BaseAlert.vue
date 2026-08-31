<template>
    <div class="picky-alert" :data-type="type" role="alert">
        <div class="picky-alert__body">
            <slot name="icon">
                <BaseIcon v-if="resolvedIcon" :code="resolvedIcon" class="picky-alert__icon" />
            </slot>

            <div class="picky-alert__content">
                <p class="picky-alert__title">{{ title }}</p>
                <p v-if="description" class="picky-alert__description">{{ description }}</p>

                <div v-if="$slots.default" class="picky-alert__extra">
                    <slot />
                </div>
            </div>

            <button
                v-if="dismissible"
                type="button"
                :aria-label="closeLabel"
                class="picky-reset picky-close-button picky-alert__close"
                @click="emit('dismiss')"
            >
                <slot name="close-icon">
                    <BaseIcon :code="closeIcon" />
                </slot>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from './BaseIcon.vue';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

defineOptions({ name: 'BaseAlert' });

defineSlots<{
    /** Extra content below the description. */
    default?(): unknown;
    /** Replaces the icon for this alert type. */
    icon?(): unknown;
    /** Replaces the icon inside the close button. */
    'close-icon'?(): unknown;
}>();

const props = withDefaults(
    defineProps<{
        title: string;
        type?: AlertType;
        description?: string;
        dismissible?: boolean;
        /** English by default; replace it for your own language. */
        closeLabel?: string;
        closeIcon?: string;
        /** Overrides the icon code for this type. Empty leaves the icon out. */
        icon?: string;
    }>(),
    {
        type: 'info',
        description: '',
        dismissible: false,
        closeLabel: 'Close',
        closeIcon: 'xmark',
        icon: undefined,
    }
);

const emit = defineEmits<{ (e: 'dismiss'): void }>();

// Names from a common set. If your resolver uses different codes, pass `icon` or
// fill the icon slot.
const defaultIconMap: Record<AlertType, string> = {
    info: 'circle-info',
    warning: 'circle-exclamation',
    error: 'triangle-exclamation',
    success: 'circle-check',
};

const resolvedIcon = computed(() => props.icon ?? defaultIconMap[props.type]);
</script>
