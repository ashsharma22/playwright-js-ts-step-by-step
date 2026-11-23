// @ts-check
const { test, expect } = require('@playwright/test');

const URL = 'https://the-internet.herokuapp.com/login';

test('login page has the expected title', async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveTitle('The Internet');
});

test('wrong password shows an error', async ({ page }) => {
  await page.goto(URL);
  await page.getByLabel('Username').fill('tomsmith');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Your password is invalid!')).toBeVisible();
});