import manifest from '../../art/assets.json';
import palette from '../../art/palette.json';
import { gameData } from '../../core/data';
import type { ElementId, VariantId } from '../../core/types';
import { applyFinish, familyMap, finishGlow, recolorPixels } from './tint';

/**
 * Battle-stage art: rigs (characters built from parts), backdrops and effects.
 * SVG parts are bundled as text so colors can be baked in once per fighter and
 * turned into Blob URLs. Nothing is recolored per frame.
 */

export interface PartDef {
  id: string;
  file?: string;
  pivot?: [number, number];
  anim?: string;
  parts?: PartDef[];
  /** Where this image sits in the rig's box, as fractions (left, top, width, height). A second pose can reach outside the box. */
  box?: [number, number, number, number];
  /** This image's own tail tip spot, when it differs from the rig's (another pose). */
  tip?: Omit<TipDef, 'file'>;
}

export interface RigDef {
  size: [number, number];
  /** dragon: player colors. enemy: a body plan colored per enemy (see "enemies" in assets.json). */
  tint?: 'dragon' | 'enemy';
  /** Size on stage relative to the slot (1 = fills it). */
  boxScale?: number;
  points: Record<string, [number, number]>;
  parts: PartDef[];
  /** Painted dragons: an element ornament drawn onto the tail when the image is colored. */
  tip?: TipDef;
}

/** Where a tail tip goes: its bottom-left corner at `at` (fractions of the image), `width` wide, turned `rotate` degrees. */
export interface TipDef { file: string; at: [number, number]; width: number; rotate?: number }

/** Player colors (and a tail tip) baked into a bitmap part at load. */
export interface BitmapTint {
  primary: string; secondary: string; tip?: { url: string; at: [number, number]; width: number; rotate: number } | undefined;
  /** A hybrid's second element color, drawn as a ring around the tail tip. */
  ring?: string | undefined;
  finish?: VariantId | undefined;
}

/** An enemy drawn from a shared body plan: its colors, size and extra parts. */
export interface EnemyLook {
  rig: string;
  colors: [string, string, string];
  scale?: number;
  extras?: (PartDef & { parent: string })[];
}

export interface Part {
  id: string;
  url: string | null;
  pivot: [number, number];
  anim?: string;
  parts: Part[];
  box?: [number, number, number, number] | undefined;
}

export interface Rig {
  key: string;
  size: [number, number];
  boxScale: number;
  points: Record<string, [number, number]>;
  parts: Part[];
}

/** Drifting specks over the whole stage (sparks, snow): one node, moved by transform only. */
export interface Ambient { kind: 'rise' | 'fall'; color: string }

/** Layers stack in order behind the fighters; a `front` layer is drawn over them. */
export interface Backdrop { layers: { url: string; anim?: string | undefined; front?: boolean | undefined }[]; ambient?: Ambient | undefined }

export interface DragonLook { element: ElementId; element2?: ElementId | null; variant?: VariantId | null; primary: string; secondary: string }

/** Values filled into {name} placeholders in part file names. */
export interface RigVars { element?: string; weapon?: string }

const svgs = import.meta.glob('../../art/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bitmaps = import.meta.glob('../../art/**/*.{webp,png}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;

const m = manifest as unknown as {
  rigs: Record<string, RigDef>;
  enemies?: Record<string, EnemyLook>;
  backdrops: Record<string, { layers: { file: string; anim?: string; front?: boolean }[]; ambient?: Ambient }>;
  effects: Record<string, string>;
};
const rigs = m.rigs;
const enemyLooks = m.enemies ?? {};
const backdrops = m.backdrops;
const effects = m.effects;

const urlCache = new Map<string, Promise<string | null>>();

/** Mix a hex color toward another by t (0 to 1). */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const shade = (c: string) => mix(c, palette.outline, palette.shadeMix);

/** The token-to-color map for a dragon's parts. */
export function dragonColors(look: DragonLook): Record<string, string> {
  const t = palette.dragonTokens;
  return {
    [t.primary]: look.primary, [t.primaryShade]: shade(look.primary),
    [t.secondary]: look.secondary, [t.secondaryShade]: shade(look.secondary),
  };
}

/** The token-to-color map for an enemy body plan. */
export function enemyColors([primary, secondary, accent]: [string, string, string]): Record<string, string> {
  const t = palette.dragonTokens;
  const a = palette.enemyTokens;
  return {
    [t.primary]: primary, [t.primaryShade]: shade(primary),
    [t.secondary]: secondary, [t.secondaryShade]: shade(secondary),
    [a.accent]: accent, [a.accentShade]: shade(accent),
  };
}

/** The token-to-color map for a breath puff of one element. */
export function breathColors(element: ElementId): Record<string, string> {
  const t = palette.puffTokens;
  const b = (palette.breath as Record<string, { mid: string; core: string }>)[element] ?? palette.breath.fire;
  return { [t.edge]: gameData.elements.info[element].color, [t.mid]: b.mid, [t.core]: b.core };
}

function recolor(svg: string, colors: Record<string, string>): string {
  let out = svg;
  for (const [from, to] of Object.entries(colors)) out = out.split(from).join(to);
  return out;
}

/**
 * The lighting pass for a rig part: soft top light and bottom shade clipped to the part's own
 * shape, plus a rim on the edges that face the light. It uses masks and gradients only (no SVG
 * filters, which Safari draws at low resolution), and it is baked into the image, so it costs
 * nothing per frame. The gradient spans the rig's whole canvas, so parts shade as one body.
 */
export function lightSvg(svg: string): string {
  const open = /<svg\b[^>]*>/.exec(svg);
  const end = svg.lastIndexOf('</svg>');
  const vb = open && /viewBox="([^"]+)"/.exec(open[0]);
  if (!open || end < 0 || !vb) return svg;
  const [x, y, w, h] = vb[1]!.trim().split(/[\s,]+/).map(Number) as [number, number, number, number];
  if (![x, y, w, h].every(Number.isFinite)) return svg;
  const L = palette.lighting;
  const box = `x="${x}" y="${y}" width="${w}" height="${h}"`;
  const [rx, ry] = L.rimOffset as [number, number];
  const inner = svg.slice(open.index + open[0].length, end);
  return `${svg.slice(0, open.index)}${open[0]}<defs>`
    + `<linearGradient id="lit-g" gradientUnits="userSpaceOnUse" x1="${x + w * 0.62}" y1="${y}" x2="${x + w * 0.38}" y2="${y + h}">`
    + `<stop offset="0.12" stop-color="${L.light}" stop-opacity="${L.lightOpacity}"/><stop offset="0.5" stop-color="${L.light}" stop-opacity="0"/>`
    + `<stop offset="0.56" stop-color="${L.shade}" stop-opacity="0"/><stop offset="1" stop-color="${L.shade}" stop-opacity="${L.shadeOpacity}"/></linearGradient>`
    + `<mask id="lit-a" maskUnits="userSpaceOnUse" ${box} mask-type="alpha" style="mask-type:alpha"><use href="#lit-c"/></mask>`
    + `<mask id="lit-r" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#fff" mask="url(#lit-a)"/>`
    + `<g transform="translate(${(rx * h).toFixed(2)} ${(ry * h).toFixed(2)})"><rect ${box} fill="#000" mask="url(#lit-a)"/></g></mask></defs>`
    + `<g id="lit-c">${inner}</g>`
    + `<rect ${box} fill="url(#lit-g)" mask="url(#lit-a)"/>`
    + `<rect ${box} fill="${L.rim}" opacity="${L.rimOpacity}" mask="url(#lit-r)"/></svg>`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${url}`));
    img.src = url;
  });
}

/** A bitmap with player colors swapped in and the tail tip drawn on, as a Blob URL. Done once per dragon look. */
async function tintBitmap(url: string, tint: BitmapTint): Promise<string> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const family = tint.finish ? familyMap(data.data) : null;
  recolorPixels(data.data, tint.primary, tint.secondary);
  if (tint.finish && family) applyFinish(data.data, canvas.width, family, tint.finish);
  ctx.putImageData(data, 0, 0);
  if (tint.tip) {
    const tip = await loadImage(tint.tip.url).catch(() => null);
    if (tip) {
      const w = tint.tip.width * canvas.width;
      const h = w * (tip.naturalHeight / tip.naturalWidth);
      ctx.save();
      ctx.translate(tint.tip.at[0] * canvas.width, tint.tip.at[1] * canvas.height);
      ctx.rotate((tint.tip.rotate * Math.PI) / 180);
      if (tint.ring) {
        // A hybrid: the tip glows in the second element's color.
        ctx.shadowColor = tint.ring;
        ctx.shadowBlur = w * palette.finishes.tipRing.blur;
        ctx.drawImage(tip, 0, -h, w, h);
        ctx.shadowBlur = 0;
      }
      ctx.drawImage(tip, 0, -h, w, h);
      ctx.restore();
    }
  }
  const glow = finishGlow(tint.finish);
  if (glow) {
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d')?.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur * canvas.width;
    ctx.drawImage(copy, 0, 0);
    ctx.shadowBlur = 0;
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob ? URL.createObjectURL(blob) : url;
}

/** URL for an art file, with colors swapped in. Null if the file is missing. Cached per file and colors. `lit` adds the lighting pass (SVG rig parts); `tint` recolors a bitmap. */
export function artUrl(file: string, colors: Record<string, string> = {}, lit = false, tint?: BitmapTint): Promise<string | null> {
  const path = `../../art/${file}`;
  const key = `${file}|${lit ? 'lit' : ''}|${tint ? JSON.stringify(tint) : ''}|${JSON.stringify(colors)}`;
  let hit = urlCache.get(key);
  if (!hit) {
    if (svgs[path] !== undefined) {
      const text = lit ? lightSvg(recolor(svgs[path]!, colors)) : recolor(svgs[path]!, colors);
      hit = Promise.resolve(URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' })));
    } else if (bitmaps[path]) {
      hit = bitmaps[path]!().then((url) => (tint ? tintBitmap(url, tint) : url)).catch(() => null);
    } else {
      hit = Promise.resolve(null);
    }
    urlCache.set(key, hit);
  }
  return hit;
}

/** True when the manifest names an art file that exists. */
export function hasArt(file: string): boolean {
  const path = `../../art/${file}`;
  return svgs[path] !== undefined || !!bitmaps[path];
}

const fill = (file: string, vars: RigVars) => file.replace(/\{(\w+)\}/g, (_, k: string) => (vars as Record<string, string | undefined>)[k] ?? '');

async function resolveParts(defs: PartDef[], colors: Record<string, string>, vars: RigVars, tint?: BitmapTint): Promise<Part[]> {
  return Promise.all(defs.map(async (d) => {
    const own = tint?.tip && d.tip ? { ...tint, tip: { url: tint.tip.url, at: d.tip.at, width: d.tip.width, rotate: d.tip.rotate ?? 0 } } : tint;
    const url = d.file ? await artUrl(fill(d.file, vars), colors, true, own) : null;
    const parts = d.parts ? await resolveParts(d.parts, colors, vars, tint) : [];
    return { id: d.id, url, pivot: d.pivot ?? [0.5, 0.5], anim: d.anim, parts, box: d.box };
  }));
}

/** Add an enemy's extra parts as children of the parts they hang from. */
function withExtras(parts: PartDef[], extras: (PartDef & { parent: string })[]): PartDef[] {
  const root = extras.filter((e) => e.parent === 'root');
  const walk = (ps: PartDef[]): PartDef[] => ps.map((p) => {
    const mine = extras.filter((e) => e.parent === p.id);
    const kids = p.parts ? walk(p.parts) : [];
    if (mine.length === 0 && !p.parts) return p;
    // A leaf that gains children keeps its own image, drawn under them.
    return { ...p, parts: [...kids, ...mine] };
  });
  return [...walk(parts), ...root];
}

const hasBody = (ps: Part[]): boolean => ps.some((p) => (p.id === 'body' && !!p.url) || hasBody(p.parts));

async function build(key: string, def: RigDef, colors: Record<string, string>, vars: RigVars, partDefs = def.parts, scale = def.boxScale ?? 1, tint?: BitmapTint): Promise<Rig | null> {
  const parts = await resolveParts(partDefs, colors, vars, tint);
  if (!hasBody(parts)) return null;
  return { key, size: def.size, boxScale: scale, points: def.points, parts };
}

/** Load a rig with its colors baked in. Null if the manifest has no such rig or its main body is missing. */
export async function loadRig(key: string, look?: DragonLook, vars: RigVars = {}): Promise<Rig | null> {
  const def = rigs[key];
  if (!def) return null;
  const dragon = def.tint === 'dragon' && look ? look : null;
  const colors = dragon ? dragonColors(dragon) : {};
  const allVars = { element: look?.element, ...vars };
  // Painted dragons: the bitmap takes the player's colors and its element's tail tip.
  let tint: BitmapTint | undefined;
  if (dragon) {
    const tipUrl = def.tip ? await artUrl(fill(def.tip.file, allVars)) : null;
    tint = {
      primary: dragon.primary, secondary: dragon.secondary,
      tip: def.tip && tipUrl ? { url: tipUrl, at: def.tip.at, width: def.tip.width, rotate: def.tip.rotate ?? 0 } : undefined,
      ring: dragon.element2 ? gameData.elements.info[dragon.element2].color : undefined,
      finish: dragon.variant ?? undefined,
    };
  }
  return build(key, def, colors, allVars, def.parts, def.boxScale ?? 1, tint);
}

/** An enemy's rig: its own (bosses) or a shared body plan in its colors with its extras. */
export async function loadEnemyRig(enemyId: string): Promise<Rig | null> {
  const own = rigs[`enemy.${enemyId}`];
  if (own) return build(`enemy.${enemyId}`, own, {}, {});
  const look = enemyLooks[enemyId];
  const plan = look ? rigs[look.rig] : undefined;
  if (!look || !plan) return null;
  return build(`enemy.${enemyId}`, plan, enemyColors(look.colors), {}, withExtras(plan.parts, look.extras ?? []), (plan.boxScale ?? 1) * (look.scale ?? 1));
}

/** Rider weapon art from the equipped weapon's type. */
export function weaponArt(type: 'melee' | 'ranged' | 'magic'): string {
  return type === 'ranged' ? 'bow' : type === 'magic' ? 'staff' : 'sword';
}

export async function loadBackdrop(zone: string): Promise<Backdrop | null> {
  const def = backdrops[zone];
  if (!def) return null;
  const layers = await Promise.all(def.layers.map(async (l) => ({ url: await artUrl(l.file), anim: l.anim, front: l.front })));
  const ok = layers.filter((l): l is { url: string; anim: string | undefined; front: boolean | undefined } => !!l.url);
  return ok.length ? { layers: ok, ambient: def.ambient } : null;
}

export interface Effects {
  slash: string | null; spark: string | null; puff: string | null;
  /** Breath per element, for hybrids and a second dragon of another element. */
  puffs?: Partial<Record<ElementId, string | null>>;
}

export async function loadEffects(element: ElementId, others: ElementId[] = []): Promise<Effects> {
  const [main, ...rest] = await Promise.all([element, ...others].map((el) => loadEffectsFor(el)));
  const puffs: Partial<Record<ElementId, string | null>> = { [element]: main!.puff };
  others.forEach((el, i) => { puffs[el] = rest[i]!.puff; });
  return { ...main!, puffs };
}

async function loadEffectsFor(element: ElementId): Promise<Effects> {
  const breath = breathColors(element);
  // An element with its own painted breath uses it; otherwise the shared puff is recolored
  // (an SVG puff swaps its gray tokens, a painted one, red edge and gold middle, is recolored like a dragon).
  const own = effects.breath ? await artUrl(fill(effects.breath, { element })) : null;
  const [slash, spark, puff] = await Promise.all([
    artUrl(effects.slash ?? ''), artUrl(effects.spark ?? ''),
    own ?? artUrl(effects.puff ?? '', breath, false, { primary: breath[palette.puffTokens.edge]!, secondary: breath[palette.puffTokens.mid]! }),
  ]);
  return { slash, spark, puff };
}

/** Every URL a rig uses, for preloading. */
export function rigUrls(rig: Rig | null): string[] {
  const out: string[] = [];
  const walk = (ps: Part[]) => ps.forEach((p) => { if (p.url) out.push(p.url); walk(p.parts); });
  if (rig) walk(rig.parts);
  return out;
}

/** Decode every image before the stage shows, so nothing pops in mid-attack. */
export async function decodeAll(urls: (string | null)[]): Promise<void> {
  await Promise.all(urls.filter((u): u is string => !!u).map(async (u) => {
    const img = new Image();
    img.src = u;
    try { await img.decode(); } catch { /* a broken image falls back to nothing; the stage still shows */ }
  }));
}
