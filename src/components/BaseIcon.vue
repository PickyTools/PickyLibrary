<template>
    <span
        v-bind="$attrs"
        :class="['picky:relative picky:inline-flex picky:shrink-0 picky:items-center picky:justify-center picky:align-middle picky:leading-none picky:text-current', $attrs.class]"
        :style="boxStyle"
        :role="label ? 'img' : undefined"
        :aria-label="label || undefined"
        :aria-hidden="label ? undefined : 'true'"
    >
        <component :is="resolved" v-if="isComponent" class="picky-icon-svg" />
        <span
            v-else-if="markup"
            class="picky:contents"
            v-html="markup"
        />
    </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Size } from '../types';
import { useIconResolver } from '../icons';
import { fetchSvg, isSvgMarkup, prepareSvg } from '../internal/svg';

defineOptions({ name: 'BaseIcon', inheritAttrs: false });

const props = withDefaults(
    defineProps<{
        /** Naam van het icoon, doorgegeven aan je resolver. */
        code: string;
        /** Optionele stijlvariant (`solid`, `regular`, …). Alleen zinvol als jouw bron varianten kent. */
        variant?: string;
        size?: Size;
        /**
         * Breedte gedeeld door hoogte. Standaard 1 (vierkant), wat klopt voor de
         * meeste sets. Font Awesome tekent gemiddeld breder dan hoog; gebruik dan
         * bijvoorbeeld 1.25 om dezelfde optische maat te krijgen als voorheen.
         */
        ratio?: number;
        /**
         * Laat het icoon zelf een toegankelijke naam dragen. Zonder dit is het
         * decoratief (`aria-hidden`) en moet de naam van het omliggende element komen —
         * wat het juiste patroon is voor een icoon ín een knop.
         */
        label?: string;
    }>(),
    { variant: undefined, size: 'md', ratio: 1, label: '' }
);

const sizeMap: Record<Size, string> = {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
};

const boxStyle = computed(() => {
    const height = sizeMap[props.size];
    return {
        height,
        width: props.ratio === 1 ? height : `calc(${height} * ${props.ratio})`,
    };
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

<style>
/* Niet scoped: de SVG komt via v-html of <component :is> binnen en draagt dus
   geen scope-attribuut. Bewust smal gehouden tot onze eigen class. */
.picky-icon-svg {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
