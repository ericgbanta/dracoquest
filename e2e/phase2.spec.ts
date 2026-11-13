import { expect, test, type Page } from '@playwright/test';
import { tab, mapView, enter } from './helpers';
import { readFileSync } from 'node:fs';

async function load(page: Page, fixture: string, hash = '#/roost') {
  await page.goto('./');
  const save = readFileSync(`e2e/fixtures/${fixture}`, 'utf8');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), save);
  await page.goto(`./${hash}`);
  await page.reload();
  await enter(page);
}

/** Press Go until the fight ends. Returns the results heading text. */
async function fightToEnd(page: Page): Promise<string> {
  for (let round = 0; round < 60; round++) {
    await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
    const results = page.locator('.results-title');
    if (await results.count()) return (await results.textContent()) ?? '';
    // Drink a potion when the rider is low, like a sensible player.
    const hp = page.getByTestId('status-rider-hp');
    const now = Number(await hp.getAttribute('aria-valuenow'));
    const max = Number(await hp.getAttribute('aria-valuemax'));
    const potion = page.getByTestId('item-potion');
    if (now / max < 0.45) {
      await page.getByTestId('act-item').tap();
      if (await potion.isEnabled()) await potion.tap();
      else await page.getByRole('button', { name: 'Close' }).tap();
    }
    // Use the big breath whenever it is ready.
    const breath = page.getByTestId('act-breath');
    if (await breath.count() && await breath.isEnabled()) await breath.tap();
    const skyfire = page.getByTestId('ride-skyfire');
    if (await skyfire.count() && await skyfire.isEnabled()) await skyfire.tap();
    await page.getByTestId('go').tap();
  }
  throw new Error('Fight did not end');
}

test('buy a Mossy Egg in town; it lands in the Bag', async ({ page }) => {
  await load(page, 'roost.json');
  // Give the keeper enough gold, whatever the fixture holds.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dracoquest.save')!);
    s.rider.gold = 2000;
    s.eggs = [];
    localStorage.setItem('dracoquest.save', JSON.stringify(s));
  });
  await page.reload();
  await enter(page);
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByRole('link', { name: /Town/ }).tap();
  await page.getByTestId('shop-tab-supplies').tap();
  const buy = page.getByTestId('buy-egg-verdant');
  await expect(buy).toContainText('1500');
  await buy.tap();
  await expect(page.getByTestId('shop-notice')).toContainText('Mossy Egg');
  await expect(page.getByTestId('gold')).toContainText('500');
  // 500 gold left: a second egg is out of reach.
  await expect(buy).toBeDisabled();
  expect(await buy.evaluate((el) => (el as HTMLElement).offsetHeight)).toBeGreaterThanOrEqual(44);
  await page.getByRole('link', { name: 'Back to Map' }).tap();
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'items');
  await expect(page.getByTestId('eggs')).toContainText('Mossy Egg');
});

test('buy a weapon in town and equip it from the Bag', async ({ page }) => {
  await load(page, 'juvenile.json', '#/map');
  await page.getByTestId('go-town').tap();
  await expect(page.getByRole('heading', { name: 'Town Shop' })).toBeVisible();
  await page.getByTestId('buy-coral-cutlass').tap();
  await expect(page.getByTestId('shop-notice')).toContainText('Bought the Coral Cutlass');
  await expect(page.getByTestId('buy-coral-cutlass')).toHaveText('Owned');
  await page.getByTestId('shop-tab-supplies').tap();
  await page.getByTestId('buy-char-pepper').tap();
  await page.getByTestId('tab-bag').tap();
  await page.getByTestId('slot-weapon').tap();
  await page.getByTestId('equip-coral-cutlass').tap();
  await expect(page.getByTestId('bag-notice')).toContainText('Equipped the Coral Cutlass');
  await expect(page.locator('.slot-row').first()).toContainText('Coral Cutlass');
});

test('learn talents and use a talent skill in battle', async ({ page }) => {
  await load(page, 'juvenile.json', '#/dragons');
  await tab(page, 'dragons', 'talents');
  await expect(page.getByTestId('talent-points')).toHaveText('3 to spend');
  await page.getByTestId('learn-thick-hide').tap();
  await page.getByTestId('learn-thick-hide').tap();
  await page.getByTestId('learn-taunting-roar').tap();
  await expect(page.getByTestId('talent-points')).toHaveCount(0);
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('start-mossy-hollow').tap();
  await page.getByTestId('act-skill').tap();
  await page.getByTestId('skill-twin-claws').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('log')).toContainText('Twin Claws', { timeout: 10_000 });
});

test('First Flight: a ready hatchling finishes its quest and grows into a Juvenile', async ({ page }) => {
  test.setTimeout(120_000);
  await load(page, 'ready-to-grow.json', '#/dragons');
  await page.getByTestId('start-growth').tap();
  await expect(page.getByTestId('dialogue')).toContainText('lifts one inch');
  for (let step = 0; step < 2; step++) {
    await page.getByTestId('next-fight').tap();
    const result = await fightToEnd(page);
    if (step === 0) {
      expect(result).toContain('Victory');
      await page.getByTestId('continue').tap();
      await expect(page.getByTestId('dialogue')).toContainText('Elder Thornling');
    } else {
      expect(result).toContain('Quest complete');
    }
  }
  await expect(page.getByTestId('grew')).toContainText('grew into a Juvenile');
  await page.getByTestId('go-home').tap();
  await page.getByTestId('tab-dragons').tap();
  await expect(page.locator('.dragon-sheet')).toContainText('Juvenile');
});

test('an Adult rides into battle and beats the Storm Roc', async ({ page }) => {
  test.setTimeout(180_000);
  await load(page, 'adult-at-roc.json');
  await expect(page.getByTestId('ride-fight')).toBeVisible();
  await page.getByTestId('ride-fight').tap();
  await expect(page.locator('.pill', { hasText: 'Riding' })).toBeVisible();
  const result = await fightToEnd(page);
  expect(result).toContain('Boss defeated');
  await expect(page.getByTestId('egg-drop')).toContainText('Thunder Egg');
  await page.getByTestId('go-home').tap();
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'items');
  await expect(page.getByTestId('eggs')).toContainText('Thunder Egg');
});

test('locked zones say why', async ({ page }) => {
  await load(page, 'ready-to-grow.json', '#/map');
  await mapView(page, 'list');
  await expect(page.getByTestId('zone-cinder-pass')).toContainText('Needs a Juvenile dragon');
  await expect(page.getByTestId('start-cinder-pass')).toHaveCount(0);
});

test('new screens keep tap targets at 44 px', async ({ page }) => {
  await load(page, 'adult-at-roc.json', '#/roost');
  const small = async () => page.locator('a, button, input, textarea').evaluateAll((els) =>
    els.map((el) => ({ el: el.outerHTML.slice(0, 70), r: { width: (el as HTMLElement).offsetWidth, height: (el as HTMLElement).offsetHeight } }))
      .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44)).map(({ el, r }) => `${el} ${r.width}x${r.height}`));
  expect(await small(), 'interlude').toEqual([]);
  await page.getByTestId('ride-fight').tap();
  expect(await small(), 'ride battle').toEqual([]);
  await load(page, 'juvenile.json', '#/town');
  expect(await small(), 'town').toEqual([]);
  await page.goto('./#/dragons');
  expect(await small(), 'dragons').toEqual([]);
  await page.goto('./#/bag');
  expect(await small(), 'bag').toEqual([]);
});
