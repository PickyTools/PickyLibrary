<template>
    <Teleport :to="to" :disabled="disabled">
        <!-- Two regions rather than one. A live region cannot change its urgency
             per message, so an urgent notification belongs in its own assertive
             region. Every toast used to carry role="alert" and aria-live="assertive"
             itself inside a polite container: nested live regions, which make screen
             readers announce twice or not at all. -->
        <div
            class="picky-toast-region"
            :data-inline="disabled ? 'true' : undefined"
            role="status"
            :aria-label="politeLabel"
        >
            <TransitionGroup name="picky-toast">
                <div v-for="toast in politeToasts" :key="toast.id" class="picky-toast-region__item">
                    <slot :toast="toast" :close="removeToast">
                        <BaseToast :toast="toast" :close-label="closeLabel" :close-icon="closeIcon" @close="removeToast" />
                    </slot>
                </div>
            </TransitionGroup>
        </div>

        <div
            class="picky-toast-region"
            :data-inline="disabled ? 'true' : undefined"
            role="alert"
            aria-live="assertive"
            :aria-label="assertiveLabel"
        >
            <TransitionGroup name="picky-toast">
                <div v-for="toast in assertiveToasts" :key="toast.id" class="picky-toast-region__item">
                    <slot :toast="toast" :close="removeToast">
                        <BaseToast :toast="toast" :close-label="closeLabel" :close-icon="closeIcon" @close="removeToast" />
                    </slot>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseToast from './BaseToast.vue';
import { useToast, type Toast } from '../composables/useToast';

defineOptions({ name: 'ToastContainer' });

defineSlots<{
    /** Replaces how a single toast is rendered. */
    default?(props: { toast: Toast; close: (id: number) => void }): unknown;
}>();

withDefaults(
    defineProps<{
        /** Teleport target. Set `disabled` to render in place (SSR, shadow DOM). */
        to?: string | HTMLElement;
        disabled?: boolean;
        closeLabel?: string;
        closeIcon?: string;
        /** Names for the two live regions, read by screen readers. */
        politeLabel?: string;
        assertiveLabel?: string;
    }>(),
    {
        to: 'body',
        disabled: false,
        closeLabel: 'Close',
        closeIcon: 'xmark',
        politeLabel: 'Notifications',
        assertiveLabel: 'Urgent notifications',
    }
);

const { toasts, removeToast } = useToast();

const politeToasts = computed(() => toasts.value.filter((toast) => !toast.assertive));
const assertiveToasts = computed(() => toasts.value.filter((toast) => toast.assertive));
</script>

