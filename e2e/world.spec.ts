import { expect, test, type Page } from '@playwright/test';
import { openFold, mapRegion, mapView } from './helpers';
import { readFileSync } from 'node:fs';
import type { SaveData } from '../src/core/save';

const TODAY = new Date('2026-11-12T10:00:00');

async function load(page: Page, fixture: string, change?: (save: SaveData) => void) {
  const save = JSON.parse(readFileSync(`e2e/fixtures/${fixture}`, 'utf8')) as SaveData;
  change?.(save);
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('dracoquest.save', s); }, JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
}

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!) as SaveData);

async function smallTargets(page: Page, scope: string): Promise<string[]> {
  return page.locator(`${scope} button`).evaluateAll((els) =>
    els.filter((el) => (el as HTMLElement).offsetWidth > 0 && ((el as HTMLElement).offsetWidth < 44 || (el as HTMLElement).offsetHeight < 44))
      .map((el) => el.outerHTML.slice(0, 60)));
}

test('the Map shows one painted region at a time, with pins, and teases the next area', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.bossesDefeated = ['mossy-hollow']; });
  await page.getByTestId('tab-map').tap();
  // The painted map is the default view. Level 15: it opens on the Wilds, with a pin per area and one for the town.
  await expect(page.getByTestId('map-view-map')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('region-wilds')).toHaveCount(0);
  await expect(page.getByTestId('map-region-name')).toHaveText('The Wilds');
  await expect(page.getByTestId('map-prev')).toBeDisabled();
  for (const id of ['mossy-hollow', 'saltmarsh-shore', 'whispering-fen', 'cinder-pass', 'town']) await expect(page.getByTestId(`pin-${id}`)).toBeVisible();
  await expect(page.getByTestId('pin-mossy-hollow')).toHaveAttribute('aria-label', /boss beaten/);
  expect(await smallTargets(page, '[data-testid=region-map]')).toEqual([]);
  // The List view shows the region's areas as cards.
  await mapView(page, 'list');
  await expect(page.getByTestId('pin-mossy-hollow')).toHaveCount(0);
  await expect(page.getByTestId('region-wilds').getByTestId('zone-mossy-hollow')).toBeVisible();
  // Whispering Fen is open (level 15, Bramble Troll beaten).
  await expect(page.getByTestId('region-wilds').getByTestId('start-whispering-fen')).toBeVisible();
  // Mossy Hollow (levels 1 to 8) is below the rider, so its card folds to one row with a Hunt button.
  await expect(page.getByTestId('start-mossy-hollow')).toHaveText('Hunt');
  await openFold(page, 'map.zone.mossy-hollow');
  await expect(page.getByTestId('story-mossy-hollow')).toHaveAttribute('aria-label', 'Story, 0 of 4 done');
  await expect(page.getByTestId('story-cinder-pass')).toHaveCount(0);
  expect(await smallTargets(page, '[data-testid=zone-mossy-hollow]')).toEqual([]);
  // The open card's level line isn't covered by its banner.
  const line = await page.getByTestId('fold-map.zone.mossy-hollow').locator('.muted').boundingBox();
  const banner = await page.getByTestId('zone-mossy-hollow').locator('.zone-banner').boundingBox();
  expect(line!.y + line!.height).toBeLessThanOrEqual(banner!.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-map-list.png' });

  // Cycle to the High Lands: locked areas say why. The list remembers being picked.
  await page.getByTestId('map-next').tap();
  await expect(page.getByTestId('map-region-name')).toHaveText('The High Lands');
  await expect(page.getByTestId('zone-gilded-wastes')).toContainText('Opens at rider level 40, after you beat the Glacier Hydra');
  await expect(page.getByTestId('zone-moonwell-woods')).toContainText('Opens at rider level 30, after you beat the Storm Roc');
  await expect(page.getByTestId('zone-rustcliff-ruins')).toContainText('Opens at rider level 20, after you beat the Magma Wyrm');
  await page.reload();
  await expect(page.getByTestId('zone-rustcliff-ruins')).toBeVisible();
  await mapView(page, 'map');
  await expect(page.getByTestId('pin-eclipse-peak')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-map-highlands.png' });

  // The Hidden Reach: Starglass Hollow, locked at level 15, and the Voidmarch teaser.
  await page.getByTestId('map-next').tap();
  await expect(page.getByTestId('map-region-name')).toHaveText('The Hidden Reach');
  await expect(page.getByTestId('pin-starglass-hollow')).toBeVisible();
  await expect(page.getByTestId('pin-starglass-hollow')).toHaveAttribute('aria-label', /Opens at rider level 30/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-map-hidden-reach.png' });

  // And Beyond the Peak: Sunken Spires (locked at level 15) and the next teaser.
  await page.getByTestId('map-next').tap();
  await expect(page.getByTestId('map-region-name')).toHaveText('Beyond the Peak');
  await expect(page.getByTestId('pin-sunken-spires')).toHaveAttribute('aria-label', /Opens at rider level 50/);
  await expect(page.getByTestId('map-next')).toBeDisabled();
  await page.getByTestId('pin-teaser').tap();
  await expect(page.locator('.sheet [data-testid=zone-teaser]')).toContainText('Arrives in a future update');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-map-beyond.png' });
  await page.keyboard.press('Escape');
  await mapView(page, 'list');
  const teaser = page.getByTestId('region-beyond').getByTestId('zone-teaser');
  await expect(teaser).toContainText('Emberwild');
  await expect(teaser).toContainText('Opens at level 60, after you beat the Tidelord');
});

test('tapping a map pin opens that area, and the map remembers its region', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.getByTestId('tab-map').tap();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/world-map.png' });
  await page.getByTestId('pin-mossy-hollow').tap();
  const sheet = page.getByTestId('pin-sheet-mossy-hollow');
  await expect(sheet).toContainText('Levels 1 to 8');
  await expect(page.getByTestId('pin-story-mossy-hollow')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/world-map-pin.png' });
  // A pin's Story button opens the story sheet in place of the pin's.
  await page.getByTestId('pin-story-mossy-hollow').tap();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('.sheet')).toContainText('Mossy Hollow');
  // The sheet starts listening for Escape just after it paints; under load the first press can come sooner.
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0, { timeout: 500 });
  }).toPass();
  // The town pin goes to the town.
  await page.getByTestId('pin-town').tap();
  await expect(page).toHaveURL(/#\/town/);
  // The map remembers the region last looked at.
  await page.getByTestId('tab-map').tap();
  await page.getByTestId('map-next').tap();
  await page.reload();
  await expect(page.getByTestId('map-region-name')).toHaveText('The High Lands');
  // A pin starts a hunt from its sheet.
  await page.getByTestId('map-prev').tap();
  await page.getByTestId('pin-mossy-hollow').tap();
  await page.getByTestId('pin-start-mossy-hollow').tap();
  await expect(page.locator('[data-testid=stage], .results-title, [data-testid=go]').first()).toBeVisible();
});

test('a story quest plays with dialogue and ends with its reward', async ({ page }) => {
  await load(page, 'juvenile.json');
  const potions = (await stored(page)).rider.inventory.potion ?? 0;
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  await page.getByTestId('story-mossy-hollow').tap();
  await expect(page.getByTestId('story-the-spore-cloud')).toContainText('Finish "Wren\'s Garden" first');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/world-story-list.png' });
  await page.getByTestId('start-story-wrens-garden').tap();
  // The interlude shows the quest and its opening lines, with the herbalist named.
  await expect(page.getByRole('heading', { name: "Wren's Garden" })).toBeVisible();
  await expect(page.getByTestId('dialogue')).toContainText('Old Wren');
  for (let i = 0; i < 40; i++) {
    const step = page.locator('[data-testid=story-end], [data-testid=next-fight], [data-testid=continue], [data-testid=go]:not([disabled])').first();
    await expect(step).toBeVisible({ timeout: 15_000 });
    if (await page.getByTestId('story-end').count()) break;
    await step.tap();
  }
  await expect(page.getByTestId('story-reward')).toContainText('+2 Potion');
  await expect(page.locator('.results-title')).toHaveText('Quest complete!');
  const s = await stored(page);
  expect(s.questsDone).toContain('wrens-garden');
  // The quest gives 2 potions (the fights may drop more, so check it did not drop below the start).
  expect(s.rider.inventory.potion).toBeGreaterThanOrEqual(potions);
});

test('a finished quest with a choice can be decided from the story list', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.questsDone = ['wrens-garden', 'the-spore-cloud']; });
  const before = (await stored(page)).embers;
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  await expect(page.getByTestId('story-mossy-hollow')).toHaveAttribute('aria-label', 'Story, 2 of 4 done, a choice is waiting');
  await page.getByTestId('story-mossy-hollow').tap();
  await expect(page.getByTestId('pending-the-spore-cloud')).toContainText('What do you do with the jar of spores?');
  await page.getByTestId('choice-give').tap();
  await expect(page.getByTestId('pending-the-spore-cloud')).toHaveCount(0);
  const s = await stored(page);
  expect(s.storyChoices['the-spore-cloud']).toBe('give');
  expect(s.embers).toBe(before + 3);
});

test('finished bounties are claimed from the board', async ({ page }) => {
  await page.clock.install({ time: TODAY });
  await load(page, 'juvenile.json', (s) => {
    // Mark every Mossy Hollow bounty as done for today; the board posts three of them.
    const progress: Record<string, number> = {};
    for (const id of ['thorn-trim', 'hopper-hop', 'boar-boredom', 'puff-patrol', 'wisp-watch', 'hollow-wins', 'hollow-clear', 'elder-visit']) progress[`mossy-hollow:${id}`] = 99;
    s.bounties = { day: '2026-11-12', progress, claimed: [] };
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await openFold(page, 'map.zone.mossy-hollow');
  await expect(page.getByTestId('bounties-mossy-hollow')).toHaveAttribute('aria-label', 'Bounties, 3 ready to claim');
  await page.getByTestId('bounties-mossy-hollow').tap();
  const before = (await stored(page)).rider.gold;
  await page.locator('[data-testid^=claim-]').first().tap();
  await expect(page.getByTestId('bounty-notice')).toContainText('Bounty done');
  expect((await stored(page)).rider.gold).toBeGreaterThan(before);
  await expect(page.locator('[data-testid^=claim-]').first()).toHaveText('Claimed');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/world-bounties.png' });
  expect(await smallTargets(page, '.sheet')).toEqual([]);
});

test('area art is cached the first time a zone shows it, not up front', async ({ page }) => {
  await load(page, 'juvenile.json');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const precached = await page.evaluate(async () => {
    const names = await caches.keys();
    const pre = names.find((n) => n.includes('precache'));
    const keys = pre ? await (await caches.open(pre)).keys() : [];
    return keys.map((r) => r.url).filter((u) => /\/(thornling|mossy-hollow)-[^/]*\.webp/.test(u)).length;
  });
  expect(precached).toBe(0);
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await expect.poll(async () => page.evaluate(async () => {
    if (!(await caches.keys()).includes('dracoquest-area-art')) return 0;
    return (await (await caches.open('dracoquest-area-art')).keys()).length;
  }), { timeout: 15_000 }).toBeGreaterThan(0);
});

test('Whispering Fen stays locked until the Bramble Troll is beaten', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.bossesDefeated = []; });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  const fen = page.getByTestId('zone-whispering-fen');
  await expect(fen).toContainText('Opens after you beat the Bramble Troll');
  await expect(page.getByTestId('start-whispering-fen')).toHaveCount(0);
});

test('Whispering Fen fights use the painted Fen art', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => { s.bossesDefeated = ['mossy-hollow']; });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('start-whispering-fen').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const fen = /(murk-toad|will-o-whisper|reed-stalker|bogling|lily-snapper)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => fen.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/fen-fight.png' });
});

test('the Whisperwillow boss fight shows the boss art', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => {
    s.bossesDefeated = ['mossy-hollow'];
    s.run = { zoneId: 'whispering-fen', fights: [{ kind: 'boss', enemies: [{ enemyId: 'whisperwillow', level: 20 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /whisperwillow-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/fen-boss.png' });
});

test('Rustcliff Ruins opens at level 20 after the Magma Wyrm, and its fights use the Ruins art', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'cinder-pass'];
    s.rider.level = 21;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await page.getByTestId('start-rustcliff-ruins').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const ruins = /(cog-crawler|brass-sentry|boiler-bot|spark-hound|gargoyle-pup)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => ruins.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/ruins-fight.png' });
});

test('the Cinderforge Colossus boss fight shows the boss art', async ({ page }) => {
  await load(page, 'juvenile.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'cinder-pass'];
    s.rider.level = 29;
    s.run = { zoneId: 'rustcliff-ruins', fights: [{ kind: 'boss', enemies: [{ enemyId: 'cinderforge-colossus', level: 30 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /cinderforge-colossus-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/ruins-boss.png' });
});

test('Moonwell Woods opens at level 30 after the Storm Roc, and its fights use the Moonwell art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire'];
    s.rider.level = 31;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await mapRegion(page, 'The High Lands');
  await page.getByTestId('start-moonwell-woods').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const woods = /(hoot-shade|frostcap-shroom|snickerbark|shadow-fox|rimeback-badger)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => woods.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/moonwell-fight.png' });
});

test('the Moonwell Wyrm boss fight shows the boss art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire'];
    s.rider.level = 39;
    s.run = { zoneId: 'moonwell-woods', fights: [{ kind: 'boss', enemies: [{ enemyId: 'moonwell-wyrm', level: 40 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /moonwell-wyrm-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/moonwell-boss.png' });
});

test('the Gilded Wastes open at level 40 after the Glacier Hydra, and their fights use the Wastes art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'frostmere'];
    s.rider.level = 41;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await mapRegion(page, 'The High Lands');
  await page.getByTestId('start-gilded-wastes').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const wastes = /(sand-scarab|mirage-jackal|glimmer-lizard|dune-sentinel|treasure-mimic)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => wastes.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/wastes-fight.png' });
});

test('the Aurum Basilisk boss fight shows the boss art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'frostmere'];
    s.rider.level = 49;
    s.run = { zoneId: 'gilded-wastes', fights: [{ kind: 'boss', enemies: [{ enemyId: 'aurum-basilisk', level: 50 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /aurum-basilisk-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/wastes-boss.png' });
});

test('Starglass Hollow opens at level 30 after the Storm Roc, and its fights use the Starglass art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire'];
    s.rider.level = 31;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await mapRegion(page, 'The Hidden Reach');
  await page.getByTestId('start-starglass-hollow').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const hollow = /(shardling|frostwing-moth|comet-pup|glass-golem|astral-owlet)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => hollow.test(src))).toBe(true);
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /starglass-hollow-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/starglass-fight.png' });
});

test('the Starwarden boss fight shows the boss art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire'];
    s.rider.level = 39;
    s.run = { zoneId: 'starglass-hollow', fights: [{ kind: 'boss', enemies: [{ enemyId: 'starwarden', level: 40 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /starwarden-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/starglass-boss.png' });
});

test('Voidmarch opens at level 40 after the Starwarden, and its fights use the Voidmarch art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'starglass-hollow'];
    s.rider.level = 41;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await mapRegion(page, 'The Hidden Reach');
  await page.getByTestId('start-voidmarch').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const march = /(rift-mite|shardhorn-goat|gloom-gulper|rubble-crab|echo-bat)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => march.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/voidmarch-fight.png' });
});

test('the Nullmaw boss fight shows the boss art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'starglass-hollow'];
    s.rider.level = 49;
    s.run = { zoneId: 'voidmarch', fights: [{ kind: 'boss', enemies: [{ enemyId: 'nullmaw', level: 50 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /nullmaw-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/voidmarch-boss.png' });
});

test('the Sunken Spires open at level 50 after the Eclipse Dragon, and the Tidelord shows its art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'frostmere', 'eclipse-peak'];
    s.rider.level = 51;
  });
  await page.getByTestId('tab-map').tap();
  await mapView(page, 'list');
  await mapRegion(page, 'Beyond the Peak');
  await page.getByTestId('start-sunken-spires').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  const spires = /(reef-stalker|storm-gull|barnacle-brute|squall-sprite|drowned-sentry)-[^/]*\.webp/;
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => spires.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/spires-fight.png' });
});

test('the Tidelord boss fight shows the boss art', async ({ page }) => {
  await load(page, 'elder.json', (s) => {
    s.bossesDefeated = ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass', 'thunderspire', 'frostmere', 'eclipse-peak'];
    s.rider.level = 59;
    s.run = { zoneId: 'sunken-spires', fights: [{ kind: 'boss', enemies: [{ enemyId: 'tidelord', level: 60 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } };
  });
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect.poll(async () => (await page.locator('[data-testid=stage] img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).some((src) => /tidelord-[^/]*\.webp/.test(src))).toBe(true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/spires-boss.png' });
});
