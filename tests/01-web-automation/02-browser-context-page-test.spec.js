// @ts-check
// =====================================================================================
// File   : 02-browser-context-page.spec.js
// Topic  : Built-in fixtures – { page } vs { context } vs { browser }
// Site   : https://the-internet.herokuapp.com  (free practice site)
// Run    : npx playwright test 04-browser-context-page --project=chromium --headed
// =====================================================================================
//
// Browser  = one Chrome/Firefox/WebKit process, shared by all tests in a worker.
// Context  = one isolated session (own cookies, storage, cache), like an incognito window.
// Page     = one tab inside a context.
//
// { page }    → Playwright creates a fresh context + page, and closes both after the test.
// { context } → Playwright creates a fresh context (no page yet), and closes it after.
// { browser } → you get the shared browser; you create contexts yourself and must close them.
// =====================================================================================

const { test, expect } = require('@playwright/test');

const LOGIN_URL = 'https://the-internet.herokuapp.com/login';

// -------------------------------------------------------------------------------------
// 1. { page } – the default choice for almost every test.
// -------------------------------------------------------------------------------------
test('1. page fixture: one user, one tab', async ({ page }) => {
  await page.goto(LOGIN_URL);
  await expect(page.getByRole('heading', { name: 'Login Page' })).toBeVisible();
});

// -------------------------------------------------------------------------------------
// 2. { browser } doing the same thing by hand – more code, same result.
//    This is what { page } does for you behind the scenes.
// -------------------------------------------------------------------------------------
test('2. browser fixture: manual context + page (same as test 1)', async ({ browser }) => {
  const context = await browser.newContext();   // new isolated session
  const page = await context.newPage();         // new tab in that session

  await page.goto(LOGIN_URL);
  await expect(page.getByRole('heading', { name: 'Login Page' })).toBeVisible();

  await context.close();                        // you opened it, you close it
});

// -------------------------------------------------------------------------------------
// 3. { context } – when you need the session itself: new tabs, cookies, permissions.
//    Here: a link opens a NEW TAB. The context sees every tab opened in that session.
// -------------------------------------------------------------------------------------
test('3. context fixture: catch a new tab', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://the-internet.herokuapp.com/windows');

  // Start waiting for the new tab BEFORE clicking, so the event is not missed.
  const newTabPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Click Here' }).click();
  const newTab = await newTabPromise;

  await expect(newTab.getByRole('heading', { name: 'New Window' })).toBeVisible();
  await expect(context.pages()).toHaveLength(2); // original tab + new tab
});

// -------------------------------------------------------------------------------------
// 4. { browser } – when ONE test needs TWO separate users / sessions.
//    User A logs in. User B, in a different context, is still logged out.
// -------------------------------------------------------------------------------------
test('4. browser fixture: two users, isolated sessions', async ({ browser }) => {
  const userAContext = await browser.newContext();
  const userBContext = await browser.newContext();
  const userA = await userAContext.newPage();
  const userB = await userBContext.newPage();

  // User A logs in.
  await userA.goto(LOGIN_URL);
  await userA.getByLabel('Username').fill('tomsmith');
  await userA.getByLabel('Password').fill('SuperSecretPassword!');
  await userA.getByRole('button', { name: 'Login' }).click();
  await expect(userA).toHaveURL(/\/secure$/);

  // User B opens the secure page directly → no shared cookies → sent back to login.
  await userB.goto('https://the-internet.herokuapp.com/secure');
  await expect(userB).toHaveURL(/\/login$/);

  await userAContext.close();
  await userBContext.close();
});