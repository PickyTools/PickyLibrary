<template>
    <div class="picky-toast" :data-style="toast.style">
        <slot name="icon">
            <BaseIcon v-if="toast.icon" :code="toast.icon" class="picky-toast__icon" />
        </slot>

        <div class="picky-toast__content">
            <p class="picky-toast__title">{{ toast.title }}</p>
            <p v-if="toast.description" class="picky-toast__description">
                {{ toast.description }}
            </p>
        </div>

        <button
            type="button"
            :aria-label="closeLabel"
            class="picky-reset picky-close-button picky-toast__close"
            @click="emit('close', toast.id)"
        >
            <slot name="close-icon">
                <BaseIcon :code="closeIcon" />
            </slot>
        </button>
    </div>
</template>

<script setup lang="ts">
import BaseIcon from './BaseIcon.vue';
import type { Toast } from '../composables/useToast';

defineOptions({ name: 'BaseToast' });

defineSlots<{
    /** Replaces the toast's icon. */
    icon?(): unknown;
    /** Replaces the icon inside the close button. */
    'close-icon'?(): unknown;
}>();

/*
 * No role or aria-live here: the surrounding ToastContainer is the live region.
 * Marking both levels caused announcements to double up or drop out entirely.
 */
withDefaults(
    defineProps<{
        toast: Toast;
        /** English by default; replace it for your own language. */
        closeLabel?: string;
        closeIcon?: string;
    }>(),
    { closeLabel: 'Close', closeIcon: 'xmark' }
);

const emit = defineEmits<{ (e: 'close', id: number): void }>();
</script>
