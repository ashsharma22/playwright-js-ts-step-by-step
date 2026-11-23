/**
 * User Registration & Login – End-to-End Tests
 * --------------------------------------------
 * Site under test : https://rahulshettyacademy.com/client (dummy e-commerce app)
 *
 * Flow covered by each test:
 *   1. Open the registration page
 *   2. Fill in the registration form and submit
 *   3. Verify the "Account Created Successfully" message
 *   4. Go to the login page and sign in with the new account
 *   5. Verify the product dashboard loads (first product = "ADIDAS ORIGINAL")
 *
 * The same flow is implemented twice to compare two locator strategies:
 *   - CSS / ID locators       → page.locator('#id')
 *   - User-facing locators    → page.getByRole(), page.getByText()  (Playwright recommended)
 *
 * Key Playwright APIs shown here:
 *   - page.locator(css)               → find an element by CSS / id
 *   - page.getByRole() / getByText()  → find an element the way a user sees it
 *   - locator.selectOption(value)     → pick an option in a <select> dropdown
 *   - locator.waitFor()               → wait until an element is visible
 *   - locator.allTextContents()       → read the texts of all matches (NO auto-wait)
 */

// ─────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────
// Configuration & test data (kept in one place for easy updates)
// ─────────────────────────────────────────────────────────────

const REGISTER_PAGE_URL = 'https://rahulshettyacademy.com/client/#/auth/register';

/** Data used to register the new user. */
const USER = {
    firstName: 'Ashwani',
    lastName: 'Sharma',
    phoneNumber: '7848932310',
    occupation: 'Engineer',
    password: 'Welcome@1',
};

/** Expected texts used in assertions. */
const MESSAGES = {
    accountCreated: 'Account Created Successfully',
    loginPageBanner: 'Register to sign in with your personal account',
    firstProduct: 'ADIDAS ORIGINAL',
};

/**
 * Builds a unique e-mail for every run, because the site rejects
 * an e-mail address that has already been registered.
 * @returns {string} e.g. ashsharma1731234567890@gmail.com
 */
function generateUniqueEmail() {
    return `ashsharma${Date.now()}@gmail.com`;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

test.describe('User Registration - Dummy Website', () => {

    /**
     * Test 1: uses CSS / ID based locators.
     * Fast and precise, but tied to the page's internal markup (ids, classes).
     */
    test('Register and login using CSS locators', async ({ page }) => {

        // ── Locators ──────────────────────────────────────────
        // Registration form
        const firstName       = page.locator('#firstName');
        const lastName        = page.locator('#lastName');
        const email           = page.locator('#userEmail');        // also used on the login page
        const phoneNumber     = page.locator('#userMobile');
        const occupation      = page.locator("[formcontrolname='occupation']");
        const genderMale      = page.locator("[value='Male']");
        const password        = page.locator('#userPassword');     // also used on the login page
        const confirmPassword = page.locator('#confirmPassword');
        const ageCheckbox     = page.locator("[type='checkbox']"); // "I am 18 years or older"
        const submitButton    = page.locator('#login');            // "Register" on register page, "Login" on login page

        // Post-registration / dashboard
        const successHeading  = page.locator('h1.headcolor');
        const goToLoginButton = page.locator('button.btn');
        const loginBanner     = page.locator('label.blink_me');
        const productTitles   = page.locator('.card-body b');

        const userEmail = generateUniqueEmail();

        // ── Steps ─────────────────────────────────────────────
        await test.step('Open registration page', async () => {
            await page.goto(REGISTER_PAGE_URL);
        });

        await test.step('Fill registration form and submit', async () => {
            await firstName.fill(USER.firstName);
            await lastName.fill(USER.lastName);
            await email.fill(userEmail);
            await phoneNumber.fill(USER.phoneNumber);
            await occupation.selectOption(USER.occupation);
            await genderMale.click();
            await password.fill(USER.password);
            await confirmPassword.fill(USER.password);
            await ageCheckbox.click();
            await submitButton.click();
        });

        await test.step('Verify account was created', async () => {
            await expect(successHeading).toContainText(MESSAGES.accountCreated);
        });

        await test.step('Navigate to login page', async () => {
            await goToLoginButton.click();
            await expect(loginBanner).toContainText(MESSAGES.loginPageBanner);
        });

        await test.step('Login with the newly registered user', async () => {
            await email.fill(userEmail);
            await password.fill(USER.password);
            await submitButton.click();
        });

        await test.step('Verify products are displayed on dashboard', async () => {
            // Wait until at least one product card is rendered before reading texts;
            // allTextContents() does NOT auto-wait and could return an empty array.
            await productTitles.first().waitFor();
            console.log('Products:', await productTitles.allTextContents());
            await expect(productTitles.first()).toContainText(MESSAGES.firstProduct);
        });
    });

    /**
     * Test 2: uses Playwright's user-facing locators (getByRole / getByText).
     * These locate elements the way a user sees them (role + accessible name),
     * so they are more resilient to markup changes.
     */
    test('Register and login using getBy locators', async ({ page }) => {

        // ── Locators ──────────────────────────────────────────
        // Registration form (names below are the fields' placeholders / labels)
        const firstName       = page.getByRole('textbox', { name: 'First Name' });
        const lastName        = page.getByRole('textbox', { name: 'Last Name' });
        const email           = page.getByRole('textbox', { name: 'email@example.com' });
        const phoneNumber     = page.getByRole('textbox', { name: 'enter your number' });
        const occupation      = page.getByRole('combobox');
        const genderMale      = page.getByText('Male', { exact: true }); // exact: avoids matching "Female"
        // NOTE: "Passsword" (3 s's) is intentional – it matches the site's actual placeholder text.
        const password        = page.getByRole('textbox', { name: 'Passsword' });
        const confirmPassword = page.getByRole('textbox', { name: 'Confirm Password' });
        const ageCheckbox     = page.locator("[type='checkbox']");   // no accessible name, so CSS is used
        const submitButton    = page.locator('#login');              // "Register" / "Login" button

        // Post-registration / dashboard
        const successHeading  = page.getByRole('heading', { name: MESSAGES.accountCreated });
        const goToLoginButton = page.locator('button.btn');
        const loginBanner     = page.locator('label.blink_me');
        const productTitles   = page.locator('.card-body b');

        const userEmail = generateUniqueEmail();

        // ── Steps ─────────────────────────────────────────────
        await test.step('Open registration page', async () => {
            await page.goto(REGISTER_PAGE_URL);
        });

        await test.step('Fill registration form and submit', async () => {
            await firstName.fill(USER.firstName);
            await lastName.fill(USER.lastName);
            await email.fill(userEmail);
            await phoneNumber.fill(USER.phoneNumber);
            await occupation.selectOption(USER.occupation);
            await genderMale.click();
            await password.fill(USER.password);
            await confirmPassword.fill(USER.password);
            await ageCheckbox.click();
            await submitButton.click();
        });

        await test.step('Verify account was created', async () => {
            await expect(successHeading).toContainText(MESSAGES.accountCreated);
        });

        await test.step('Navigate to login page', async () => {
            await goToLoginButton.click();
            await expect(loginBanner).toContainText(MESSAGES.loginPageBanner);
        });

        await test.step('Login with the newly registered user', async () => {
            await email.fill(userEmail);
            await password.fill(USER.password);
            await submitButton.click();
        });

        await test.step('Verify products are displayed on dashboard', async () => {
            // Wait until at least one product card is rendered before reading texts;
            // allTextContents() does NOT auto-wait and could return an empty array.
            // (Prefer this over waitForLoadState('networkidle'), which Playwright discourages.)
            await productTitles.first().waitFor();
            console.log('Products:', await productTitles.allTextContents());
            await expect(productTitles.first()).toContainText(MESSAGES.firstProduct);
        });
    });
});
