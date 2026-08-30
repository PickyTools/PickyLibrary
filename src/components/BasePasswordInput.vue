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
            <!-- Geen tabindex="-1": tonen/verbergen is een kernvoorziening voor wie
                 dyslexie of een motorische beperking heeft, en voor iedereen op een
                 telefoontoetsenbord. @mousedown.prevent houdt de focus in het veld
                 bij een muisklik, wat de reden was dat de knop eerder uit de
                 tabvolgorde was gehaald. -->
            <button
                type="button"
                :aria-label="visible ? hideLabel : showLabel"
                :aria-pressed="visible"
                class="picky-reset picky:flex picky:shrink-0 picky:cursor-pointer picky:items-center picky:justify-center picky:rounded picky:p-0.5 picky:text-text-caption picky:transition-colors picky:hover:text-text-muted picky:focus-visible:outline-2 picky:focus-visible:outline-offset-2 picky:focus-visible:outline-[var(--picky-color-focus-ring)]"
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
    prefix(): unknown;
    suffix(): unknown;
}>();

withDefaults(
    defineProps<{
        modelValue?: string | number;
        size?: Size;
        /** Namen voor de toggle. Engelse defaults; vervang ze voor je eigen taal. */
        showLabel?: string;
        hideLabel?: string;
        /** Icooncodes, doorgegeven aan jouw resolver. */
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
