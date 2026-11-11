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
