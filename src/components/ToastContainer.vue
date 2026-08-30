<template>
    <Teleport :to="to" :disabled="disabled">
        <!-- Twee regio's in plaats van één. Een live region kan zijn urgentie niet
             per bericht wisselen, dus een dringende melding hoort in een eigen
             assertive regio. Eerder droeg elke toast zelf role="alert" én
             aria-live="assertive" binnen een polite container: geneste live regions,
             wat per schermlezer dubbele of juist weggevallen aankondigingen geeft. -->
        <div :class="regionClasses" aria-live="polite" :aria-label="politeLabel">
            <TransitionGroup name="picky-toast">
                <div v-for="toast in politeToasts" :key="toast.id" class="picky:pointer-events-auto">
                    <slot :toast="toast" :close="removeToast">
                        <BaseToast :toast="toast" :close-label="closeLabel" :close-icon="closeIcon" @close="removeToast" />
                    </slot>
                </div>
            </TransitionGroup>
        </div>

        <div :class="regionClasses" role="alert" aria-live="assertive" :aria-label="assertiveLabel">
            <TransitionGroup name="picky-toast">
                <div v-for="toast in assertiveToasts" :key="toast.id" class="picky:pointer-events-auto">
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
    /** Vervangt de weergave van één toast. */
    default(props: { toast: Toast; close: (id: number) => void }): unknown;
}>();

const props = withDefaults(
    defineProps<{
        /** Doel voor de Teleport. Zet `disabled` als je in-place wilt renderen (SSR, shadow DOM). */
        to?: string | HTMLElement;
        disabled?: boolean;
        closeLabel?: string;
        closeIcon?: string;
        /** Namen van de twee live regions, voor schermlezers. */
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

const regionClasses = computed(() => [
    'picky:pointer-events-none picky:fixed picky:inset-x-0 picky:bottom-0 picky:z-[200] picky:flex picky:flex-col picky:items-end picky:gap-2 picky:p-4 picky:sm:top-0 picky:sm:bottom-auto',
    props.disabled ? 'picky:static' : '',
]);
</script>

<style>
.picky-toast-enter-active {
    transition: all 0.3s ease-out;
}
.picky-toast-leave-active {
    transition: all 0.2s ease-in;
    position: absolute;
    right: 1rem;
}
.picky-toast-move {
    transition: transform 0.3s ease;
}
.picky-toast-enter-from,
.picky-toast-leave-to {
    opacity: 0;
    transform: translateY(1rem);
}
@media (min-width: 640px) {
    .picky-toast-enter-from,
    .picky-toast-leave-to {
        transform: translateY(-1rem);
    }
}
@media (prefers-reduced-motion: reduce) {
    .picky-toast-enter-active,
    .picky-toast-leave-active,
    .picky-toast-move {
        transition: none;
    }
}
</style>
