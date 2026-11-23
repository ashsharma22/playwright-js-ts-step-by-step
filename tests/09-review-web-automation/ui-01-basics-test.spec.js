/**
 * UI Basics – Login Error Message
 * -------------------------------
 * Site under test : https://rahulshettyacademy.com/loginpagePractise/
 *
 * Flow:
 *   1. Create a fresh browser context and open a page in it
 *   2. Open the login practice page
 *   3. Log in with a valid username and a WRONG password
 *   4. Verify the "Incorrect username/password" error is shown
 *
 * Key Playwright APIs shown here:
 *   - browser.newContext()         → create an isolated, incognito-like browser profile
 *   - context.newPage()            → open a new tab inside that context
 *   - locator.fill() / click()     → type into a field / click an element (auto-wait)
 *   - expect(...).toContainText()  → assert text (auto-retries until timeout)
 *
 * This test creates its browser context by hand with browser.newContext()
 * instead of using the ready-made `page` fixture, to show how contexts work.
 */

// ─────────────────────────────────────────────────────────────
// Imports
// require() is the CommonJS way to load a package (like Java's `import`).
//   test   → defines a test case (like TestNG's @Test)
//   expect → assertion library (like TestNG's Assert), with auto-retry
// { test, expect } is "destructuring": it picks just these two exports.
// In a .ts file, write: import { test, expect } from '@playwright/test';
// ─────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────
// Configuration & test data (kept in one place for easy updates)
// ─────────────────────────────────────────────────────────────

const LOGIN_PAGE_URL = 'https://rahulshettyacademy.com/loginpagePractise/';

/** Login form data. */
const USER = {
    username: 'rahulshettyacademy',
    wrongPassword: 'WrongPassword@123',   // any wrong value triggers the error
};

/** Expected texts used in assertions. */
const MESSAGES = {
    loginError: 'Incorrect',              // part of "Incorrect username/password."
};

// ─────────────────────────────────────────────────────────────
// Tests
// test(title, async callback)
//   async         → the body uses await (every browser action returns a Promise)
//   ({ browser }) → a "fixture" Playwright injects: the launched browser.
//                   We ask for `browser` (not `page`) because we want to
//                   create the context ourselves.
// ─────────────────────────────────────────────────────────────

test.describe('UI Basics - Dummy Website', () => {

    /**
     * Logs in with a wrong password and verifies the error banner.
     */
    test('Login with wrong password shows an error message', async ({ browser }) => {

        // browser.newContext() = a brand-new, incognito-like browser profile with its
        // own cookies, localStorage and cache. Nothing leaks in from other tests.
        // Options can be passed here, e.g. newContext({ viewport: { width: 1280, height: 720 } }).
        // Selenium comparison: like starting a clean new driver session.
        const context = await browser.newContext();

        // context.newPage() = a new tab inside that context.
        const page = await context.newPage();

        try {
            // ── Locators ──────────────────────────────────────────
            // Locators are lazy: nothing is searched until an action/assertion uses them,
            // so there are no "stale element" errors.
            // Selenium comparison: storing a By, not a WebElement.
            const username   = page.locator('#username');           // CSS id selector
            const password   = page.locator("[type='password']");   // CSS attribute selector
            const signIn     = page.locator('#signInBtn');
            const errorAlert = page.locator('.alert-danger');       // red error banner

            // ── Steps ─────────────────────────────────────────────
            await test.step('Open login practice page', async () => {
                // goto() waits for the page "load" event automatically.
                await page.goto(LOGIN_PAGE_URL);
                console.log('Page title:', await page.title());
            });

            await test.step('Login with valid username and wrong password', async () => {
                // fill() clears the field, then types. It auto-waits until the field is editable.
                await username.fill(USER.username);
                await password.fill(USER.wrongPassword);

                // click() auto-waits until the button is visible, enabled and stable.
                await signIn.click();
            });

            await test.step('Verify error message is shown', async () => {
                // Web-first assertion: retries until the text appears (5 s, set in
                // playwright.config.js). Pass the locator itself, not awaited text.
                await expect(errorAlert).toContainText(MESSAGES.loginError);
                console.log('Error shown:', await errorAlert.textContent());
            });
        } finally {
            // A context we create ourselves is NOT closed for us, so close it here.
            // `finally` makes sure this runs even when a step or assertion fails.
            await context.close();
        }
    });
});
