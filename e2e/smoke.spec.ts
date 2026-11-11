import { expect, test } from '@playwright/test';

test('loads at the Roost and the tab bar switches screens', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Roost' })).toBeVisible();
  for (const [tab, title] of [['map', 'Map'], ['dragons', 'Dragons'], ['bag', 'Bag'], ['roost', 'Roost']] as const) {
    await page.getByTestId(`tab-${tab}`).tap();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
  }
});

test('deep links work through the hash', async ({ page }) => {
  await page.goto('./#/bag');
  await expect(page.getByRole('heading', { name: 'Bag' })).toBeVisible();
  await page.goto('./#/nowhere');
  await expect(page.getByRole('heading', { name: 'Roost' })).toBeVisible();
});

test('every tap target is at least 44 x 44 px', async ({ page }) => {
  for (const route of ['roost', 'settings']) {
    await page.goto(`./#/${route}`);
    const small = await page.locator('a, button, input, textarea').evaluateAll((els) =>
      els
        .map((el) => ({ el: el.outerHTML.slice(0, 60), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
        .map(({ el, r }) => `${el} ${r.width}x${r.height}`),
    );
    expect(small).toEqual([]);
  }
});

test('no horizontal scroll at phone width', async ({ page }) => {
  await page.goto('./#/settings');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a save survives a reload', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByTestId('rider-name').fill('Reload Rider');
  await page.getByTestId('save-name').tap();
  await expect(page.getByTestId('notice')).toHaveText('Name saved.');
  await page.reload();
  await page.getByTestId('tab-roost').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Welcome back, Reload Rider.');
});

test('an exported save code imports into a fresh browser', async ({ browser, page }) => {
  await page.goto('./#/settings');
  await page.getByTestId('rider-name').fill('Traveler 🐉');
  await page.getByTestId('save-name').tap();
  await page.getByTestId('export').tap();
  const code = await page.getByTestId('export-code').inputValue();
  expect(code).toMatch(/^DQ1:/);

  // A new context has its own empty localStorage, like a different browser.
  const fresh = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page2 = await fresh.newPage();
  await page2.goto('./#/roost');
  await expect(page2.getByTestId('welcome')).toHaveText('Welcome back, Keeper.');
  await page2.goto('./#/settings');
  await page2.getByTestId('import-code').fill(code);
  await page2.getByTestId('import').tap();
  await expect(page2.getByTestId('notice')).toContainText('Save loaded');
  await page2.reload();
  await page2.goto('./#/roost');
  await expect(page2.getByTestId('welcome')).toHaveText('Welcome back, Traveler 🐉.');
  await fresh.close();
});

test('a bad import code shows an error and keeps the current save', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByTestId('import-code').fill('not a code');
  await page.getByTestId('import').tap();
  await expect(page.getByTestId('notice')).toHaveText('That is not a DracoQuest save code');
  await page.getByTestId('tab-roost').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Welcome back, Keeper.');
});

test('a damaged save is not overwritten', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('dracoquest.save', '{"version":2,"broken":true}'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be read');
  const stored = await page.evaluate(() => localStorage.getItem('dracoquest.save'));
  expect(stored).toBe('{"version":2,"broken":true}');
});
