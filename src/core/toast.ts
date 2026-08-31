import type { Color } from './types';

/*
 * The toast store, without a line of framework code.
 *
 * Reactivity is deliberately absent: the store reports changes through
 * `subscribe`, and each adapter translates that into its own primitive -- a ref in
 * Vue, useSyncExternalStore in React, a signal in Angular. That is the seam a
 * second framework plugs into.
 */

export interface ToastOptions {
    title: string;
    description?: string;
    style?: Color;
    /** Icon code, handed to your resolver. Without one, no icon renders. */
    icon?: string;
    /** Auto-dismiss in ms. `0` keeps the toast until it is dismissed by hand. */
    duration?: number;
    /**
     * Interrupts the screen reader straight away instead of waiting for a pause.
     * On by default only for `danger`. Use it sparingly: an assertive message cuts
     * across whatever the user was doing.
     */
    assertive?: boolean;
}

export interface Toast extends Required<Pick<ToastOptions, 'title' | 'style' | 'duration'>> {
    id: number;
    description: string;
    icon?: string;
    assertive: boolean;
}

export interface ToastStoreOptions {
    /**
     * How many toasts stay on screen. Adding another drops the oldest.
     *
     * A stack that grows without limit eventually pushes its own contents off the
     * screen, and a screen reader announces every one of them in turn. Three is
     * enough to see that several things happened without becoming a wall.
     *
     * Set to `0` to keep every toast.
     */
    limit?: number;
}

export interface ToastStore {
    getToasts(): readonly Toast[];
    add(options: ToastOptions): number;
    remove(id: number): void;
    clear(): void;
    /** Calls `listener` after every change. The return value unsubscribes. */
    subscribe(listener: () => void): () => void;
}

/**
 * Creates an empty, self-contained store.
 *
 * One per application instance, not one per module. On a server, module scope is
 * shared between requests, so a singleton would carry one visitor's toast over to
 * the next.
 */
export function createToastStore({ limit = 3 }: ToastStoreOptions = {}): ToastStore {
    let toasts: Toast[] = [];
    let nextId = 0;

    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const listeners = new Set<() => void>();

    const notify = () => listeners.forEach((listener) => listener());

    function remove(id: number): void {
        const timer = timers.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }

        toasts = toasts.filter((toast) => toast.id !== id);
        notify();
    }

    /**
     * Drops the oldest toasts until the stack fits.
     *
     * Prefers to drop a polite one: an assertive toast interrupted the user to say
     * something went wrong, so it should not be pushed out by a routine "Saved".
     * Only when nothing but assertive toasts remain does the oldest of those go.
     */
    function evict(): void {
        while (limit > 0 && toasts.length > limit) {
            const victim = toasts.find((toast) => !toast.assertive) ?? toasts[0];
            if (!victim) return;

            const timer = timers.get(victim.id);
            if (timer) {
                clearTimeout(timer);
                timers.delete(victim.id);
            }

            toasts = toasts.filter((toast) => toast !== victim);
        }
    }

    function add(options: ToastOptions): number {
        const id = ++nextId;
        const style = options.style ?? 'info';

        const toast: Toast = {
            id,
            title: options.title,
            description: options.description ?? '',
            style,
            icon: options.icon,
            duration: options.duration ?? 4000,
            assertive: options.assertive ?? style === 'danger',
        };

        toasts = [...toasts, toast];
        evict();

        if (toast.duration > 0) {
            timers.set(
                id,
                setTimeout(() => remove(id), toast.duration)
            );
        }

        notify();
        return id;
    }

    function clear(): void {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        toasts = [];
        notify();
    }

    return {
        getToasts: () => toasts,
        add,
        remove,
        clear,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
