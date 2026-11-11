// Batch renderer (same logic as rigpreview.mjs) : node sheet.mjs jobs.json
// jobs: [{rig:{size,parts}, colors:"#a,#b,#c", flip, pose:{id:deg}, width, out, bg}]
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const require = createRequire('/home/user/dracoquest/package.json');
const { chromium } = require('@playwright/test');
const ART = '/home/user/dracoquest/src/art/';
const jobs = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 900, height: 1000 } });
for (const j of jobs) {
  const [c1, c2, c3] = j.colors.split(',');
  const tokens = { '#9a9a9a': c1, '#6e6e6e': mix(c1, '#1d1a2b', 0.25), '#d6d6d6': c2, '#b0b0b0': mix(c2, '#1d1a2b', 0.25), '#505050': c3, '#3c3c3c': mix(c3, '#1d1a2b', 0.25) };
  const load = (f) => { if (!existsSync(ART + f)) { console.error('missing', f); return null; } let s = readFileSync(ART + f, 'utf8'); for (const [k, v] of Object.entries(tokens)) s = s.split(k).join(v); return 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64'); };
  const pose = j.pose ?? {};
  const part = (p) => {
    const o = `${(p.pivot ?? [0.5, 0.5])[0] * 100}% ${(p.pivot ?? [0.5, 0.5])[1] * 100}%`;
    const rot = pose[p.id] ? `transform:rotate(${pose[p.id]}deg);` : '';
    const dot = j.grid && p.pivot ? `<i style="position:absolute;left:${p.pivot[0] * 100}%;top:${p.pivot[1] * 100}%;width:6px;height:6px;margin:-3px;background:red;border-radius:3px;z-index:9"></i>` : '';
    const img = p.file ? load(p.file) : null;
    return `<div style="position:absolute;inset:0;transform-origin:${o};${rot}">${img ? `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%">` : ''}${(p.parts ?? []).map(part).join('')}${dot}</div>`;
  };
  const w = j.width ?? 300;
  const html = `<div style="position:relative;width:${w}px;aspect-ratio:${j.rig.size[0]}/${j.rig.size[1]};${j.flip ? 'transform:scaleX(-1)' : ''}">${j.rig.parts.map(part).join('')}</div>`;
  await pg.setContent(`<body style="margin:10px;background:${j.bg ?? '#8a74b8'}">${html}</body>`);
  await pg.waitForTimeout(30);
  const box = await pg.locator('body > div').boundingBox();
  await pg.screenshot({ path: j.out, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
}
await b.close();
console.log('rendered', jobs.length);
