<template>
    <div :class="['picky:flex picky:flex-col picky:gap-y-1', attrs.class]" :style="attrs.style as string">
        <label
            v-if="label"
            :for="inputId"
            :class="[
                'picky:text-text-body picky:font-medium picky:select-none',
                labelSizeMap[size],
                disabled ? 'picky:cursor-not-allowed picky:opacity-50' : 'picky:cursor-pointer',
            ]"
        >
            {{ label }}
            <span v-if="required" class="picky:ml-0.5 picky:text-red-500" aria-hidden="true">*</span>
        </label>

        <!-- De wrapper draagt alle styling; het veld zelf is kaal. Als <label for>
             stuurt hij randklikken native door naar het veld, dus er is geen
             muis-only klikafhandeling nodig. -->
        <label
            :for="inputId"
            :class="[
                'picky:flex picky:items-center picky-pressable',
                'picky:motion-safe:transition-[color,background-color,border-color,box-shadow] picky:motion-safe:duration-150',
                isTextarea ? wrapperTextareaSizeMap[size] : wrapperSizeMap[size],
                isTextarea ? 'picky:h-auto picky:items-start' : '',
                stateClasses,
                disabled
                    ? 'picky:opacity-50 picky:cursor-not-allowed picky:*:cursor-not-allowed'
                    : readonly
                      ? 'picky:cursor-default'
                      : 'picky:cursor-text',
            ]"
            :style="wrapperStyle"
        >
            <span v-if="$slots.prefix" :class="['picky:text-text-caption picky:shrink-0', prefixMap[size]]">
                <slot name="prefix" />
            </span>

            <component
                :is="isTextarea ? 'textarea' : 'input'"
                :id="inputId"
                ref="inputEl"
                :type="isTextarea ? undefined : type"
                :name="name"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :readonly="readonly"
                :required="required"
                :rows="isTextarea ? rows : undefined"
                :min="isTextarea ? undefined : min"
                :max="isTextarea ? undefined : max"
                :step="isTextarea ? undefined : step"
                :minlength="minlength"
                :maxlength="maxlength"
                :pattern="isTextarea ? undefined : pattern"
                :autocomplete="autocomplete"
                :aria-label="label ? undefined : placeholder || undefined"
                :aria-describedby="describedBy"
                :aria-invalid="hasError || undefined"
                :aria-required="required || undefined"
                :class="[fieldClasses, isTextarea ? 'picky:resize-y' : paddingClasses]"
                v-bind="fieldAttrs"
                @input="onInput"
                @change="emit('change', $event as Event)"
                @focus="emit('focus', $event as FocusEvent)"
                @blur="emit('blur', $event as FocusEvent)"
            />

            <span v-if="$slots.suffix" :class="['picky:text-text-caption picky:shrink-0', suffixMap[size]]">
                <slot name="suffix" />
            </span>
        </label>

        <!-- role="alert" alleen bij een fout: een foutmelding die na verzenden
             verschijnt moet aangekondigd worden, een statische hint niet. -->
        <p
            v-if="error || hint"
            :id="messageId"
            :role="hasError ? 'alert' : undefined"
            :class="[
                'picky:text-xs',
                hasError ? 'picky:text-red-600 picky:dark:text-red-400' : 'picky:text-text-muted',
            ]"
        >
            {{ error || hint }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, useId, useSlots } from 'vue';
import type { HasDisabled, HasSize, Size } from '../types';

type InputType =
    | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
    | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'textarea';

// class/style horen op de wortel, alle overige attributen op het veld zelf.
defineOptions({ name: 'BaseInput', inheritAttrs: false });

defineSlots<{
    prefix(): unknown;
    suffix(): unknown;
}>();

const props = withDefaults(
    defineProps<
        HasSize &
            HasDisabled & {
                modelValue?: string | number;
                type?: InputType;
                label?: string;
                placeholder?: string;
                hint?: string;
                /** Aanwezigheid maakt het veld ongeldig én kondigt de melding aan. */
                error?: string;
                readonly?: boolean;
                required?: boolean;
                name?: string;
                id?: string;
                autocomplete?: string;
                rows?: number;
                min?: string | number;
                max?: string | number;
                step?: string | number;
                minlength?: number;
                maxlength?: number;
                pattern?: string;
            }
    >(),
    {
        modelValue: '',
        type: 'text',
        size: 'md',
        disabled: false,
        readonly: false,
        required: false,
        rows: 3,
        label: '',
        placeholder: '',
        hint: '',
        error: '',
        name: undefined,
        id: undefined,
        autocomplete: undefined,
        min: undefined,
        max: undefined,
        step: undefined,
        minlength: undefined,
        maxlength: undefined,
        pattern: undefined,
    }
);

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | number): void;
    (e: 'input', event: Event): void;
    (e: 'change', event: Event): void;
    (e: 'focus', event: FocusEvent): void;
    (e: 'blur', event: FocusEvent): void;
}>();

const attrs = useAttrs();
const slots = useSlots();

const fieldAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs;
    return rest;
});

const inputEl = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

defineExpose({
    focus: () => inputEl.value?.focus(),
    blur: () => inputEl.value?.blur(),
    select: () => inputEl.value?.select(),
    /** Het onderliggende element, voor wat de bovenstaande helpers niet dekken. */
    el: inputEl,
});

const isTextarea = computed(() => props.type === 'textarea');
const hasError = computed(() => Boolean(props.error));

const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);
const messageId = computed(() => `${inputId.value}-message`);

// Alleen verwijzen naar de melding als die ook echt bestaat; anders wijst
// aria-describedby naar een id dat niet in de DOM staat.
const describedBy = computed(() => (props.error || props.hint ? messageId.value : undefined));

const labelSizeMap: Record<Size, string> = {
    xs: 'picky:text-xs',
    sm: 'picky:text-xs',
    md: 'picky:text-sm',
    lg: 'picky:text-base',
};

const wrapperSizeMap: Record<Size, string> = {
    xs: 'picky:h-6 picky:gap-x-1 picky:text-xs',
    sm: 'picky:h-8 picky:gap-x-1.5 picky:text-sm',
    md: 'picky:h-10 picky:gap-x-2 picky:text-base',
    lg: 'picky:h-14 picky:gap-x-3 picky:text-xl',
};

const wrapperTextareaSizeMap: Record<Size, string> = {
    xs: 'picky:px-1.5 picky:py-1 picky:gap-x-1 picky:text-xs',
    sm: 'picky:px-2 picky:py-1.5 picky:gap-x-1.5 picky:text-sm',
    md: 'picky:px-3 picky:py-2 picky:gap-x-2 picky:text-base',
    lg: 'picky:px-4 picky:py-3 picky:gap-x-3 picky:text-xl',
};

const prefixMap: Record<Size, string> = {
    xs: 'picky:ml-1.5',
    sm: 'picky:ml-2',
    md: 'picky:ml-3',
    lg: 'picky:ml-4',
};

const suffixMap: Record<Size, string> = {
    xs: 'picky:mr-1.5',
    sm: 'picky:mr-2',
    md: 'picky:mr-3',
    lg: 'picky:mr-4',
};

const padLeftMap: Record<Size, string> = {
    xs: 'picky:pl-1.5',
    sm: 'picky:pl-2',
    md: 'picky:pl-3',
    lg: 'picky:pl-4',
};

const padRightMap: Record<Size, string> = {
    xs: 'picky:pr-1.5',
    sm: 'picky:pr-2',
    md: 'picky:pr-3',
    lg: 'picky:pr-4',
};

// De horizontale padding zit op het veld, niet op de wrapper, zodat het klikgebied
// van het veld de hele wrapper dekt. Chrome toont autofill alleen wanneer een echte
// mousedown op het veld zelf landt.
const paddingClasses = computed(() => [
    slots.prefix ? '' : padLeftMap[props.size],
    slots.suffix ? '' : padRightMap[props.size],
    'picky:h-full',
]);

const fieldClasses =
    'picky-reset picky-input-field picky:min-w-0 picky:flex-1 picky:appearance-none picky:border-0 picky:bg-transparent picky:text-inherit picky:placeholder:text-neutral-400 picky:dark:placeholder:text-dark-surface-500 picky:read-only:cursor-default';

const baseState =
    'picky:bg-transparent picky:text-neutral-900 picky:dark:text-dark-surface-100 picky:[--picky-input-text:var(--picky-color-neutral-900)] picky:dark:[--picky-input-text:var(--picky-color-dark-surface-50)]';

// Alle drie de toestanden krijgen een zichtbare focusring. De readonly-variant had
// er eerder geen: die is nog steeds focusbaar en selecteerbaar, dus zonder ring
// verdwijnt de toetsenbordpositie uit beeld.
const focusRing =
    'picky:focus-within:ring-2 picky:focus-within:ring-offset-2 picky:focus-within:ring-offset-transparent';

const stateClasses = computed(() => {
    if (hasError.value) {
        return `${baseState} ${focusRing} picky:border picky:border-red-500 picky:dark:border-red-500 picky:focus-within:ring-red-500/40 picky:[--picky-shadow-color:var(--picky-color-red-500)]`;
    }

    if (props.readonly) {
        return `${baseState} ${focusRing} picky:border picky:border-neutral-300 picky:dark:border-dark-surface-600 picky:bg-neutral-100 picky:dark:bg-dark-surface-800 picky:focus-within:ring-neutral-400/40 picky:[--picky-shadow:none]`;
    }

    return `${baseState} ${focusRing} picky:border picky:border-neutral-400 picky:dark:border-dark-surface-500 picky:focus-within:border-neutral-500 picky:dark:focus-within:border-dark-surface-300 picky:focus-within:ring-[var(--picky-color-focus-ring)]/40 picky:[--picky-shadow-color:var(--picky-color-neutral-500)]`;
});

const wrapperStyle = computed(() => ({
    borderRadius: isTextarea.value
        ? 'min(var(--picky-radius-button), 1.5rem)'
        : 'var(--picky-radius-button)',
}));

function onInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value =
        props.type === 'number' && target instanceof HTMLInputElement
            ? Number.isNaN(target.valueAsNumber)
                ? target.value
                : target.valueAsNumber
            : target.value;

    emit('update:modelValue', value);
    emit('input', event);
}
</script>

<style>
/* De focusring zit op de wrapper (focus-within), dus het veld zelf hoeft er geen te
   tonen. Bewust zónder !important: eerder stond hier `outline: none !important`, wat
   ook de eigen focusstijl van een consument en de forced-colors-modus van Windows
   onderdrukte. */
.picky-input-field:focus,
.picky-input-field:focus-visible {
    outline: none;
    box-shadow: none;
}

@media (forced-colors: active) {
    .picky-input-field:focus-visible {
        outline: revert;
    }
}

.picky-input-field:-webkit-autofill,
.picky-input-field:-webkit-autofill:hover,
.picky-input-field:-webkit-autofill:focus {
    /* Custom properties erven door de DOM, dus --picky-input-text (met de juiste
       licht/donker-waarde op de wrapper) is hier beschikbaar zonder afhankelijk te
       zijn van currentColor, die Chrome tijdens autofill kan overschrijven. */
    -webkit-text-fill-color: var(--picky-input-text) !important;
    -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
    box-shadow: 0 0 0 1000px transparent inset !important;
    transition: background-color 9999s ease-out 0s;
}
</style>
