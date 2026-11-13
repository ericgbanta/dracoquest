import { useCallback, useMemo, useState } from 'preact/hooks';
import {
  deleteSlot as removeSlot, listSlots, loadSave, newSave, readActiveSlot, SaveError, slotKey, writeActiveSlot, writeSave,
  type SaveData, type SaveStorage, type SlotSummary,
} from '../core/save';
import { browserStorage } from './storage';

export interface SaveApi {
  save: SaveData | null;
  /** Set when the stored save could not be read. The stored data is left untouched. */
  loadError: string | null;
  persistent: boolean;
  /** The saved game in play (1 to SLOT_COUNT). */
  slot: number;
  /** Every slot, for the saved games list. */
  slots: SlotSummary[];
  /** Apply a change and write it to storage immediately. */
  update(change: (s: SaveData) => SaveData): void;
  /** Replace the whole save (import or reset) and write it. */
  replace(next: SaveData): void;
  /** Play another slot. An empty slot starts a new game. */
  switchSlot(slot: number): void;
  /** Delete a slot that is not in play. */
  deleteSlot(slot: number): void;
  /** Start a new game in a slot, in play from now on. Anything stored there is deleted. */
  startNewGame(slot: number): void;
}

interface State {
  slot: number;
  save: SaveData | null;
  loadError: string | null;
}

function open(storage: SaveStorage, slot: number): State {
  // An empty slot stays empty until the first change, so opening the game
  // (or the main menu) never leaves a blank save behind.
  if (storage.getItem(slotKey(slot)) === null) return { slot, save: newSave(Date.now()), loadError: null };
  try {
    const loaded = loadSave(storage, Date.now(), slot);
    return { slot, save: writeSave(storage, loaded, Date.now(), slot), loadError: null };
  } catch (err) {
    const msg = err instanceof SaveError ? err.message : 'Unknown error reading the save';
    return { slot, save: null, loadError: msg };
  }
}

export function useSave(): SaveApi {
  const { storage, persistent } = useMemo(browserStorage, []);
  const [state, setState] = useState<State>(() => open(storage, readActiveSlot(storage)));
  // Bumped after any write that could change what the slot list shows.
  const [listVersion, setListVersion] = useState(0);
  const slots = useMemo(() => listSlots(storage), [storage, listVersion, state.save]);

  const replace = useCallback(
    (next: SaveData) => setState((prev) => ({ ...prev, save: writeSave(storage, next, Date.now(), prev.slot), loadError: null })),
    [storage],
  );

  const update = useCallback(
    (change: (s: SaveData) => SaveData) =>
      setState((prev) => {
        const base = prev.save ?? newSave(Date.now());
        return { ...prev, save: writeSave(storage, change(base), Date.now(), prev.slot), loadError: null };
      }),
    [storage],
  );

  const switchSlot = useCallback(
    (slot: number) => {
      writeActiveSlot(storage, slot);
      setState(open(storage, slot));
      setListVersion((v) => v + 1);
    },
    [storage],
  );

  const deleteSlot = useCallback(
    (slot: number) => {
      removeSlot(storage, slot);
      setListVersion((v) => v + 1);
    },
    [storage],
  );

  const startNewGame = useCallback(
    (slot: number) => {
      storage.removeItem(slotKey(slot));
      writeActiveSlot(storage, slot);
      setState({ slot, save: newSave(Date.now()), loadError: null });
      setListVersion((v) => v + 1);
    },
    [storage],
  );

  return { ...state, persistent, slots, update, replace, switchSlot, deleteSlot, startNewGame };
}
