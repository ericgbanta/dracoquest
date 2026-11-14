import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { enter, mapView, openFold } from './helpers';
import layout from '../src/data/stage.json' with { type: 'json' };

const stageNodes = (page: Page) => page.getByTestId('stage').evaluate((el) => el.querySelectorAll('*').length);

/**
 * Load the level 9 fixture with one Mossy Hollow fight against these enemies, and start it.
 * `sturdy` gives the rider a lot of Strength and Vigor, so tapping Repeat wins and the test checks the screens, not balance.
 */
async function fight(page: Page, enemies: unknown[], sturdy = false) {
  const save = JSON.parse(readFileSync('e2e/fixtures/ready-to-grow.json', 'utf8'));
  save.settings.fastBattles = true;
  if (sturdy) save.rider = { ...save.rider, hp: 9999, stats: { ...save.rider.stats, strength: 60, vigor: 60 } };
  save.run = {
    zoneId: 'mossy-hollow',
    fights: [{ kind: 'normal', enemies }, { kind: 'mini', enemies: [{ enemyId: 'elder-thornling', level: 8 }] }],
    index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} },
  };
  await page.goto('./');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
}

/** Tap Repeat (or Go) until the results show. */
async function playOut(page: Page) {
  await page.getByTestId('go').tap();
  for (let i = 0; i < 60; i++) {
    await expect(page.locator('.results-title, [data-testid=repeat]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
    if (await page.locator('.results-title').count()) return;
    await page.getByTestId('repeat').tap();
  }
}

test('a champion pair: tint, gold ring, gold plate and traits in the details', async ({ page }) => {
  await fight(page, [{ enemyId: 'thornling', level: 8, traits: ['thorned', 'vampiric'] }, { enemyId: 'moss-wisp', level: 7 }]);
  const champ = page.locator('[data-fighter=e0]');
  await expect(champ).toHaveClass(/actor--champion/);
  await expect(page.locator('[data-fighter=e1]')).not.toHaveClass(/actor--special/);
  // The tint is a filter on the painted sprite; the ring is the gold ::before.
  expect(await champ.locator('.rig').evaluate((el) => getComputedStyle(el).filter)).toContain('hue-rotate');
  expect(await champ.evaluate((el) => getComputedStyle(el, '::before').borderTopColor)).toBe('rgb(242, 193, 78)');
  await expect(page.getByTestId('plate-e0')).toHaveClass(/plate--champion/);
  await expect(page.getByTestId('plate-e0')).toContainText('Thorned Thornling');
  expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
  // Order rows still fit at 375 wide, and the target chip shows the kind, not the trait.
  await expect(page.getByTestId('target-rider')).toContainText('Thornli');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/champion-fight.png' });

  await page.getByTestId('plate-e0').tap();
  const traits = page.getByTestId('fighter-traits');
  await expect(traits).toContainText('A champion');
  await expect(traits).toContainText('Thorned');
  await expect(traits).toContainText('Vampiric');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/champion-details.png' });
});

test('a rare: bigger, on the stage, and its win pays embers and fills in the Map', async ({ page }) => {
  // Before meeting it, the zone's treasures keep its name hidden.
  await page.goto('./');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), readFileSync('e2e/fixtures/ready-to-grow.json', 'utf8'));
  await page.goto('./#/map');
  await page.reload();
  await enter(page);
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  await page.getByTestId('treasures-mossy-hollow').tap();
  await expect(page.getByTestId('treasure-rare-old-mossjaw')).toContainText('???');

  await fight(page, [{ enemyId: 'barkback-boar', level: 9, rare: 'old-mossjaw' }], true);
  const rare = page.locator('[data-fighter=e0]');
  await expect(rare).toHaveClass(/actor--rare/);
  await expect(page.getByTestId('plate-e0')).toContainText('★ Old Mossjaw');
  // Drawn bigger than a plain boar, and still on the stage.
  const box = await rare.boundingBox();
  const stage = await page.getByTestId('stage').boundingBox();
  // A regular enemy box is 43 percent of the stage at box scale 0.5; a rare is drawn bigger.
  expect(box!.width).toBeGreaterThan(stage!.width * 0.43 * 0.5 * 1.15);
  expect(box!.x + box!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/rare-fight.png' });

  await playOut(page);
  await expect(page.locator('.results-title')).toContainText('Victory');
  await expect(page.getByTestId('rare-reward')).toContainText('Old Mossjaw for the first time');
  await expect(page.getByTestId('rare-reward')).toContainText('+3 embers');
  await page.screenshot({ path: 'test-results/rare-results.png' });

  await page.getByTestId('go-home').tap();
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  await page.getByTestId('treasures-mossy-hollow').tap();
  await expect(page.getByTestId('treasure-rare-old-mossjaw')).toContainText('Old Mossjaw');
  await expect(page.getByTestId('treasure-rare-old-mossjaw')).toContainText('beaten 1');
  await page.getByTestId('treasure-rare-old-mossjaw').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/rare-treasures.png' });
});
