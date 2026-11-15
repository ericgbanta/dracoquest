import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { enter } from './helpers';
import events from '../src/data/runEvents.json' with { type: 'json' };

/** The level 9 fixture in a Mossy Hollow hunt after its first win, with this event waiting. */
async function atEvent(page: Page, id: string, seed = 1234) {
  const save = JSON.parse(readFileSync('e2e/fixtures/ready-to-grow.json', 'utf8'));
  save.settings.fastBattles = true;
  save.rider.gold = 500;
  const thorn = { kind: 'normal', enemies: [{ enemyId: 'thornling', level: 8 }] };
  save.run = {
    zoneId: 'mossy-hollow', fights: [thorn, thorn, { kind: 'mini', enemies: [{ enemyId: 'elder-thornling', level: 8 }] }],
    index: 1, battle: null, totals: { xp: 0, gold: 0, drops: {} }, event: { id, seed }, boon: null,
  };
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('run-event')).toHaveAttribute('data-event', id);
}

async function smallTargets(page: Page): Promise<string[]> {
  return page.locator('.run-event a, .run-event button').evaluateAll((els) =>
    els.map((el) => ({ el: el.outerHTML.slice(0, 70), w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight }))
      .filter(({ w, h }) => w > 0 && (w < 44 || h < 44)).map(({ el, w, h }) => `${el} ${w}x${h}`));
}

const fits = (page: Page) => page.evaluate(() => ({
  height: document.scrollingElement!.scrollHeight,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));

test('a reload mid-event shows the same event, and after a choice the same result', async ({ page }) => {
  await atEvent(page, 'chest', 4242);
  await expect(page.getByTestId('event-open')).toBeVisible();
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('run-event')).toHaveAttribute('data-event', 'chest');
  await page.getByTestId('event-open').tap();
  const text = await page.getByTestId('event-result').textContent();
  const reward = await page.getByTestId('run-event').textContent();
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('event-result')).toHaveText(text!);
  await expect(page.getByTestId('run-event')).toHaveText(reward!);
  await expect(page.getByTestId('event-open')).toHaveCount(0);
});

test('every option of every event works at 375 x 667 and fits on one screen', async ({ page }) => {
  for (const ev of events.events) {
    for (const opt of ev.options) {
      await atEvent(page, ev.id);
      const before = await fits(page);
      expect(before.overflow, `${ev.id} overflows`).toBe(0);
      expect(before.height / 667, `${ev.id} is ${before.height}px`).toBeLessThanOrEqual(1);
      expect(await smallTargets(page)).toEqual([]);
      if (opt === ev.options[0]) {
        await page.waitForTimeout(300);
        await page.screenshot({ path: `test-results/event-${ev.id}.png` });
      }
      await page.getByTestId(`event-${opt.id}`).tap();
      await expect(page.getByTestId('event-result')).toBeVisible();
      const after = await fits(page);
      expect(after.overflow).toBe(0);
      expect(after.height / 667, `${ev.id}/${opt.id} result is ${after.height}px`).toBeLessThanOrEqual(1);
      expect(await smallTargets(page)).toEqual([]);
      // Keep going leads into a fight (an event's own extra fight, or the next one).
      await page.getByTestId('event-continue').tap();
      await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
    }
  }
});

test('a mimic: the chest bites, and the fight pays a bonus', async ({ page }) => {
  // Find a seed whose chest is a mimic (a quarter of them are).
  let seed = 0;
  for (const s of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]) {
    await atEvent(page, 'chest', s);
    await page.getByTestId('event-open').tap();
    if ((await page.getByTestId('event-result').textContent())!.includes('mimic')) { seed = s; break; }
  }
  expect(seed).toBeGreaterThan(0);
  await expect(page.getByTestId('event-continue')).toHaveText('Fight!');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/event-mimic.png' });
  await page.getByTestId('event-continue').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(page.getByTestId('plate-e0')).toContainText('Treasure Mimic');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/event-mimic-fight.png' });
});

test('heading home from an event ends the run', async ({ page }) => {
  await atEvent(page, 'ambush');
  await page.getByTestId('go-home').tap();
  await expect(page.getByTestId('run-event')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/roost/);
});
