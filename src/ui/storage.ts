import { memoryStorage, type SaveStorage } from '../core/save';

/** localStorage when the browser allows it, otherwise an in-memory fallback. */
export function browserStorage(): { storage: SaveStorage; persistent: boolean } {
  try {
    const probe = '__dq_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { storage: window.localStorage, persistent: true };
  } catch {
    return { storage: memoryStorage(), persistent: false };
  }
}
