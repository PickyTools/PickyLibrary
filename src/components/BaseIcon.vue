<template>
    <span
        v-bind="rest"
        :class="['picky-icon', $attrs.class]"
        :style="ratio === 1 ? undefined : { '--picky-icon-ratio': String(ratio) }"
        :data-size="size"
        :role="label ? 'img' : undefined"
        :aria-label="label || undefined"
        :aria-hidden="label ? undefined : 'true'"
    >
        <component :is="resolved" v-if="isComponent" class="picky-icon-svg" />
        <span v-else-if="markup" class="picky-icon__markup" v-html="markup" />
    </span>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue';
import type { Size } from '../types';
import { useIconResolver } from '../icons';
import { fetchSvg, isSvgMarkup, prepareSvg } from '../internal/svg';

defineOptions({ name: 'BaseIcon', inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        /** Name of the icon, handed to your resolver. */
        code: string;
        /** Optional style variant (`solid`, `regular`, ...). Only useful if your source has them. */
        variant?: string;
        size?: Size;
        /**
         * Width divided by height. Defaults to 1 (square), which is right for most
         * sets. Font Awesome draws wider than tall on average, so 1.25 gets you the
         * same optical size there.
         */
        ratio?: number;
        /**
         * Gives the icon an accessible name of its own. Without it the icon is
         * decorative (`aria-hidden`) and the name has to come from the surrounding
         * element -- which is the right pattern for an icon inside a button.
         */
        label?: string;
    }>(),
    { variant: undefined, size: 'md', ratio: 1, label: '' }
);

const attrs = useAttrs();

// class goes through the :class above; everything else passes through unchanged,
// minus class, so it is not applied twice.
const rest = computed(() => {
    const { class: _class, ...others } = attrs;
    return others;
});

const resolve = useIconResolver();
const resolved = computed(() => resolve(props.code, props.variant));
const isComponent = computed(() => typeof resolved.value === 'function' || typeof resolved.value === 'object');

const markup = ref('');

watch(
    resolved,
    async (source) => {
        if (typeof source !== 'string') {
            markup.value = '';
            return;
        }

        if (isSvgMarkup(source)) {
            markup.value = prepareSvg(source);
            return;
        }

        markup.value = (await fetchSvg(source)) ?? '';
    },
    { immediate: true }
);
</script>
