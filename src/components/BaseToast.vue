<template>
    <div :class="['picky:flex picky:w-80 picky:gap-3 picky:rounded-lg picky:p-3 picky:shadow-lg picky:sm:w-96', styleMap[toast.style]]">
        <slot name="icon">
            <BaseIcon v-if="toast.icon" :code="toast.icon" class="picky:mt-0.5 picky:shrink-0" />
        </slot>

        <div class="picky:min-w-0 picky:flex-1">
            <p class="picky:text-sm picky:leading-tight picky:font-semibold">{{ toast.title }}</p>
            <p v-if="toast.description" class="picky:mt-0.5 picky:text-sm picky:leading-snug picky:opacity-80">
                {{ toast.description }}
            </p>
        </div>

        <button
            type="button"
            :aria-label="closeLabel"
            class="picky:flex picky:h-6 picky:w-6 picky:shrink-0 picky:cursor-pointer picky:items-center picky:justify-center picky:self-start picky:rounded-md picky:bg-white/20 picky:opacity-60 picky:hover:opacity-100 picky:motion-safe:transition-opacity picky:focus-visible:outline-2 picky:focus-visible:outline-offset-2"
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
import type { Toast, ToastStyle } from '../composables/useToast';

defineOptions({ name: 'BaseToast' });

withDefaults(
    defineProps<{
        toast: Toast;
        /** Engelse default; vervang voor je eigen taal. */
        closeLabel?: string;
        closeIcon?: string;
    }>(),
    { closeLabel: 'Close', closeIcon: 'xmark' }
);

const emit = defineEmits<{ (e: 'close', id: number): void }>();

// Geen role of aria-live hier: de omhullende ToastContainer is de live region.
// Beide niveaus markeren gaf dubbele of juist weggevallen aankondigingen.
const styleMap: Record<ToastStyle, string> = {
    primary: 'picky:bg-primary-500 picky:text-primary-text',
    secondary: 'picky:bg-secondary-500 picky:text-secondary-text',
    success: 'picky:bg-green-600 picky:text-white',
    danger: 'picky:bg-red-600 picky:text-white',
    warning: 'picky:bg-yellow-500 picky:text-yellow-950',
    info: 'picky:bg-teal-600 picky:text-white',
    gray: 'picky:bg-neutral-700 picky:text-white',
};
</script>
