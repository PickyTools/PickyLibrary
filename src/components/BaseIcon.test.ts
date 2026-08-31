import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import BaseIcon from './BaseIcon.vue';
import { IconResolverKey, type IconResolver } from '../icons';
import { clearSvgCache } from '../internal/svg';

const FA_SOLID = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0"/></svg>';
const LUCIDE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M0 0"/></svg>';

function mountWith(resolver: IconResolver, props: Record<string, unknown> = {}) {
    return mount(BaseIcon, {
        props: { code: 'check', ...props },
        global: { provide: { [IconResolverKey as symbol]: resolver } },
    });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => clearSvgCache());
afterEach(() => vi.unstubAllGlobals());

describe('BaseIcon resolver paths', () => {
    it('renders a Vue component source', () => {
        const Custom = defineComponent({ render: () => h('svg', { 'data-custom': '' }) });
        expect(mountWith(() => Custom).find('svg[data-custom]').exists()).toBe(true);
    });

    it('inlines a raw SVG string source', async () => {
        const w = mountWith(() => FA_SOLID);
        await flush();
        expect(w.find('svg').exists()).toBe(true);
    });

    it('fetches and inlines a URL source', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => FA_SOLID }) as unknown as Response));
        const w = mountWith(() => '/icons/solid/check.svg');
        await flush();
        expect(w.find('svg').exists()).toBe(true);
    });

    it('renders nothing when the resolver has no match', async () => {
        const w = mountWith(() => undefined);
        await flush();
        expect(w.find('svg').exists()).toBe(false);
    });
});

describe('BaseIcon does not assume a Font Awesome-shaped icon set', () => {
    // Regression: the previous implementation forced fill="currentColor" onto every
    // SVG. Since the first of two duplicate attributes wins, that turned stroke-based
    // sets into solid blobs.
    it('leaves a stroke-based icon untouched', async () => {
        const w = mountWith(() => LUCIDE);
        await flush();
        const svg = w.find('svg');
        expect(svg.attributes('fill')).toBe('none');
        expect(svg.attributes('stroke')).toBe('currentColor');
    });

    it('adds fill only when the icon declares no paint of its own', async () => {
        const w = mountWith(() => FA_SOLID);
        await flush();
        expect(w.find('svg').attributes('fill')).toBe('currentColor');
    });

    // The size comes from icon.css through data-size; only a non-square ratio is a
    // runtime value and therefore stays an inline token.
    it('is square by default rather than Font Awesome’s 1.25:1', () => {
        const w = mountWith(() => FA_SOLID);
        expect(w.attributes('data-size')).toBe('md');
        expect(w.attributes('style')).toBeUndefined();
    });

    it('accepts a ratio for sets that draw wider than tall', () => {
        const style = mountWith(() => FA_SOLID, { ratio: 1.25 }).attributes('style') ?? '';
        expect(style).toContain('--picky-icon-ratio: 1.25');
    });

    it('treats variant as optional', () => {
        const resolver = vi.fn(() => FA_SOLID);
        mountWith(resolver);
        expect(resolver).toHaveBeenCalledWith('check', undefined);
    });
});

describe('BaseIcon caching', () => {
    // Regression: the cache lived in <script setup> and so existed per instance.
    // Forty icons on a page made forty requests for the same file.
    it('fetches a repeated icon only once across instances', async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, text: async () => FA_SOLID }) as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);

        const resolver: IconResolver = () => '/icons/solid/star.svg';
        [0, 1, 2].forEach(() => mountWith(resolver, { code: 'star' }));
        await flush();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('BaseIcon accessibility', () => {
    it('is decorative by default so the parent supplies the name', () => {
        const w = mountWith(() => FA_SOLID);
        expect(w.attributes('aria-hidden')).toBe('true');
        expect(w.attributes('role')).toBeUndefined();
    });

    it('becomes an image with a name when labelled', () => {
        const w = mountWith(() => FA_SOLID, { label: 'Done' });
        expect(w.attributes('role')).toBe('img');
        expect(w.attributes('aria-label')).toBe('Done');
        expect(w.attributes('aria-hidden')).toBeUndefined();
    });
});
