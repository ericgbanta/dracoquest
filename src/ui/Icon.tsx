/**
 * Small UI icons from /src/art/icons (B5). Each falls back to the emoji it
 * replaces when the file is missing, so nothing blocks on art.
 */
const files = import.meta.glob('../art/icons/*.{svg,webp}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

/** A painted icon (WebP) wins over an older SVG of the same name. */
export function iconUrl(name: string): string | null {
  return files[`../art/icons/${name}.webp`] ?? files[`../art/icons/${name}.svg`] ?? null;
}

export function Icon({ name, fallback = '', size = 20, label }: { name: string; fallback?: string; size?: number; label?: string }) {
  const url = iconUrl(name);
  if (!url) return fallback ? <span class="icon-emoji" aria-hidden={label ? undefined : 'true'} aria-label={label}>{fallback}</span> : null;
  return <img class="icon" src={url} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : 'true'} draggable={false} />;
}

/** Gold with its coin icon, for prices and purses. */
export function Gold({ amount, size = 18 }: { amount: number | string; size?: number }) {
  return <span class="money"><Icon name="gold" fallback="🪙" size={size} />{amount}</span>;
}

/** Embers with their icon. */
export function Embers({ amount, size = 18 }: { amount: number | string; size?: number }) {
  return <span class="money"><Icon name="ember" fallback="🔥" size={size} />{amount}</span>;
}
