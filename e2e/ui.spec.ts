import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/core/save';
import { openFold, tab, mapView, enter } from './helpers';

/** A date outside every seasonal event, so no event card adds height. */
const QUIET_DAY = new Date('2026-06-01T10:00:00');

async function load(page: Page, fixture: string, change?: (save: SaveData) => void) {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
}

const pageHeight = (page: Page) => page.evaluate(() => document.scrollingElement!.scrollHeight);

test('every main screen stays short at 375 x 667 (docs/UI_PLAN.md)', async ({ page }) => {
  await page.clock.install({ time: QUIET_DAY });
  // Fresh timers (nothing to collect), so the Roost's buildings stay folded.
  await load(page, 'elder.json', (s) => {
    s.roost.pantry = { lastAt: QUIET_DAY.getTime(), stored: 0 };
    s.roost.hatchery.eggs = [];
    s.dragons = s.dragons.map((d) => ({ ...d, assignment: { kind: 'idle' as const } }));
  });
  // Budgets in screens (667 px). The Map's includes its painted map (about 0.8 screens). Before the change: Bag 4.3, Town 15.8, Map 9.6, Roost 3.9, Dragons 3.7, Settings 3.2.
  const budgets: [string, number][] = [['bag', 1.5], ['dragons', 2.2], ['settings', 1.6], ['town', 2.6], ['map', 3.5], ['roost', 2.6]];
  for (const [route, screens] of budgets) {
    await page.goto(`./#/${route}`);
    await page.reload();
    await enter(page);
    await page.waitForTimeout(500);
    const h = await pageHeight(page);
    expect(h / 667, `${route} is ${h}px`).toBeLessThanOrEqual(screens);
  }
});

test('folds remember being opened, and sub-tabs show waiting points', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.rider.statPoints = 3; });
  await page.getByTestId('tab-bag').tap();
  // The Stats tab carries a badge with the points waiting.
  await expect(page.getByTestId('bag-tab-stats')).toContainText('3');
  await tab(page, 'bag', 'stats');
  await expect(page.getByTestId('rider-points')).toHaveText('3 to spend');
  // The chosen tab survives a reload.
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('rider-points')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui-bag.png' });

  await page.goto('./#/settings');
  await expect(page.getByTestId('fold-settings.slots')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('fold-settings.backup')).toHaveAttribute('aria-expanded', 'false');
  await openFold(page, 'settings.backup');
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('fold-settings.backup')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('export')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/ui-settings.png' });
});

test('the Town starts on the rider’s weapon type near their level', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('go-town').tap();
  // The juvenile fixture wields a melee weapon at level 15.
  await expect(page.getByTestId('shop-kind-melee')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('shop-range')).toHaveText('Near my level');
  await expect(page.getByTestId('buy-coral-cutlass')).toBeVisible();
  await expect(page.getByTestId('buy-frostbite-crossbow')).toHaveCount(0);
  await expect(page.getByTestId('buy-dawnbreaker')).toHaveCount(0);
  await page.getByTestId('shop-show-all').tap();
  await expect(page.getByTestId('buy-dawnbreaker')).toBeVisible();
  await page.getByTestId('shop-range').tap();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui-town.png' });
});

test('a folded zone keeps a Hunt button that starts a run', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  // Level 15: Mossy Hollow (1 to 8) is folded; Cinder Pass (12 to 20) is open.
  await expect(page.getByTestId('fold-map.zone.mossy-hollow')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('fold-map.zone.cinder-pass')).toHaveAttribute('aria-expanded', 'true');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ui-map.png' });
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.locator('[data-testid=stage], .results-title, [data-testid=go]').first()).toBeVisible();
});
