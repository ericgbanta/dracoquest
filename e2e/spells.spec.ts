import { expect, test, type Page } from '@playwright/test';
import { openFold, tab, mapView } from './helpers';
import { readFileSync } from 'node:fs';

async function load(page: Page, fixture: string) {
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, readFileSync(`e2e/fixtures/${fixture}`, 'utf8'));
  await page.goto('./#/roost');
  await page.reload();
}

const loadout = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!).rider.spells as string[]);

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.outerHTML.slice(0, 60)));
}

test('the Bag picks four spells to take into battle', async ({ page }) => {
  // The juvenile fixture is a level 15 rider who still has only the two starting spells picked.
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'spells');
  const card = page.getByTestId('spells');
  await card.scrollIntoViewIfNeeded();
  await expect(page.getByTestId('loadout-count')).toHaveText('2 of 4 in battle');
  await openFold(page, 'bag.spells.locked');
  await expect(page.getByTestId('spell-row-thorn-snare')).toContainText('Level 30');

  await page.getByTestId('spell-add-frost-dart').tap();
  await page.getByTestId('spell-add-bright-ward').tap();
  await expect(page.getByTestId('loadout-count')).toHaveText('4 of 4 in battle');
  await expect(page.getByTestId('spell-add-tide-surge')).toBeDisabled();
  expect(await loadout(page)).toEqual(['arc-bolt', 'mend', 'frost-dart', 'bright-ward']);

  await page.getByTestId('spell-remove-arc-bolt').tap();
  await page.getByTestId('spell-add-ember-lance').tap();
  expect(await loadout(page)).toEqual(['mend', 'frost-dart', 'bright-ward', 'ember-lance']);

  const overflow = await card.evaluate((el) => [...el.querySelectorAll('.spell-row')].filter((r) => r.scrollWidth > r.clientWidth + 1).length);
  expect(overflow).toBe(0);
  expect(await smallTargets(page, '[data-testid=spells]')).toEqual([]);
  await page.waitForTimeout(400);
  await card.screenshot({ path: 'test-results/spells-bag.png' });
});

test('a picked spell is cast in battle and shows its element', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'spells');
  await page.getByTestId('spell-add-rot-spit').tap();
  await page.getByTestId('spell-add-bright-ward').tap();

  await page.getByTestId('tab-map').tap();

  await mapView(page, 'list');
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await page.getByTestId('act-spell').tap();
  // Only the loadout is offered. Mossy Hollow's enemies are Verdant, so Rot Spit (Blight) is marked strong.
  await expect(page.getByTestId('spell-rot-spit')).toContainText('Strong against');
  await expect(page.getByTestId('spell-rot-spit')).toContainText('Blight');
  await expect(page.getByTestId('spell-bright-ward-rider')).toBeVisible();
  await expect(page.getByTestId('spell-tide-surge')).toHaveCount(0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/spells-battle.png' });

  await page.getByTestId('spell-rot-spit').tap();
  await expect(page.getByTestId('act-spell')).toContainText('Rot Spit');
  await page.getByTestId('go').tap();
  await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('log').tap();
  await expect(page.getByTestId('log')).toContainText('Rot Spit');
});
