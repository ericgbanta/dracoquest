import { expect, test, type Page } from '@playwright/test';
import { enter, mapView, openFold, tab } from './helpers';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/core/save';
import type { LooksData } from '../src/core/types';

const looks = JSON.parse(readFileSync('src/data/looks.json', 'utf8')) as LooksData;

/** Loads a fixture, optionally changed first. */
async function load(page: Page, fixture: string, change?: (save: SaveData) => void, route = 'roost') {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto(`./#/${route}`);
  await page.reload();
  await enter(page);
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save') ?? 'null') as SaveData | null);
const preset = (id: string) => looks.presets.find((p) => p.id === id)!.look;
const painted = (page: Page) => page.locator('[data-testid=rider-preview][data-ready=true] img').first();

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button, ${scope} a`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.outerHTML.slice(0, 80)));
}

test('a new game starts with Your keeper: a name and a look, then the egg', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('title-new').tap();
  await expect(page.getByRole('heading', { name: 'Your keeper' })).toBeVisible();
  await expect(painted(page)).toBeVisible();
  // Nothing is saved until the player decides something.
  expect(await saved(page)).toBeNull();
  await page.getByTestId('keeper-name').fill('Mira');
  await page.getByTestId('look-preset-dusk').tap();
  await page.getByTestId('look-part-cape').tap();
  await page.getByTestId('look-swatch-1').tap();
  const want = { ...preset('dusk'), cape: looks.swatches.cloth![1]! };
  await expect(page.getByTestId('rider-preview')).toHaveAttribute('data-look', Object.values(want).join(''));
  expect(await smallTargets(page, '.screen')).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/looks-keeper.png', fullPage: true });
  await page.getByTestId('keeper-continue').tap();
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  const s = (await saved(page))!;
  expect(s.rider.name).toBe('Mira');
  expect(s.rider.look).toEqual(want);
  // The step doesn't come back once it has been answered.
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('egg-fire')).toBeVisible();
  await expect(page.getByTestId('keeper-continue')).toHaveCount(0);
});

test('Skip keeps the rider as painted and the Random button picks listed colors', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('title-new').tap();
  await page.getByTestId('look-random').tap();
  const shown = await page.getByTestId('rider-preview').getAttribute('data-look');
  expect(shown).toMatch(/^(#[0-9a-f]{6}){5}$/);
  await page.getByTestId('keeper-skip').tap();
  await page.getByTestId('egg-tide').tap();
  const s = (await saved(page))!;
  expect(s.rider.name).toBe('Keeper');
  expect(s.rider.look).toEqual(looks.default);
});

test('the Bag\'s Look tab recolors the rider and keeps it after a reload', async ({ page }) => {
  await load(page, 'juvenile.json', undefined, 'bag');
  // Five tabs fit across a phone without scrolling sideways.
  const tabs = page.locator('.subtabs');
  expect(await tabs.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await tab(page, 'bag', 'look');
  await expect(painted(page)).toBeVisible();
  const before = await painted(page).getAttribute('src');
  await page.getByTestId('look-preset-frost').tap();
  await expect(page.getByTestId('rider-preview')).toHaveAttribute('data-look', Object.values(preset('frost')).join(''));
  await expect(painted(page)).toBeVisible();
  await expect(painted(page)).not.toHaveAttribute('src', before!);
  await page.getByTestId('look-part-hair').tap();
  await page.getByTestId('look-swatch-9').tap();
  expect(await smallTargets(page, '[data-testid=look-card]')).toEqual([]);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(h / 667, `the Look tab is ${h}px`).toBeLessThanOrEqual(1.5);
  await page.screenshot({ path: 'test-results/looks-bag.png', fullPage: true });
  const want = { ...preset('frost'), hair: looks.swatches.hair![9]! };
  expect((await saved(page))!.rider.look).toEqual(want);
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('rider-preview')).toHaveAttribute('data-look', Object.values(want).join(''));
});

test('the rider fights in the chosen colors', async ({ page }) => {
  const riderArt = async (look?: string) => {
    await load(page, 'juvenile.json', undefined, 'bag');
    if (look) {
      await tab(page, 'bag', 'look');
      await page.getByTestId(`look-preset-${look}`).tap();
    }
    await page.getByTestId('tab-map').tap();
    await mapView(page, 'list');
    await page.getByTestId('start-mossy-hollow').tap();
    await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
    const img = page.getByTestId('stage-rider').locator('img').first();
    await expect(img).toBeVisible();
    // The colored image is drawn once and kept as a blob; its size says the colors changed.
    return img.evaluate(async (el) => (await (await fetch((el as HTMLImageElement).src)).blob()).size);
  };
  const plain = await riderArt();
  expect(await riderArt('ember')).not.toBe(plain);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/looks-fight.png' });
});

test('gear rows show a painted icon in the Bag, the Town and the Forge', async ({ page }) => {
  await load(page, 'forge.json', undefined, 'bag');
  const weapon = (await saved(page))!.rider.equipment.weapon!;
  const icon = page.getByTestId(`gear-icon-${weapon}`).first();
  await expect(icon).toHaveAttribute('data-art', 'painted');
  await expect(icon.locator('img')).toBeVisible();
  await page.getByTestId('slot-weapon').tap();
  await expect(page.locator('.sheet .gear-icon[data-art=painted]').first()).toBeVisible();
  expect(await smallTargets(page, '.sheet')).toEqual([]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/looks-bag-gear.png' });

  await page.goto('./#/town');
  await page.reload();
  await enter(page);
  const rows = page.locator('.shop-row');
  await expect(rows.first().locator('.gear-icon')).toHaveAttribute('data-art', 'painted');
  // Every row in view has its icon, and no icon is still loading or fell back to an emoji.
  await expect(page.locator('.shop-row .gear-icon:not([data-art=painted])')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: 'test-results/looks-town.png' });

  await page.goto('./#/roost');
  await page.reload();
  await enter(page);
  await page.getByTestId('building-forge').scrollIntoViewIfNeeded();
  await openFold(page, 'roost.forge');
  await page.getByTestId('open-forge').tap();
  await expect(page.locator('.forge-row .gear-icon[data-art=painted]').first()).toBeVisible();
  await expect(page.locator('.forge-row .gear-icon:not([data-art=painted])')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/looks-forge.png' });
});
