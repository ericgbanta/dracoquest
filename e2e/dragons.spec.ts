import { expect, test, type Page } from '@playwright/test';
import { openFold } from './helpers';
import { readFileSync } from 'node:fs';

const NOW = 1794355200000; // the fixtures' save time

async function load(page: Page, fixture: string, hash = '#/roost', change?: (save: { dragons: { name: string; breed: string }[] }) => void) {
  await page.clock.install({ time: new Date(NOW) });
  await page.goto('./');
  let save = readFileSync(`e2e/fixtures/${fixture}`, 'utf8');
  if (change) { const s = JSON.parse(save); change(s); save = JSON.stringify(s); }
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), save);
  await page.goto(`./${hash}`);
  await page.reload();
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('dracoquest.save')!));

test('return an unwanted egg to the wild for embers', async ({ page }) => {
  await load(page, 'nest.json');
  const before = (await saved(page)).embers as number;
  await openFold(page, 'roost.hatchery');
  await openFold(page, 'roost.hatchery.bag');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('release-1').tap();
  await expect(page.getByTestId('toast')).toContainText('back in the wild');
  const after = await saved(page);
  // A rare hybrid: base + hybrid + finish.
  expect(after.embers).toBe(before + 3 + 2 + 7);
  expect(after.eggs).toHaveLength(1);
  expect(after.eggs[0].element).toBe('storm');
});

test('keeping an egg when asked leaves it in the bag', async ({ page }) => {
  await load(page, 'nest.json');
  await openFold(page, 'roost.hatchery');
  await openFold(page, 'roost.hatchery.bag');
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('release-0').tap();
  expect((await saved(page)).eggs).toHaveLength(2);
});

test('take an egg out of the Hatchery and it goes back to the bag', async ({ page }) => {
  await load(page, 'nest.json');
  await openFold(page, 'roost.hatchery');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('remove-0').tap();
  await expect(page.getByTestId('toast')).toContainText('back in your bag');
  const s = await saved(page);
  expect(s.roost.hatchery.eggs).toHaveLength(0);
  expect(s.eggs).toHaveLength(3);
  expect(s.eggs[2].element).toBe('tide');
  // The slot is free again.
  await openFold(page, 'roost.hatchery.bag');
  await expect(page.getByTestId('incubate-0')).toBeEnabled();
});

test('identical eggs share one row in the Hatchery', async ({ page }) => {
  await load(page, 'nest.json');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dracoquest.save')!);
    const storm = { element: 'storm', element2: null, breed: 'dragon', variant: null };
    s.eggs = [storm, storm, s.eggs[1], storm, storm];
    s.roost.hatchery.eggs = [];
    localStorage.setItem('dracoquest.save', JSON.stringify(s));
  });
  await page.reload();
  await openFold(page, 'roost.hatchery');
  await openFold(page, 'roost.hatchery.bag');
  await expect(page.locator('[data-testid^="bag-egg-"]')).toHaveCount(2);
  await expect(page.getByTestId('egg-count-0')).toHaveText(' ×4');
  await expect(page.getByTestId('fold-roost.hatchery.bag')).toContainText('5 eggs, 2 kinds');
  await page.screenshot({ path: 'test-results/hatchery-grouped.png' });
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('release-0').tap();
  await expect(page.getByTestId('egg-count-0')).toHaveText(' ×3');
});

test('two grown dragons nest and their egg arrives after the wait', async ({ page }) => {
  await load(page, 'nest.json');
  await openFold(page, 'roost.nesting');
  await expect(page.getByTestId('start-nesting')).toBeDisabled();
  await page.getByTestId('nest-pick-Mist').tap();
  await page.getByTestId('nest-pick-Glint').tap();
  await page.getByTestId('start-nesting').tap();
  await expect(page.getByTestId('fold-roost.nesting')).toContainText('Mist and Glint nesting');
  await expect(page.getByTestId('collect-nest-egg')).toBeDisabled();
  await page.screenshot({ path: 'test-results/nesting-wait.png' });

  // Come back after the wait.
  await page.goto('about:blank');
  await page.clock.setFixedTime(new Date(NOW + 9 * 3600_000));
  await page.goto('./#/roost');
  await openFold(page, 'roost.nesting');
  await expect(page.getByTestId('fold-roost.nesting')).toContainText('An egg is waiting');
  await page.getByTestId('collect-nest-egg').tap();
  await expect(page.getByTestId('toast')).toContainText('Mist and Glint made a');
  const s = await saved(page);
  expect(s.eggs).toHaveLength(3);
  expect(s.roost.nesting).toBeNull();
  expect(['tide', 'fire', 'stone']).toContain(s.eggs[2].element);
});

test('ten dragons fit on the Dragons screen, hybrids and rare finishes shown', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await load(page, 'nest.json', '#/dragons');
  await expect(page.getByTestId('dpick-Zap')).toBeAttached();
  await page.getByTestId('dpick-Coal').tap();
  await expect(page.locator('.dragon-sheet')).toContainText('Magma');
  await expect(page.getByTestId('variant-badge')).toHaveText(/Ember-eyed/);
  // The painted art loads with the finish and the tail tip ring baked in.
  await expect(page.locator('.dragon-sheet .sprite--rig img').first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/dragons-coal.png' });
  await page.getByTestId('dpick-Wisp').tap();
  await expect(page.getByTestId('variant-badge')).toHaveText(/Ghost/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/dragons-wisp.png' });
  // The picker scrolls sideways instead of growing the page.
  const height = await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight);
  expect(height).toBeLessThan(2.4);
});

test('the Roost lists ten dragons and every finish draws', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await load(page, 'nest.json');
  for (const name of ['Mist', 'Glint', 'Twinkle', 'Wisp', 'Coal']) {
    await page.getByTestId(`pick-${name}`).tap();
    await expect(page.getByTestId('welcome')).toHaveText(name);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/roost-ten.png', fullPage: true });
});

test('a Wyvern shows its own painted body, its breed and its signature skill', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await load(page, 'nest.json', '#/dragons');
  await page.getByTestId('dpick-Zap').scrollIntoViewIfNeeded();
  await page.getByTestId('dpick-Zap').tap();
  await expect(page.locator('.dragon-sheet')).toContainText('Juvenile Wyvern');
  await expect(page.getByTestId('signature-skill')).toContainText('Rake');
  await expect.poll(async () => (await page.locator('.dragon-sheet img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))).length).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/dragons-wyvern.png' });
});

test('a Behemoth shows its painted body and Brace, and braces for the party in a fight', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const behemoth = (s: { dragons: { name: string; breed: string }[] }) => { s.dragons.find((d) => d.name === 'Mist')!.breed = 'behemoth'; };
  await load(page, 'nest.json', '#/dragons', behemoth);
  await page.getByTestId('dpick-Mist').scrollIntoViewIfNeeded();
  await page.getByTestId('dpick-Mist').tap();
  await expect(page.locator('.dragon-sheet')).toContainText('Behemoth');
  await expect(page.getByTestId('signature-skill')).toContainText('Brace');
  // The body is recolored into a blob URL, so look for the Behemoth rig's own shape (adult 710 x 417, elder 710 x 391).
  const behemothRig = (scope: string) => page.locator(`${scope} .rig[style*="710 / 417"], ${scope} .rig[style*="710 / 391"]`).first();
  await expect(behemothRig('.dragon-sheet')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/dragons-behemoth.png' });
  // In battle (Mist is the third partner): the stage draws the Behemoth, and Brace is a skill it can use.
  await load(page, 'trio-fight.json', '#/roost', behemoth);
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(behemothRig('[data-testid=stage]')).toBeVisible();
  await page.getByTestId('act3-skill').tap();
  await page.getByTestId('skill3-behemoth-brace').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('go')).toBeEnabled({ timeout: 20_000 });
  const s = await saved(page);
  expect(s.run.battle.third.cooldowns['behemoth-brace']).toBeGreaterThan(0);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/behemoth-stage.png' });
});

test('three dragons fight together from rider level 60: three order rows, all three on the stage', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await load(page, 'trio-fight.json');
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();
  await expect(page.getByTestId('stage-dragon3')).toBeVisible();
  await expect(page.getByTestId('third-card')).toContainText('Mist');
  await expect(page.getByTestId('act3-claw')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/trio-stage.png', fullPage: true });
  // Tap targets stay at 44 px in every order row.
  const small = await page.locator('.action-row button').evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetHeight < 44 || (el as HTMLElement).offsetWidth < 44).length);
  expect(small).toBe(0);
  await page.getByTestId('act3-guard').tap();
  await page.getByTestId('go').tap();
  await expect(page.getByTestId('go')).toBeEnabled({ timeout: 20_000 });
  const s = await saved(page);
  expect(s.run.battle.third.fighter.name).toBe('Mist');
  expect(s.run.battle.round).toBeGreaterThan(1);
});
