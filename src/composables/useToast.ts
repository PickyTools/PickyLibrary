import { readonly, ref } from 'vue';

export type ToastStyle = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'gray';

export interface ToastOptions {
    title: string;
    description?: string;
    style?: ToastStyle;
    /** Icooncode, doorgegeven aan jouw resolver. Zonder waarde geen icoon. */
    icon?: string;
    /** Auto-sluiten in ms. `0` laat de toast staan tot hij handmatig weg gaat. */
    duration?: number;
    /**
     * Onderbreekt de schermlezer meteen in plaats van te wachten op een pauze.
     * Standaard alleen aan voor `danger`. Gebruik dit spaarzaam: een `assertive`
     * melding kapt af waar de gebruiker mee bezig was.
     */
    assertive?: boolean;
}

export interface Toast extends Required<Pick<ToastOptions, 'title' | 'style' | 'duration'>> {
    id: number;
    description: string;
    icon?: string;
    assertive: boolean;
}

const toasts = ref<Toast[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 0;

function removeToast(id: number): void {
    const timer = timers.get(id);
    if (timer) {
        clearTimeout(timer);
        timers.delete(id);
    }
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

function addToast(options: ToastOptions): number {
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

    toasts.value = [...toasts.value, toast];

    if (toast.duration > 0) {
        timers.set(
            id,
            setTimeout(() => removeToast(id), toast.duration)
        );
    }

    return id;
}

function clearToasts(): void {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    toasts.value = [];
}

/**
 * Gedeelde toaststate. Bewust module-scope, zodat je vanuit elke plek in je app
 * een toast kunt tonen zonder hem door te geven. Eén ToastContainer volstaat.
 */
export function useToast() {
    return { toasts: readonly(toasts), addToast, removeToast, clearToasts };
}
