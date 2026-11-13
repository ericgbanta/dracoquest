import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import manifest from '../../art/assets.json';
import { gameData as data } from '../../core/data';
import type { DragonState, ElementId } from '../../core/types';
import { DragonSprite } from '../Sprites';
import { artUrl, decodeAll, loadBackdrop, loadEnemyRig, loadRig, mix, rigUrls, type Backdrop, type Rig } from './rigs';
import { RigView } from './Stage';
import './stage.css';

/**
 * Scenes outside battle (B4): a painted backdrop with characters idling on it,
 * built from the same rigs as the battle stage. Still unless the idle loops run.
 */

const cache = new Map<string, unknown>();

/** Load something once per key, decode its images, and keep it for the session. */
function useLoaded<T>(key: string | null, load: () => Promise<T>, urls: (v: T) => (string | null)[]): T | null {
  const [value, setValue] = useState<T | null>(() => (key && cache.has(key) ? (cache.get(key) as T) : null));
  useEffect(() => {
    if (!key) { setValue(null); return; }
    if (cache.has(key)) { setValue(cache.get(key) as T); return; }
    let live = true;
    (async () => {
      const v = await load();
      await decodeAll(urls(v));
      cache.set(key, v);
      if (live) setValue(v);
    })();
    return () => { live = false; };
  }, [key]);
  return value;
}

export function useBackdrop(key: string | null): Backdrop | null {
  return useLoaded(key ? `bd:${key}` : null, () => loadBackdrop(key!), (b) => b?.layers.map((l) => l.url) ?? []);
}

type Look = Pick<DragonState, 'element' | 'stage' | 'colors'> & Partial<Pick<DragonState, 'element2' | 'variant'>>;
const lookOf = (d: Look) => ({ element: d.element, element2: d.element2 ?? null, variant: d.variant ?? null, primary: d.colors.primary, secondary: d.colors.secondary });
const lookKey = (d: Look) => `${d.stage}.${d.element}.${d.element2 ?? ''}.${d.variant ?? ''}.${d.colors.primary}.${d.colors.secondary}`;

export function useDragonRig(d: Look | null): Rig | null {
  const key = d ? `dragon:${lookKey(d)}` : null;
  return useLoaded(key, () => loadRig(`dragon.${d!.stage}`, lookOf(d!)), rigUrls);
}

/** Rigs for several dragons at once (the Roost), keyed together so hooks stay in order. */
export function useDragonRigs(ds: (Look & Pick<DragonState, 'id'>)[]): Record<string, Rig | null> {
  const key = ds.length ? `dragons:${ds.map((d) => `${d.id}.${lookKey(d)}`).join('|')}` : null;
  const v = useLoaded(key, async () => {
    const rigs = await Promise.all(ds.map((d) => loadRig(`dragon.${d.stage}`, lookOf(d))));
    return Object.fromEntries(ds.map((d, i) => [d.id, rigs[i] ?? null]));
  }, (m) => Object.values(m).flatMap(rigUrls));
  return v ?? {};
}

export function useRiderRig(weapon: string): Rig | null {
  return useLoaded(`rider:${weapon}`, () => loadRig(`rider.${weapon}`), rigUrls);
}

export function useEnemyRig(enemyId: string | null): Rig | null {
  return useLoaded(enemyId ? `enemy:${enemyId}` : null, () => loadEnemyRig(enemyId!), rigUrls);
}

export interface EggArt { egg: string | null; top: string | null; bottom: string | null; cracks: (string | null)[] }

/** The egg in its element's color, with cracks and the two halves for hatching. */
export function useEggArt(element: ElementId): EggArt | null {
  const eggs = (manifest as unknown as { eggs?: { egg: string; top: string; bottom: string; cracks: string[] } }).eggs;
  return useLoaded(eggs ? `egg:${element}` : null, async () => {
    const c = data.elements.info[element].color;
    const colors = { '#9a9a9a': c, '#6e6e6e': mix(c, '#1d1a2b', 0.25), '#d6d6d6': mix(c, '#ffffff', 0.55), '#b0b0b0': mix(c, '#ffffff', 0.3) };
    // A painted egg (red shell, gold spots) is recolored like a dragon; an SVG egg swaps its gray tokens.
    const tint = { primary: c, secondary: mix(c, '#ffffff', 0.55) };
    const [egg, top, bottom, ...cracks] = await Promise.all([
      artUrl(eggs!.egg, colors, false, tint), artUrl(eggs!.top, colors, false, tint), artUrl(eggs!.bottom, colors, false, tint), ...eggs!.cracks.map((f) => artUrl(f)),
    ]);
    return { egg, top, bottom, cracks };
  }, (a) => [a.egg, a.top, a.bottom, ...a.cracks]);
}

/** Idle speed by temperament: Bold moves quicker, Gentle slower. */
export const IDLE_PACE: Record<string, number> = { bold: 0.7, gentle: 1.45, clever: 1, proud: 1.15 };

export interface SceneActor {
  id: string;
  rig: Rig | null;
  fallback: ComponentChildren;
  /** Box in percent of the scene: left, bottom, width. */
  left: number;
  bottom: number;
  width: number;
  z?: number;
  facing?: 'right' | 'left';
  pace?: number;
  selected?: boolean;
  label?: string;
  onTap?(): void;
  testid?: string;
}

/** A backdrop with characters standing on it. The aspect is the scene's width to height. */
export function Scene({ backdrop, plainColor, actors, aspect = '16 / 11', focus = 'center', still, label, children }: {
  backdrop: Backdrop | null; plainColor?: string; actors: SceneActor[]; aspect?: string; focus?: string; still?: boolean; label?: string;
  children?: ComponentChildren;
}) {
  const plain = !backdrop && plainColor
    ? { background: `linear-gradient(#3d2f6e, #8a6aa8 72%, color-mix(in srgb, ${plainColor} 45%, #4a4458) 72%)` }
    : undefined;
  return (
    <div class={`stage scene${still ? ' stage--paused' : ''}`} style={{ aspectRatio: aspect }} role={label ? 'img' : undefined} aria-label={label}>
      <div class="stage-world" style={plain}>
        {backdrop?.layers.map((l, i) => (
          <img key={i} class={`stage-layer${l.front ? ' stage-layer--front' : ''}${l.anim && !still ? ` anim-${l.anim}` : ''}`} src={l.url} alt="" draggable={false} style={{ objectPosition: focus }} />
        ))}
        {actors.map((a) => {
          const w = a.width * (a.rig?.boxScale ?? 1);
          const style = {
            left: `${a.left + (a.width - w) / 2}%`, bottom: `${a.bottom}%`, width: `${w}%`, zIndex: a.z ?? 1,
            ...(a.pace ? { '--idle': a.pace } : {}),
          };
          const body = a.rig ? <RigView rig={a.rig} facing={a.facing ?? 'right'} /> : <div class="rig rig--fallback">{a.fallback}</div>;
          const cls = `actor scene-actor${a.selected ? ' actor--targeted' : ''}`;
          return a.onTap ? (
            <button key={a.id} type="button" class={cls} style={style} onClick={a.onTap} aria-label={a.label} aria-pressed={a.selected} data-testid={a.testid}>{body}</button>
          ) : (
            <div key={a.id} class={cls} style={style} data-testid={a.testid}>{body}</div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

/** A dragon actor, drawn from its rig or the placeholder shape. */
export function dragonFallback(d: Look) {
  return <DragonSprite element={d.element} element2={d.element2} variant={d.variant} stage={d.stage} primary={d.colors.primary} secondary={d.colors.secondary} size={120} plain />;
}
