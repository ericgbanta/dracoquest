import { expect, test, type Page } from '@playwright/test';
import { openFold, enter } from './helpers';
import { readFileSync } from 'node:fs';

/** Puts a fixture where a save made before slots existed lives, then opens the game. */
async function loadOldSave(page: Page, fixture: string) {
  await page.goto('./');
  const save = readFileSync(`e2e/fixtures/${fixture}`, 'utf8');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, save);
  await page.reload();
  await enter(page);
}

const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

async function openSettings(page: Page) {
  await page.getByTestId('tab-roost').tap();
  await page.getByRole('link', { name: 'Settings' }).tap();
  await expect(page.getByTestId('save-slots')).toBeVisible();
}

test('a second saved game starts fresh and leaves the existing save alone', async ({ page }) => {
  await loadOldSave(page, 'roost.json');
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
  const before = await stored(page, 'dracoquest.save');

  await openSettings(page);
  await expect(page.getByTestId('slot-1')).toContainText('Keeper, level 26');
  await expect(page.getByTestId('slot-1')).toContainText('Blaze');
  await expect(page.getByTestId('slot-playing-1')).toBeVisible();
  await expect(page.getByTestId('slot-2')).toContainText('Empty');
  await expect(page.getByTestId('slot-delete-1')).toHaveCount(0);

  // Start a new game in slot 2 and hatch a dragon there.
  await page.getByTestId('slot-play-2').tap();
  await page.getByTestId('egg-tide').tap();
  for (let i = 0; i < 12; i++) await page.getByTestId('warm-egg').tap();
  await page.getByTestId('dragon-name').fill('Puddle');
  await page.getByTestId('hatch').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Puddle');

  expect(await stored(page, 'dracoquest.save')).toBe(before);
  expect(await stored(page, 'dracoquest.slot')).toBe('2');
  expect(JSON.parse((await stored(page, 'dracoquest.save.2'))!).dragons[0].name).toBe('Puddle');

  // The choice of slot survives a reload.
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('welcome')).toHaveText('Puddle');

  // Back to slot 1: the old game is exactly where it was.
  await openSettings(page);
  await expect(page.getByTestId('slot-2')).toContainText('Puddle, Hatchling');
  await page.getByTestId('slot-play-1').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
  expect(JSON.parse((await stored(page, 'dracoquest.save'))!).rider.level).toBe(26);

  // Delete slot 2, after a confirm.
  await openSettings(page);
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('slot-delete-2').tap();
  await expect(page.getByTestId('slot-2')).toContainText('Empty');
  expect(await stored(page, 'dracoquest.save.2')).toBeNull();
  expect(await stored(page, 'dracoquest.save')).not.toBeNull();
});

test('starting over clears only the slot in play', async ({ page }) => {
  await loadOldSave(page, 'roost.json');
  await openSettings(page);
  await page.getByTestId('slot-play-3').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  await page.goto('./#/settings');
  await openFold(page, 'settings.danger');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('reset').tap();
  await expect(page.getByTestId('notice')).toHaveText('New save started.');
  expect(JSON.parse((await stored(page, 'dracoquest.save'))!).rider.level).toBe(26);
});

test('a damaged slot can be left for another slot', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('dracoquest.save', '{"version":2,"broken":true}'); });
  await page.reload();
  await page.getByTestId('title-load').tap();
  await page.getByTestId('title-pick-1').tap();
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await expect(page.getByTestId('slot-1')).toContainText('cannot be read');
  await page.getByTestId('slot-play-2').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  expect(await stored(page, 'dracoquest.save')).toBe('{"version":2,"broken":true}');
});

test('the saved games list fits a phone and its buttons are big enough', async ({ page }) => {
  await loadOldSave(page, 'elder.json');
  // Fill the other slots too: a row with Play and Delete is the widest.
  const second = readFileSync('e2e/fixtures/juvenile.json', 'utf8');
  await page.evaluate((s) => {
    localStorage.setItem('dracoquest.save.2', s);
    localStorage.setItem('dracoquest.save.3', '{"version":2,"broken":true}');
  }, second);
  await page.reload();
  await enter(page);
  await openSettings(page);
  await expect(page.getByTestId('slot-delete-2')).toBeVisible();
  await expect(page.getByTestId('slot-delete-3')).toBeVisible();
  const list = page.getByTestId('save-slots');
  const overflow = await list.evaluate((el) => [...el.querySelectorAll('.save-slot')].filter((r) => r.scrollWidth > r.clientWidth + 1).length);
  expect(overflow).toBe(0);
  const small = await list.locator('button').evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44).length);
  expect(small).toBe(0);
  await page.waitForTimeout(600); // let the screen's fade-in finish
  await page.screenshot({ path: 'test-results/save-slots.png', fullPage: false });
});
