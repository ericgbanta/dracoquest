import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/core/save';

/** Loads a fixture, optionally changed first. */
async function load(page: Page, fixture: string, change?: (save: SaveData) => void) {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
}

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button, ${scope} a`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.outerHTML.slice(0, 60)));
}

test('each zone on the Map lists its treasures and where they drop', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.rider.gear.push('bramblewarden-trinket'); });
  await page.getByTestId('tab-map').tap();
  await expect(page.getByTestId('treasures-mossy-hollow')).toHaveText('Treasures: 1 of 5 found');
  await page.getByTestId('treasures-mossy-hollow').tap();
  await expect(page.getByTestId('treasure-set-bramblewarden')).toContainText('2 pieces');
  await expect(page.getByTestId('treasure-bramblewarden-armor')).toContainText('Dropped by the Bramble Troll');
  await expect(page.getByTestId('treasure-bramblewarden-melee')).toContainText('regular fights');
  await expect(page.getByTestId('treasure-bramblewarden-trinket')).toContainText('Found');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/gear-treasures.png' });
  expect(await smallTargets(page, '.sheet')).toEqual([]);
});

test('wearing set pieces shows the set bonus in the Bag', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => {
    s.rider.gear.push('bramblewarden-melee', 'bramblewarden-trinket');
    s.rider.equipment.weapon = 'bramblewarden-melee';
    s.rider.equipment.trinket = 'bramblewarden-trinket';
  });
  await page.getByTestId('tab-bag').tap();
  const set = page.getByTestId('set-bramblewarden');
  await expect(set).toContainText('Bramblewarden set · 2 of 3');
  await expect(set.locator('.set-on')).toHaveCount(1);
  await expect(set).toContainText('3 pieces: +2 Vigor, +10% Healing');
  await set.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/gear-bag-set.png' });
});

test('the shop sells a second weapon of another element at each tier', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('go-town').tap();
  await expect(page.getByTestId('buy-cobble-cudgel')).toBeVisible();
  await expect(page.getByTestId('buy-icicle-wand')).toBeVisible();
  await page.getByTestId('shop-tab-armor').tap();
  await expect(page.getByTestId('buy-travelers-coat')).toBeVisible();
  // Trophies and zone drops are never sold.
  await expect(page.getByTestId('buy-bramblewarden-armor')).toHaveCount(0);
});
