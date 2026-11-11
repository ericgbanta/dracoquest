// Rig preview for DracoQuest art. Renders a rig from a manifest fragment the way the battle stage does
// (nested parts, pivots, gray tokens swapped for colors), so joints and tints can be checked.
//
// node rigpreview.mjs --manifest frag.json --rig dragon.juvenile --out out.png
//   [--width 400] [--bg "#8a74b8"] [--colors "#e8603c,#f2a541,#5fbf5a"] (primary,secondary,accent)
//   [--vars element=fire,weapon=sword] [--pose head=-18,jaw=26,wing-front=-10] [--flip]
//   [--grid] (draws the pivot of every part as a red dot)
// node rigpreview.mjs --backdrop thunderspire --manifest frag.json --out bg.png [--width 800]
// Paths in the manifest are relative to src/art/. Run from anywhere: node tools/art/rigpreview.mjs --manifest src/art/assets.json --rig rider --out tools/art/out/rider.png
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));
const ART = fileURLToPath(new URL('../../src/art/', import.meta.url));
const man = JSON.parse(readFileSync(args.manifest, 'utf8'));
const width = Number(args.width ?? 400);
const bg = args.bg ?? '#8a74b8';
const vars = Object.fromEntries(String(args.vars ?? 'element=fire,weapon=sword').split(',').map((kv) => kv.split('=')));
const pose = Object.fromEntries(String(args.pose ?? '').split(',').filter(Boolean).map((kv) => { const [k, v] = kv.split('='); return [k, Number(v)]; }));

const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const [c1, c2, c3] = String(args.colors ?? '#e8603c,#f2a541,#5fbf5a').split(',');
const tokens = {
  '#9a9a9a': c1, '#6e6e6e': mix(c1, '#1d1a2b', 0.25), '#d6d6d6': c2, '#b0b0b0': mix(c2, '#1d1a2b', 0.25),
  '#505050': c3, '#3c3c3c': mix(c3, '#1d1a2b', 0.25),
};
const load = (file) => {
  const f = file.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  if (!existsSync(ART + f)) { console.error('missing part file:', f); return null; }
  let s = readFileSync(ART + f, 'utf8');
  for (const [k, v] of Object.entries(tokens)) s = s.split(k).join(v);
  return 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
};

let html;
if (args.backdrop) {
  const bd = man.backdrops[args.backdrop];
  const h = Math.round(width * 11 / 16);
  html = `<div style="position:relative;width:${width}px;height:${h}px;overflow:hidden">${bd.layers.map((l) => `<img src="${load(l.file)}" style="position:absolute;inset:0;width:100%;height:100%">`).join('')}</div>`;
} else {
  const rig = man.rigs[args.rig];
  if (!rig) throw new Error('no rig ' + args.rig);
  const part = (p) => {
    const o = `${(p.pivot ?? [0.5, 0.5])[0] * 100}% ${(p.pivot ?? [0.5, 0.5])[1] * 100}%`;
    const rot = pose[p.id] ? `transform:rotate(${pose[p.id]}deg);` : '';
    const dot = args.grid && p.pivot ? `<i style="position:absolute;left:${p.pivot[0] * 100}%;top:${p.pivot[1] * 100}%;width:6px;height:6px;margin:-3px;background:red;border-radius:3px;z-index:9"></i>` : '';
    const img = p.file ? load(p.file) : null;
    const kids = (p.parts ?? []).map(part).join('');
    return `<div style="position:absolute;inset:0;transform-origin:${o};${rot}">${img ? `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%">` : ''}${kids}${dot}</div>`;
  };
  html = `<div style="position:relative;width:${width}px;aspect-ratio:${rig.size[0]}/${rig.size[1]};${args.flip ? 'transform:scaleX(-1)' : ''}">${rig.parts.map(part).join('')}</div>`;
}
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: width + 20, height: 900 } });
await pg.setContent(`<body style="margin:10px;background:${bg}">${html}</body>`);
const box = await pg.locator('body > div').boundingBox();
await pg.screenshot({ path: args.out, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
await b.close();
console.log('wrote', args.out);
