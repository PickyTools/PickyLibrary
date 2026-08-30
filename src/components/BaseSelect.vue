<template>
    <div :class="['picky:relative', block ? 'picky:block' : 'picky:inline-block picky:max-w-full']">
        <p v-if="label" :id="labelId" class="picky:text-text-body picky:mb-1 picky:text-sm picky:font-medium">
            {{ label }}
        </p>

        <BaseButton
            ref="triggerRef"
            :size="size"
            :variant="variant"
            :color="color"
            :shadow="shadow"
            :rounded-side="roundedSide"
            :disabled="disabled"
            :class="block ? 'picky:w-full' : undefined"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="isOpen && activeOption ? optionId(activeIndex) : undefined"
            :aria-label="ariaLabel || undefined"
            :aria-labelledby="!ariaLabel && label ? labelId : undefined"
            @click="toggle"
            @keydown="onTriggerKeydown"
        >
            <template v-if="$slots.prefix" #prefix>
                <slot name="prefix" :option="selectedOption" />
            </template>

            <span v-if="!hideSelectedText" class="picky:min-w-0 picky:flex-1 picky:truncate picky:text-left">
                <slot :option="selectedOption" :open="isOpen">{{ selectedOption?.label ?? placeholder }}</slot>
            </span>

            <template #suffix>
                <slot name="suffix" :option="selectedOption" :open="isOpen">
                    <BaseIcon
                        v-if="!hideArrow"
                        :code="arrowIcon"
                        :size="size === 'xs' ? 'xs' : 'md'"
                        :class="['picky:shrink-0 picky:motion-safe:transition-transform picky:motion-safe:duration-200', isOpen ? 'picky:rotate-180' : '']"
                    />
                </slot>
            </template>
        </BaseButton>

        <Teleport :to="to" :disabled="teleportDisabled">
            <div
                v-if="isOpen"
                :id="listboxId"
                ref="dropdownRef"
                role="listbox"
                :aria-labelledby="label ? labelId : undefined"
                :aria-label="!label && ariaLabel ? ariaLabel : undefined"
                :class="[
                    'picky:z-50 picky:overflow-auto picky:rounded-md picky:bg-light-surface-50 picky:shadow-lg picky:ring-1 picky:ring-black/5 picky:dark:bg-dark-surface-800 picky:dark:ring-white/10',
                    dropdownClass,
                ]"
                :style="[floatingStyles, isPositioned ? undefined : { visibility: 'hidden' }]"
            >
                <slot name="dropdown" :close="close" :active-index="activeIndex" :set-active-index="setActiveIndex">
                    <ul class="picky:py-1">
                        <li
                            v-for="(option, index) in options"
                            :id="optionId(index)"
                            :key="String(option.value)"
                            role="option"
                            :aria-selected="option.value === modelValue"
                            :aria-disabled="option.disabled || undefined"
                            :class="[
                                'picky:text-text-body picky:flex picky:items-center picky:gap-x-2 picky:px-3 picky:py-2 picky:text-sm picky:font-medium picky:whitespace-nowrap',
                                option.disabled
                                    ? 'picky:cursor-not-allowed picky:opacity-50'
                                    : 'picky:cursor-pointer',
                                index === activeIndex && !option.disabled
                                    ? 'picky:bg-primary-100 picky:dark:bg-dark-surface-700'
                                    : option.value === modelValue
                                      ? 'picky:bg-neutral-100 picky:dark:bg-dark-surface-700/60'
                                      : '',
                            ]"
                            @click="select(option)"
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

<script setup lang="ts" generic="T extends string | number = string">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import { autoUpdate, flip, offset, shift, size as sizeMiddleware, useFloating } from '@floating-ui/vue';
import BaseButton from './BaseButton.vue';
import BaseIcon from './BaseIcon.vue';
import type { Size } from '../types';

export interface SelectOption<Value = string> {
    label: string;
    value: Value;
    disabled?: boolean;
}

/*
 * Volgt het listbox-patroon met aria-activedescendant: de focus blijft op de knop,
 * en die wijst met aria-activedescendant naar de actieve optie. Eerder had de
 * dropdown twee geneste role="listbox" (een listbox mag alleen opties bevatten),
 * ontbrak aria-controls, en hadden de opties geen id — waardoor pijltjesnavigatie
 * visueel werkte maar voor een schermlezer volledig stil was.
 */
defineOptions({ name: 'BaseSelect', inheritAttrs: true });

const props = withDefaults(
    defineProps<{
        modelValue: T;
        options: SelectOption<T>[];
        label?: string;
        placeholder?: string;
        size?: Size;
        variant?: 'full' | 'outline' | 'text';
        color?: 'primary' | 'secondary' | 'success' | 'danger' | 'gray';
        shadow?: 'hard' | 'soft' | 'none';
        roundedSide?: 'all' | 'left' | 'right' | 'none';
        disabled?: boolean;
        hideSelectedText?: boolean;
        hideArrow?: boolean;
        block?: boolean;
        ariaLabel?: string;
        arrowIcon?: string;
        /** Extra klassen op het (geteleporteerde) paneel — bijvoorbeeld om het buiten je thema te houden. */
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
    default(props: { option: SelectOption<T> | undefined; open: boolean }): unknown;
    prefix(props: { option: SelectOption<T> | undefined }): unknown;
    suffix(props: { option: SelectOption<T> | undefined; open: boolean }): unknown;
    option(props: { option: SelectOption<T>; active: boolean }): unknown;
    dropdown(props: {
        close: () => void;
        activeIndex: number;
        setActiveIndex: (index: number) => void;
    }): unknown;
}>();

const uid = useId();
const labelId = `${uid}-label`;
const listboxId = `${uid}-listbox`;
const optionId = (index: number) => `${uid}-option-${index}`;

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

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue));
const activeOption = computed(() => props.options[activeIndex.value]);

function setActiveIndex(index: number): void {
    activeIndex.value = index;
}

function open(): void {
    if (props.disabled || isOpen.value) return;
    isOpen.value = true;

    const selected = props.options.findIndex((option) => option.value === props.modelValue);
    activeIndex.value = selected >= 0 ? selected : nextEnabled(-1, 1);
    scrollActiveIntoView();
}

function close(): void {
    isOpen.value = false;
    activeIndex.value = -1;
}

function toggle(): void {
    isOpen.value ? close() : open();
}

function nextEnabled(from: number, step: number): number {
    const count = props.options.length;
    if (count === 0) return -1;

    let index = from;
    for (let i = 0; i < count; i += 1) {
        index = (index + step + count) % count;
        if (!props.options[index]?.disabled) return index;
    }
    return -1;
}

function move(step: number): void {
    activeIndex.value = nextEnabled(activeIndex.value, step);
    scrollActiveIntoView();
}

function scrollActiveIntoView(): void {
    nextTick(() => {
        dropdownRef.value?.querySelector(`#${CSS.escape(optionId(activeIndex.value))}`)?.scrollIntoView({ block: 'nearest' });
    });
}

function select(option: SelectOption<T> | undefined): void {
    if (!option || option.disabled) return;
    emit('update:modelValue', option.value);
    close();
    triggerEl.value?.focus();
}

// Type-ahead: springen naar de eerste optie die met de ingetypte letters begint.
let typed = '';
let typedTimer: ReturnType<typeof setTimeout> | null = null;

function typeAhead(char: string): void {
    typed += char.toLowerCase();
    if (typedTimer) clearTimeout(typedTimer);
    typedTimer = setTimeout(() => (typed = ''), 500);

    const match = props.options.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(typed)
    );
    if (match >= 0) {
        activeIndex.value = match;
        scrollActiveIntoView();
    }
}

function onTriggerKeydown(event: KeyboardEvent): void {
    if (props.disabled) return;

    switch (event.key) {
        case 'ArrowDown':
        case 'ArrowUp':
            event.preventDefault();
            isOpen.value ? move(event.key === 'ArrowDown' ? 1 : -1) : open();
            break;
        case 'Home':
            if (isOpen.value) {
                event.preventDefault();
                activeIndex.value = nextEnabled(-1, 1);
                scrollActiveIntoView();
            }
            break;
        case 'End':
            if (isOpen.value) {
                event.preventDefault();
                activeIndex.value = nextEnabled(props.options.length, -1);
                scrollActiveIntoView();
            }
            break;
        case 'Enter':
        case ' ':
            event.preventDefault();
            // De klik-handler van de knop niet ook laten vuren, anders racen open en sluiten.
            event.stopPropagation();
            isOpen.value ? select(activeOption.value) : open();
            break;
        case 'Escape':
            if (isOpen.value) {
                event.preventDefault();
                close();
            }
            break;
        case 'Tab':
            if (isOpen.value) close();
            break;
        default:
            if (isOpen.value && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
                typeAhead(event.key);
            }
    }
}

function onDocumentPointerDown(event: PointerEvent): void {
    const target = event.target as Node;
    if (triggerEl.value?.contains(target) || dropdownRef.value?.contains(target)) return;
    close();
}

// De listener alleen aanhaken zolang de dropdown open is: eerder hing hij vanaf
// mount permanent aan het document, per instance.
watch(isOpen, (open) => {
    if (open) {
        document.addEventListener('pointerdown', onDocumentPointerDown, true);
    } else {
        document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
    if (typedTimer) clearTimeout(typedTimer);
});

defineExpose({ open, close, focus: () => triggerEl.value?.focus() });
</script>
