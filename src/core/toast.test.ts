// @vitest-environment node
//
// The store, without a framework in sight.

import { describe, expect, it, vi } from 'vitest';
import { createToastStore } from './toast';

const titles = (store: ReturnType<typeof createToastStore>) =>
    store.getToasts().map((toast) => toast.title);

describe('keeping the stack a readable size', () => {
    // A stack that grows without limit pushes its own contents off the screen, and a
    // screen reader announces every one of them in turn.
    it('drops the oldest once the limit is reached', () => {
        const store = createToastStore({ limit: 3 });
        for (const title of ['one', 'two', 'three', 'four']) store.add({ title, duration: 0 });

        expect(titles(store)).toEqual(['two', 'three', 'four']);
    });

    it('defaults to three', () => {
        const store = createToastStore();
        for (const title of ['a', 'b', 'c', 'd', 'e']) store.add({ title, duration: 0 });

        expect(store.getToasts()).toHaveLength(3);
    });

    it('keeps every toast when the limit is zero', () => {
        const store = createToastStore({ limit: 0 });
        for (const title of ['a', 'b', 'c', 'd']) store.add({ title, duration: 0 });

        expect(store.getToasts()).toHaveLength(4);
    });

    // An assertive toast interrupted the user to say something went wrong. A routine
    // "Saved" arriving afterwards should not be what pushes it away.
    it('drops a polite toast before an urgent one', () => {
        const store = createToastStore({ limit: 2 });
        store.add({ title: 'failed', style: 'danger', duration: 0 });
        store.add({ title: 'saved', duration: 0 });
        store.add({ title: 'saved again', duration: 0 });

        expect(titles(store)).toEqual(['failed', 'saved again']);
    });

    it('drops the oldest urgent one when there is nothing else left', () => {
        const store = createToastStore({ limit: 2 });
        for (const title of ['first', 'second', 'third']) {
            store.add({ title, style: 'danger', duration: 0 });
        }

        expect(titles(store)).toEqual(['second', 'third']);
    });

    // A dropped toast that keeps its timer would fire later and remove whichever
    // toast happened to inherit its id.
    it('clears the timer of a toast it drops', () => {
        vi.useFakeTimers();
        const store = createToastStore({ limit: 1 });

        store.add({ title: 'first', duration: 1000 });
        store.add({ title: 'second', duration: 0 });
        expect(titles(store)).toEqual(['second']);

        vi.advanceTimersByTime(2000);
        expect(titles(store), 'the evicted timer removed the wrong toast').toEqual(['second']);
        vi.useRealTimers();
    });

    it('notifies subscribers once per add, eviction included', () => {
        const store = createToastStore({ limit: 1 });
        let calls = 0;
        store.subscribe(() => (calls += 1));

        store.add({ title: 'a', duration: 0 });
        store.add({ title: 'b', duration: 0 });

        expect(calls).toBe(2);
        expect(titles(store)).toEqual(['b']);
    });
});
