import { useEffect, useState } from 'preact/hooks';
import manifest from '../art/assets.json';

// Vite finds every WebP in /src/art. Each one loads on demand, so a zone only fetches its own sprites.
const files = import.meta.glob('../art/**/*.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;
const sprites = (manifest as { sprites: Record<string, string> }).sprites;
const cache = new Map<string, string | null>();

/** URL for a sprite key from assets.json, or null if the key or file is missing. */
export function useSprite(key: string): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(key) ?? null);
  useEffect(() => {
    if (cache.has(key)) {
      setUrl(cache.get(key) ?? null);
      return;
    }
    const file = sprites[key];
    const loader = file ? files[`../art/${file}`] : undefined;
    if (!loader) {
      cache.set(key, null);
      setUrl(null);
      return;
    }
    let live = true;
    loader()
      .then((u) => { cache.set(key, u); if (live) setUrl(u); })
      .catch(() => { cache.set(key, null); if (live) setUrl(null); });
    return () => { live = false; };
  }, [key]);
  return url;
}
