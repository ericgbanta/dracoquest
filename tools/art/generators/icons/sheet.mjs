import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire('/home/user/dracoquest/package.json')('@playwright/test');
const dir = '/home/user/dracoquest/src/art/icons';
const names = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort();
const big = process.argv[2] === 'big';
const cells = names.map(n => {
  const src = 'data:image/svg+xml;base64,' + fs.readFileSync(`${dir}/${n}`).toString('base64');
  const sizes = big ? [16, 24, 32, 64] : [16, 24, 32];
  return `<div class=c>${sizes.map(s => `<img src="${src}" width=${s} height=${s}>`).join('')}<span>${n.replace('.svg','')}</span></div>`;
}).join('');
const html = `<html><body style="margin:0;background:#2a2540;font:10px sans-serif;color:#cfc8ee">
<div style="display:grid;grid-template-columns:repeat(${big?5:6},1fr);gap:6px;padding:8px;width:${big?900:780}px">${cells}</div>
<style>.c{display:flex;align-items:center;gap:6px;padding:4px;background:#2a2540}.c:nth-child(odd){background:#362f52}span{margin-left:4px}</style></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
await p.setContent(html); await p.waitForTimeout(300);
await p.screenshot({ path: process.argv[3], fullPage: true }); await b.close();
