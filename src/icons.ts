import { inject, provide, type Component, type InjectionKey } from 'vue';

/**
 * Wat een resolver mag teruggeven:
 *  - een Vue-component  → gerenderd via <component :is>. Geen netwerk, tree-shakeable.
 *  - een SVG-string     → inline gezet (`<svg …>`). Jouw markup, dus vertrouwd.
 *  - een andere string  → behandeld als URL; opgehaald en inline gezet, zodat het
 *                         icoon `currentColor` erft (een <img> kan dat niet).
 *  - undefined / null   → niets gerenderd, plus een waarschuwing in development.
 */
export type IconSource = string | Component;

export type IconResolver = (code: string, variant?: string) => IconSource | undefined | null;

export const IconResolverKey: InjectionKey<IconResolver> = Symbol('picky-icon-resolver');

/**
 * Registreer één resolver voor de hele boom. Roep dit aan in de setup van je
 * root-component, of gebruik `app.provide(IconResolverKey, resolver)`.
 *
 * PickyLibrary levert bewust geen iconen mee: kies je eigen bron — een
 * icon-library, een map met SVG's, of je eigen componenten.
 */
export function provideIcons(resolver: IconResolver): void {
    provide(IconResolverKey, resolver);
}

let warned = false;

/** Interne helper voor BaseIcon. */
export function useIconResolver(): IconResolver {
    const resolver = inject(IconResolverKey, null);

    if (resolver) return resolver;

    return () => {
        if (import.meta.env.DEV && !warned) {
            warned = true;
            console.warn(
                '[PickyLibrary] No icon resolver registered, so icons render as nothing.\n' +
                    'Call provideIcons((code, variant) => …) in your root component.\n' +
                    'PickyLibrary ships no icons on purpose — bring your own source.'
            );
        }
        return undefined;
    };
}
