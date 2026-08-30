/**
 * Minimale kleurhulp voor de `custom` knopkleur.
 *
 * Bewust klein gehouden: hover- en press-schakeringen doet CSS met `color-mix()`,
 * dus het enige wat JavaScript hier nog moet beslissen is of zwarte of witte tekst
 * beter leest op de opgegeven kleur — en dát kan CSS nog niet.
 */

/** Zet hex (#rgb of #rrggbb) of rgb()/rgba() om naar [r, g, b]. Null bij onbekende notatie. */
export function parseColor(input: string): [number, number, number] | null {
    const value = input.trim();

    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
    if (short) {
        return [short[1]!, short[2]!, short[3]!].map((c) => parseInt(c + c, 16)) as [
            number,
            number,
            number,
        ];
    }

    const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
    if (long) {
        return [long[1]!, long[2]!, long[3]!].map((c) => parseInt(c, 16)) as [
            number,
            number,
            number,
        ];
    }

    const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(value);
    if (rgb) {
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map((c) =>
            Math.min(255, Math.max(0, c))
        ) as [number, number, number];
    }

    return null;
}

/** WCAG relatieve luminantie (0 = zwart, 1 = wit). */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
    const [lr, lg, lb] = [r, g, b].map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }) as [number, number, number];

    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Kiest zwarte of witte tekst voor het beste contrast op `background`.
 * 0.179 is het omslagpunt waar het contrast met zwart en wit gelijk is.
 */
export function readableTextColor(background: string): '#000000' | '#ffffff' {
    const rgb = parseColor(background);
    if (!rgb) return '#ffffff';
    return relativeLuminance(rgb) > 0.179 ? '#000000' : '#ffffff';
}
