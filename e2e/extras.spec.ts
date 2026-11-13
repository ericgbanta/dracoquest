import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/core/save';
import { enter, openFold, tab } from './helpers';

async function load(page: Page, fixture: string, change?: (save: SaveData) => void) {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!) as SaveData);

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.textContent ?? ''));
}

test('a dragon can be freed for embers, but not the lead or one away on a trip', async ({ page }) => {
  // roost.json: Blaze leads, Ripple is the second partner, Fern is on an expedition.
  await load(page, 'roost.json');
  await page.getByTestId('tab-dragons').tap();

  // The lead can't be freed.
  await openFold(page, 'dragons.free');
  await expect(page.getByTestId('free-blocker')).toHaveText('Make another dragon your lead first.');
  await expect(page.getByTestId('free-dragon-button')).toBeDisabled();

  await page.getByTestId('dpick-Fern').tap();
  await expect(page.getByTestId('free-blocker')).toHaveText('Fern is away on an expedition.');

  await page.getByTestId('dpick-Ripple').tap();
  await expect(page.getByTestId('free-dragon-button')).toBeEnabled();
  await expect(page.getByTestId('free-dragon-button')).toContainText('Free Ripple');
  expect(await smallTargets(page, '[data-testid=free-dragon]')).toEqual([]);
  await page.screenshot({ path: 'test-results/free-dragon.png', fullPage: true });

  // Saying no keeps Ripple.
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('free-dragon-button').tap();
  expect((await saved(page)).dragons).toHaveLength(3);

  page.once('dialog', (d) => { expect(d.message()).toContain('8 embers'); d.accept(); });
  await page.getByTestId('free-dragon-button').tap();
  await expect(page.getByTestId('dragons-notice')).toContainText('Ripple flew off into the wild. You got 8 embers.');
  const s = await saved(page);
  expect(s.dragons.map((d) => d.name)).toEqual(['Blaze', 'Fern']);
  expect(s.embers).toBe(87 + 8);
  expect(s.secondDragonId).toBeNull();
  await expect(page.getByTestId('dpick-Ripple')).toHaveCount(0);
});

test('choosing a weapon shows its element and what it beats', async ({ page }) => {
  await load(page, 'roost.json');
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'gear');
  // The equipped weapon's row says its element too.
  await expect(page.getByTestId('gear-element-thunder-glaive').first()).toContainText('Storm');
  await page.getByTestId('slot-weapon').tap();
  const sheet = page.getByRole('dialog', { name: 'Weapon' });
  await expect(sheet.getByTestId('gear-element-thunder-glaive')).toContainText('Storm');
  await expect(sheet.getByTestId('gear-element-thunder-glaive')).toContainText('Strong vs Tide');
  // A weapon without an element says so.
  await expect(sheet.getByTestId('gear-element-ash-blade')).toHaveText('No element');
  const overflow = await sheet.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/weapon-elements.png' });
});

test('spells can be powered up in the Bag', async ({ page }) => {
  await load(page, 'roost.json', (s) => { s.rider.materials = { crystal: 3 }; s.rider.gold = 5000; });
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'spells');
  await openFold(page, 'bag.spells.power');
  await expect(page.getByTestId('spell-power')).toContainText('3 Sky Crystals');
  const row = page.getByTestId('power-row-arc-bolt');
  await expect(row).toContainText('Next: +10% power');
  await page.getByTestId('power-up-arc-bolt').tap();
  await expect(page.getByTestId('bag-notice')).toHaveText('Arc Bolt is now +1.');
  await expect(page.getByTestId('spell-plus-arc-bolt')).toHaveText(' +1');
  await expect(row).toContainText('Now: +10% power');
  // +2 needs embers and two crystals; there are 2 left and 87 embers, so it works once more.
  await page.getByTestId('power-up-arc-bolt').tap();
  await expect(page.getByTestId('bag-notice')).toHaveText('Arc Bolt is now +2.');
  // Out of crystals now: the +3 button waits.
  await expect(page.getByTestId('power-up-arc-bolt')).toBeDisabled();
  const s = await saved(page);
  expect(s.rider.spellPlus).toEqual({ 'arc-bolt': 2 });
  expect(s.rider.materials.crystal).toBe(0);
  expect(await smallTargets(page, '[data-testid=spell-power]')).toEqual([]);
  await page.screenshot({ path: 'test-results/spell-power.png', fullPage: true });
});
