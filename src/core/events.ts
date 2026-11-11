/**
 * Seasonal events, checked against the device date. Each event has a
 * yearly gift and a few items the town only sells while it's on.
 */
import type { EventData, GameData } from './types';

/** "2026-11-11" → 1111, so dates compare as numbers within a year. */
const mmdd = (s: string) => Number(s.replace('-', ''));

/** The event running on a local date (YYYY-MM-DD), if any. Handles events that wrap past New Year. */
export function activeEvent(data: GameData, today: string): EventData | null {
  const d = mmdd(today.slice(5));
  for (const e of data.events) {
    const start = mmdd(e.start);
    const end = mmdd(e.end);
    const on = start <= end ? d >= start && d <= end : d >= start || d <= end;
    if (on) return e;
  }
  return null;
}

/**
 * A key for this year's run of an event. An event that wraps past New Year
 * counts as the year it started in, so its January days share December's key.
 */
export function eventKey(e: EventData, today: string): string {
  let year = Number(today.slice(0, 4));
  const wraps = mmdd(e.start) > mmdd(e.end);
  if (wraps && mmdd(today.slice(5)) <= mmdd(e.end)) year -= 1;
  return `${e.id}-${year}`;
}

/** Shop ids (gear or food) only sold during an event that isn't running today. */
export function eventOnlyIds(data: GameData, today: string): Set<string> {
  const active = activeEvent(data, today);
  const ids = new Set<string>();
  for (const e of data.events) if (e.id !== active?.id) for (const id of e.shop) ids.add(id);
  // Items some other event sells but the active one also sells stay available.
  for (const id of active?.shop ?? []) ids.delete(id);
  return ids;
}
