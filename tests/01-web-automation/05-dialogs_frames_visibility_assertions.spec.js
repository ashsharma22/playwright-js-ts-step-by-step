// =====================================================================================
// File   : 05-visibility-navigation.spec.js
// Topic  : Visibility assertions (toBeVisible / toBeHidden / toHaveCount)
//          + browser navigation (goBack / goForward / reload)
// Site   : https://the-internet.herokuapp.com  (free practice site)
// Run    : npx playwright test 05 --ui --project=chromium
//          npx playwright test 05 --headed --project=chromium

/*
=====================================================================================
Scenario 1: Hidden → Visible (element stays in the page)
-------------------------------------------------------------------------------------
Manual steps:
1. Open https://the-internet.herokuapp.com/dynamic_loading/1
2. Check that the "Hello World!" text is NOT shown.
   DevTools (F12) → Elements → search #finish → it IS in the HTML with display: none.
3. Click Start.
4. Check that a loading bar appears.
5. Wait about 5 seconds.
6. Check that "Hello World!" is now shown.
-------------------------------------------------------------------------------------
Playwright features used:

• Web-first assertions: await expect(locator).toBeVisible() / toBeHidden()
  These assertions WAIT and RETRY until the condition is true or the timeout ends
  (default 5 seconds). You never write explicit waits for them.

• toBeHidden() passes when the element is in the DOM but not visible
  (display:none, visibility:hidden, zero size) OR not in the DOM at all.
  Here #finish is in the DOM with display:none → toBeHidden() passes.

• { timeout: 10_000 } on one assertion
  Overrides the 5 s default for that assertion only. Use it for steps you know are
  slow, instead of raising the global timeout for every test.

• toHaveText('...')
  Full-text match on the element's text (extra spaces are normalised). Also retries.
=====================================================================================
*/
test('Scenario 1: Hidden → Visible (element stays in DOM)', async ({ page }) => {
  // Open the page. goto() waits for the page "load" event before the next line runs.
  await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');

  // Save the locator in a variable so it can be reused in 3 assertions below.
  // <div id="finish"> holds the "Hello World!" text. Nothing is searched yet (lazy).
  const finish = page.locator('#finish');

  // The div is in the HTML but has display:none → hidden → assertion passes.
  await expect(finish).toBeHidden();

  // getByRole finds the element by its role (button) and its visible text (Start).
  // click() auto-waits until the button is visible, enabled and not moving, then clicks.
  await page.getByRole('button', { name: 'Start' }).click();

  // The loading bar (<div id="loading">) appears right after Start is clicked.
  await expect(page.locator('#loading')).toBeVisible();

  // Loading takes about 5 s, same as the default 5 s timeout → too tight, may fail.
  // So wait up to 10 s for this one assertion. 10_000 = 10000 (underscore only for reading).
  await expect(finish).toBeVisible({ timeout: 10_000 });

  // Confirm the text inside the div is exactly "Hello World!".
  await expect(finish).toHaveText('Hello World!');
});


/*
=====================================================================================
Scenario 2: Visible → Removed → Visible (checkbox removed from the page and added back)
-------------------------------------------------------------------------------------
Manual steps:
1. Open https://the-internet.herokuapp.com/dynamic_controls
2. Check that the "A checkbox" checkbox is shown.
   DevTools: <div id="checkbox"> wraps <input type="checkbox">.
   NOTE: #checkbox is the DIV, not the checkbox itself.
3. Click Remove.
4. Check that a short loading bar ("Wait for it...") appears.
5. Check that the checkbox disappears.
   DevTools: the checkbox is no longer in the HTML → REMOVED, not just hidden.
6. Check that the message "It's gone!" is shown. The button text changes to "Add".
7. Click Add → check that "It's back!" is shown and the checkbox comes back.
   NOTE: after Add, the new HTML is <div><input type="checkbox" id="checkbox"></div>
         → now #checkbox is the INPUT. The id moved. Role-based locators don't care.
-------------------------------------------------------------------------------------
Playwright features used:

• getByRole('checkbox')
  Finds the real <input type="checkbox"> by its accessibility role, not by id or CSS.
  It keeps working even when the page changes ids or wrappers (see note in step 7).
  If more than one element matches and you act on it, Playwright throws a
  "strict mode violation" error. Here only one checkbox exists, so it is safe.

• toBeHidden() vs toHaveCount(0)
  toBeHidden()   → passes if the element is hidden OR removed. It cannot tell which.
  toHaveCount(0) → passes ONLY if no element matches in the DOM → proves "removed".
  Use both when the requirement is "the element is removed".

• toHaveText() on the SAME locator twice
  #message first shows "It's gone!", later "It's back!". Because the locator is lazy
  and the assertion retries, the same locator works for both texts.

• Pass a locator to expect, not a value
  ❌ await expect(await loc.textContent()).toBe('...')  → reads once, no retry → flaky
  ✅ await expect(loc).toHaveText('...')                → reads + retries until match
=====================================================================================
*/
test('Scenario 2: Visible → Removed → Visible (remove and add checkbox)', async ({ page }) => {
  await page.goto('https://the-internet.herokuapp.com/dynamic_controls');

  // The real checkbox input. Only one on the page → no strict mode error.
  const checkbox = page.getByRole('checkbox');

  // <p id="message"> shows "It's gone!" / "It's back!" after the button is clicked.
  // ✏️ p[id='message'] and 'form p' → #message (shorter and more precise).
  const message = page.locator('#message');

  // #checkbox = the wrapper <div>. Fine for a visibility check, NOT for check()/toBeChecked().
  await expect(page.locator('#checkbox')).toBeVisible();

  // The checkbox itself is visible at page load.
  await expect(checkbox).toBeVisible();

  // Only one "Remove" button → .first() not needed.
  await page.getByRole('button', { name: 'Remove' }).click();   // ✏️ removed unnecessary .first()

  // "Wait for it..." loading bar shows while the page removes the checkbox (~3 s).
  await expect(page.locator('#loading')).toBeVisible();

  // Checkbox removed from the DOM → toBeHidden() passes. 10 s because removal takes ~3 s.
  await expect(checkbox).toBeHidden({ timeout: 10_000 });

  // Proves it was REMOVED from the DOM, not only hidden. toBeHidden() alone cannot tell.
  await expect(checkbox).toHaveCount(0);                        // ✏️ added

  // Pass the locator to expect so it can retry. (Original used textContent() → no retry.)
  await expect(message).toHaveText("It's gone!");               // ✏️ was textContent()

  // After Remove, the same button now says "Add".
  // A locator with name 'Remove' here would wait 30 s and fail with "Test timeout exceeded".
  await page.getByRole('button', { name: 'Add' }).click();

  // Same #message element now shows new text. toHaveText retries until it changes.
  await expect(message).toHaveText("It's back!");

  // New checkbox is back on the page.
  await expect(checkbox).toBeVisible();
});


/*
=====================================================================================
Scenario 3: Browser back, forward and reload
-------------------------------------------------------------------------------------
Manual steps:
1. Open https://the-internet.herokuapp.com/
2. Check that the heading reads "Welcome to the-internet".
3. Click the Checkboxes link.
4. Check that the URL ends with /checkboxes and the heading reads "Checkboxes".
5. Tick the first checkbox (default: checkbox 1 = unticked, checkbox 2 = ticked).
6. Click the browser Back button → check you are on the home page.
7. Click the browser Forward button → check the Checkboxes page is shown again.
8. Click the browser Reload button → check the page is still Checkboxes and
   checkbox 1 is unticked again (reload resets the page).
-------------------------------------------------------------------------------------
Playwright features used:

• page.goBack() / page.goForward() / page.reload()
  Same as the browser Back, Forward and Reload buttons. Each one waits for the
  page "load" event by default, then returns. They return Promises → always await.
  Missing await = navigation starts, the next line runs immediately → random failures.
  Selenium: driver.navigate().back() / forward() / refresh()

• await expect(page).toHaveURL(...)
  Retries until the page URL matches.
    String  'https://.../'      → exact match of the full URL.
    Regex   /\/checkboxes$/     → pattern match. \/ = a real "/", $ = end of URL.
    ❌ '/checkboxes$' in quotes is a plain STRING, not a regex → exact match → fails.

• getByRole('heading', { name: '...' }) / getByRole('link', { name: '...' })
  Finds <h1>–<h6> or <a> elements by their visible text. Preferred over CSS like
  'div h1' or "a[href='/checkboxes']" because it matches what the user sees.

• check() + toBeChecked() / not.toBeChecked()
  check() ticks the checkbox only if it is unticked, then confirms it is ticked.
  toBeChecked() asserts it is ticked. .not reverses any assertion.
  first() = first matching element, nth(1) = second (index starts at 0).

• Why every action ends with an assertion
  A test with only actions passes as long as nothing throws, even if the action did
  nothing. The original getByText('checkbox 1').click() clicked the middle of the
  form (empty space) and the test still passed. The assertion catches that.

• Note: some browsers restore form state on reload. If not.toBeChecked() fails after
  reload, the browser kept the tick. Use page.goto() for a truly fresh page.
=====================================================================================
*/
test('Scenario 3: Browser back, forward and reload', async ({ page }) => {
  // Locators used more than once are saved in variables at the top.
  const homeHeading = page.getByRole('heading', { name: 'Welcome to the-internet' });
  const checkboxesHeading = page.getByRole('heading', { name: 'Checkboxes' });

  // First checkbox <input> on the Checkboxes page. Lazy → safe to create before that page opens.
  // ✏️ was getByText('checkbox 1') → "checkbox 1" is plain text, not a <label>, so it matched
  //    the whole <form> and the click hit empty space → nothing was ticked.
  const firstCheckbox = page.getByRole('checkbox').first();

  // ---- Steps 1–2: open home page ----
  await page.goto('https://the-internet.herokuapp.com/');
  await expect(homeHeading).toBeVisible();                      // ✏️ 'div h1' → getByRole('heading')

  // ---- Steps 3–4: go to Checkboxes page ----
  // Click the link by its visible text.
  await page.getByRole('link', { name: 'Checkboxes' }).click(); // ✏️ "li a[href='/checkboxes']" → getByRole('link')

  // URL must end with /checkboxes (regex), and the page heading must be "Checkboxes".
  await expect(page).toHaveURL(/\/checkboxes$/);
  await expect(checkboxesHeading).toBeVisible();

  // ---- Step 5: tick the first checkbox ----
  // check() ticks only if unticked. The assertion proves the tick really happened.
  await firstCheckbox.check();                                  // ✏️ was getByText(...).click()
  await expect(firstCheckbox).toBeChecked();                    // ✏️ added

  // ---- Step 6: browser Back ----
  // Goes back to the home page. Exact URL match with a string.
  await page.goBack();                                          // ✏️ added await
  await expect(page).toHaveURL('https://the-internet.herokuapp.com/');
  await expect(homeHeading).toBeVisible();

  // ---- Step 7: browser Forward ----
  // Goes forward to the Checkboxes page again.
  await page.goForward();                                       // ✏️ added await
  await expect(page).toHaveURL(/\/checkboxes$/);
  await expect(checkboxesHeading).toBeVisible();

  // ---- Step 8: browser Reload ----
  // Reloads the same page. The URL must not change.
  await page.reload();                                          // ✏️ added await
  await expect(page).toHaveURL(/\/checkboxes$/);

  // Reload resets the page → checkbox 1 is unticked again.
  // ✏️ was nth(1).toBeChecked() → that is checkbox 2, ticked by default, so it proved nothing.
  await expect(firstCheckbox).not.toBeChecked();

  // Checkbox 2 keeps its default state (ticked). nth(1) = second checkbox.
  await expect(page.getByRole('checkbox').nth(1)).toBeChecked();
});
