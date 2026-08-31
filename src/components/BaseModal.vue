<template>
    <Teleport :to="to" :disabled="teleportDisabled">
        <dialog
            ref="dialogRef"
            class="picky-modal"
            :data-size="size"
            :aria-labelledby="hasOwnTitle($slots) ? titleId : undefined"
            :aria-label="!hasOwnTitle($slots) && ariaLabel ? ariaLabel : undefined"
            @cancel.prevent="close"
            @click="onDialogClick"
        >
            <!-- A click on the panel must not bubble into the backdrop check. -->
            <div class="picky-modal__panel" @click.stop>
                <div v-if="!hideHeader" class="picky-modal__header">
                    <slot name="title">
                        <p v-if="title" :id="titleId" class="picky-modal__title">
                            {{ title }}
                        </p>
                    </slot>

                    <button
                        v-if="dismissible"
                        type="button"
                        :aria-label="closeLabel"
                        class="picky-reset picky-close-button picky-modal__close"
                        @click="close"
                    >
                        <slot name="close-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                            </svg>
                        </slot>
                    </button>
                </div>

                <div class="picky-modal__body">
                    <slot />
                </div>

                <div v-if="$slots.footer" class="picky-modal__footer">
                    <slot name="footer" />
                </div>
            </div>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { lockBodyScroll, unlockBodyScroll } from '../internal/scrollLock';

/*
 * Built on the native <dialog> element, which brings the focus trap, the top layer
 * and Escape from the platform. There is deliberately no fallback for browsers
 * without <dialog>: the shipped stylesheet already requires cascade layers and
 * color-mix(), and that bar sits higher than <dialog> does. A fallback would be
 * false reassurance -- and the previous one neither trapped focus nor caught Escape.
 */
defineOptions({ name: 'BaseModal' });

defineSlots<{
    default?(): unknown;
    /** Replaces the title. Provide an accessible name yourself through `ariaLabel`. */
    title?(): unknown;
    footer?(): unknown;
    'close-icon'?(): unknown;
}>();

const props = withDefaults(
    defineProps<{
        title?: string;
        size?: 'sm' | 'md' | 'lg';
        /** Shows the close button and allows closing with Escape or a backdrop click. */
        dismissible?: boolean;
        hideHeader?: boolean;
        /** Name for the dialog when there is no visible title. */
        ariaLabel?: string;
        closeLabel?: string;
        to?: string | HTMLElement;
        teleportDisabled?: boolean;
    }>(),
    {
        title: '',
        size: 'md',
        dismissible: true,
        hideHeader: false,
        ariaLabel: '',
        closeLabel: 'Close',
        to: 'body',
        teleportDisabled: false,
    }
);

const model = defineModel<boolean>({ default: false });
const dialogRef = ref<HTMLDialogElement | null>(null);

// useId rather than a counter: the counter lived in <script setup> and so reset to
// 0 per instance, giving every modal id="modal-title-1". With two modals in the DOM
// aria-labelledby then pointed at the first one's title.
const titleId = useId();
/**
 * Whether the dialog renders a title of its own -- the `title` prop is set and the
 * slot has not replaced it. Decides between aria-labelledby and aria-label.
 *
 * Takes `$slots` as an argument rather than reading `useSlots()` from the setup
 * scope. That call made the type inference circular: the template needs this value,
 * the value needs the slots, and the slots need the component's own type, at which
 * point TypeScript gives up and falls back to `any`.
 */
function hasOwnTitle(slots: Readonly<Record<string, unknown>>): boolean {
    return Boolean(props.title) && !slots.title;
}

let locked = false;
let previouslyFocused: HTMLElement | null = null;

function open(): void {
    const dialog = dialogRef.value;
    if (!dialog || dialog.open) return;

    previouslyFocused = document.activeElement as HTMLElement | null;
    dialog.showModal();

    if (!locked) {
        lockBodyScroll();
        locked = true;
    }
}

function close(): void {
    model.value = false;
}

function teardown(): void {
    const dialog = dialogRef.value;
    if (dialog?.open) dialog.close();

    if (locked) {
        unlockBodyScroll();
        locked = false;
    }

    previouslyFocused?.focus?.();
    previouslyFocused = null;
}

watch(model, (isOpen) => (isOpen ? open() : teardown()));

function onDialogClick(event: MouseEvent): void {
    // Only a click on the dialog surface itself counts as a backdrop click; the
    // panel stops propagation above.
    if (props.dismissible && event.target === dialogRef.value) close();
}

function onPopState(): void {
    close();
}

onMounted(() => {
    window.addEventListener('popstate', onPopState);
    if (model.value) open();
});

onBeforeUnmount(() => {
    window.removeEventListener('popstate', onPopState);
    teardown();
});

defineExpose({ open: () => (model.value = true), close });
</script>

