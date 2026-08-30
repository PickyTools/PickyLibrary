/**
 * Gedeelde scroll-lock voor overlays.
 *
 * Staat bewust in een eigen module en niet in het component. In een SFC is
 * `<script setup>` de setup-functie zelf, dus een `let` daarbinnen is per instance —
 * en dan geeft het sluiten van de ene modal het scrollen vrij terwijl een andere
 * nog open staat. Dezelfde valkuil zorgde in de oorspronkelijke BaseModal ervoor
 * dat elke instance id="modal-title-1" kreeg.
 */
let lockCount = 0;

export function lockBodyScroll(): void {
    if (lockCount === 0) {
        // Meet de scrollbarbreedte vóór het verbergen, anders verspringt de lay-out.
        const width = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = `${width}px`;
        document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
}

export function unlockBodyScroll(): void {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}

/** Alleen voor tests. */
export function resetBodyScrollLock(): void {
    lockCount = 0;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}
