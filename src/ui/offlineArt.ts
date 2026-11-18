/**
 * Saves area art (enemies and zone backdrops) for offline play. The service
 * worker leaves this art out of the install and caches it on first view
 * (see vite.config.ts); this module fills the same cache ahead of time:
 * quietly for the areas that are open or coming up, or all of it from Settings.
 */
import { useEffect, useState } from 'preact/hooks';
import manifest from '../art/assets.json';
import { gameData } from '../core/data';
import { zoneEnemies, zonesToPrefetch } from '../core/offline';
import type { SaveData } from '../core/save';

/** Must match the runtime cache name in vite.config.ts. */
const CACHE = 'dracoquest-area-art';
const PARALLEL = 4;

// Only URL strings: nothing is downloaded until it is asked for.
const urls = import.meta.glob('../art/painted/{enemies,backdrops}/*.webp', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

interface Part { file?: string; parts?: Part[] }
const m = manifest as unknown as {
  rigs: Record<string, { parts?: Part[] }>;
  backdrops: Record<string, { layers: { file: string }[] }>;
};

function partFiles(parts: Part[] | undefined, out: string[]): string[] {
  for (const p of parts ?? []) {
    if (p.file) out.push(p.file);
    partFiles(p.parts, out);
  }
  return out;
}

const toUrl = (file: string) => urls[`../art/${file}`];

/** URLs of one area's backdrop and enemy art. */
export function areaArtUrls(zoneId: string): string[] {
  const files = (m.backdrops[zoneId]?.layers ?? []).map((l) => l.file);
  for (const id of zoneEnemies(gameData, zoneId)) partFiles(m.rigs[`enemy.${id}`]?.parts, files);
  return [...new Set(files.map(toUrl).filter((u): u is string => !!u))];
}

/** URLs of every enemy and backdrop image in the game. */
export const allAreaArtUrls = (): string[] => [...new Set(Object.values(urls))];

const supported = () => typeof caches !== 'undefined';
const path = (u: string) => new URL(u, location.href).pathname;

async function missing(list: string[]): Promise<string[]> {
  const cache = await caches.open(CACHE);
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  return list.filter((u) => !have.has(path(u)));
}

/** Download the URLs not yet saved, a few at a time. Returns how many failed. */
async function fill(list: string[], onStep?: () => void): Promise<number> {
  const cache = await caches.open(CACHE);
  const queue = [...list];
  let failed = 0;
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      try { await cache.add(u); } catch { failed++; }
      onStep?.();
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return failed;
}

/** Skip background downloads when offline or when the phone asks to save data. */
function quietOk(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return supported() && navigator.onLine && !conn?.saveData;
}

const fetched = new Set<string>();

/** Quietly save the art for open and upcoming areas, a few seconds after they change. */
export function useAreaArtPrefetch(save: SaveData | null): void {
  const key = save ? zonesToPrefetch(gameData, save).join(',') : '';
  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => {
      if (!quietOk()) return;
      const zones = key.split(',').filter((z) => !fetched.has(z));
      if (!zones.length) return;
      void missing(zones.flatMap(areaArtUrls))
        .then((list) => fill(list))
        .then((failed) => { if (!failed) for (const z of zones) fetched.add(z); })
        .catch(() => undefined);
    }, 4000);
    return () => clearTimeout(timer);
  }, [key]);
}

export interface ArtDownload {
  supported: boolean;
  total: number;
  /** How many are saved, or null while counting. */
  saved: number | null;
  busy: boolean;
  failed: number;
  start(): void;
}

/** State for the Settings button that saves every area's art. */
export function useArtDownload(): ArtDownload {
  const all = allAreaArtUrls();
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(0);
  useEffect(() => {
    if (!supported()) return;
    void missing(all).then((list) => setSaved(all.length - list.length)).catch(() => setSaved(0));
  }, []);
  const start = () => {
    if (busy || !supported()) return;
    setBusy(true);
    setFailed(0);
    void missing(all)
      .then((list) => {
        setSaved(all.length - list.length);
        return fill(list, () => setSaved((n) => (n ?? 0) + 1));
      })
      .then(async (f) => {
        setFailed(f);
        setSaved(all.length - (await missing(all)).length);
      })
      .catch(() => setFailed(all.length))
      .finally(() => setBusy(false));
  };
  return { supported: supported(), total: all.length, saved, busy, failed, start };
}
