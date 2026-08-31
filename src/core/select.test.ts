// @vitest-environment node
//
// No DOM, no component, no framework -- which is exactly the point of core. This
// suite covers the behaviour a React or Angular adapter would inherit.

import { describe, expect, it } from 'vitest';
import {
    activeIndexOnOpen,
    connectSelect,
    createSelectIds,
    createTypeahead,
    firstEnabledIndex,
    lastEnabledIndex,
    matchTypeahead,
    nextEnabledIndex,
    selectKeydown,
    type SelectOption,
    type SelectState,
} from './select';

const options: SelectOption<string>[] = [
    { label: 'Appel', value: 'appel' },
    { label: 'Banaan', value: 'banaan', disabled: true },
    { label: 'Citroen', value: 'citroen' },
    { label: 'Cactus', value: 'cactus' },
];

const closed: SelectState = { open: false, activeIndex: -1 };
const openAt = (activeIndex: number): SelectState => ({ open: true, activeIndex });

describe('navigating the options', () => {
    it('skips disabled options in both directions', () => {
        expect(nextEnabledIndex(options, 0, 1)).toBe(2);
        expect(nextEnabledIndex(options, 2, -1)).toBe(0);
    });

    it('wraps around at both ends', () => {
        expect(nextEnabledIndex(options, 3, 1)).toBe(0);
        expect(nextEnabledIndex(options, 0, -1)).toBe(3);
    });

    it('reports -1 when nothing is selectable', () => {
        expect(nextEnabledIndex([], 0, 1)).toBe(-1);
        expect(nextEnabledIndex([{ label: 'x', value: 'x', disabled: true }], 0, 1)).toBe(-1);
    });

    it('finds the first and last usable option', () => {
        expect(firstEnabledIndex(options)).toBe(0);
        expect(lastEnabledIndex(options)).toBe(3);
    });

    it('opens on the selected value, or the first usable one', () => {
        expect(activeIndexOnOpen(options, 'citroen')).toBe(2);
        expect(activeIndexOnOpen(options, 'does-not-exist')).toBe(0);
    });
});

describe('type-ahead', () => {
    it('accumulates letters typed in quick succession', () => {
        let clock = 0;
        const typeahead = createTypeahead(500, () => clock);

        expect(typeahead.push('c')).toBe('c');
        clock += 100;
        expect(typeahead.push('a')).toBe('ca');
    });

    it('starts over once the pause is long enough', () => {
        let clock = 0;
        const typeahead = createTypeahead(500, () => clock);

        typeahead.push('c');
        clock += 600;
        expect(typeahead.push('a')).toBe('a');
    });

    it('matches on a prefix and never lands on a disabled option', () => {
        expect(matchTypeahead(options, 'ca')).toBe(3);
        expect(matchTypeahead(options, 'ban')).toBe(-1);
        expect(matchTypeahead(options, '')).toBe(-1);
    });
});

describe('the keyboard table', () => {
    it('opens on the arrow keys when closed', () => {
        for (const key of ['ArrowDown', 'ArrowUp']) {
            const result = selectKeydown({ key }, closed, options);
            expect(result.intent).toEqual({ type: 'open' });
            expect(result.preventDefault).toBe(true);
        }
    });

    it('moves the active option when open', () => {
        expect(selectKeydown({ key: 'ArrowDown' }, openAt(0), options).intent).toEqual({
            type: 'activate',
            index: 2,
        });
        expect(selectKeydown({ key: 'ArrowUp' }, openAt(2), options).intent).toEqual({
            type: 'activate',
            index: 0,
        });
    });

    it('jumps to either end with Home and End, but only while open', () => {
        expect(selectKeydown({ key: 'Home' }, openAt(2), options).intent).toEqual({
            type: 'activate',
            index: 0,
        });
        expect(selectKeydown({ key: 'End' }, openAt(0), options).intent).toEqual({
            type: 'activate',
            index: 3,
        });
        expect(selectKeydown({ key: 'Home' }, closed, options).intent).toEqual({ type: 'none' });
    });

    it('chooses with Enter and Space when open, opens when closed', () => {
        for (const key of ['Enter', ' ']) {
            expect(selectKeydown({ key }, openAt(2), options).intent).toEqual({
                type: 'choose',
                index: 2,
            });
            expect(selectKeydown({ key }, closed, options).intent).toEqual({ type: 'open' });
        }
    });

    // Without this the button's click handler fires too, and open races close.
    it('stops Enter and Space from reaching the button’s click handler', () => {
        expect(selectKeydown({ key: 'Enter' }, openAt(0), options).stopPropagation).toBe(true);
        expect(selectKeydown({ key: ' ' }, closed, options).stopPropagation).toBe(true);
    });

    it('closes on Escape, but only while open', () => {
        expect(selectKeydown({ key: 'Escape' }, openAt(0), options).intent).toEqual({ type: 'close' });
        expect(selectKeydown({ key: 'Escape' }, closed, options).intent).toEqual({ type: 'none' });
    });

    // Tab must not be swallowed: focus should still move on.
    it('closes on Tab without swallowing the key', () => {
        const result = selectKeydown({ key: 'Tab' }, openAt(0), options);
        expect(result.intent).toEqual({ type: 'close' });
        expect(result.preventDefault).toBe(false);
    });

    it('type-aheads on printable keys, and ignores shortcuts', () => {
        const typeahead = createTypeahead();
        expect(selectKeydown({ key: 'c' }, openAt(0), options, typeahead).intent).toEqual({
            type: 'activate',
            index: 2,
        });

        typeahead.reset();
        expect(
            selectKeydown({ key: 'c', metaKey: true }, openAt(0), options, typeahead).intent
        ).toEqual({ type: 'none' });
    });

    it('ignores typing while closed', () => {
        expect(selectKeydown({ key: 'c' }, closed, options, createTypeahead()).intent).toEqual({
            type: 'none',
        });
    });
});

describe('the attributes it hands to an adapter', () => {
    const ids = createSelectIds('picky-1');
    const context = { options, value: 'citroen', ids, label: 'Fruit' };

    it('wires the trigger to the listbox and the active option', () => {
        const api = connectSelect(openAt(2), context);

        expect(api.trigger['aria-haspopup']).toBe('listbox');
        expect(api.trigger['aria-expanded']).toBe(true);
        expect(api.trigger['aria-controls']).toBe('picky-1-listbox');
        expect(api.trigger['aria-activedescendant']).toBe('picky-1-option-2');
        expect(api.listbox.id).toBe('picky-1-listbox');
    });

    // Regression: aria-activedescendant must not point at an option that is not in
    // the DOM. Closed means no options, so no reference either.
    it('drops aria-activedescendant while closed', () => {
        expect(connectSelect(closed, context).trigger['aria-activedescendant']).toBeUndefined();
    });

    it('names the trigger with the visible label, or aria-label when there is none', () => {
        expect(connectSelect(closed, context).trigger['aria-labelledby']).toBe('picky-1-label');
        expect(connectSelect(closed, context).trigger['aria-label']).toBeUndefined();

        const unlabelled = connectSelect(closed, { options, value: 'citroen', ids, ariaLabel: 'Fruit' });
        expect(unlabelled.trigger['aria-label']).toBe('Fruit');
        expect(unlabelled.trigger['aria-labelledby']).toBeUndefined();
    });

    it('marks each option as selected, active or disabled', () => {
        const api = connectSelect(openAt(0), context);

        expect(api.option(2)['aria-selected']).toBe(true);
        expect(api.option(0)['aria-selected']).toBe(false);
        expect(api.option(0)['data-active']).toBe('true');
        expect(api.option(1)['aria-disabled']).toBe(true);
        expect(api.option(1)['data-active']).toBeUndefined();
    });

    it('gives every option a unique, stable id', () => {
        const api = connectSelect(openAt(0), context);
        const seen = options.map((_, index) => api.option(index).id);
        expect(new Set(seen).size).toBe(options.length);
        expect(seen[0]).toBe('picky-1-option-0');
    });
});
