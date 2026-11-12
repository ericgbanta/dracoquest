import { expect, test, type Page } from '@playwright/test';
import { openFold, tab } from './helpers';

async function hatch(page: Page, name = 'Cinder', egg = 'fire') {
  await page.goto('./');
  await page.getByTestId(`egg-${egg}`).tap();
  for (let i = 0; i < 12; i++) await page.getByTestId('warm-egg').tap();
  await page.getByTestId('dragon-name').fill(name);
  await page.getByTestId('primary-6').tap();
  await page.getByTestId('hatch').tap();
  await expect(page.getByTestId('welcome')).toHaveText(name);
}

/** Press Go until the fight ends. Returns the results heading text. */
async function fightToEnd(page: Page): Promise<string> {
  for (let round = 0; round < 40; round++) {
    await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
    const results = page.locator('.results-title');
    if (await results.count()) return (await results.textContent()) ?? '';
    await page.getByTestId('go').tap();
  }
  throw new Error('Fight did not end');
}

async function tooSmallTargets(page: Page): Promise<string[]> {
  return page.locator('a, button, input, textarea').evaluateAll((els) =>
    els
      .map((el) => ({ el: el.outerHTML.slice(0, 70), r: { width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight } }))
      .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
      .map(({ el, r }) => `${el} ${r.width}x${r.height}`),
  );
}

test('a new player hatches a dragon and wins a fight within 5 minutes', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const start = Date.now();
  await hatch(page);
  // Fast battles keep the test quick; the flow is the same.
  await page.getByTestId('go-map').tap();
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.getByTestId('go')).toBeVisible();
  await expect(page.locator('.intent').first()).toBeVisible();
  const result = await fightToEnd(page);
  expect(result).toContain('Victory');
  await expect(page.getByTestId('reward-xp')).toContainText('XP');
  expect(Date.now() - start).toBeLessThan(5 * 60_000);
});

test('the tab bar switches screens after hatching and deep links work', async ({ page }) => {
  await hatch(page);
  for (const [tab, title] of [['map', 'Map'], ['dragons', 'Dragons'], ['bag', 'Bag'], ['roost', 'Roost']] as const) {
    await page.getByTestId(`tab-${tab}`).tap();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#/${tab}$`));
  }
  await page.goto('./#/bag');
  await expect(page.getByRole('heading', { name: 'Bag' })).toBeVisible();
  await page.goto('./#/nowhere');
  await expect(page.getByRole('heading', { name: 'Roost', exact: true })).toBeVisible();
});

test('every tap target is at least 44 x 44 px', async ({ page }) => {
  await page.goto('./');
  expect(await tooSmallTargets(page)).toEqual([]);
  await hatch(page);
  for (const route of ['roost', 'map', 'dragons', 'bag', 'settings']) {
    await page.goto(`./#/${route}`);
    expect(await tooSmallTargets(page), route).toEqual([]);
  }
  await page.goto('./#/map');
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.getByTestId('go')).toBeVisible();
  expect(await tooSmallTargets(page), 'battle').toEqual([]);
});

test('the battle screen fits a 375 x 667 phone without scrolling', async ({ page }) => {
  await hatch(page);
  await page.goto('./#/map');
  await page.getByTestId('start-mossy-hollow').tap();
  const go = await page.getByTestId('go').boundingBox();
  expect(go!.y + go!.height).toBeLessThanOrEqual(667);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Roost care: feed, groom and play, rest, and the Well kept buff', async ({ page }) => {
  await hatch(page);
  await page.getByTestId('care-feed').tap();
  await page.getByTestId('food-river-trout').tap();
  await expect(page.getByTestId('toast')).toContainText('stat point');
  await page.getByTestId('care-groom').tap();
  for (let i = 0; i < 6; i++) await page.getByTestId('groom-spot').first().tap({ force: true });
  await expect(page.getByTestId('groom-done')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('groom-done').tap();
  await expect(page.getByTestId('toast')).toContainText('bond');
  await page.getByTestId('care-rest').tap();
  await expect(page.getByText(/Well kept: \+10% XP for 5 more fights/)).toBeVisible();
  await page.getByTestId('tab-dragons').tap();
  await tab(page, 'dragons', 'stats');
  await expect(page.getByTestId('dragon-points')).toHaveText('1 to spend');
  await page.getByTestId('dragon-plus-might').tap();
  await expect(page.getByTestId('dragon-points')).toHaveCount(0);
});

test('a save survives a reload, including mid-battle', async ({ page }) => {
  await hatch(page, 'Reloady');
  await page.reload();
  await expect(page.getByTestId('welcome')).toHaveText('Reloady');
  await page.goto('./#/map');
  await page.getByTestId('start-mossy-hollow').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('go')).toBeEnabled();
  const round = await page.locator('.battle-header span').first().textContent();
  await page.reload();
  await expect(page.locator('.battle-header span').first()).toHaveText(round!);
});

test('an exported save code imports into a fresh browser', async ({ browser, page }) => {
  await hatch(page, 'Traveler 🐉');
  await page.goto('./#/settings');
  await openFold(page, 'settings.backup');
  await page.getByTestId('export').tap();
  const code = await page.getByTestId('export-code').inputValue();
  expect(code).toMatch(/^DQ1:/);

  const fresh = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page2 = await fresh.newPage();
  await page2.goto('./');
  await expect(page2.getByTestId('egg-fire')).toBeVisible();
  await page2.goto('./#/settings');
  await openFold(page2, 'settings.backup');
  await page2.getByTestId('import-code').fill(code);
  await page2.getByTestId('import').tap();
  await expect(page2.getByTestId('notice')).toContainText('Save loaded');
  await page2.reload();
  await page2.getByTestId('tab-roost').tap();
  await expect(page2.getByTestId('welcome')).toHaveText('Traveler 🐉');
  await fresh.close();
});

test('a bad import code shows an error and keeps the current save', async ({ page }) => {
  await hatch(page, 'Keepme');
  await page.goto('./#/settings');
  await openFold(page, 'settings.backup');
  await page.getByTestId('import-code').fill('not a code');
  await page.getByTestId('import').tap();
  await expect(page.getByTestId('notice')).toHaveText('That is not a DracoQuest save code');
  await page.getByTestId('tab-roost').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Keepme');
});

test('a damaged save is not overwritten', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('dracoquest.save', '{"version":2,"broken":true}'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('could not be read');
  const stored = await page.evaluate(() => localStorage.getItem('dracoquest.save'));
  expect(stored).toBe('{"version":2,"broken":true}');
});

test('a Phase 0 (version 1) save migrates and keeps the rider name', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('dracoquest.save', JSON.stringify({
    version: 1, createdAt: 1, updatedAt: 1, seed: 7, rider: { name: 'Old Friend' }, settings: { sound: false, fastBattles: false },
  })));
  await page.reload();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  await page.goto('./#/settings');
  await openFold(page, 'settings.rider');
  await expect(page.getByTestId('rider-name')).toHaveValue('Old Friend');
});

test('can be added to the Home Screen: manifest, icons, and standalone tags', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  expect(href).toBe('/dracoquest/manifest.webmanifest');
  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({ name: 'DracoQuest', display: 'standalone', scope: '/dracoquest/', start_url: '/dracoquest/#/roost' });
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const res = await request.get(new URL(icon.src, `http://localhost:4173${href}`).href);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  const apple = await page.locator('link[rel=apple-touch-icon]').getAttribute('href');
  expect((await request.get(apple!)).status()).toBe(200);
  await expect(page.locator('meta[name=apple-mobile-web-app-capable]')).toHaveAttribute('content', 'yes');
  await page.goto('./#/settings');
  await expect(page.getByTestId('install-tip')).toContainText('Add to Home');
});
