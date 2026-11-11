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
  /** dragon: player colors. enemy: a body plan colored per enemy (see "enemies" in assets.json). */
  tint?: 'dragon' | 'enemy';
  /** Size on stage relative to the slot (1 = fills it). */
  boxScale?: number;
  points: Record<string, [number, number]>;
  parts: PartDef[];
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
}

export interface Rig {
  key: string;
  size: [number, number];
  boxScale: number;
  points: Record<string, [number, number]>;
  parts: Part[];
}

export interface Backdrop { layers: { url: string; anim?: string | undefined }[] }

export interface DragonLook { element: ElementId; primary: string; secondary: string }

/** Values filled into {name} placeholders in part file names. */
export interface RigVars { element?: string; weapon?: string }

const svgs = import.meta.glob('../../art/**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bitmaps = import.meta.glob('../../art/**/*.{webp,png}', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;

const m = manifest as unknown as {
  rigs: Record<string, RigDef>;
  enemies?: Record<string, EnemyLook>;
  backdrops: Record<string, { layers: { file: string; anim?: string }[] }>;
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

/** True when the manifest names an art file that exists. */
export function hasArt(file: string): boolean {
  const path = `../../art/${file}`;
  return svgs[path] !== undefined || !!bitmaps[path];
}

const fill = (file: string, vars: RigVars) => file.replace(/\{(\w+)\}/g, (_, k: string) => (vars as Record<string, string | undefined>)[k] ?? '');

async function resolveParts(defs: PartDef[], colors: Record<string, string>, vars: RigVars): Promise<Part[]> {
  return Promise.all(defs.map(async (d) => {
    const url = d.file ? await artUrl(fill(d.file, vars), colors) : null;
    const parts = d.parts ? await resolveParts(d.parts, colors, vars) : [];
    return { id: d.id, url, pivot: d.pivot ?? [0.5, 0.5], anim: d.anim, parts };
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

async function build(key: string, def: RigDef, colors: Record<string, string>, vars: RigVars, partDefs = def.parts, scale = def.boxScale ?? 1): Promise<Rig | null> {
  const parts = await resolveParts(partDefs, colors, vars);
  if (!hasBody(parts)) return null;
  return { key, size: def.size, boxScale: scale, points: def.points, parts };
}

/** Load a rig with its colors baked in. Null if the manifest has no such rig or its main body is missing. */
export async function loadRig(key: string, look?: DragonLook, vars: RigVars = {}): Promise<Rig | null> {
  const def = rigs[key];
  if (!def) return null;
  const colors = def.tint === 'dragon' && look ? dragonColors(look) : {};
  return build(key, def, colors, { element: look?.element, ...vars });
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
