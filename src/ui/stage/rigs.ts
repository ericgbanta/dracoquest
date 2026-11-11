import manifest from '../../art/assets.json';
import palette from '../../art/palette.json';
import { gameData } from '../../core/data';
import type { ElementId } from '../../core/types';

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
}

export interface RigDef {
  size: [number, number];
  tint?: 'dragon';
  points: Record<string, [number, number]>;
  parts: PartDef[];
}

export interface Part {
  id: string;
  url: string | null;
  pivot: [number, number];
  anim?: string;
  parts: Part[];
}

export interface Rig {
  key: string;
  size: [number, number];
  points: Record<string, [number, number]>;
  parts: Part[];
}

export interface Backdrop { layers: { url: string; anim?: string | undefined }[] }

export interface DragonLook { element: ElementId; primary: string; secondary: string }

const svgs = import.meta.glob('../../art/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bitmaps = import.meta.glob('../../art/**/*.{webp,png}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;

const rigs = (manifest as unknown as { rigs: Record<string, RigDef> }).rigs;
const backdrops = (manifest as unknown as { backdrops: Record<string, { layers: { file: string; anim?: string }[] }> }).backdrops;
const effects = (manifest as unknown as { effects: Record<string, string> }).effects;

const urlCache = new Map<string, Promise<string | null>>();

/** Mix a hex color toward another by t (0 to 1). */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** The token-to-color map for a dragon's parts. */
export function dragonColors(look: DragonLook): Record<string, string> {
  const t = palette.dragonTokens;
  return {
    [t.primary]: look.primary,
    [t.primaryShade]: mix(look.primary, palette.outline, palette.shadeMix),
    [t.secondary]: look.secondary,
    [t.secondaryShade]: mix(look.secondary, palette.outline, palette.shadeMix),
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

/** URL for an art file, with colors swapped in. Null if the file is missing. Cached per file and colors. */
export function artUrl(file: string, colors: Record<string, string> = {}): Promise<string | null> {
  const path = `../../art/${file}`;
  const key = `${file}|${JSON.stringify(colors)}`;
  let hit = urlCache.get(key);
  if (!hit) {
    if (svgs[path] !== undefined) {
      const text = recolor(svgs[path]!, colors);
      hit = Promise.resolve(URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' })));
    } else if (bitmaps[path]) {
      hit = bitmaps[path]!().catch(() => null);
    } else {
      hit = Promise.resolve(null);
    }
    urlCache.set(key, hit);
  }
  return hit;
}

async function resolveParts(defs: PartDef[], colors: Record<string, string>, element?: ElementId): Promise<Part[]> {
  return Promise.all(defs.map(async (d) => {
    const file = d.file?.replace('{element}', element ?? '');
    const url = file ? await artUrl(file, colors) : null;
    const parts = d.parts ? await resolveParts(d.parts, colors, element) : [];
    return { id: d.id, url, pivot: d.pivot ?? [0.5, 0.5], anim: d.anim, parts };
  }));
}

/** Load a rig with its colors baked in. Null if the manifest has no such rig or its main body is missing. */
export async function loadRig(key: string, look?: DragonLook): Promise<Rig | null> {
  const def = rigs[key];
  if (!def) return null;
  const colors = def.tint === 'dragon' && look ? dragonColors(look) : {};
  const parts = await resolveParts(def.parts, colors, look?.element);
  const hasBody = (ps: Part[]): boolean => ps.some((p) => (p.id === 'body' && !!p.url) || hasBody(p.parts));
  if (!hasBody(parts)) return null;
  return { key, size: def.size, points: def.points, parts };
}

export async function loadBackdrop(zone: string): Promise<Backdrop | null> {
  const def = backdrops[zone];
  if (!def) return null;
  const layers = await Promise.all(def.layers.map(async (l) => ({ url: await artUrl(l.file), anim: l.anim })));
  const ok = layers.filter((l): l is { url: string; anim: string | undefined } => !!l.url);
  return ok.length ? { layers: ok } : null;
}

export interface Effects { slash: string | null; spark: string | null; puff: string | null }

export async function loadEffects(element: ElementId): Promise<Effects> {
  const [slash, spark, puff] = await Promise.all([
    artUrl(effects.slash ?? ''), artUrl(effects.spark ?? ''), artUrl(effects.puff ?? '', breathColors(element)),
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
