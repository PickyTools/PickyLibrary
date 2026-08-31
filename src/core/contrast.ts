/*
 * Colour maths: WCAG contrast, and picking readable text.
 *
 * Lives in core because it is pure arithmetic -- no DOM, no framework -- and
 * because two callers need it. The accessibility test reads the real stylesheet
 * with it and checks every colour pair the library ships, instead of taking the
 * palette on trust. BaseButton uses `readableTextColor` for its `custom` colour.
 *
 * Internal: none of this is exported from the package entry point.
 */

/** sRGB channels in the 0..1 range. */
export type Rgb = [number, number, number];

function parseHex(value: string): Rgb | null {
    let hex = value.replace(/^#/, '');
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Rgb;
}

/**
 * Converts `oklch(L C H)` to sRGB.
 *
 * Needed because the palette is authored in oklch: it is perceptually uniform, so
 * a step from -600 to -700 changes lightness by the same amount in every hue. WCAG
 * contrast, however, is defined on sRGB, so the values have to come back down.
 *
 * Follows Björn Ottosson's reference conversion: oklch -> oklab -> linear sRGB.
 */
function parseOklch(value: string): Rgb | null {
    const match = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+|none)/i.exec(value.trim());
    if (!match) return null;

    const lightness = value.includes('%') ? Number(match[1]) / 100 : Number(match[1]);
    const chroma = Number(match[2]);
    const hue = match[3] === 'none' ? 0 : Number(match[3]);

    const radians = (hue * Math.PI) / 180;
    const a = chroma * Math.cos(radians);
    const b = chroma * Math.sin(radians);

    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

    const linear: Rgb = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];

    // Gamma-encode, and clamp anything outside the sRGB gamut to its edge.
    return linear.map((channel) => {
        const clamped = Math.min(Math.max(channel, 0), 1);
        const encoded = clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055;
        return Math.min(Math.max(encoded, 0), 1);
    }) as Rgb;
}

function parseRgbFunction(value: string): Rgb | null {
    const match = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(value);
    if (!match) return null;

    const clamp = (raw: string | undefined) => Math.min(255, Math.max(0, Number(raw ?? 0))) / 255;
    return [clamp(match[1]), clamp(match[2]), clamp(match[3])];
}

/** Accepts hex, `rgb()`/`rgba()` or `oklch()`; null for anything it cannot read. */
export function parseColor(value: string): Rgb | null {
    const trimmed = value.trim();
    if (trimmed.startsWith('#')) return parseHex(trimmed);
    if (/^rgba?\(/i.test(trimmed)) return parseRgbFunction(trimmed);
    return parseOklch(trimmed);
}

/** Relative luminance as WCAG 2.x defines it. */
export function relativeLuminance([r, g, b]: Rgb): number {
    const linear = (channel: number) =>
        channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Contrast ratio between two colours: 1 (identical) up to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
    const first = parseColor(a);
    const second = parseColor(b);
    if (!first || !second) return 0;

    const one = relativeLuminance(first);
    const other = relativeLuminance(second);
    const high = Math.max(one, other);
    const low = Math.min(one, other);

    return (high + 0.05) / (low + 0.05);
}

/**
 * Flattens a translucent colour onto an opaque one.
 *
 * Approximates `color-mix()`, which the browser evaluates in oklab while this works
 * in sRGB. Close enough to judge contrast by, and the thresholds it is checked
 * against keep enough margin that the difference cannot flip a verdict.
 */
export function blend(foreground: string, background: string, alpha: number): string {
    const fg = parseColor(foreground);
    const bg = parseColor(background);
    if (!fg || !bg) return background;

    const channel = (from: number, onto: number) =>
        Math.round((from * alpha + onto * (1 - alpha)) * 255)
            .toString(16)
            .padStart(2, '0');

    return `#${channel(fg[0], bg[0])}${channel(fg[1], bg[1])}${channel(fg[2], bg[2])}`;
}

/**
 * Picks black or white text for the best contrast on `background`.
 *
 * 0.179 is the luminance where contrast against black and against white is equal,
 * so it is the point where the better choice flips.
 *
 * This is the one colour decision JavaScript still has to make. Hover and press
 * shades are mixed by CSS with `color-mix()`; choosing a readable text colour is
 * not something CSS can express yet.
 */
export function readableTextColor(background: string): '#000000' | '#ffffff' {
    const rgb = parseColor(background);
    if (!rgb) return '#ffffff';
    return relativeLuminance(rgb) > 0.179 ? '#000000' : '#ffffff';
}
