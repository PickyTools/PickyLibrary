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

        <Teleport :to="to" :disabled="teleportDisabled">
            <div
                v-if="isOpen"
                ref="dropdownRef"
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
const triggerRef = ref<InstanceType<typeof BaseButton> | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const triggerEl = computed(() => (triggerRef.value?.$el as HTMLElement | undefined) ?? null);

const { floatingStyles, isPositioned } = useFloating(triggerEl, dropdownRef, {
    open: isOpen,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
        offset(8),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        sizeMiddleware({
            padding: 8,
            apply({ rects, availableHeight, elements }) {
                Object.assign(elements.floating.style, {
                    minWidth: `${rects.reference.width}px`,
                    maxWidth: 'calc(100vw - 1rem)',
                    maxHeight: `${Math.max(96, availableHeight)}px`,
                });
            },
        }),
    ],
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
