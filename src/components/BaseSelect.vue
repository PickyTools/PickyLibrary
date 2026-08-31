<template>
    <div v-bind="api.root">
        <p v-if="label" v-bind="api.label">{{ label }}</p>

        <BaseButton
            ref="triggerRef"
            :size="size"
            :variant="variant"
            :color="color"
            :shadow="shadow"
            :rounded-side="roundedSide"
            :disabled="disabled"
            v-bind="api.trigger"
            @click="toggle"
            @keydown="onTriggerKeydown"
        >
            <template v-if="$slots.prefix" #prefix>
                <slot name="prefix" :option="selectedOption" />
            </template>

            <span v-if="!hideSelectedText" class="picky-select__value">
                <slot :option="selectedOption" :open="isOpen">{{ selectedOption?.label ?? placeholder }}</slot>
            </span>

            <template #suffix>
                <slot name="suffix" :option="selectedOption" :open="isOpen">
                    <BaseIcon
                        v-if="!hideArrow"
                        :code="arrowIcon"
                        :size="size === 'xs' ? 'xs' : 'md'"
                        class="picky-select__arrow"
                    />
                </slot>
            </template>
        </BaseButton>

        <Teleport :to="teleportTarget" :disabled="teleportDisabled">
            <div
                v-if="isOpen"
                ref="dropdownRef"
                :popover="usePopover ? 'manual' : undefined"
                v-bind="api.listbox"
                :class="['picky-select__dropdown', dropdownClass]"
                :style="[floatingStyles, isPositioned ? undefined : { visibility: 'hidden' }]"
            >
                <slot name="dropdown" :close="close" :active-index="activeIndex" :set-active-index="setActiveIndex">
                    <ul class="picky-select__list">
                        <li
                            v-for="(option, index) in options"
                            :key="String(option.value)"
                            v-bind="api.option(index)"
                            @click="choose(index)"
                            @mousemove="!option.disabled && (activeIndex = index)"
                        >
                            <slot name="option" :option="option" :active="index === activeIndex">
                                <slot name="prefix" :option="option" />
                                <span>{{ option.label }}</span>
                            </slot>
                        </li>
                    </ul>
                </slot>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts" generic="T extends string | number = string, O extends SelectOption<T> = SelectOption<T>">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { autoUpdate, flip, offset, shift, size as sizeMiddleware, useFloating } from '@floating-ui/vue';
import BaseButton from './BaseButton.vue';
import BaseIcon from './BaseIcon.vue';
import type { Color, Size } from '../types';
import {
    activeIndexOnOpen,
    connectSelect,
    createSelectIds,
    createTypeahead,
    selectKeydown,
    type SelectIntent,
    type SelectOption,
} from '../core/select';

/*
 * This component is the Vue adapter; the behaviour lives in core/select.ts.
 *
 * What remains here is deliberately only what is Vue-specific: the refs, positioning
 * through Floating UI, moving focus and scrolling. The keyboard table and every ARIA
 * attribute come from core, so a React or Angular version does not have to work them
 * out again -- and cannot get them wrong again.
 */
defineOptions({ name: 'BaseSelect', inheritAttrs: true });

const props = withDefaults(
    defineProps<{
        modelValue: T;
        options: O[];
        label?: string;
        placeholder?: string;
        size?: Size;
        variant?: 'full' | 'outline' | 'text';
        color?: Color;
        shadow?: 'hard' | 'soft' | 'none';
        roundedSide?: 'all' | 'left' | 'right' | 'none';
        disabled?: boolean;
        hideSelectedText?: boolean;
        hideArrow?: boolean;
        block?: boolean;
        ariaLabel?: string;
        arrowIcon?: string;
        /** Extra classes on the (teleported) panel -- for example to keep it outside your theme. */
        dropdownClass?: string | string[];
        to?: string | HTMLElement;
        teleportDisabled?: boolean;
    }>(),
    {
        label: '',
        placeholder: '',
        size: 'md',
        variant: 'full',
        color: 'gray',
        shadow: undefined,
        roundedSide: 'all',
        disabled: false,
        hideSelectedText: false,
        hideArrow: false,
        block: false,
        ariaLabel: '',
        arrowIcon: 'chevron-down',
        dropdownClass: undefined,
        to: 'body',
        teleportDisabled: false,
    }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: T): void }>();

defineSlots<{
    default?(props: { option: O | undefined; open: boolean }): unknown;
    prefix?(props: { option: O | undefined }): unknown;
    suffix?(props: { option: O | undefined; open: boolean }): unknown;
    option?(props: { option: O; active: boolean }): unknown;
    dropdown?(props: {
        close: () => void;
        activeIndex: number;
        setActiveIndex: (index: number) => void;
    }): unknown;
}>();

// The id comes from Vue, not from core: server and client have to produce the same
// sequence, or hydration breaks on exactly the aria wiring.
const ids = createSelectIds(useId());

const isOpen = ref(false);
const activeIndex = ref(-1);

/*
 * Getting a panel out of a modal takes two different tricks, because a native
 * <dialog> both paints in the top layer -- above every z-index on the page -- and
 * clips its descendants to its own box.
 *
 * Both are handled by teleporting the panel into the dialog and then showing it as
 * a popover. Each half matters:
 *
 *   in the dialog   `showModal()` makes everything outside the dialog inert, so a
 *                   panel parked on <body> is painted but cannot be clicked.
 *   as a popover    `showPopover()` promotes it into the top layer, which is what
 *                   frees it from the dialog's `overflow: hidden`.
 *
 * Where popover is unavailable the panel stays a plain child of the dialog: it can
 * be clicked but is clipped to the modal. Worse, and only in browsers below the ones
 * the stylesheet already requires.
 *
 * Outside a dialog neither is needed: a panel teleported to <body> behaves.
 */
const dialogHost = ref<HTMLElement | null>(null);

const supportsPopover =
    typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

const usePopover = computed(() => Boolean(dialogHost.value) && supportsPopover);

const teleportTarget = computed<string | HTMLElement>(() =>
    props.to === 'body' ? (dialogHost.value ?? 'body') : props.to
);
const triggerRef = ref<InstanceType<typeof BaseButton> | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const triggerEl = computed(() => (triggerRef.value?.$el as HTMLElement | undefined) ?? null);

/*
 * Inside a modal, measure against the viewport rather than the enclosing boxes.
 *
 * The panel is positioned `fixed`, so it already paints outside the dialog -- an
 * ancestor's `overflow: hidden` does not clip fixed descendants. What it does do is
 * make Floating UI treat the modal as the clipping boundary, which collapses
 * `availableHeight` to a sliver and leaves a scrollable stub barely tall enough to
 * click. Pointing the boundary at the document gives it the room it actually has.
 */
const overflowBoundary = computed(() =>
    dialogHost.value ? { boundary: document.documentElement } : {}
);

// A popover is inert until it is shown, and has to be dismissed again or it stays in
// the top layer after the panel is gone.
watch(isOpen, async (open) => {
    if (!usePopover.value) return;
    await nextTick();

    const panel = dropdownRef.value;
    if (!panel?.isConnected) return;

    if (open) panel.showPopover();
    else if (panel.matches(':popover-open')) panel.hidePopover();
});

const middleware = computed(() => [
    offset(8),
    flip({ padding: 8, ...overflowBoundary.value }),
    shift({ padding: 8, ...overflowBoundary.value }),
    sizeMiddleware({
        padding: 8,
        ...overflowBoundary.value,
        apply({ rects, availableHeight, elements }) {
            Object.assign(elements.floating.style, {
                minWidth: `${rects.reference.width}px`,
                maxWidth: 'calc(100vw - 1rem)',
                maxHeight: `${Math.max(96, availableHeight)}px`,
            });
        },
    }),
]);

const { floatingStyles, isPositioned } = useFloating(triggerEl, dropdownRef, {
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware,
});

const api = computed(() =>
    connectSelect<T, O>(
        { open: isOpen.value, activeIndex: activeIndex.value },
        {
            options: props.options,
            value: props.modelValue,
            ids,
            label: props.label,
            ariaLabel: props.ariaLabel,
            block: props.block,
        }
    )
);

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue));

function setActiveIndex(index: number): void {
    activeIndex.value = index;
    scrollActiveIntoView();
}

function open(): void {
    if (props.disabled || isOpen.value) return;

    dialogHost.value = triggerEl.value?.closest('dialog') ?? null;
    isOpen.value = true;
    setActiveIndex(activeIndexOnOpen(props.options, props.modelValue));
}

function close(): void {
    isOpen.value = false;
    activeIndex.value = -1;
    typeahead.reset();
}

function toggle(): void {
    isOpen.value ? close() : open();
}

function choose(index: number): void {
    const option = props.options[index];
    if (!option || option.disabled) return;

    emit('update:modelValue', option.value);
    close();
    triggerEl.value?.focus();
}

function scrollActiveIntoView(): void {
    nextTick(() => {
        if (activeIndex.value < 0) return;
        dropdownRef.value
            ?.querySelector(`#${CSS.escape(ids.option(activeIndex.value))}`)
            ?.scrollIntoView({ block: 'nearest' });
    });
}

/** Carries out what core decided. This is the only place that touches state. */
function apply(intent: SelectIntent): void {
    switch (intent.type) {
        case 'open':
            open();
            break;
        case 'close':
            close();
            break;
        case 'activate':
            setActiveIndex(intent.index);
            break;
        case 'choose':
            choose(intent.index);
            break;
        case 'none':
            break;
    }
}

const typeahead = createTypeahead();

function onTriggerKeydown(event: KeyboardEvent): void {
    if (props.disabled) return;

    const result = selectKeydown(
        event,
        { open: isOpen.value, activeIndex: activeIndex.value },
        props.options,
        typeahead
    );

    if (result.preventDefault) event.preventDefault();
    if (result.stopPropagation) event.stopPropagation();
    apply(result.intent);
}

function onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as Node;
    if (triggerEl.value?.contains(target) || dropdownRef.value?.contains(target)) return;
    close();
}

// Only attach the listener while the dropdown is open: it used to sit on the
// document permanently from mount, once per instance.
watch(isOpen, (open) => {
    if (open) {
        document.addEventListener('pointerdown', onDocumentPointerDown, true);
    } else {
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
});

defineExpose({ open, close, focus: () => triggerEl.value?.focus() });
</script>
