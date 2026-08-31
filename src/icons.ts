import { inject, provide, type Component, type InjectionKey } from 'vue';

/**
 * What a resolver may return:
 *  - a Vue component  -> rendered through <component :is>. No network, tree-shakeable.
 *  - an SVG string    -> inlined as-is. Your markup, so it is trusted.
 *  - any other string -> treated as a URL; fetched and inlined so the icon inherits
 *                        `currentColor`, which an <img> cannot do.
 *  - undefined / null -> nothing rendered, plus a warning in development.
 */
export type IconSource = string | Component;

export type IconResolver = (code: string, variant?: string) => IconSource | undefined | null;

export const IconResolverKey: InjectionKey<IconResolver> = Symbol('picky-icon-resolver');

/**
 * Registers one resolver for the whole tree. Call it in the setup of your root
 * component, or use `app.provide(IconResolverKey, resolver)`.
 *
 * PickyLibrary deliberately ships no icons: pick your own source -- an icon
 * library, a folder of SVGs, or your own components.
 */
export function provideIcons(resolver: IconResolver): void {
    provide(IconResolverKey, resolver);
}

let warned = false;

/** Internal helper for BaseIcon. */
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
