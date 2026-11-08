<template>
    <div
        :class="['picky-input', attrs.class]"
        :style="attrs.style as string"
        :data-size="size"
        :data-state="state"
        :data-multiline="isTextarea ? 'true' : undefined"
        :data-disabled="disabled ? 'true' : undefined"
    >
        <label v-if="label" :for="inputId" class="picky-input__label">
            {{ label }}
            <span v-if="required" class="picky-input__required" aria-hidden="true">*</span>
        </label>

        <!-- The wrapper carries all the styling; the field itself is bare. Being a
             <label for>, it forwards edge clicks to the field natively, so no
             mouse-only click handling is needed. -->
        <label :for="inputId" class="picky-input__control picky-pressable">
            <span v-if="$slots.prefix" class="picky-input__prefix">
                <slot name="prefix" />
            </span>

            <component
                :is="isTextarea ? 'textarea' : 'input'"
                :id="inputId"
                ref="inputEl"
                class="picky-reset picky-input__field"
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
                v-bind="fieldAttrs"
                @input="onInput"
                @change="emit('change', $event as Event)"
                @focus="emit('focus', $event as FocusEvent)"
                @blur="emit('blur', $event as FocusEvent)"
            />

            <span v-if="$slots.suffix" class="picky-input__suffix">
                <slot name="suffix" />
            </span>
        </label>

        <!-- A hint is static text, so it is rendered only when there is one and it
             is never announced. -->
        <p v-if="hint && !hasError" :id="hintId" class="picky-input__message">
            {{ hint }}
        </p>

        <!--
            The error lives in its own region, and that region is in the document
            from the first render, empty, with its role already on it.

            A live region created together with its message is one several screen
            readers never read out: the text has to change inside a region that was
            already being watched. Putting `role="alert"` on at the same moment is
            the same failure one step along, so the role is static too, which is
            also why the hint above cannot share this element -- a static hint in a
            live region would be announced on page load.

            Empty, it is pulled out of the flow rather than hidden. `display: none`
            and `visibility: hidden` both take an element out of the accessibility
            tree, and then nothing is watching it at all. @see input.css.
        -->
        <p
            :id="messageId"
            role="alert"
            class="picky-input__message"
            :data-empty="hasError ? undefined : ''"
        >
            {{ error }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, useId } from 'vue';
import type { HasDisabled, HasSize } from '../types';

type InputType =
    | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
    | 'date' | 'time' | 'datetime-local' | 'month' | 'week' | 'textarea';

// class and style belong on the root, every other attribute on the field itself.
defineOptions({ name: 'BaseInput', inheritAttrs: false });

defineSlots<{
    prefix?(): unknown;
    suffix?(): unknown;
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
                /** Its presence marks the field invalid and announces the message. */
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

const fieldAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs;
    return rest;
});

const inputEl = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

defineExpose({
    focus: () => inputEl.value?.focus(),
    blur: () => inputEl.value?.blur(),
    select: () => inputEl.value?.select(),
    /** The underlying element, for whatever the helpers above do not cover. */
    el: inputEl,
});

const isTextarea = computed(() => props.type === 'textarea');
const hasError = computed(() => Boolean(props.error));

/** One attribute for the three mutually exclusive states input.css knows about. */
const state = computed(() => {
    if (hasError.value) return 'error';
    if (props.readonly) return 'readonly';
    return 'default';
});

const generatedId = useId();
const inputId = computed(() => props.id ?? generatedId);
const messageId = computed(() => `${inputId.value}-message`);
const hintId = computed(() => `${inputId.value}-hint`);

/*
 * Only point at a message that has something in it. The error region is always in
 * the document, so its id is always resolvable, but describing a field with an
 * empty string tells a reader nothing.
 */
const describedBy = computed(() => {
    if (props.error) return messageId.value;
    if (props.hint) return hintId.value;
    return undefined;
});

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
