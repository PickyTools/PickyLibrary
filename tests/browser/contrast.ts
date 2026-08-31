/*
 * Runs inside the page: finds every visible piece of text and measures it against
 * the background it actually sits on.
 *
 * Deliberately automatic rather than a list of selectors. A regression here looks
 * like "this text is invisible", and the way that happened was a component nobody
 * thought to add to a list. Walking the DOM means a new component is covered the
 * moment it appears on the story page.
 */

export interface TextContrastIssue {
    text: string;
    selector: string;
    color: string;
    background: string;
    ratio: number;
    required: number;
}

export function collectContrastIssues(): TextContrastIssue[] {
    type Rgba = [number, number, number, number];

    const parse = (value: string): Rgba | null => {
        const match = /rgba?\(([^)]+)\)/.exec(value);
        if (!match?.[1]) return null;
        const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        const [r, g, b, a] = parts;
        if (r === undefined || g === undefined || b === undefined) return null;
        return [r, g, b, a ?? 1];
    };

    const over = (top: Rgba, bottom: Rgba): Rgba => [
        top[0] * top[3] + bottom[0] * (1 - top[3]),
        top[1] * top[3] + bottom[1] * (1 - top[3]),
        top[2] * top[3] + bottom[2] * (1 - top[3]),
        1,
    ];

    /** Composites every background from the element up to an opaque one. */
    const backgroundOf = (element: Element): Rgba => {
        const layers: Rgba[] = [];
        let node: Element | null = element;

        while (node) {
            const colour = parse(getComputedStyle(node).backgroundColor);
            if (colour && colour[3] > 0) {
                layers.push(colour);
                if (colour[3] >= 0.999) break;
            }
            node = node.parentElement;
        }

        return layers.reduceRight<Rgba>((below, layer) => over(layer, below), [255, 255, 255, 1]);
    };

    const luminance = ([r, g, b]: Rgba): number => {
        const channel = (value: number) => {
            const c = value / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };

    const ratio = (a: Rgba, b: Rgba) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
        return (high + 0.05) / (low + 0.05);
    };

    const describe = (element: Element): string => {
        const classes = [...element.classList].filter((c) => c.startsWith('picky-'));
        return classes.length ? `.${classes.join('.')}` : element.tagName.toLowerCase();
    };

    const issues: TextContrastIssue[] = [];

    for (const element of document.querySelectorAll('*')) {
        // Only elements holding their own text; a wrapper inherits its children's.
        const text = [...element.childNodes]
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() ?? '')
            .join(' ')
            .trim();
        if (!text) continue;

        const style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        if (element.getBoundingClientRect().width === 0) continue;

        // WCAG 1.4.3 exempts controls that are not available for interaction.
        if (element.closest('[disabled], [aria-disabled="true"]')) continue;

        const colour = parse(style.color);
        if (!colour || colour[3] === 0) continue;

        const background = backgroundOf(element);
        const size = parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        // Large text is 24px, or 18.66px when bold.
        const required = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;

        const measured = ratio(over(colour, background), background);
        if (measured < required) {
            issues.push({
                text: text.slice(0, 40),
                selector: describe(element),
                color: style.color,
                background: `rgb(${background.slice(0, 3).map(Math.round).join(', ')})`,
                ratio: Number(measured.toFixed(2)),
                required,
            });
        }
    }

    return issues;
}
