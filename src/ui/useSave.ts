import { useCallback, useMemo, useState } from 'preact/hooks';
import { loadSave, newSave, SaveError, writeSave, type SaveData } from '../core/save';
import { browserStorage } from './storage';

export interface SaveApi {
  save: SaveData | null;
  /** Set when the stored save could not be read. The stored data is left untouched. */
  loadError: string | null;
  persistent: boolean;
  /** Apply a change and write it to storage immediately. */
  update(change: (s: SaveData) => SaveData): void;
  /** Replace the whole save (import or reset) and write it. */
  replace(next: SaveData): void;
}

export function useSave(): SaveApi {
  const { storage, persistent } = useMemo(browserStorage, []);
  const [state, setState] = useState<{ save: SaveData | null; loadError: string | null }>(() => {
    try {
      const loaded = loadSave(storage, Date.now());
      return { save: writeSave(storage, loaded, Date.now()), loadError: null };
    } catch (err) {
      const msg = err instanceof SaveError ? err.message : 'Unknown error reading the save';
      return { save: null, loadError: msg };
    }
  });

  const replace = useCallback(
    (next: SaveData) => setState({ save: writeSave(storage, next, Date.now()), loadError: null }),
    [storage],
  );

  const update = useCallback(
    (change: (s: SaveData) => SaveData) =>
      setState((prev) => {
        const base = prev.save ?? newSave(Date.now());
        return { save: writeSave(storage, change(base), Date.now()), loadError: null };
      }),
    [storage],
  );

  return { ...state, persistent, update, replace };
}
