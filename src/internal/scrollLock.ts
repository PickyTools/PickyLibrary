/**
 * Shared scroll lock for overlays.
 *
 * Deliberately its own module rather than part of the component. In an SFC,
 * `<script setup>` is the setup function itself, so a `let` inside it is per
 * instance -- and then closing one modal releases scrolling while another is still
 * open. The same trap gave every instance of the original BaseModal the same
 * id="modal-title-1".
 */
let lockCount = 0;

/**
 * Blocking scroll is by definition a browser concern. During server-side rendering
 * there is no `document`, so these functions do nothing instead of throwing. The
 * counter stays at zero and the first real lock happens after hydration -- exactly
 * when there is something to scroll in the first place.
 */
function hasDocument(): boolean {
    return typeof document !== 'undefined';
}

export function lockBodyScroll(): void {
    if (!hasDocument()) return;

    if (lockCount === 0) {
        // Measure the scrollbar before hiding it, or the layout jumps.
        const width = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${width}px`;
        document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
}

export function unlockBodyScroll(): void {
    if (!hasDocument()) return;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

/** For tests only. */
export function resetBodyScrollLock(): void {
    lockCount = 0;
    if (!hasDocument()) return;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}
