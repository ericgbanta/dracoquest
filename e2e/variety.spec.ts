import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { enter, mapView, openFold } from './helpers';
import layout from '../src/data/stage.json' with { type: 'json' };
import art from '../tools/art/painted/zones.json' with { type: 'json' };

const stageNodes = (page: Page) => page.getByTestId('stage').evaluate((el) => el.querySelectorAll('*').length);
const LEVEL: Record<string, number> = { 'mossy-hollow': 6, 'saltmarsh-shore': 9, 'whispering-fen': 12, 'cinder-pass': 14 };

async function fight(page: Page, zoneId: string, enemies: string[]) {
  const save = JSON.parse(readFileSync('e2e/fixtures/juvenile.json', 'utf8'));
  save.settings.fastBattles = true;
  save.run = {
    zoneId, fights: [{ kind: 'normal', enemies: enemies.map((enemyId) => ({ enemyId, level: LEVEL[zoneId] })) }],
    index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} }, event: null, boon: null, condition: null,
  };
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
}

// V7: three new enemies in each of the first four zones, each with painted idle and attack art.
for (const [zoneId, v] of Object.entries(art as Record<string, { more?: string[] }>)) {
  if (!v.more) continue;
  test(`${zoneId}'s new enemies load their painted art at 375 x 667`, async ({ page }) => {
    const [a, b, c] = v.more!;
    for (const pair of [[a!, b!], [c!]]) {
      await fight(page, zoneId, pair);
      for (let i = 0; i < pair.length; i++) {
        const body = page.locator(`[data-fighter=e${i}] [data-part=body]`);
        await expect(body).toHaveAttribute('src', new RegExp(`${pair[i]}`));
        expect(await body.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(200);
        await expect(page.locator(`[data-fighter=e${i}] [data-part=pose-attack]`)).toHaveCSS('opacity', '0');
      }
      expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/v7-${zoneId}-${pair.length}.png` });
    }
  });
}

// V3: today's condition on the zone card and in the hunt.
test('the Map shows today\'s condition for a zone, and a hunt carries it', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-15T10:00:00') });
  const save = JSON.parse(readFileSync('e2e/fixtures/juvenile.json', 'utf8'));
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/map');
  await page.reload();
  await enter(page);
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  const line = page.getByTestId('today-mossy-hollow');
  await expect(line).toContainText('Today:');
  const name = (await line.locator('strong').textContent())!.replace(/^Today: /, '').replace(/\.$/, '');
  await line.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/v3-today.png' });
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  // Calm adds no log line; every other condition says what it does when a fight starts.
  if (name !== 'Calm') await expect(page.getByTestId('log')).toContainText(name);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
