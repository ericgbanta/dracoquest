/**
 * Service worker registration for offline play. A new version waits until
 * the player taps Reload, so an update never interrupts a fight.
 */
import { useSyncExternalStore } from 'preact/compat';
import { registerSW } from 'virtual:pwa-register';

interface PwaState { offlineReady: boolean; needRefresh: boolean }

let state: PwaState = { offlineReady: false, needRefresh: false };
const listeners = new Set<() => void>();
let update: ((reload?: boolean) => Promise<void>) | undefined;

function set(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  for (const l of [...listeners]) l();
}

export function startPwa(): void {
  if (!('serviceWorker' in navigator)) return;
  update = registerSW({
    immediate: true,
    onNeedRefresh: () => set({ needRefresh: true }),
    onOfflineReady: () => set({ offlineReady: true }),
    onRegisteredSW: (_url, reg) => {
      // Check for a new version every hour, and whenever the app comes back to the front.
      if (!reg) return;
      setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) void reg.update().catch(() => undefined);
      });
    },
  });
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );
}

export function applyUpdate(): void {
  if (update) void update(true);
  else window.location.reload();
}

export function dismissOfflineReady(): void {
  set({ offlineReady: false });
}
