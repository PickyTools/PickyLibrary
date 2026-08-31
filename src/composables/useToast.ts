import {
    getCurrentInstance,
    getCurrentScope,
    inject,
    onScopeDispose,
    provide,
    readonly,
    shallowRef,
    type InjectionKey,
} from 'vue';
import { createToastStore, type Toast, type ToastStore } from '../core/toast';

export type { Toast, ToastOptions, ToastStore } from '../core/toast';

export const ToastStoreKey: InjectionKey<ToastStore> = Symbol('picky-toast-store');

/**
 * Gives this app its own toast store. Call it in the setup of your root component,
 * or use `app.provide(ToastStoreKey, createToastStore())`.
 *
 * **Required for server-side rendering.** Without it, `useToast()` falls back to a
 * store outside the component tree, and on a server that store is shared by every
 * request in flight.
 */
export function provideToasts(store: ToastStore = createToastStore()): ToastStore {
    provide(ToastStoreKey, store);
    return store;
}

let browserFallback: ToastStore | null = null;

function fallbackStore(): ToastStore {
    // Never a singleton on the server: module scope outlives a single request
    // there, so a shared store leaks one visitor's toast to the next. A fresh empty
    // store is the safe answer -- on the server a toast is not visible before the
    // page hydrates anyway.
    if (typeof window === 'undefined') {
        if (import.meta.env.DEV) {
            console.warn(
                '[PickyLibrary] useToast() was called during server rendering without a ' +
                    'provided store. Call provideToasts() in your root component so each ' +
                    'request gets its own.'
            );
        }
        return createToastStore();
    }

    browserFallback ??= createToastStore();
    return browserFallback;
}

/**
 * Access to the toast state. Uses the store put in place by `provideToasts()`, and
 * in the browser falls back to a single shared store so you can raise a toast from
 * anywhere without passing it around.
 */
export function useToast() {
    // inject() warns outside a setup function, and useToast() is allowed to be
    // called at module scope.
    const store = (getCurrentInstance() ? inject(ToastStoreKey, null) : null) ?? fallbackStore();

    const toasts = shallowRef<readonly Toast[]>(store.getToasts());
    const unsubscribe = store.subscribe(() => {
        toasts.value = store.getToasts();
    });

    if (getCurrentScope()) onScopeDispose(unsubscribe);

    return {
        toasts: readonly(toasts),
        addToast: store.add,
        removeToast: store.remove,
        clearToasts: store.clear,
    };
}
