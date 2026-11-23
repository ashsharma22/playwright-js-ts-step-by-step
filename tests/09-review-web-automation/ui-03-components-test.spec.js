/**
 * UI Components – Radio Buttons, Dropdown, Checkbox, Link, Child Window
 * ---------------------------------------------------------------------
 * Site under test : https://rahulshettyacademy.com/loginpagePractise/
 *
 * Flow:
 *   1. Open the login practice page
 *   2. Fill in username and password
 *   3. Radio buttons : select "User" (accept the pop-up), then switch to "Admin"
 *   4. Dropdown      : select the "Consultant" option
 *   5. Checkbox      : check, then uncheck "I agree to the terms and conditions"
 *   6. Link          : verify the top "Free Access to InterviewQues/..." link blinks
 *   7. Child window  : click that link, capture the new tab, verify its URL/content
 *   8. Child window  : extract the domain name from the e-mail shown in the new tab
 *   9. Parent window : type that domain name into the Username field
 *  10. Child window  : close the new tab and confirm the parent tab is still usable
 *
 * Key Playwright APIs shown here:
 *   - locator.click()               → select a radio button
 *   - locator.selectOption(value)   → pick an option in a <select> dropdown
 *   - locator.check() / uncheck()   → tick / untick a checkbox
 *   - locator.isChecked()           → read the current state (returns true/false, NO auto-wait)
 *   - expect(...).toBeChecked()     → assert the state (auto-retries until timeout)
 *   - expect(...).toHaveAttribute() → assert an HTML attribute value
 *   - context.waitForEvent('page')  → capture a child window / new tab
 */

// ─────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────
// Configuration & test data (kept in one place for easy updates)
// ─────────────────────────────────────────────────────────────

const LOGIN_PAGE_URL = 'https://rahulshettyacademy.com/loginpagePractise/';

/** Login form data (the form is never submitted in this test). */
const USER = {
    username: 'ashwanisharma@gmail.com',
    password: 'learning',
};

/** Values / texts used for selections and assertions. */
const TEST_DATA = {
    dropdownValue: 'consult',                          // value attribute of the "Consultant" <option>
    termsLabel: 'I agree to the terms and conditions',
    blinkingLinkName: 'Free Access to InterviewQues/', // partial accessible name of the top link
    blinkingLinkClass: 'blinkingText',
};

/** Expectations for the child window opened by the blinking link. */
const CHILD_WINDOW = {
    urlPattern: /documents-request/,                   // the link opens /documents-request in a new tab
    redTextSelector: 'p.red',                          // the red "Please email us at ..." paragraph
    expectedDomain: 'rahulshettyacademy',              // domain part of the e-mail shown in the red paragraph
};

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

test.describe('UI Components - Dummy Website', () => {

    /**
     * Exercises the common form controls on the login practice page:
     * radio buttons, a dropdown, a checkbox and a link's CSS class.
     */
    test('Learn dropdown, radio buttons, checkboxes', async ({ page }) => {

        // ── Locators ──────────────────────────────────────────
        // Locators are lazy: nothing is searched until an action/assertion uses them.
        const username      = page.getByRole('textbox', { name: 'Username' });
        const password      = page.getByRole('textbox', { name: 'Password' });

        // exact: true → match "User" only, not "Username" etc.
        // The text sits inside the radio's <label>, so Playwright retargets
        // click()/isChecked()/toBeChecked() to the radio <input> itself.
        const userRadio     = page.getByText('User', { exact: true });
        const adminRadio    = page.getByText('Admin', { exact: true });
        const popupOkay     = page.locator('#okayBtn');             // "Okay" in the pop-up shown after choosing "User"

        const roleDropdown  = page.getByRole('combobox');           // the only <select> on the page
        const termsCheckbox = page.getByRole('checkbox', { name: TEST_DATA.termsLabel });
        const blinkingLink  = page.getByRole('link', { name: TEST_DATA.blinkingLinkName });

        // ── Steps ─────────────────────────────────────────────
        await test.step('Open login practice page', async () => {
            await page.goto(LOGIN_PAGE_URL);
        });

        await test.step('Fill username and password', async () => {
            await username.fill(USER.username);
            await password.fill(USER.password);
        });

        await test.step('Radio button - select "User" and accept the pop-up', async () => {
            await userRadio.click();
            await popupOkay.click();

            await expect(userRadio).toBeChecked();
            console.log('Radio button - User checked:', await userRadio.isChecked());
        });

        await test.step('Radio button - switch to "Admin"', async () => {
            await adminRadio.click();                 // no pop-up appears for "Admin"

            // Radios in the same group are mutually exclusive.
            await expect(adminRadio).toBeChecked();
            await expect(userRadio).not.toBeChecked();
            console.log('Radio button - User checked:', await userRadio.isChecked());
        });

        await test.step('Dropdown - select "Consultant"', async () => {
            await roleDropdown.selectOption(TEST_DATA.dropdownValue);
            await expect(roleDropdown).toHaveValue(TEST_DATA.dropdownValue);
        });

        await test.step('Checkbox - check and then uncheck terms', async () => {
            await termsCheckbox.check();
            await expect(termsCheckbox).toBeChecked();
            console.log('Checkbox - Terms and conditions checked:', await termsCheckbox.isChecked());

            await termsCheckbox.uncheck();
            await expect(termsCheckbox).not.toBeChecked();
        });

        await test.step('Verify the top link is blinking', async () => {
            // The blinking effect comes from the "blinkingText" CSS class.
            await expect(blinkingLink).toHaveAttribute('class', TEST_DATA.blinkingLinkClass);
        });

        // Debug tip: uncomment to pause here and open the Playwright Inspector.
        // await page.pause();
    });

    /**
     * Clicks the blinking link (target="_blank"), verifies the child window
     * (new tab) it opens, and uses data from it back in the parent window.
     */
    test('Child window - verify the top link opens a new tab', async ({ page, context }) => {

        // ── Locators (parent window) ──────────────────────────
        const username     = page.getByRole('textbox', { name: 'Username' });
        const blinkingLink = page.getByRole('link', { name: TEST_DATA.blinkingLinkName });

        // ── Child window (assigned once the new tab is captured) ──
        /** @type {import('@playwright/test').Page} */
        let childPage;
        /** @type {import('@playwright/test').Locator} */
        let childRedText;
        /** @type {string} */
        let domainName;            // read in the child window, used in the parent window

        // ── Steps ─────────────────────────────────────────────
        await test.step('Open login practice page', async () => {
            await page.goto(LOGIN_PAGE_URL);
        });

        /*
         * ── HOW A CHILD WINDOW (NEW TAB) IS HANDLED IN PLAYWRIGHT ──────────
         *
         * Key concepts:
         *   - context (BrowserContext) = one browser session/profile. Every tab
         *     opened in it belongs to it.
         *   - page = a single tab. The test starts with one (the parent).
         *   - When a link with target="_blank" opens a new tab, Playwright creates
         *     a NEW Page object in the same context and fires a 'page' event
         *     on the context.
         *
         * Steps:
         *   1. Start listening for the 'page' event (NO await, so we don't block).
         *   2. Click the link, which opens the new tab and fires the event.
         *   3. Await the promise to get the new tab as a Page object (childPage).
         *   4. Wait for childPage to finish loading before using it.
         *
         * Why listen BEFORE clicking?
         *   If we click first and then call waitForEvent('page'), the new tab may
         *   already be open (event already fired), so the listener misses it and
         *   the test hangs until timeout. Listening first avoids this race.
         *
         *   ❌ Wrong:
         *      await blinkingLink.click();
         *      const childPage = await context.waitForEvent('page'); // may hang
         *
         *   ✅ Equivalent alternative using Promise.all:
         *      const [childPage] = await Promise.all([
         *          context.waitForEvent('page'),
         *          blinkingLink.click(),
         *      ]);
         *
         * Related: page.waitForEvent('popup') catches only tabs opened by that
         * specific page; context.waitForEvent('page') catches ANY new tab in the
         * context.
         */
        await test.step('Click the blinking link and capture the child window', async () => {
            // Step 1: Start listening for a new tab. NO 'await' here: we only
            //         want the listener running, not waiting yet.
            const childPagePromise = context.waitForEvent('page');

            // Step 2: Click the link. The browser opens the new tab and the
            //         'page' event fires, which our listener catches.
            await blinkingLink.click();

            // Step 3: Now await the promise. It resolves to the new tab's Page object.
            childPage = await childPagePromise;

            // Step 4: Wait until the child page has loaded (default: 'load' state)
            //         so it's ready before we interact with or verify it.
            await childPage.waitForLoadState();

            // We now have TWO independent tabs: 'page' (parent) and 'childPage' (child).
            // Unlike Selenium, there is NO switchTo().window(). You simply choose
            // which Page object to call methods on.
            // Locators on the child window must be created from childPage, not page.
            // A locator built from 'page' only searches the parent tab.
            childRedText = childPage.locator(CHILD_WINDOW.redTextSelector);
        });

        await test.step('Verify child window URL and content', async () => {
            await expect(childPage).toHaveURL(CHILD_WINDOW.urlPattern);
            await expect(childRedText).toBeVisible();
            console.log('Child window text:', await childRedText.textContent());
        });

        await test.step('Extract the domain name from the e-mail in the child window', async () => {
            // Text looks like: "Please email us at mentor@rahulshettyacademy.com with below template ..."
            // textContent() does NOT auto-wait, but the previous step already asserted visibility.
            const redText     = (await childRedText.textContent()) ?? '';
            const afterAtSign = redText.split('@')[1];      // "rahulshettyacademy.com with below template ..."
            domainName        = afterAtSign.split('.')[0];  // "rahulshettyacademy"

            expect(domainName).toBe(CHILD_WINDOW.expectedDomain);
            console.log('Child window domain name:', domainName);
        });

        await test.step('Use the domain name as username in the parent window', async () => {
            // Data read from the child tab can be used straight away in the parent tab.
            await username.fill(domainName);
            await expect(username).toHaveValue(domainName);
            console.log('Parent window username:', await username.inputValue());
        });

        await test.step('Close child window and return to parent', async () => {
            // Closes ONLY the child tab; the parent tab is untouched.
            await childPage.close();

            // The parent 'page' was never affected, so no "switch back" is needed.
            // Its locators (like blinkingLink) still work directly.
            await expect(blinkingLink).toBeVisible(); // parent window is still usable
        });
    });
});
