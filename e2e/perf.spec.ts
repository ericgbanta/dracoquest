import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The budget from docs/GRAPHICS_PLAN.md: under 5% dropped frames over scripted rounds,
// with the CPU throttled 4x and fast battles off. Headless Chromium has no GPU, so this
// catches main-thread work (scripts, layout, style); the phone bench covers the rest.
test('a real stage fight stays under 5% dropped frames at 4x CPU throttle', async ({ page, context }) => {
  test.setTimeout(120_000);
  const save = JSON.parse(readFileSync('e2e/fixtures/adult-at-roc.json', 'utf8'));
  save.settings.fastBattles = false;
  await page.goto('./');
  await page.evaluate((s) => localStorage.setItem('dracoquest.save', s), JSON.stringify(save));
  await page.goto('./#/roost');
  await page.reload();
  await page.getByTestId('next-fight').tap();
  await expect(page.locator('[data-testid=stage]:not(.stage--loading)')).toBeVisible();

  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    const tick = (t: number) => { if (w.__on) { w.__frames.push(t); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
  });
  for (let round = 0; round < 2; round++) {
    await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 30_000 });
    if (await page.locator('.results-title').count()) break;
    await page.getByTestId('go').tap();
    await expect(page.getByTestId('go')).toBeDisabled();
  }
  await expect(page.locator('.results-title, [data-testid=go]:not([disabled])').first()).toBeVisible({ timeout: 30_000 });
  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __on: boolean };
    w.__on = false;
    return w.__frames;
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const deltas = frames.slice(1).map((t, i) => t - frames[i]!);
  const sorted = [...deltas].sort((a, b) => a - b);
  const interval = sorted[Math.floor(sorted.length / 2)]!;
  const dropped = deltas.reduce((n, d) => n + Math.max(0, Math.round(d / interval) - 1), 0);
  const pct = (dropped / (deltas.length + dropped)) * 100;
  console.log(`perf: ${deltas.length} frames, ${dropped} dropped (${pct.toFixed(2)}%), frame ${interval.toFixed(1)} ms`);
  expect(deltas.length).toBeGreaterThan(60);
  expect(pct).toBeLessThan(5);
});
