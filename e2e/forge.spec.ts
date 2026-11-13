import { expect, test, type Page } from '@playwright/test';
import { openFold, tab, enter } from './helpers';
import { readFileSync } from 'node:fs';

async function load(page: Page, fixture: string) {
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, readFileSync(`e2e/fixtures/${fixture}`, 'utf8'));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
}

const rider = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!).rider as { upgrades: Record<string, number>; gear: string[]; materials: Record<string, number> });

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.outerHTML.slice(0, 60)));
}

test('the Forge upgrades the equipped weapon and crafts a trinket', async ({ page }) => {
  // A level 2 Forge, 20 ore, 8 crystal, 2 scale; the rider wields a Thunder Glaive.
  await load(page, 'forge.json');
  await page.getByTestId('building-forge').scrollIntoViewIfNeeded();
  await openFold(page, 'roost.forge');
  await expect(page.getByTestId('forge-status')).toContainText('up to +2');
  await page.getByTestId('open-forge').tap();
  await expect(page.getByTestId('forge-materials')).toContainText('20 Iron Ore');

  await page.getByTestId('forge-up-thunder-glaive').tap();
  await expect(page.getByTestId('forge-notice')).toHaveText('Thunder Glaive is now +1.');
  await page.getByTestId('forge-up-thunder-glaive').tap();
  await expect(page.getByTestId('forge-row-thunder-glaive')).toContainText('Thunder Glaive +2 (equipped)');
  // A level 2 Forge stops at +2.
  await expect(page.getByTestId('forge-up-thunder-glaive')).toBeDisabled();
  await expect(page.getByTestId('forge-row-thunder-glaive')).toContainText('Upgrade the Forge to reach +3');
  expect((await rider(page)).upgrades['thunder-glaive']).toBe(2);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/forge-upgrade.png' });
  expect(await smallTargets(page, '.sheet')).toEqual([]);

  await page.getByTestId('forge-tab-craft').tap();
  await expect(page.getByTestId('craft-starforged-blade')).toBeDisabled();
  await expect(page.getByTestId('recipe-starforged-blade')).toContainText('level 3 Forge');
  await page.getByTestId('craft-forgeheart-amulet').tap();
  await expect(page.getByTestId('craft-forgeheart-amulet')).toHaveText('Owned');
  expect((await rider(page)).gear).toContain('forgeheart-amulet');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/forge-craft.png' });

  // The Bag shows the upgraded weapon.
  await page.getByRole('button', { name: 'Close' }).tap();
  await page.getByTestId('tab-bag').tap();
  await expect(page.locator('.slot-row').first()).toContainText('Thunder Glaive +2');
  await tab(page, 'bag', 'items');
  await expect(page.getByTestId('material-ore')).toBeVisible();
});

test('an unbuilt Forge explains itself and can be built', async ({ page }) => {
  await load(page, 'roost.json');
  const card = page.getByTestId('building-forge');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toContainText('Not built');
  await openFold(page, 'roost.forge');
  await expect(card).toContainText('Expeditions and bosses bring back materials');
  await page.getByTestId('upgrade-forge').tap();
  await expect(page.getByTestId('open-forge')).toBeVisible();
});
