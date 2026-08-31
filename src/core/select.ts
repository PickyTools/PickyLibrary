/*
 * The behaviour behind BaseSelect, with no framework and no DOM.
 *
 * What lives here is exactly the part you would not want to reinvent for a second
 * framework: the arrow-key arithmetic, the type-ahead, the table of what each key
 * does, and the ARIA attributes. That last one is why this file exists --
 * aria-activedescendant and its ids fail silently when they are wrong, and that is
 * a mistake worth making once rather than three times.
 *
 * What deliberately does NOT live here: reactivity, refs, positioning and focus.
 * Those differ per framework and stay in the adapter.
 */

export interface SelectOption<Value = string> {
    label: string;
    value: Value;
    disabled?: boolean;
}

export interface SelectState {
    readonly open: boolean;
    /** Index of the option the arrow keys are on; -1 when there is none. */
    readonly activeIndex: number;
}

type AnyOption = SelectOption<unknown>;

/* ── Navigation ────────────────────────────────────────────────────────────── */

/**
 * The next option that is not disabled, wrapping around at either end.
 * Returns -1 when no usable option exists.
 */
export function nextEnabledIndex(
    options: readonly AnyOption[],
    from: number,
    step: number
): number {
    const count = options.length;
    if (count === 0) return -1;

    let index = from;
    for (let i = 0; i < count; i += 1) {
        index = (index + step + count) % count;
        if (!options[index]?.disabled) return index;
    }
    return -1;
}

export function firstEnabledIndex(options: readonly AnyOption[]): number {
    return nextEnabledIndex(options, -1, 1);
}

export function lastEnabledIndex(options: readonly AnyOption[]): number {
    return nextEnabledIndex(options, options.length, -1);
}

/**
 * Where the highlight lands on open: on the selected value, or otherwise on the
 * first usable option.
 */
export function activeIndexOnOpen<T>(options: readonly SelectOption<T>[], value: T): number {
    const selected = options.findIndex((option) => option.value === value);
    return selected >= 0 ? selected : firstEnabledIndex(options);
}

/* ── Type-ahead ────────────────────────────────────────────────────────────── */

export interface Typeahead {
    /** Appends a character and returns the current query. */
    push(char: string): string;
    reset(): void;
}

/**
 * Collects typed letters until `timeoutMs` passes without input.
 *
 * Measures time rather than setting a timer. That saves cleanup on unmount, and it
 * makes the behaviour testable without touching the test runner's clock -- just
 * pass your own `now`.
 */
export function createTypeahead(timeoutMs = 500, now: () => number = () => Date.now()): Typeahead {
    let query = '';
    let last = 0;

    return {
        push(char) {
            const at = now();
            query = at - last > timeoutMs ? char.toLowerCase() : query + char.toLowerCase();
            last = at;
            return query;
        },
        reset() {
            query = '';
            last = 0;
        },
    };
}

/** The first usable option whose label starts with `query`, or -1. */
export function matchTypeahead(options: readonly AnyOption[], query: string): number {
    if (!query) return -1;
    return options.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(query)
    );
}

/* ── Keyboard ──────────────────────────────────────────────────────────────── */

/** What should happen. The adapter carries it out; core touches nothing. */
export type SelectIntent =
    | { type: 'none' }
    | { type: 'open' }
    | { type: 'close' }
    | { type: 'activate'; index: number }
    | { type: 'choose'; index: number };

/** Only the fields that affect the decision -- not a real KeyboardEvent. */
export interface SelectKeydown {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
}

export interface SelectKeyResult {
    intent: SelectIntent;
    preventDefault: boolean;
    stopPropagation: boolean;
}

const NOTHING: SelectKeyResult = {
    intent: { type: 'none' },
    preventDefault: false,
    stopPropagation: false,
};

/**
 * The complete keyboard table for the listbox pattern, as one pure function.
 *
 * Follows the WAI-ARIA APG for a collapsible listbox: focus stays on the button,
 * which points at the active option through aria-activedescendant.
 */
export function selectKeydown(
    event: SelectKeydown,
    state: SelectState,
    options: readonly AnyOption[],
    typeahead?: Typeahead
): SelectKeyResult {
    const move = (step: number): SelectKeyResult => ({
        intent: { type: 'activate', index: nextEnabledIndex(options, state.activeIndex, step) },
        preventDefault: true,
        stopPropagation: false,
    });

    switch (event.key) {
        case 'ArrowDown':
            return state.open
                ? move(1)
                : { intent: { type: 'open' }, preventDefault: true, stopPropagation: false };

        case 'ArrowUp':
            return state.open
                ? move(-1)
                : { intent: { type: 'open' }, preventDefault: true, stopPropagation: false };

        case 'Home':
            if (!state.open) return NOTHING;
            return {
                intent: { type: 'activate', index: firstEnabledIndex(options) },
                preventDefault: true,
                stopPropagation: false,
            };

        case 'End':
            if (!state.open) return NOTHING;
            return {
                intent: { type: 'activate', index: lastEnabledIndex(options) },
                preventDefault: true,
                stopPropagation: false,
            };

        case 'Enter':
        case ' ':
            // stopPropagation because the button underneath also has a click
            // handler; without it, opening and closing race each other.
            return {
                intent: state.open ? { type: 'choose', index: state.activeIndex } : { type: 'open' },
                preventDefault: true,
                stopPropagation: true,
            };

        case 'Escape':
            if (!state.open) return NOTHING;
            return { intent: { type: 'close' }, preventDefault: true, stopPropagation: false };

        case 'Tab':
            // No preventDefault: focus should still move on to the next element.
            return state.open
                ? { intent: { type: 'close' }, preventDefault: false, stopPropagation: false }
                : NOTHING;

        default: {
            const printable = event.key.length === 1 && !event.metaKey && !event.ctrlKey;
            if (!state.open || !printable || !typeahead) return NOTHING;

            const match = matchTypeahead(options, typeahead.push(event.key));
            return match >= 0
                ? { intent: { type: 'activate', index: match }, preventDefault: false, stopPropagation: false }
                : NOTHING;
        }
    }
}

/* ── Attributes ────────────────────────────────────────────────────────────── */

export interface SelectIds {
    label: string;
    listbox: string;
    option(index: number): string;
}

/**
 * Builds the ids from one unique base.
 *
 * Deliberately generates no id of its own: that has to come from the framework
 * (Vue's `useId`, React's `useId`). Otherwise server and client disagree, and
 * hydration breaks on exactly the wiring that carries the accessibility.
 */
export function createSelectIds(uid: string): SelectIds {
    return {
        label: `${uid}-label`,
        listbox: `${uid}-listbox`,
        option: (index) => `${uid}-option-${index}`,
    };
}

export interface SelectConnectContext<T, O extends SelectOption<T>> {
    options: readonly O[];
    value: T;
    ids: SelectIds;
    label?: string;
    ariaLabel?: string;
    block?: boolean;
}

/**
 * The attributes for each part. An adapter spreads them over its own markup and
 * needs to know nothing else about ARIA.
 */
export function connectSelect<T, O extends SelectOption<T>>(
    state: SelectState,
    context: SelectConnectContext<T, O>
) {
    const { options, value, ids, label = '', ariaLabel = '', block = false } = context;
    const activeOption = options[state.activeIndex];

    return {
        root: {
            class: 'picky-select',
            'data-block': block ? 'true' : undefined,
            'data-state': state.open ? 'open' : 'closed',
        },

        label: {
            id: ids.label,
            class: 'picky-select__label',
        },

        trigger: {
            'aria-haspopup': 'listbox',
            'aria-expanded': state.open,
            'aria-controls': ids.listbox,
            'aria-activedescendant':
                state.open && activeOption ? ids.option(state.activeIndex) : undefined,
            // A visible label wins; aria-label is the fallback when there is none.
            'aria-label': ariaLabel || undefined,
            'aria-labelledby': !ariaLabel && label ? ids.label : undefined,
        },

        listbox: {
            id: ids.listbox,
            role: 'listbox',
            class: 'picky-select__dropdown',
            'aria-labelledby': label ? ids.label : undefined,
            'aria-label': !label && ariaLabel ? ariaLabel : undefined,
        },

        option(index: number) {
            const option = options[index];
            const selected = option !== undefined && option.value === value;

            return {
                id: ids.option(index),
                role: 'option',
                class: 'picky-select__option',
                'aria-selected': selected,
                'aria-disabled': option?.disabled || undefined,
                'data-active':
                    index === state.activeIndex && !option?.disabled ? 'true' : undefined,
                'data-selected': selected ? 'true' : undefined,
            };
        },
    };
}
