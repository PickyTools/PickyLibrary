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
        :class="['picky:group picky:rounded-md', $attrs.class]"
        v-bind="rest"
        @click="handleClick"
    >
        <span :class="innerClasses" :style="innerStyle">
            <slot name="prefix" />
            <slot>{{ showTempLabel ? tempLabel : label }}</slot>
            <slot name="suffix" />
        </span>
    </component>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useAttrs, useSlots } from 'vue';
import type { HasDisabled, HasSize, Size } from '../types';
import { readableTextColor } from '../internal/color';

type ButtonVariant = 'full' | 'outline' | 'text';
type ButtonColor = 'primary' | 'secondary' | 'success' | 'danger' | 'gray' | 'custom';
type ButtonShadow = 'hard' | 'soft' | 'none';

defineOptions({ name: 'BaseButton', inheritAttrs: false });

const props = withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                label?: string;
                variant?: ButtonVariant;
                color?: ButtonColor;
                htmlType?: 'button' | 'submit' | 'reset';
                /** Tijdelijk label na een klik, bijvoorbeeld "Gekopieerd!". */
                tempLabel?: string;
                tempLabelDuration?: number;
                /** Alleen bij color="custom": elke CSS-kleur. Tekstkleur wordt op contrast gekozen. */
                customColor?: string;
                /**
                 * Overschrijft de schaduwstijl voor deze knop. Zonder waarde volgt de
                 * knop `data-picky-shadow` op een voorouder (standaard `soft`).
                 */
                shadow?: ButtonShadow;
                /** Maak één zijde vierkant zodat knoppen tegen elkaar aan kunnen staan. */
                roundedSide?: 'all' | 'left' | 'right' | 'none';
                /** Animeer wijzigingen van de hoekradius. Uit by default zodat themawissels direct zijn. */
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

// class gaat naar het buitenste element (hierboven); de rest ook, maar zonder class
// om dubbele toepassing te voorkomen.
const rest = computed(() => {
    const { class: _class, ...others } = attrs;
    return others;
});

const isLink = computed(() => Boolean(props.href));

/**
 * Vangnet voor de toegankelijke naam. Vult een consument de default slot met een
 * icoon in plaats van tekst, dan heeft de knop anders geen naam. Een expliciete
 * aria-label van de consument wint altijd, en bij zichtbare labeltekst laten we
 * aria-label leeg om dubbele naamgeving te voorkomen.
 */
const resolvedAriaLabel = computed<string | undefined>(() => {
    if (attrs['aria-label'] != null) return undefined;
    if (!props.label) return undefined;
    return slots.default ? props.label : undefined;
});

const sizeMap: Record<Size, string> = {
    xs: 'picky:px-1.5 picky:h-6 picky:min-w-8 picky:text-xs',
    sm: 'picky:px-2 picky:h-8 picky:min-w-12 picky:text-sm',
    md: 'picky:px-4 picky:h-10 picky:min-w-12 picky:text-base',
    lg: 'picky:px-8 picky:h-14 picky:min-w-14 picky:text-base picky:sm:text-xl',
};

const variantColorMap: Record<ButtonVariant, Record<ButtonColor, string>> = {
    full: {
        primary:
            'picky:border picky:border-transparent picky:bg-primary-500 picky:text-primary-text picky:font-medium picky:group-not-disabled:hover:bg-primary-600 picky:active:ring-4 picky:active:ring-primary-300/25',
        secondary:
            'picky:border picky:border-transparent picky:bg-secondary-500 picky:text-secondary-text picky:font-medium picky:group-not-disabled:hover:bg-secondary-600 picky:active:ring-4 picky:active:ring-secondary-300/25',
        success:
            'picky:border picky:border-transparent picky:bg-green-600 picky:text-white picky:font-medium picky:group-not-disabled:hover:bg-green-700 picky:dark:bg-green-700 picky:dark:group-not-disabled:hover:bg-green-600 picky:active:ring-4 picky:active:ring-green-300/25',
        danger: 'picky:border picky:border-transparent picky:bg-red-600 picky:text-white picky:font-medium picky:group-not-disabled:hover:bg-red-700 picky:dark:bg-red-700 picky:dark:group-not-disabled:hover:bg-red-600 picky:active:ring-4 picky:active:ring-red-300/25',
        gray: 'picky:border picky:border-transparent picky:bg-neutral-500 picky:text-white picky:font-medium picky:group-not-disabled:hover:bg-neutral-600 picky:dark:bg-neutral-600 picky:dark:group-not-disabled:hover:bg-neutral-500 picky:active:ring-4 picky:active:ring-neutral-300/20',
        custom: 'picky:border picky:border-transparent picky:font-medium',
    },
    outline: {
        primary:
            'picky:border picky:border-primary-500 picky:text-black picky:dark:text-white picky:group-not-disabled:hover:bg-primary-700/5 picky:dark:group-not-disabled:hover:bg-primary-200/10 picky:active:ring-4 picky:active:ring-primary-500/35',
        secondary:
            'picky:border picky:border-secondary-500 picky:text-black picky:dark:text-white picky:group-not-disabled:hover:bg-secondary-500/5 picky:dark:group-not-disabled:hover:bg-secondary-500/20 picky:active:ring-4 picky:active:ring-secondary-500/35',
        success:
            'picky:border picky:border-green-600 picky:text-green-600 picky:dark:border-green-500 picky:dark:text-green-300 picky:group-not-disabled:hover:bg-green-500/5 picky:active:ring-4 picky:active:ring-green-300/50',
        danger: 'picky:border picky:border-red-600 picky:text-red-600 picky:dark:border-red-400 picky:dark:text-red-500 picky:group-not-disabled:hover:bg-red-500/5 picky:active:ring-4 picky:active:ring-red-300/50',
        gray: 'picky:border picky:border-neutral-400 picky:text-neutral-900 picky:dark:border-dark-surface-500 picky:dark:text-neutral-200 picky:group-not-disabled:hover:bg-dark-surface-400/5 picky:active:ring-4 picky:active:ring-neutral-300/50',
        custom: 'picky:border',
    },
    text: {
        primary:
            'picky:font-normal picky:text-primary-500 picky:group-not-disabled:hover:bg-primary-500/10',
        secondary:
            'picky:font-normal picky:text-secondary-500 picky:group-not-disabled:hover:bg-secondary-500/10',
        success:
            'picky:font-normal picky:text-green-500 picky:group-not-disabled:hover:bg-green-500/10',
        danger: 'picky:font-normal picky:text-red-500 picky:group-not-disabled:hover:bg-red-500/10',
        gray: 'picky:font-normal picky:text-neutral-500 picky:group-not-disabled:hover:bg-neutral-500/10',
        custom: 'picky:font-normal',
    },
};

/**
 * Elke kleur zet alleen nog `--picky-shadow-color`. De vorm van de schaduw en het
 * press-gedrag komen uit de stylesheet, gestuurd door `data-picky-shadow`.
 *
 * Deze klassen staan bewust voluit: Tailwind scant bronbestanden op letterlijke
 * klassennamen, dus een klasse die pas at runtime uit strings wordt samengesteld
 * bestaat in de gecompileerde CSS niet.
 */
const shadowColorMap: Record<ButtonColor, string> = {
    primary: 'picky:[--picky-shadow-color:var(--picky-color-primary-500)]',
    secondary: 'picky:[--picky-shadow-color:var(--picky-color-secondary-500)]',
    success: 'picky:[--picky-shadow-color:var(--picky-color-green-500)]',
    danger: 'picky:[--picky-shadow-color:var(--picky-color-red-500)]',
    gray: 'picky:[--picky-shadow-color:var(--picky-color-neutral-500)]',
    custom: '',
};

// De tekstvariant heeft geen schaduw.
const shadowClasses = computed(() =>
    props.variant === 'text' ? 'picky:[--picky-shadow:none]' : shadowColorMap[props.color]
);

const originMap: Record<'all' | 'left' | 'right' | 'none', string> = {
    left: 'picky:origin-right',
    right: 'picky:origin-left',
    all: 'picky:origin-center',
    none: 'picky:origin-center',
};

const innerClasses = computed(() => [
    'picky:flex picky:w-full picky:items-center picky:justify-center picky:gap-x-2 picky:relative picky:cursor-pointer',
    'picky:motion-safe:transition-all picky:motion-safe:duration-100 picky:motion-safe:ease-in-out',
    sizeMap[props.size],
    variantColorMap[props.variant][props.color],
    'picky-pressable',
    shadowClasses.value,
    originMap[props.roundedSide],
    props.disabled ? 'picky:opacity-50 picky:cursor-not-allowed!' : '',
]);

const innerRadius = computed(() => {
    const r = 'var(--picky-radius-button)';
    if (props.roundedSide === 'none') return '0';
    if (props.roundedSide === 'left') return `${r} 0 0 ${r}`;
    if (props.roundedSide === 'right') return `0 ${r} ${r} 0`;
    return r;
});

const innerStyle = computed(() => {
    const style: Record<string, string> = {
        borderRadius: innerRadius.value,
        ...(props.transitionRadius
            ? { transition: 'transform 100ms, border-radius 200ms ease-out' }
            : {}),
    };

    if (props.color !== 'custom' || !props.customColor) return style;

    // Hover- en press-schakeringen doet CSS met color-mix(); alleen de keuze tussen
    // zwarte en witte tekst vraagt om een luminantieberekening in JS.
    const base = props.customColor;
    style['--picky-custom-color'] = base;

    if (props.variant === 'full') {
        style.backgroundColor = base;
        style.color = readableTextColor(base);
    } else if (props.variant === 'outline') {
        style.borderColor = base;
        style.color = base;
    } else {
        style.color = base;
    }

    return style;
});

const showTempLabel = ref(false);
let tempLabelTimeout: ReturnType<typeof setTimeout> | null = null;

function handleClick(event: MouseEvent) {
    if (props.disabled) {
        // Een <a> heeft geen disabled-attribuut, dus navigatie moet hier gestopt worden.
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
