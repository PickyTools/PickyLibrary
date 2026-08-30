<template>
    <Teleport :to="to" :disabled="teleportDisabled">
        <dialog
            ref="dialogRef"
            :class="['picky-modal', sizeMap[size]]"
            :aria-labelledby="hasOwnTitle ? titleId : undefined"
            :aria-label="!hasOwnTitle && ariaLabel ? ariaLabel : undefined"
            @cancel.prevent="close"
            @click="onDialogClick"
        >
            <!-- Klikken op het paneel mag niet doorborrelen naar de backdrop-check. -->
            <div class="picky:flex picky:max-h-[inherit] picky:min-h-0 picky:flex-col" @click.stop>
                <div
                    v-if="!hideHeader"
                    class="picky:flex picky:shrink-0 picky:items-center picky:gap-4 picky:border-b picky:border-neutral-200 picky:px-6 picky:py-4 picky:dark:border-dark-surface-700"
                >
                    <slot name="title">
                        <p v-if="title" :id="titleId" class="picky:text-text-heading picky:text-lg picky:font-semibold">
                            {{ title }}
                        </p>
                    </slot>

                    <button
                        v-if="dismissible"
                        type="button"
                        :aria-label="closeLabel"
                        class="picky-reset picky:ml-auto picky:flex picky:h-8 picky:w-8 picky:cursor-pointer picky:items-center picky:justify-center picky:rounded-md picky:text-text-muted picky:hover:bg-neutral-100 picky:hover:text-text-heading picky:dark:hover:bg-dark-surface-700 picky:motion-safe:transition-colors picky:focus-visible:outline-2 picky:focus-visible:outline-offset-2 picky:focus-visible:outline-[var(--picky-color-focus-ring)]"
                        @click="close"
                    >
                        <slot name="close-icon">
                            <svg class="picky:h-5 picky:w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                            </svg>
                        </slot>
                    </button>
                </div>

                <div class="picky:text-text-body picky:min-h-0 picky:flex-1 picky:overflow-y-auto picky:px-6 picky:py-5">
                    <slot />
                </div>

                <div
                    v-if="$slots.footer"
                    class="picky:flex picky:shrink-0 picky:justify-end picky:gap-3 picky:border-t picky:border-neutral-200 picky:px-6 picky:py-4 picky:dark:border-dark-surface-700"
                >
                    <slot name="footer" />
                </div>
            </div>
        </dialog>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue';
import { lockBodyScroll, unlockBodyScroll } from '../internal/scrollLock';

/*
 * Gebouwd op het native <dialog>-element, dat de focus trap, de top layer en
 * Escape van het platform krijgt. Er is bewust geen fallback voor browsers zonder
 * <dialog>: de meegeleverde stylesheet vereist cascade layers en color-mix(), en
 * die drempel ligt hóger dan <dialog>. Een fallback zou dus schijnzekerheid zijn —
 * en de vorige fallback trapte de focus niet en ving Escape niet af.
 */
defineOptions({ name: 'BaseModal' });

defineSlots<{
    default(): unknown;
    /** Vervangt de titel. Zorg dan zelf voor een toegankelijke naam via `ariaLabel`. */
    title(): unknown;
    footer(): unknown;
    'close-icon'(): unknown;
}>();

const props = withDefaults(
    defineProps<{
        title?: string;
        size?: 'sm' | 'md' | 'lg';
        /** Toont de sluitknop en laat sluiten via Escape en backdrop-klik toe. */
        dismissible?: boolean;
        hideHeader?: boolean;
        /** Naam voor het dialoogvenster als er geen zichtbare titel is. */
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
const slots = useSlots();

const dialogRef = ref<HTMLDialogElement | null>(null);

// useId in plaats van een teller: die stond in <script setup> en werd dus per
// instance op 0 gezet, waardoor élke modal id="modal-title-1" kreeg. Met twee
// modals in de DOM wees aria-labelledby naar de titel van de eerste.
const titleId = useId();
const hasOwnTitle = computed(() => Boolean(props.title) && !slots.title);

const sizeMap: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'picky:md:max-w-sm',
    md: 'picky:md:max-w-lg',
    lg: 'picky:md:max-w-2xl',
};

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
    // Alleen een klik op het dialoogvlak zelf is een backdrop-klik; het paneel
    // stopt propagatie hierboven.
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

<style>
/* Namen geprefixt zodat ze niet botsen met de keyframes van een consument. */
.picky-modal {
    position: relative;
    margin: auto;
    padding: 0;
    border: 0;
    max-height: calc(100dvh - 1rem);
    width: calc(100vw - 2rem);
    max-width: calc(100vw - 2rem);
    overflow: hidden;
    color: inherit;
    background: var(--picky-color-light-surface-50);
    border-radius: var(--picky-radius-container);
    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

@media (min-width: 640px) {
    .picky-modal {
        max-height: calc(100dvh - 2rem);
        width: 100%;
    }
}

:where(.dark) .picky-modal {
    background: var(--picky-color-dark-surface-800);
}

@media (prefers-color-scheme: dark) {
    :root:not(.light) .picky-modal {
        background: var(--picky-color-dark-surface-800);
    }
}

.picky-modal::backdrop {
    background: rgb(0 0 0 / 0.5);
    animation: picky-modal-backdrop-in 200ms ease-out forwards;
}

.picky-modal[open] {
    animation: picky-modal-in 200ms ease-out forwards;
}

@keyframes picky-modal-in {
    from {
        opacity: 0;
        transform: translateY(-0.5rem) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes picky-modal-backdrop-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .picky-modal[open],
    .picky-modal::backdrop {
        animation: none;
    }
}
</style>
