<template>
    <div :class="['picky:border picky:p-4', typeMap[type]]" :style="{ borderRadius: 'var(--picky-radius-container)' }" role="alert">
        <div class="picky:flex picky:items-start picky:gap-3">
            <slot name="icon">
                <BaseIcon v-if="resolvedIcon" :code="resolvedIcon" class="picky:mt-0.5 picky:shrink-0" />
            </slot>

            <div class="picky:min-w-0 picky:flex-1">
                <p class="picky:text-sm picky:leading-tight picky:font-semibold">{{ title }}</p>
                <p v-if="description" class="picky:mt-1 picky:text-sm picky:leading-snug picky:opacity-75">
                    {{ description }}
                </p>
                <div v-if="$slots.default" class="picky:mt-3">
                    <slot />
                </div>
            </div>

            <button
                v-if="dismissible"
                type="button"
                :aria-label="closeLabel"
                class="picky-reset picky:flex picky:h-6 picky:w-6 picky:shrink-0 picky:cursor-pointer picky:items-center picky:justify-center picky:self-start picky:rounded picky:opacity-60 picky:hover:opacity-100 picky:motion-safe:transition-opacity picky:focus-visible:outline-2 picky:focus-visible:outline-offset-2"
                @click="emit('dismiss')"
            >
                <slot name="close-icon">
                    <BaseIcon :code="closeIcon" />
                </slot>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from './BaseIcon.vue';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

defineOptions({ name: 'BaseAlert' });

defineSlots<{
    /** Extra inhoud onder de omschrijving. */
    default(): unknown;
    /** Vervangt het type-icoon. */
    icon(): unknown;
    /** Vervangt het icoon in de sluitknop. */
    'close-icon'(): unknown;
}>();

const props = withDefaults(
    defineProps<{
        title: string;
        type?: AlertType;
        description?: string;
        dismissible?: boolean;
        /** Engelse default; vervang voor je eigen taal. */
        closeLabel?: string;
        closeIcon?: string;
        /** Overschrijft de icooncode voor dit type. Leeg laat het icoon weg. */
        icon?: string;
    }>(),
    {
        type: 'info',
        description: '',
        dismissible: false,
        closeLabel: 'Close',
        closeIcon: 'xmark',
        icon: undefined,
    }
);

const emit = defineEmits<{ (e: 'dismiss'): void }>();

const typeMap: Record<AlertType, string> = {
    info: 'picky:bg-blue-50 picky:border-blue-200 picky:text-blue-800 picky:dark:bg-blue-950/40 picky:dark:border-blue-800 picky:dark:text-blue-200',
    warning:
        'picky:bg-yellow-50 picky:border-yellow-200 picky:text-yellow-800 picky:dark:bg-yellow-950/40 picky:dark:border-yellow-800 picky:dark:text-yellow-200',
    error: 'picky:bg-red-50 picky:border-red-200 picky:text-red-800 picky:dark:bg-red-950/40 picky:dark:border-red-800 picky:dark:text-red-200',
    success:
        'picky:bg-green-50 picky:border-green-200 picky:text-green-800 picky:dark:bg-green-950/40 picky:dark:border-green-800 picky:dark:text-green-200',
};

// Namen uit een gangbare set; werkt jouw resolver met andere codes, dan geef je
// `icon` mee of vul je de icon-slot.
const defaultIconMap: Record<AlertType, string> = {
    info: 'circle-info',
    warning: 'circle-exclamation',
    error: 'triangle-exclamation',
    success: 'circle-check',
};

const resolvedIcon = computed(() => props.icon ?? defaultIconMap[props.type]);
</script>
