import './styles/index.css';

export { default as BaseAlert } from './components/BaseAlert.vue';
export { default as BaseButton } from './components/BaseButton.vue';
export { default as BaseIcon } from './components/BaseIcon.vue';
export { default as BaseInput } from './components/BaseInput.vue';
export { default as BasePasswordInput } from './components/BasePasswordInput.vue';
export { default as BasePill } from './components/BasePill.vue';
export { default as BaseToast } from './components/BaseToast.vue';
export { default as ToastContainer } from './components/ToastContainer.vue';

export { useToast } from './composables/useToast';
export type { Toast, ToastOptions, ToastStyle } from './composables/useToast';
export type { AlertType } from './components/BaseAlert.vue';

export { provideIcons, IconResolverKey } from './icons';
export type { IconResolver, IconSource } from './icons';

export type {
    Size,
    Color,
    HasSize,
    HasDisabled,
    HasColor,
    BaseComponentProps,
} from './types';
