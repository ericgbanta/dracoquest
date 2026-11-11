// Builds the Home Screen and favicon icons in public/ from the SVG art in scripts/icons/.
// Rasterizes with the sandbox Chromium through Playwright. Run with: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const out = (name) => here(`../public/${name}`);

const art = await readFile(here('icons/art.svg'), 'utf8');
const BG = '#1d1a2b';

// Regular icon: rounded tile with a thin frame. The art fills most of the tile.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="104" fill="${BG}"/>
  <rect x="20" y="20" width="472" height="472" rx="88" fill="none" stroke="#362f52" stroke-width="6"/>
  <g transform="translate(256 262) scale(0.92) translate(-256 -258)">${art}</g>
</svg>`;

// Apple touch icon: iOS rounds the corners itself, so the tile is a full square.
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(256 262) scale(0.92) translate(-256 -258)">${art}</g>
</svg>`;

// Maskable icon: full bleed background, art inside the central 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(256 260) scale(0.7) translate(-256 -258)">${art}</g>
</svg>`;

const jobs = [
  [icon, 192, 'icon-192.png'],
  [icon, 512, 'icon-512.png'],
  [apple, 180, 'apple-touch-icon.png'],
  [maskable, 512, 'icon-maskable-512.png'],
];

const browser = await chromium.launch();
try {
  for (const [svg, size, name] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
    );
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await writeFile(out(name), png);
    console.log(`${name} ${size}x${size} ${png.length} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(out('icon.svg'), icon);
console.log('icon.svg');
