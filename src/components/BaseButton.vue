<template>
    <component
        :is="isLink ? 'a' : 'button'"
        :type="isLink ? undefined : htmlType"
        :href="isLink && !disabled ? href : undefined"
        :target="isLink ? target : undefined"
        :rel="isLink ? rel : undefined"
        :role="isLink && disabled ? 'link' : undefined"
        :tabindex="isLink && disabled ? -1 : undefined"
        :disabled="isLink ? undefined : disabled"
        :aria-disabled="disabled || undefined"
        :aria-label="resolvedAriaLabel"
        :data-picky-shadow="shadow"
        :data-size="size"
        :data-variant="variant"
        :data-color="color"
        :data-rounded="roundedSide"
        :data-transition-radius="transitionRadius ? 'true' : undefined"
        :class="['picky-reset', 'picky-button', $attrs.class]"
        :style="customColorTokens"
        v-bind="rest"
        @click="handleClick"
    >
        <span class="picky-button__inner picky-pressable">
            <slot name="prefix" />
            <slot>{{ showTempLabel ? tempLabel : label }}</slot>
            <slot name="suffix" />
        </span>
    </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, useSlots } from 'vue';
import type { Color, HasDisabled, HasSize } from '../types';
import { readableTextColor } from '../core/contrast';

type ButtonVariant = 'full' | 'outline' | 'text';
/**
 * The shared colour scale, plus `custom` for an arbitrary CSS colour. `custom` is
 * not a semantic colour, so it is not part of `Color`; it sets the same tokens, but
 * as an inline style.
 */
type ButtonColor = Color | 'custom';
type ButtonShadow = 'hard' | 'soft' | 'none';
type RoundedSide = 'all' | 'left' | 'right' | 'none';

/*
 * All styling lives in styles/components/button.css and is selected through the
 * data attributes above. This component computes no class names: colour, variant
 * and size are attributes, not strings.
 */
defineOptions({ name: 'BaseButton', inheritAttrs: false });

defineSlots<{
    /** Replaces the label. Pass `label` as well, as the accessible name. */
    default?(): unknown;
    prefix?(): unknown;
    suffix?(): unknown;
}>();

const props = withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                label?: string;
                variant?: ButtonVariant;
                color?: ButtonColor;
                htmlType?: 'button' | 'submit' | 'reset';
                /** Temporary label after a click, for example "Copied!". */
                tempLabel?: string;
                tempLabelDuration?: number;
                /** Only with color="custom": any CSS colour. Text colour is picked for contrast. */
                customColor?: string;
                /**
                 * Overrides the shadow style for this button. Without a value the
                 * button follows `data-picky-shadow` on an ancestor (`soft` by default).
                 */
                shadow?: ButtonShadow;
                /** Square off one side so buttons can sit flush against each other. */
                roundedSide?: RoundedSide;
                /** Animate corner-radius changes. Off by default so theme switches are instant. */
                transitionRadius?: boolean;
                href?: string;
                target?: string;
                rel?: string;
            }
    >(),
    {
        label: '',
        variant: 'full',
        color: 'primary',
        htmlType: 'button',
        size: 'md',
        disabled: false,
        tempLabel: '',
        tempLabelDuration: 2000,
        customColor: undefined,
        shadow: undefined,
        roundedSide: 'all',
        transitionRadius: false,
        href: undefined,
        target: undefined,
        rel: undefined,
    }
);

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>();

const attrs = useAttrs();
const slots = useSlots();

// class goes on the outer element (above); everything else follows, minus class,
// so it is not applied twice.
const rest = computed(() => {
    const { class: _class, ...others } = attrs;
    return others;
});

const isLink = computed(() => Boolean(props.href));

/**
 * Safety net for the accessible name. If a consumer fills the default slot with an
 * icon instead of text, the button would otherwise have no name. An explicit
 * aria-label from the consumer always wins, and when the label is visible text we
 * leave aria-label off to avoid naming the button twice.
 */
const resolvedAriaLabel = computed<string | undefined>(() => {
    if (attrs['aria-label'] != null) return undefined;
    if (!props.label) return undefined;
    return slots.default ? props.label : undefined;
});

/**
 * With color="custom", JavaScript sets exactly the tokens button.css sets for the
 * fixed colours. That is why `custom` needs no CSS rules of its own -- the variants
 * read the tokens and never learn where they came from.
 *
 * Only the choice between black and white text needs JavaScript, because it is a
 * luminance calculation. CSS mixes the hover and ring shades itself.
 */
const customColorTokens = computed<Record<string, string> | undefined>(() => {
    if (props.color !== 'custom' || !props.customColor) return undefined;

    const base = props.customColor;

    return {
        '--picky-btn-fill': base,
        '--picky-btn-fill-hover': `color-mix(in oklab, ${base} 85%, black)`,
        '--picky-btn-on-fill': readableTextColor(base),
        '--picky-btn-line': base,
        '--picky-btn-on-line': base,
        '--picky-btn-accent': base,
        '--picky-btn-ring-soft': base,
        '--picky-shadow-color': base,
    };
});

const showTempLabel = ref(false);
let tempLabelTimeout: ReturnType<typeof setTimeout> | null = null;

function handleClick(event: MouseEvent) {
    if (props.disabled) {
        // An <a> has no disabled attribute, so navigation has to be stopped here.
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if (props.tempLabel) {
        showTempLabel.value = true;
        if (tempLabelTimeout) clearTimeout(tempLabelTimeout);
        tempLabelTimeout = setTimeout(() => {
            showTempLabel.value = false;
        }, props.tempLabelDuration);
    }

    emit('click', event);
}

onBeforeUnmount(() => {
    if (tempLabelTimeout) clearTimeout(tempLabelTimeout);
});
</script>
