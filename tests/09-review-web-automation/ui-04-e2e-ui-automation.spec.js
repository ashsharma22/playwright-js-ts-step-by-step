/**
 * E2E UI Automation – Login, Cart, Checkout, Place Order, Verify Order
 * --------------------------------------------------------------------
 * Site under test : https://rahulshettyacademy.com/client/#/auth/login
 *
 * Flow:
 *   1. Log in with an existing user
 *   2. Add "ZARA COAT 3" and "IPHONE 13 PRO" to the cart
 *   3. Open the cart and verify both products are listed
 *   4. Click Checkout
 *   5. Fill CVV and Name on Card, apply coupon "rahulshettyacademy"
 *   6. Verify the logged-in e-mail is shown as the label above the e-mail field
 *   7. Type "Ind" slowly into Country, pick "India" from the suggestions
 *   8. Place the order and verify the "Thank you" message
 *   9. Copy the order id, open "My Orders" and verify the order is listed
 *
 * Key Playwright APIs shown here:
 *   - locator.pressSequentially(text, { delay }) → type key-by-key (triggers auto-suggest)
 *   - locator.filter({ hasText })                → narrow a list of elements
 *   - expect(...).toBeVisible() / toHaveText()   → auto-retrying assertions
 */

// ─────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────
// Configuration & test data (kept in one place for easy updates)
// ─────────────────────────────────────────────────────────────

const LOGIN_PAGE_URL = 'https://rahulshettyacademy.com/client/#/auth/login';

/** Existing user used to log in. */
const USER = {
    email: 'ashwanisharma@gmail.com',
    password: 'Testing@123',
};

/** Values used for actions and assertions. */
const TEST_DATA = {
    products: ['ZARA COAT 3', 'IPHONE 13 PRO'],
    cvvCode: '123',
    nameOnCard: 'Ashwani Sharma',
    couponCode: 'rahulshettyacademy',
    countrySearch: 'Ind',                     // typed key-by-key to open the suggestion list
    country: 'India',
    typingDelayMs: 100,                       // pause between key presses
    couponAppliedText: 'Coupon Applied',
    thankYouText: 'Thankyou for the order.',
};

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

test.describe('E2E UI Automation Test Suite', () => {

    test('Login, add products, place order and verify order', async ({ page }) => {

        // Many steps + slowMo (1 s per action in config) → 30 s default is too short.
        test.setTimeout(120 * 1000);

        // ── Locators ──────────────────────────────────────────
        // Login page
        const emailInput        = page.locator('#userEmail');
        const passwordInput     = page.locator('#userPassword');
        const loginButton       = page.locator('#login');

        // Dashboard / cart
        const productCards      = page.locator('.card-body');
        const cartButton        = page.locator('button[routerlink="/dashboard/cart"]');
        const cartItems         = page.locator('.cartSection h3');
        const checkoutButton    = page.getByRole('button', { name: 'Checkout' });

        // Checkout page: each input sits inside a .field box together with its title
        const fieldInput        = (title) => page.locator('.field').filter({ hasText: title }).locator('input');
        const cvvInput          = fieldInput('CVV');
        const nameOnCardInput   = fieldInput('Name on Card');
        const couponInput       = fieldInput('Apply Coupon');
        const applyCouponButton = page.getByRole('button', { name: 'Apply Coupon' });
        const couponMessage     = page.locator('.field').filter({ hasText: 'Apply Coupon' }).locator('p');
        const emailLabel        = page.locator('.user__name label');
        const countryInput      = page.locator('input[placeholder="Select Country"]');
        const countryOptions    = page.locator('.ta-results button');
        const placeOrderButton  = page.locator('.action__submit');

        // Thank-you page
        const thankYouHeading   = page.locator('.hero-primary');
        const orderIdLabel      = page.locator('.em-spacer-1 .ng-star-inserted');

        // My Orders page
        const myOrdersButton    = page.locator('button[routerlink="/dashboard/myorders"]');
        const orderRows         = page.locator('tbody tr');

        // ── 1. Log in ─────────────────────────────────────────
        await page.goto(LOGIN_PAGE_URL);
        await emailInput.fill(USER.email);
        await passwordInput.fill(USER.password);
        await loginButton.click();
        await expect(productCards.first()).toBeVisible();

        // ── 2. Add both products to the cart ──────────────────
        for (const productName of TEST_DATA.products) {
            const card = productCards.filter({ has: page.locator('b', { hasText: productName }) });
            await card.getByRole('button', { name: 'Add To Cart' }).click();
        }

        // ── 3. Open the cart and verify both products ─────────
        await cartButton.click();
        for (const productName of TEST_DATA.products) {
            await expect(cartItems.filter({ hasText: productName })).toBeVisible();
        }

        // ── 4. Checkout ───────────────────────────────────────
        await checkoutButton.click();

        // ── 5. Card details + coupon ──────────────────────────
        await cvvInput.fill(TEST_DATA.cvvCode);
        await nameOnCardInput.fill(TEST_DATA.nameOnCard);
        await couponInput.fill(TEST_DATA.couponCode);
        await applyCouponButton.click();
        await expect(couponMessage).toContainText(TEST_DATA.couponAppliedText);

        // ── 6. E-mail label shows the logged-in user ──────────
        await expect(emailLabel).toHaveText(USER.email);

        // ── 7. Country auto-suggest ───────────────────────────
        // Options are passed as an object: { delay: 100 }, not `delay=100`.
        await countryInput.pressSequentially(TEST_DATA.countrySearch, { delay: TEST_DATA.typingDelayMs });
        await countryOptions.first().waitFor({ state: 'visible' });
        // Exact match: "Ind" also suggests "British Indian Ocean Territory", "Indonesia".
        await countryOptions.filter({ hasText: new RegExp(`^\\s*${TEST_DATA.country}\\s*$`) }).click();
        await expect(countryInput).toHaveValue(TEST_DATA.country);

        // ── 8. Place the order ────────────────────────────────
        await placeOrderButton.click();
        await expect(thankYouHeading).toContainText(TEST_DATA.thankYouText);

        // ── 9. Copy order id and verify it in My Orders ───────
        // Label text looks like " | 6745abc... | " → strip the pipes and spaces.
        await expect(orderIdLabel.first()).toBeVisible();
        const orderId = (await orderIdLabel.first().textContent()).replace(/\|/g, '').trim();
        console.log(`Order ID: ${orderId}`);
        expect(orderId).not.toBe('');

        await myOrdersButton.first().click();
        await expect(orderRows.first()).toBeVisible();
        await expect(orderRows.filter({ hasText: orderId })).toHaveCount(1);
    });
});
