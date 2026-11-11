import { expect, test, type Page } from '@playwright/test';
import layout from '../src/data/stage.json' with { type: 'json' };

async function smallTargets(page: Page): Promise<string[]> {
  return page.locator('a, button').evaluateAll((els) =>
    els
      .map((el) => ({ el: el.outerHTML.slice(0, 70), w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight }))
      .filter(({ w, h }) => w > 0 && (w < 44 || h < 44))
      .map(({ el, w, h }) => `${el} ${w}x${h}`),
  );
}

const stageNodes = (page: Page) => page.getByTestId('stage').evaluate((el) => el.querySelectorAll('*').length);

test('the B0 mock battle acts out a round on the stage, in portrait and landscape', async ({ page }) => {
  await page.goto('./#/dev/mock');
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(page.getByTestId('enemy-e0')).toBeVisible();
  expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
  expect(await smallTargets(page)).toEqual([]);
  // Painted art: each fighter is one bitmap, the dragon's is recolored to the player's colors, and the zone has drifting specks.
  await expect(page.locator('[data-fighter=dragon] img.part')).toHaveCount(1);
  const dragonSrc = await page.locator('[data-fighter=dragon] img.part').getAttribute('src');
  expect(dragonSrc).toMatch(/^blob:/);
  expect(await page.locator('[data-fighter=dragon] img.part').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(300);
  expect(await page.locator('[data-fighter=e0] img.part').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(300);
  await expect(page.locator('.stage-ambient')).toHaveCount(1);

  const roc = page.locator('[data-plate=e0] [role=meter]');
  const before = Number(await roc.getAttribute('aria-valuenow'));
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('log')).toContainText('Fire Breath', { timeout: 5_000 });
  await expect(page.getByTestId('go')).toBeEnabled({ timeout: 5_000 });
  await expect(page.getByTestId('log')).toContainText('Talon Rake');
  expect(Number(await roc.getAttribute('aria-valuenow'))).toBeLessThan(before);
  await expect(page.getByTestId('act-breath')).toBeDisabled();

  await page.setViewportSize({ width: 667, height: 375 });
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect(page.getByTestId('go')).toBeInViewport();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the bench loops a round and shows frame numbers', async ({ page }) => {
  await page.goto('./#/dev/bench');
  await expect(page.getByTestId('stage')).toBeVisible();
  await expect.poll(async () => Number(await page.getByTestId('bench-stats').getAttribute('data-frames')), { timeout: 10_000 }).toBeGreaterThan(30);
  await expect(page.getByTestId('bench-fps')).not.toHaveText('0');
  expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
  expect(await smallTargets(page)).toEqual([]);
  await page.getByTestId('bench-restart').tap();
  await expect.poll(async () => Number(await page.getByTestId('bench-stats').getAttribute('data-frames'))).toBeLessThan(200);
});

async function loadFixture(page: Page, fixture: string) {
  const { readFileSync } = await import('node:fs');
  await page.goto('./');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), readFileSync(`e2e/fixtures/${fixture}`, 'utf8'));
  await page.goto('./#/roost');
  await page.reload();
}

test('a real fight uses the stage: tap to target, tap again for details, tap a party member for theirs', async ({ page }) => {
  await loadFixture(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(page.getByTestId('enemy-e0')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('enemy-e0').tap();
  await expect(page.getByTestId('fighter-details')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).tap();
  await page.getByTestId('stage-rider').tap();
  await expect(page.getByTestId('fighter-details')).toContainText('HP');
  await page.getByRole('button', { name: 'Close' }).tap();
  expect(await stageNodes(page)).toBeLessThanOrEqual(layout.maxNodes);
  await page.getByTestId('go').tap();
  await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
});

test('the Simple battle setting brings back the card layout', async ({ page }) => {
  await loadFixture(page, 'juvenile.json');
  await page.getByRole('link', { name: 'Settings' }).tap();
  await page.getByTestId('simple-battle').check();
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('start-mossy-hollow').tap();
  await expect(page.getByTestId('enemy-e0')).toBeVisible();
  await expect(page.getByTestId('stage')).toHaveCount(0);
  await expect(page.locator('.enemies .enemy')).toHaveCount(1);
});

test('the bench has a 2 vs 2 scene for the busiest stage', async ({ page }) => {
  await page.goto('./#/dev/bench');
  await expect(page.getByTestId('stage')).toBeVisible();
  await page.getByTestId('bench-scene').tap();
  await expect(page.locator('[data-fighter=dragon2]')).toBeVisible();
  await expect(page.locator('[data-fighter=e1]')).toBeVisible();
  await expect.poll(async () => Number(await page.getByTestId('bench-stats').getAttribute('data-frames')), { timeout: 10_000 }).toBeGreaterThan(30);
});

test('a dragon looks the same on every screen: no gray filter on its art', async ({ page }) => {
  // Regression: an old grayscale rule meant for tinting gray WebP sprites turned rig sprites gray
  // on the Dragons and grooming screens while the Roost scene showed the real colors.
  await loadFixture(page, 'juvenile.json');
  const filters = () => page.locator('.sprite--rig img, .scene .rig img').evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).filter))]);
  await expect(page.locator('.scene .rig img').first()).toBeVisible();
  expect(await filters()).toEqual(['none']);
  await page.getByTestId('tab-dragons').tap();
  await expect(page.locator('.sprite--rig img').first()).toBeVisible();
  expect(await filters()).toEqual(['none']);
  await page.getByTestId('tab-roost').tap();
  await page.getByTestId('care-groom').tap();
  await expect(page.locator('.sprite--rig img').first()).toBeVisible();
  expect(await filters()).toEqual(['none']);
});

test('gold and embers open a sheet that explains them', async ({ page }) => {
  await loadFixture(page, 'juvenile.json');
  await page.getByTestId('embers-info').tap();
  await expect(page.getByTestId('embers-sheet')).toContainText('How to earn them');
  await page.getByRole('button', { name: 'Close' }).tap();
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('gold-info').tap();
  await expect(page.getByTestId('gold-sheet')).toContainText('What it buys');
  await page.getByRole('button', { name: 'Close' }).tap();
  await page.getByTestId('tab-bag').tap();
  await page.getByTestId('gold-info').tap();
  await expect(page.getByTestId('gold-sheet')).toBeVisible();
});

/** Two partners against two enemies: the fixture's next fight, with a second enemy added. */
async function twoOnTwo(page: Page) {
  const { readFileSync } = await import('node:fs');
  const save = JSON.parse(readFileSync('e2e/fixtures/two-partners-fight.json', 'utf8'));
  const f = save.run.fights[save.run.index];
  f.enemies = [{ enemyId: 'storm-roc', level: 20 }, { enemyId: 'thunder-goat', level: 20 }];
  await page.goto('./');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
}

test('tapping an enemy plate shows its exact HP', async ({ page }) => {
  await twoOnTwo(page);
  const meter = page.locator('[data-plate=e1] [role=meter]');
  const hp = await meter.getAttribute('aria-valuenow');
  const max = await meter.getAttribute('aria-valuemax');
  await page.getByTestId('plate-e1').tap();
  await expect(page.getByTestId('fighter-details')).toContainText(`${hp}/${max}`);
});

test('the rider and the dragons can aim at different enemies', async ({ page }) => {
  await twoOnTwo(page);
  // Everyone starts on the first enemy; send the lead dragon at the second.
  await expect(page.getByTestId('target-rider')).toContainText('Storm');
  await expect(page.getByTestId('target-rider')).toContainText('Rider');
  await page.getByTestId('target-dragon').tap();
  await expect(page.getByTestId('target-dragon')).toContainText('Thunder');
  await expect(page.getByTestId('target-rider')).toContainText('Storm');
  await expect(page.getByTestId('enemy-e0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('enemy-e1')).toHaveAttribute('aria-pressed', 'true');
  expect(await smallTargets(page)).toEqual([]);
  // The order rows still fit a 375-wide phone with the target chips in them.
  const overflow = await page.locator('.action-row').evaluateAll((rows) => rows.filter((r) => r.scrollWidth > r.clientWidth + 1).length);
  expect(overflow).toBe(0);
  await page.getByTestId('act-claw').tap();
  await page.getByTestId('act2-guard').tap();
  await page.getByTestId('go').tap();
  await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('log').tap();
  const log = (await page.getByTestId('log').textContent()) ?? '';
  // The rider's weapon lands on (or misses) the Roc, the lead dragon's Claw on the Goat.
  expect(log).toMatch(/Claw (hits|misses) Thunder Goat/);
  expect(log).toMatch(/(hits|misses) Storm Roc/);
  // Tapping an enemy on the stage aims everyone at it again.
  if (await page.getByTestId('go').isVisible()) {
    await page.getByTestId('enemy-e0').tap();
    await expect(page.getByTestId('target-dragon')).toContainText('Storm');
  }
});

test('the battle log shows its lines in full, and opens to the whole history', async ({ page }) => {
  // Regression: the log box was pinned to 44 px, so the second line was cut off and it couldn't open.
  await loadFixture(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('start-mossy-hollow').tap();
  // One round (the fixture's seed makes it the same every time) leaves the fight going with a full log.
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('go')).toBeEnabled({ timeout: 20_000 });
  const log = page.getByTestId('log');
  const clipped = () => log.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll('.log-line')].filter((l) => l.getBoundingClientRect().bottom > box.bottom + 1).length;
  });
  await expect(log.locator('.log-line')).toHaveCount(2);
  expect(await clipped()).toBe(0);
  await log.tap();
  await expect(log).toHaveAttribute('aria-expanded', 'true');
  expect(await log.locator('.log-line').count()).toBeGreaterThan(2);
  // Open, the history scrolls inside the box rather than spilling over the orders.
  const scrolls = await log.evaluate((el) => getComputedStyle(el).overflowY);
  expect(scrolls).toBe('auto');
});
