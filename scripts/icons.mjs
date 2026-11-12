// Builds the Home Screen icons and favicon in public/ from the painted emblem in scripts/icons/emblem.webp
// (a baby dragon hatching, cut out by tools/art/painted/icon_cut.py). Rasterizes with the sandbox Chromium
// through Playwright. Run with: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = (name) => here(`../public/${name}`);

const emblem = `data:image/webp;base64,${(await readFile(here('icons/emblem.webp'))).toString('base64')}`;
const BG = '#1d1a2b';
const GLOW = '#2b2643';

// The emblem is square with the art centered. `size` is its width as a share of the 512 tile.
const art = (size, cy = 256) => {
  const s = 512 * size;
  return `<circle cx="256" cy="${cy}" r="${s * 0.47}" fill="${GLOW}"/>
  <image href="${emblem}" x="${256 - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}"/>`;
};

// Regular icon: rounded tile with a thin frame. The art fills most of the tile.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="104" fill="${BG}"/>
  <rect x="20" y="20" width="472" height="472" rx="88" fill="none" stroke="#362f52" stroke-width="6"/>
  ${art(0.84)}
</svg>`;

// Apple touch icon: iOS rounds the corners itself, so the tile is a full square.
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  ${art(0.86)}
</svg>`;

// Maskable icon: full bleed background, art inside the central 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  ${art(0.7)}
</svg>`;

// Favicon: no frame, art as big as it fits, since it shows at 16 to 32 px.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="104" fill="${BG}"/>
  ${art(0.96)}
</svg>`;

const jobs = [
  [icon, 192, 'icon-192.png'],
  [icon, 512, 'icon-512.png'],
  [apple, 180, 'apple-touch-icon.png'],
  [maskable, 512, 'icon-maskable-512.png'],
  [favicon, 64, 'favicon.png'],
];

const browser = await chromium.launch();
try {
  for (const [svg, size, name] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await writeFile(out(name), png);
    console.log(`${name} ${size}x${size} ${png.length} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
}
