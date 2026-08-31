<template>
    <BaseInput
        ref="inputRef"
        v-bind="$attrs"
        :size="size"
        :type="visible ? 'text' : 'password'"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template v-if="$slots.prefix" #prefix>
            <slot name="prefix" />
        </template>

        <template #suffix>
            <slot name="suffix" />
            <!-- No tabindex="-1": show/hide is a core affordance for people with
                 dyslexia or a motor impairment, and for anyone on a phone keyboard.
                 @mousedown.prevent keeps focus in the field on a mouse click, which
                 was the reason the button had been pulled out of the tab order. -->
            <button
                type="button"
                :aria-label="visible ? hideLabel : showLabel"
                :aria-pressed="visible"
                class="picky-reset picky-password-toggle"
                @click="visible = !visible"
                @mousedown.prevent
            >
                <BaseIcon :code="visible ? hideIcon : showIcon" :size="size" />
            </button>
        </template>
    </BaseInput>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseInput from './BaseInput.vue';
import BaseIcon from './BaseIcon.vue';
import type { Size } from '../types';

defineOptions({ name: 'BasePasswordInput', inheritAttrs: false });

defineSlots<{
    prefix?(): unknown;
    suffix?(): unknown;
}>();

withDefaults(
    defineProps<{
        modelValue?: string | number;
        size?: Size;
        /** Names for the toggle. English by default; replace them for your own language. */
        showLabel?: string;
        hideLabel?: string;
        /** Icon codes, handed to your resolver. */
        showIcon?: string;
        hideIcon?: string;
    }>(),
    {
        modelValue: '',
        size: 'md',
        showLabel: 'Show password',
        hideLabel: 'Hide password',
        showIcon: 'eye',
        hideIcon: 'eye-slash',
    }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string | number): void }>();

const visible = ref(false);
const inputRef = ref<InstanceType<typeof BaseInput> | null>(null);

defineExpose({
    focus: () => inputRef.value?.focus(),
    blur: () => inputRef.value?.blur(),
});
</script>
