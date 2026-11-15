import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { enter, mapView, openFold } from './helpers';
import type { SaveData } from '../src/core/save';

async function load(page: Page, fixture: string, change?: (save: SaveData) => void) {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!) as SaveData);
const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} a, ${scope} button`).evaluateAll((els) =>
    els.map((el) => ({ el: el.outerHTML.slice(0, 70), w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight }))
      .filter(({ w, h }) => w > 0 && (w < 44 || h < 44)).map(({ el, w, h }) => `${el} ${w}x${h}`));
}

test('V4: the hunter\'s log counts old defeats and pays out a goal', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.bestiary['thornling'] = { fought: 30, defeated: 27 }; });
  await openFold(page, 'map.zone.mossy-hollow');
  const button = page.getByTestId('log-mossy-hollow');
  await expect(button).toHaveAttribute('aria-label', /0 of 32 goals, 2 ready to claim/);
  await page.waitForTimeout(300);
  await page.getByTestId('zone-mossy-hollow').screenshot({ path: 'test-results/v4-zone-buttons.png' });
  await button.tap();
  await expect(page.getByTestId('log-thornling')).toContainText('27 defeated');
  const gold = (await stored(page)).rider.gold;
  await page.getByTestId('log-claim-thornling').tap();
  await expect(page.getByTestId('log-notice')).toContainText('Thornling x10');
  expect((await stored(page)).rider.gold).toBeGreaterThan(gold);
  expect((await stored(page)).hunterLog).toEqual(['thornling:10']);
  await expect(page.getByTestId('log-thornling')).toContainText('1/4 goals');
  expect(await smallTargets(page, '.sheet')).toEqual([]);
  expect(await fits(page)).toBe(0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/v4-log.png' });
});

test('V5: Cinder Pass has a story and a bounty board now', async ({ page }) => {
  await load(page, 'juvenile.json');
  await openFold(page, 'map.zone.cinder-pass');
  await page.getByTestId('bounties-cinder-pass').tap();
  await expect(page.locator('[data-testid^=bounty-]')).toHaveCount(3);
  await page.locator('.sheet [aria-label=Close], .sheet .icon-button').first().tap();
  await page.getByTestId('story-cinder-pass').tap();
  await expect(page.getByTestId('story-hot-feet')).toBeVisible();
  await page.getByTestId('start-story-hot-feet').tap();
  await expect(page.locator('.dialogue')).toContainText('Mira the Ash-Walker');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/v5-story.png' });
  expect(await fits(page)).toBe(0);
});

test('V6: an echo hunt runs an old zone at the rider\'s level', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.bossesDefeated = [...new Set([...s.bossesDefeated, 'mossy-hollow'])]; });
  await openFold(page, 'map.zone.mossy-hollow');
  const echo = page.getByTestId('echo-mossy-hollow');
  await expect(echo).toContainText('Echo hunt at level 15');
  await echo.tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(page.locator('.stage-header')).toContainText('Mossy Hollow (Echo)');
  const s = await stored(page);
  expect(s.run!.echo).toBe(true);
  expect(s.run!.battle!.enemies.every((e) => e.level >= 14)).toBe(true);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/v6-echo.png' });
  expect(await fits(page)).toBe(0);
});
