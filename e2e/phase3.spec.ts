import { expect, test, type Page } from '@playwright/test';
import { openFold, enter } from './helpers';
import { readFileSync } from 'node:fs';

async function load(page: Page, fixture: string, hash = '#/roost') {
  await page.goto('./');
  const save = readFileSync(`e2e/fixtures/${fixture}`, 'utf8');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), save);
  await page.goto(`./${hash}`);
  await page.reload();
  await enter(page);
}

test('timers keep running while the app is closed for a day', async ({ page }) => {
  const start = new Date(1794355200000); // the fixture's save time
  await page.clock.install({ time: start });
  await load(page, 'juvenile.json');
  await openFold(page, 'roost.pantry');
  await expect(page.getByTestId('pantry-status')).toContainText('0 of 4 food ready');
  // Close the app, come back a day later.
  await page.goto('about:blank');
  await page.clock.setFixedTime(new Date(start.getTime() + 24 * 3600_000));
  await page.goto('./#/roost');
  await enter(page);
  await expect(page.getByTestId('pantry-status')).toContainText('4 of 4 food ready');
  await expect(page.getByTestId('pantry-status')).toContainText('full');
  await page.getByTestId('collect-food').tap();
  await expect(page.getByTestId('toast')).toContainText('Collected');
  await expect(page.getByTestId('pantry-status')).toContainText('0 of 4 food ready');
});

test('hatch a second dragon from the Hatchery without changing the first', async ({ page }) => {
  await load(page, 'roost.json');
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
  await page.getByTestId('hatch-0').tap();
  await page.getByTestId('dragon-name').fill('Puddle');
  await page.getByTestId('hatch').tap();
  // Back at the Roost, the lead is still Blaze and Puddle is in the Nest.
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
  await expect(page.getByTestId('pick-Puddle')).toBeVisible();
  await page.getByTestId('pick-Puddle').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Puddle');
  await expect(page.locator('.roost-dragon')).toContainText('Lv 1');
});

test('collect an expedition, send a dragon training, and set partners', async ({ page }) => {
  await load(page, 'roost.json');
  await page.getByTestId('collect-trip-Fern').tap();
  await expect(page.getByTestId('toast')).toContainText('Fern is back with');
  await openFold(page, 'roost.training');
  await page.getByTestId('train-Fern').tap();
  await expect(page.getByTestId('toast')).toContainText('Fern starts training');
  await page.getByTestId('tab-dragons').tap();
  await page.getByTestId('dpick-Fern').tap();
  await page.getByTestId('make-second').tap();
  await expect(page.getByTestId('dragons-notice')).toContainText('Fern joins as second partner');
  await page.getByTestId('dpick-Ripple').tap();
  await expect(page.locator('.partners')).toContainText('on the bench');
});

test('two partners: three orders a round, and Repeat reuses them', async ({ page }) => {
  test.setTimeout(120_000);
  await load(page, 'two-partners-fight.json');
  await page.getByTestId('next-fight').tap();
  await expect(page.getByTestId('second-card')).toContainText('Ripple');
  await page.getByTestId('act2-guard').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('log')).toContainText(/Ripple/, { timeout: 10_000 });
  await expect(page.getByTestId('repeat')).toBeVisible();
  for (let i = 0; i < 40; i++) {
    await expect(page.locator('.results-title, [data-testid=repeat]:not([disabled])').first()).toBeVisible({ timeout: 15_000 });
    if (await page.locator('.results-title').count()) break;
    await page.getByTestId('repeat').tap();
  }
  await expect(page.locator('.results-title')).toContainText(/Victory|cleared/);
});

test('Roost screens keep tap targets at 44 px', async ({ page }) => {
  await load(page, 'roost.json');
  const small = await page.locator('a, button, input, textarea').evaluateAll((els) =>
    els.map((el) => ({ el: el.outerHTML.slice(0, 70), w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight }))
      .filter(({ w, h }) => w > 0 && (w < 44 || h < 44)).map(({ el, w, h }) => `${el} ${w}x${h}`));
  expect(small).toEqual([]);
});
