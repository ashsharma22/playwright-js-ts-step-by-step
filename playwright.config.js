// @ts-check

/**
 * Playwright Configuration
 * ------------------------
 * Shared settings for every test in ./tests.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// ─────────────────────────────────────────────────────────────
// Imports
// require() (CommonJS) matches module.exports below. Don't mix it with import.
// defineConfig() gives autocomplete and catches typos in option names.
// ─────────────────────────────────────────────────────────────
const { defineConfig } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────
module.exports = defineConfig({
    testDir: './tests',          // folder where test files live
    timeout: 30 * 1000,          // max time for one test (30 s)

    expect: {
        timeout: 5 * 1000,       // max wait for each expect() assertion (5 s)
    },

    reporter: 'html',            // open with: npx playwright show-report

    use: {
        browserName: 'chromium',
        screenshot: 'on',        // screenshot at the end of each test
        video: 'on',             // video of the whole run
        trace: 'on',             // step-by-step replay in Trace Viewer
        launchOptions: {
            slowMo: 1000,        // 1 s pause between actions, for watching only
        },
    },
});
