import { defineConfig, devices } from '@playwright/test';

/*
 * Browser tests, separate from the Vitest suite because they need a real engine.
 *
 * Vitest can check what the tokens say; only a browser can check what actually
 * lands on the screen. That gap is what let a set of regressions through: the
 * tokens were right, the wrong ones were being applied.
 */
export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: 'http://localhost:5199',
        // Fixed so a screenshot diff reports a real change rather than a resize.
        deviceScaleFactor: 1,

        // Every transition in the library sits behind `prefers-reduced-motion`, so
        // asking for reduced motion settles the page instead of injecting overrides.
        // Without it a test reads colours mid-transition: a button changing from
        // blue to orange measures as the purple somewhere in between.
        reducedMotion: 'reduce',
    },

    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
        { name: 'mobile', use: { ...devices['Pixel 5'] } },
    ],

    webServer: {
        command: 'npx vite --config tests/browser/stories/vite.config.ts',
        url: 'http://localhost:5199',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
});
