/**
 * Bereidt een opgehaalde of meegegeven SVG-string voor op inline gebruik.
 *
 * De ColorPicky-versie forceerde `fill="currentColor"` op elke SVG. Bij dubbele
 * attributen wint in HTML de eerste, dus dat overschreef de `fill="none"` van
 * stroke-gebaseerde sets — Lucide, Feather en Phosphor-thin werden er dichte blobs
 * van. We vullen `fill` daarom alleen aan wanneer de SVG zelf nergens `fill` of
 * `stroke` declareert, wat precies de fill-gebaseerde sets zijn (o.a. Font Awesome).
 */
export function prepareSvg(raw: string): string {
    const declaresPaint = /\s(?:fill|stroke)\s*=/.test(raw);
    const extra = declaresPaint ? '' : ' fill="currentColor"';

    return raw.replace(/<svg\b/i, (tag) => `${tag} class="picky-icon-svg"${extra}`);
}

/** Herkent of een resolver-string markup is in plaats van een URL. */
export function isSvgMarkup(value: string): boolean {
    return /^\s*<svg[\s>]/i.test(value);
}

/**
 * Module-scope cache. In de ColorPicky-versie stond deze binnen `<script setup>`,
 * wat betekent dat hij per instance werd aangemaakt: veertig iconen op een pagina
 * gaven veertig requests voor hetzelfde bestand. Hier is hij echt gedeeld, en
 * gelijktijdige aanvragen voor dezelfde URL delen één promise.
 */
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

export function fetchSvg(url: string): Promise<string | null> {
    const cached = cache.get(url);
    if (cached !== undefined) return Promise.resolve(cached);

    const pending = inFlight.get(url);
    if (pending) return pending;

    const request = (async (): Promise<string | null> => {
        try {
            const response = await fetch(url);
            const raw = await response.text();

            if (!response.ok || !isSvgMarkup(raw)) {
                if (import.meta.env.DEV) {
                    console.warn(`[PickyLibrary] Icon at ${url} is missing or is not an SVG.`);
                }
                return null;
            }

            const prepared = prepareSvg(raw);
            cache.set(url, prepared);
            return prepared;
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn(`[PickyLibrary] Could not load icon at ${url}.`, error);
            }
            return null;
        } finally {
            inFlight.delete(url);
        }
    })();

    inFlight.set(url, request);
    return request;
}

/** Alleen voor tests. */
export function clearSvgCache(): void {
    cache.clear();
    inFlight.clear();
}
