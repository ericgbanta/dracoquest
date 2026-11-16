import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { enter, mapView, openFold } from './helpers';
import layout from '../src/data/stage.json' with { type: 'json' };
import type { SaveData } from '../src/core/save';

const stageNodes = (page: Page) => page.getByTestId('stage').evaluate((el) => el.querySelectorAll('*').length);
const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The level 9 fixture (a Hatchling), optionally changed, opened on the Map. */
async function load(page: Page, change?: (save: SaveData) => void, toMap = true) {
  const save = JSON.parse(readFileSync('e2e/fixtures/ready-to-grow.json', 'utf8')) as SaveData;
  save.settings.fastBattles = true;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  if (toMap) await page.getByTestId('tab-map').tap();
}

async function fight(page: Page, enemies: { enemyId: string; level: number }[], kind = 'normal') {
  await load(page, (s) => {
    s.bestiary['elder-thornling'] = { fought: 1, defeated: 1 };
    s.run = { zoneId: 'sunpetal-meadow', fights: [{ kind: kind as 'normal', enemies }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} }, event: null, boon: null, condition: null, echo: false };
  }, false);
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
}

test('Sunpetal Meadow sits on the Wilds map with its landmark, locked until the Elder Thornling falls', async ({ page }) => {
  await load(page, (s) => { delete s.bestiary['elder-thornling']; });
  const pin = page.getByTestId('pin-sunpetal-meadow');
  await expect(pin).toHaveAttribute('aria-label', /Opens after you beat the Elder Thornling/);
  const sticker = page.getByTestId('sticker-sunpetal-meadow');
  await expect(sticker).toBeVisible();
  expect(await sticker.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(200);
  // The landmark sits under its pin, inside the map.
  const map = (await page.locator('.region-map').boundingBox())!;
  const s = (await sticker.boundingBox())!;
  const p = (await pin.boundingBox())!;
  expect(s.x).toBeGreaterThanOrEqual(map.x);
  expect(s.x + s.width).toBeLessThanOrEqual(map.x + map.width);
  expect(p.x + p.width / 2).toBeGreaterThan(s.x);
  expect(p.x + p.width / 2).toBeLessThan(s.x + s.width);
  expect(await fits(page)).toBe(0);
  await page.locator('.region-map').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/v8-map.png' });
});

test('once the Elder Thornling is beaten, the Meadow opens with its story, bounties and a hunt', async ({ page }) => {
  await load(page, (s) => { s.bestiary['elder-thornling'] = { fought: 1, defeated: 1 }; });
  await mapView(page, 'list');
  await openFold(page, 'map.zone.sunpetal-meadow');
  await expect(page.getByTestId('story-sunpetal-meadow')).toHaveAttribute('aria-label', /Story, 0 of 5 done/);
  await expect(page.getByTestId('bounties-sunpetal-meadow')).toBeVisible();
  await page.getByTestId('zone-sunpetal-meadow').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/v8-zone.png' });
  await page.getByTestId('start-sunpetal-meadow').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(page.locator('.stage-header')).toContainText('Sunpetal Meadow');
});

for (const pair of [['buzzbee', 'dandelion-hare'], ['clover-sprite', 'static-lamb'], ['hay-golem', 'queen-buzzbee']]) {
  test(`the Meadow's ${pair.join(' and ')} load their painted art`, async ({ page }) => {
    await fight(page, pair.map((enemyId) => ({ enemyId, level: 8 })));
    for (let i = 0; i < pair.length; i++) {
      const body = page.locator(`[data-fighter=e${i}] [data-part=body]`);
      await expect(body).toHaveAttribute('src', new RegExp(pair[i]!));
      expect(await body.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(200);
    }
    expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/v8-${pair[0]}.png` });
  });
}

test('Thunderhoof fits the stage at 375 wide', async ({ page }) => {
  await fight(page, [{ enemyId: 'thunderhoof', level: 12 }], 'boss');
  const boss = page.locator('[data-fighter=e0]');
  const body = boss.locator('[data-part=body]');
  expect(await body.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(300);
  const stage = (await page.getByTestId('stage').boundingBox())!;
  const b = (await boss.boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/v8-boss.png' });
});
