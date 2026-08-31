/**
 * Prepares a fetched or supplied SVG string for inline use.
 *
 * An earlier version forced `fill="currentColor"` onto every SVG. HTML keeps the
 * first of two duplicate attributes, so that overrode the `fill="none"` of
 * stroke-based sets, turning Lucide, Feather and Phosphor-thin into solid blobs.
 * `fill` is therefore only added when the SVG declares no `fill` or `stroke` of its
 * own -- which is exactly the fill-based sets, Font Awesome among them.
 */
export function prepareSvg(raw: string): string {
    const declaresPaint = /\s(?:fill|stroke)\s*=/.test(raw);
    const extra = declaresPaint ? '' : ' fill="currentColor"';

    return raw.replace(/<svg\b/i, (tag) => `${tag} class="picky-icon-svg"${extra}`);
}

/** Tells whether a resolver returned markup rather than a URL. */
export function isSvgMarkup(value: string): boolean {
    return /^\s*<svg[\s>]/i.test(value);
}

/**
 * Module-scope cache. An earlier version kept this inside `<script setup>`, which
 * means it was created per instance: forty icons on a page made forty requests for
 * the same file. Here it is genuinely shared, and concurrent requests for the same
 * URL share a single promise.
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

/** For tests only. */
export function clearSvgCache(): void {
    cache.clear();
    inFlight.clear();
}
