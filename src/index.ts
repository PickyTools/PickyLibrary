/*
 * This import is a build mechanism, not a consumer API: it is the only reference to
 * the stylesheet, and without it Vite emits no dist/style.css.
 *
 * In library mode Vite then strips the import from the JavaScript output. The built
 * bundle contains none, which means the package can be imported in plain Node --
 * where SSR runs -- and that consumers pull in the stylesheet themselves:
 *
 *     import 'pickylibrary/style.css';
 */
import './styles/index.css';

export { default as BaseAlert } from './components/BaseAlert.vue';
export { default as BaseButton } from './components/BaseButton.vue';
export { default as BaseCheckbox } from './components/BaseCheckbox.vue';
export { default as BaseIcon } from './components/BaseIcon.vue';
export { default as BaseInput } from './components/BaseInput.vue';
export { default as BaseModal } from './components/BaseModal.vue';
export { default as BasePasswordInput } from './components/BasePasswordInput.vue';
export { default as BaseSelect } from './components/BaseSelect.vue';
export type { SelectOption } from './core/select';
export { default as BaseSwitch } from './components/BaseSwitch.vue';
export { default as BasePill } from './components/BasePill.vue';
export { default as BaseToast } from './components/BaseToast.vue';
export { default as ToastContainer } from './components/ToastContainer.vue';

export { useToast, provideToasts, ToastStoreKey } from './composables/useToast';
export { createToastStore } from './core/toast';
export type { Toast, ToastOptions, ToastStore } from './composables/useToast';
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
