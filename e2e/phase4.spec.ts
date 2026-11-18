import { expect, test, type Page } from '@playwright/test';
import { openFold, tab, mapRegion, mapView, enter } from './helpers';
import { readFileSync } from 'node:fs';

async function load(page: Page, fixture: string, hash = '#/roost') {
  await page.goto('./');
  const save = readFileSync(`e2e/fixtures/${fixture}`, 'utf8');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), save);
  await page.goto(`./${hash}`);
  await page.reload();
  await enter(page);
}

test('plays fully offline after the first visit', async ({ page, context }) => {
  await load(page, 'juvenile.json');
  // Wait for the service worker to finish installing and take control.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await enter(page);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await enter(page);
  await expect(page.getByTestId('welcome')).toHaveText('Scorch');
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('start-mossy-hollow').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('log')).not.toContainText('appears!', { timeout: 10_000 });
  await context.setOffline(false);
});

test('saves area art ahead of time: upcoming areas quietly, every area from Settings', async ({ page, context }) => {
  test.setTimeout(180_000);
  await load(page, 'juvenile.json');
  const cached = () => page.evaluate(async () =>
    (await (await caches.open('dracoquest-area-art')).keys()).map((r) => new URL(r.url).pathname.split('/').pop()!));
  // A level 15 rider with a Juvenile: Cinder Pass is open and Thunderspire (level 18) is coming up.
  await expect.poll(async () => (await cached()).some((f) => f.startsWith('thunderspire-')), { timeout: 30_000 }).toBe(true);
  expect((await cached()).some((f) => f.startsWith('cinder-pass-'))).toBe(true);
  expect((await cached()).some((f) => f.startsWith('dragonsrest-'))).toBe(false);

  await page.evaluate(() => { location.hash = '#/settings'; });
  await openFold(page, 'settings.offline');
  await page.getByTestId('download-art').tap();
  await expect(page.getByTestId('art-saved')).toBeVisible({ timeout: 150_000 });

  // Offline, once the service worker is in charge, a far-off area's backdrop still loads.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  const far = (await cached()).find((f) => f.startsWith('dragonsrest-'))!;
  const width = await page.evaluate(async (f) => {
    const img = new Image();
    img.src = `/dracoquest/assets/${f}`;
    await img.decode();
    return img.naturalWidth;
  }, far);
  expect(width).toBeGreaterThan(0);
  await context.setOffline(false);
});

test('a seasonal event shows on its dates and its gift opens once', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-11T10:00:00') });
  await load(page, 'juvenile.json');
  await expect(page.getByTestId('event-card')).toContainText('Harvest Moon Fair');
  await page.getByTestId('claim-gift').tap();
  await expect(page.getByTestId('toast')).toContainText('Festival gift');
  await expect(page.getByTestId('claim-gift')).toHaveCount(0);
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('go-town').tap();
  await expect(page.getByTestId('event-shop')).toBeVisible();
  await page.getByTestId('shop-tab-armor').tap();
  await expect(page.getByTestId('buy-harvest-lantern')).toBeVisible();
});

test('no event card outside event dates', async ({ page }) => {
  await page.clock.install({ time: new Date('2027-02-14T10:00:00') });
  await load(page, 'juvenile.json');
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expect(page.getByTestId('event-card')).toHaveCount(0);
});

test('an Elder lays its one egg', async ({ page }) => {
  await load(page, 'elder.json', '#/dragons');
  await page.getByTestId('lay-egg').tap();
  await expect(page.getByTestId('dragons-notice')).toContainText('laid an egg');
  await expect(page.getByTestId('egg-laying')).toContainText('has laid its egg');
  await page.getByTestId('tab-bag').tap();
  await tab(page, 'bag', 'items');
  await expect(page.getByTestId('eggs')).toContainText('Ember Egg');
});

test('sound is off by default and can be turned on', async ({ page }) => {
  await load(page, 'juvenile.json', '#/settings');
  await openFold(page, 'settings.battle');
  await expect(page.getByTestId('sound')).not.toBeChecked();
  await page.getByTestId('sound').tap();
  await expect(page.getByTestId('sound')).toBeChecked();
});

test('Eclipse Peak opens for an Elder', async ({ page }) => {
  await load(page, 'elder.json', '#/map');
  await mapView(page, 'list');
  await mapRegion(page, 'The High Lands');
  await expect(page.getByTestId('start-eclipse-peak')).toBeVisible();
  await expect(page.getByTestId('zone-eclipse-peak')).toContainText('Eclipse Dragon');
});
