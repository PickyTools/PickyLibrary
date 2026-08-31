import { expect, test, type Page } from '@playwright/test';
import { collectContrastIssues } from './contrast';

/**
 * Waits until nothing is animating.
 *
 * Applying a theme starts colour transitions, and a computed style read while one
 * is running measures the blend on the way rather than the destination.
 */
async function settle(page: Page): Promise<void> {
    await page.evaluate(() => Promise.all(
        document.getAnimations().map((animation) => animation.finished.catch(() => undefined))
    ));
}

/*
 * The four theme states a visitor can end up in.
 *
 * `system` matters most: it sets no class at all, which is what a consumer gets
 * when they toggle only `.dark`. On a machine whose OS is in dark mode that falls
 * through to `@media (prefers-color-scheme: dark)` -- and that is precisely how a
 * page ended up with dark-mode text colours on a light background.
 */
const STATES = [
    { name: 'os light, no class', scheme: 'light', theme: 'system' },
    { name: 'os dark, no class', scheme: 'dark', theme: 'system' },
    { name: 'os light, .dark', scheme: 'light', theme: 'dark' },
    { name: 'os dark, .light', scheme: 'dark', theme: 'light' },
] as const;

for (const state of STATES) {
    test.describe(state.name, () => {
        test.use({ colorScheme: state.scheme });

        test('every piece of text reads against its own background', async ({ page }) => {
            await page.goto(`/?theme=${state.theme}`);
            await page.waitForSelector('html[data-stories-ready]');
            await settle(page);

            const issues = await page.evaluate(collectContrastIssues);
            expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
        });

        test('matches its reference rendering', async ({ page }) => {
            await page.goto(`/?theme=${state.theme}`);
            await page.waitForSelector('html[data-stories-ready]');

            await expect(page).toHaveScreenshot(`${state.theme}-${state.scheme}.png`, {
                fullPage: true,
                // Sub-pixel text rendering differs slightly between machines.
                maxDiffPixelRatio: 0.01,
            });
        });
    });
}

test.describe('a consumer’s own accent', () => {
    // The case that broke: components read a fixed shade of the ramp, so an
    // overridden accent reached the fill and nothing else.
    test('drives every derived colour and stays readable', async ({ page }) => {
        await page.goto('/?theme=light&accent=%23f97316');
        await page.waitForSelector('html[data-stories-ready]');
        await settle(page);

        const issues = await page.evaluate(collectContrastIssues);
        expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);

        // The accent has to actually arrive, not merely fail to break anything.
        //
        // toHaveCSS rather than a one-shot read: applying the accent starts a colour
        // transition, and a read taken mid-flight measures the blend on the way --
        // blue heading for orange reports as the purple in between.
        await expect(
            page
                .locator('.picky-button[data-color="primary"][data-variant="full"] .picky-button__inner')
                .first()
        ).toHaveCSS('background-color', 'rgb(249, 115, 22)');
    });
});

test.describe('the elements the library renders itself', () => {
    /*
     * Shipping no global reset means the browser's own margins survive unless the
     * library neutralises them. Left alone, a <ul> carries `padding-inline-start:
     * 40px` and a <p> carries `margin: 1em 0` -- which inset a select's options from
     * their panel and pushed a field's error message a line and a half too low.
     *
     * Asserted as layout rather than as "margin must be 0", because some of these
     * margins are deliberate. What matters is where the pixels end up.
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/?theme=light');
        await page.waitForSelector('html[data-stories-ready]');
    });

    test('lays select options flush with their panel', async ({ page }) => {
        await page.locator('.picky-select .picky-button').first().click();

        const panel = await page.locator('.picky-select__dropdown').first().boundingBox();
        const option = await page.locator('.picky-select__option').first().boundingBox();

        expect(panel).not.toBeNull();
        expect(option).not.toBeNull();
        expect(Math.abs(option!.x - panel!.x)).toBeLessThan(0.5);
        expect(Math.abs(option!.width - panel!.width)).toBeLessThan(0.5);
    });

    test('keeps a field’s message directly under the field', async ({ page }) => {
        const field = page.locator('.picky-input').filter({ hasText: 'That address looks wrong.' });

        const control = await field.locator('.picky-input__control').boundingBox();
        const message = await field.locator('.picky-input__message').boundingBox();

        expect(control).not.toBeNull();
        expect(message).not.toBeNull();

        const gap = message!.y - (control!.y + control!.height);
        expect(gap, `message sits ${gap}px below the field`).toBeLessThanOrEqual(8);
        expect(gap).toBeGreaterThanOrEqual(0);
    });

    test('renders no list markers', async ({ page }) => {
        // The only list in the library lives inside the select's panel, so it has to
        // be open before there is anything to check. Without this the test passed by
        // examining nothing at all.
        await page.locator('.picky-select .picky-button').first().click();
        await expect(page.locator('.picky-select__list')).toBeVisible();

        const { examined, markers } = await page.evaluate(() => {
            const lists = [...document.querySelectorAll('ul, ol, li')].filter((el) =>
                [...el.classList].some((c) => c.startsWith('picky-'))
            );

            return {
                examined: lists.length,
                markers: lists
                    .filter((el) => getComputedStyle(el).listStyleType !== 'none')
                    .map((el) => el.className),
            };
        });

        expect(examined).toBeGreaterThan(0);
        expect(markers).toEqual([]);
    });
});

test.describe('a select inside a modal', () => {
    /*
     * A <dialog> paints in the browser's top layer, above every z-index on the page,
     * so a panel teleported to <body> ends up behind it and cannot be clicked. The
     * panel therefore goes into the dialog -- but that made Floating UI treat the
     * modal as its clipping boundary and collapse the panel to a scrollable stub.
     *
     * Both halves are checked here: it has to paint above the dialog, and it has to
     * be given the height it actually has.
     */
    test.beforeEach(async ({ page }) => {
        await page.goto('/?theme=light&modal=open');
        await page.waitForSelector('html[data-stories-ready]');
        await settle(page);
        await page.locator('.picky-modal .picky-select .picky-button').click();
        await expect(page.locator('.picky-select__dropdown')).toBeVisible();
    });

    test('is tall enough to use, not a sliver', async ({ page }) => {
        const panel = await page.locator('.picky-select__dropdown').boundingBox();
        const options = await page.locator('.picky-select__option').count();

        expect(panel).not.toBeNull();
        expect(options).toBe(6);
        // Six options at ~36px each. Constrained to the modal it collapsed to the
        // 96px floor, which showed two and a half rows.
        expect(panel!.height, `panel is only ${panel!.height}px tall`).toBeGreaterThan(150);
    });

    // Layout only: a bounding box is unaffected by clipping, so this says the panel
    // is *given* the room, not that every pixel is painted. The click below is what
    // proves it is really there.
    test('is allowed to extend past the modal', async ({ page }) => {
        const panel = await page.locator('.picky-select__dropdown').boundingBox();
        const modal = await page.locator('.picky-modal').boundingBox();

        expect(panel).not.toBeNull();
        expect(modal).not.toBeNull();

        const overhang = panel!.y + panel!.height - (modal!.y + modal!.height);
        expect(overhang, `panel stops ${-overhang}px short of the modal's edge`).toBeGreaterThan(20);
    });

    test('can be clicked where it hangs past the modal', async ({ page }) => {
        // The last option sits below the modal. Clipped to the dialog it would not
        // exist; painted but outside it, `showModal()` renders it inert and the click
        // lands on the backdrop instead.
        await page.locator('.picky-select__option').filter({ hasText: 'Fig' }).click();
        await expect(page.locator('.picky-modal .picky-select__value')).toContainText('Fig');
    });

    test('is what the pointer actually hits', async ({ page }) => {
        // No coordinate arithmetic: Playwright refuses to click an element that
        // something else is covering, so a successful click is the assertion. When
        // the panel sat behind the dialog this timed out on intercepted pointer
        // events.
        await page.locator('.picky-select__option').filter({ hasText: 'Banana' }).click();

        await expect(page.locator('.picky-select__dropdown')).toBeHidden();
        await expect(page.locator('.picky-modal .picky-select__value')).toContainText('Banana');
    });
});

test.describe('hover', () => {
    /*
     * Every interactive surface has to react to the pointer, and the reaction has to
     * be visible. A token left undeclared in light mode makes the colour mix invalid,
     * the declaration is dropped in silence, and the hover simply stops happening --
     * with every other test still green.
     *
     * Compared as computed colours rather than by eye, in both themes, because a
     * mistake like that shows up in one and not the other.
     */
    const VARIANTS = ['full', 'outline', 'text'] as const;

    for (const theme of ['light', 'dark'] as const) {
        test(`changes every button variant in ${theme} mode`, async ({ page }) => {
            await page.goto(`/?theme=${theme}`);
            await page.waitForSelector('html[data-stories-ready]');
            await settle(page);

            for (const variant of VARIANTS) {
                const button = page
                    .locator(`.picky-button[data-variant="${variant}"][data-color="primary"]`)
                    .first();
                const inner = button.locator('.picky-button__inner');

                const before = await inner.evaluate((el) => getComputedStyle(el).backgroundColor);
                await button.hover();
                await settle(page);
                const after = await inner.evaluate((el) => getComputedStyle(el).backgroundColor);

                expect(after, `${variant} does not react to hover (${before})`).not.toBe(before);

                // A change nobody can see is not a hover state.
                expect(after, `${variant} hover is fully transparent`).not.toMatch(/, 0\)$/);

                await page.mouse.move(0, 0);
                await settle(page);
            }
        });
    }

    test('highlights the select option under the pointer', async ({ page }) => {
        await page.goto('/?theme=light');
        await page.waitForSelector('html[data-stories-ready]');
        await page.locator('.picky-select .picky-button').first().click();

        const second = page.locator('.picky-select__option').nth(1);
        const before = await second.evaluate((el) => getComputedStyle(el).backgroundColor);

        await second.hover();
        await expect(second).toHaveAttribute('data-active', 'true');

        const after = await second.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(after, 'the option under the pointer looks the same as before').not.toBe(before);
    });
});
