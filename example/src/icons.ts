import type { Component } from 'vue';
import {
    Check, ChevronDown, Circle, CircleAlert, CircleCheck, CircleX, Copy, Eye, EyeOff,
    Info, Moon, Search, Sun, TriangleAlert, X,
} from 'lucide-vue-next';
import type { IconResolver } from 'pickylibrary';

/**
 * Twee bronnen achter één resolver, om te laten zien dat dat kan.
 *
 * Lucide (ISC) levert Vue-componenten: geen netwerkverkeer en tree-shakeable.
 * Merk-iconen heeft Lucide bewust niet, dus die komen hier als rauwe SVG-string
 * uit Simple Icons (CC0). Een derde optie is een URL teruggeven — PickyLibrary
 * haalt die dan op en zet hem inline zodat currentColor blijft werken.
 */
const lucide: Record<string, Component> = {
    check: Check,
    'chevron-down': ChevronDown,
    circle: Circle,
    'circle-check': CircleCheck,
    'circle-exclamation': CircleAlert,
    'circle-info': Info,
    'circle-xmark': CircleX,
    copy: Copy,
    eye: Eye,
    'eye-slash': EyeOff,
    'magnifying-glass': Search,
    moon: Moon,
    sun: Sun,
    'triangle-exclamation': TriangleAlert,
    xmark: X,
};

// Simple Icons, CC0. Stroke-loos en fill-loos: PickyLibrary vult hier zelf
// fill="currentColor" aan, terwijl het de stroke-attributen van Lucide met rust laat.
const brands: Record<string, string> = {
    github:
        '<svg viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7 0-.7 0-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3Z"/></svg>',
};

export const resolveIcon: IconResolver = (code, variant) => {
    if (variant === 'brands') return brands[code];
    return lucide[code];
};
