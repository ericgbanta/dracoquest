import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = (name: string) => readFileSync(`e2e/fixtures/${name}`, 'utf8');
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

/** Puts saves in slots (1 to 3), then opens the game fresh. */
async function withSlots(page: Page, saves: Record<number, string>) {
  await page.goto('./');
  await page.evaluate((all) => {
    localStorage.clear();
    for (const [n, s] of Object.entries(all)) localStorage.setItem(n === '1' ? 'dracoquest.save' : `dracoquest.save.${n}`, s);
  }, saves);
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
}

async function tooSmall(page: Page): Promise<string[]> {
  return page.locator('button, a').evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.textContent ?? ''));
}

test('a first visit shows New game and Settings, and writes no save until play starts', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('title')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'DracoQuest' })).toBeVisible();
  await expect(page.getByTestId('title-continue')).toHaveCount(0);
  await expect(page.getByTestId('title-load')).toBeDisabled();
  await expect(page.getByTestId('title-settings')).toBeVisible();
  expect(await stored(page, 'dracoquest.save')).toBeNull();
  expect(await tooSmall(page)).toEqual([]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/title-new.png' });

  await page.getByTestId('title-new').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  // Leaving before picking an egg keeps the slot empty.
  expect(await stored(page, 'dracoquest.save')).toBeNull();
  await page.getByTestId('egg-fire').tap();
  expect(await stored(page, 'dracoquest.save')).not.toBeNull();
});

test('Continue picks up the slot in play, back on the screen it was on', async ({ page }) => {
  await withSlots(page, { 1: fixture('juvenile.json'), 2: fixture('roost.json') });
  await page.evaluate(() => localStorage.setItem('dracoquest.slot', '2'));
  await page.reload();
  // Slot 2 is the one in play (played last), so Continue opens it.
  await expect(page.getByTestId('title-continue')).toContainText('Continue');
  await expect(page.getByTestId('title-continue')).toContainText('Blaze');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/title-continue.png' });
  await page.getByTestId('title-continue').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
  expect(await stored(page, 'dracoquest.slot')).toBe('2');

  // A reload on the Bag opens the menu, and Continue goes back to the Bag.
  await page.getByTestId('tab-bag').tap();
  await page.reload();
  await page.getByTestId('title-continue').tap();
  await expect(page).toHaveURL(/#\/bag$/);
});

test('Load game lists every slot and plays the one picked', async ({ page }) => {
  await withSlots(page, { 1: fixture('roost.json'), 3: fixture('juvenile.json') });
  await page.getByTestId('title-load').tap();
  await expect(page.getByTestId('title-slot-1')).toContainText('Blaze');
  await expect(page.getByTestId('title-slot-2')).toContainText('Empty');
  await expect(page.getByTestId('title-pick-2')).toHaveCount(0);
  await expect(page.getByTestId('title-slot-3')).toContainText('Scorch');
  expect(await tooSmall(page)).toEqual([]);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/title-load.png' });
  await page.getByTestId('title-pick-3').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Scorch');
  expect(await stored(page, 'dracoquest.slot')).toBe('3');
});

test('New game uses an empty slot, and asks which to replace when all are used', async ({ page }) => {
  await withSlots(page, { 1: fixture('roost.json') });
  await page.getByTestId('title-new').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  expect(await stored(page, 'dracoquest.slot')).toBe('2');
  expect(await stored(page, 'dracoquest.save')).not.toBeNull();

  await withSlots(page, { 1: fixture('roost.json'), 2: fixture('juvenile.json'), 3: fixture('elder.json') });
  await page.getByTestId('title-new').tap();
  await expect(page.getByRole('dialog', { name: 'New game' })).toContainText('Pick one to replace');
  // Saying no keeps the game.
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('title-pick-2').tap();
  await expect(page.getByTestId('title')).toBeVisible();
  expect(await stored(page, 'dracoquest.save.2')).not.toBeNull();
  // Saying yes clears it and starts over there.
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('title-pick-2').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  expect(await stored(page, 'dracoquest.save.2')).toBeNull();
  expect(await stored(page, 'dracoquest.slot')).toBe('2');
  expect(await stored(page, 'dracoquest.save')).not.toBeNull();
});

test('Settings opens from the menu and goes back to it, and the game has a way back to the menu', async ({ page }) => {
  await withSlots(page, { 1: fixture('roost.json') });
  await page.getByTestId('title-settings').tap();
  await expect(page.getByTestId('save-slots')).toBeVisible();
  await page.getByTestId('settings-back').tap();
  await expect(page.getByTestId('title')).toBeVisible();

  await page.getByTestId('title-continue').tap();
  await page.getByTestId('tab-roost').tap();
  await page.getByRole('link', { name: 'Settings' }).tap();
  await page.getByTestId('main-menu').tap();
  await expect(page.getByTestId('title')).toBeVisible();
  await page.getByTestId('title-continue').tap();
  await expect(page.getByTestId('welcome')).toHaveText('Blaze');
});

test('the menu fits a 430 wide phone and landscape', async ({ page }) => {
  await withSlots(page, { 1: fixture('roost.json') });
  for (const size of [{ width: 430, height: 932 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(300);
    const box = await page.getByTestId('title-settings').boundingBox();
    expect(box!.y + box!.height, `${size.width} wide`).toBeLessThanOrEqual(size.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    await page.screenshot({ path: `test-results/title-${size.width}.png` });
  }
});
