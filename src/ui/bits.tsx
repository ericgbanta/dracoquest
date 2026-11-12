import { useEffect, useState } from 'preact/hooks';
import { gameData } from '../core/data';
import type { ElementId, IntentKind, StatusId, StoryReward } from '../core/types';
import { MATERIALS } from '../core/types';
import { Icon } from './Icon';

export function ElementBadge({ element, small }: { element: ElementId; small?: boolean }) {
  const info = gameData.elements.info[element];
  return (
    <span class={`badge${small ? ' badge--small' : ''}`} style={{ '--el': info.color }}>
      <span aria-hidden="true">{info.symbol}</span> {info.name}
    </span>
  );
}

export function Bar({ value, max, kind, label, showNumbers = true }: {
  value: number; max: number; kind: 'hp' | 'mp' | 'breath' | 'xp' | 'bond'; label: string; showNumbers?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div class={`bar bar--${kind}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <div class="bar-fill" style={{ width: `${pct}%` }} />
      <span class="bar-text">
        <span class="bar-label">{label}</span>
        {showNumbers && <span class="bar-num">{Math.round(value)}/{max}</span>}
      </span>
    </div>
  );
}

export const INTENTS: Record<IntentKind, { icon: string; label: string }> = {
  attack: { icon: '⚔', label: 'Attack' },
  big: { icon: '‼', label: 'Big attack' },
  buff: { icon: '▲', label: 'Buff' },
  heal: { icon: '✚', label: 'Heal' },
  shift: { icon: '⟳', label: 'Element shift' },
};

export function IntentChip({ kind, name }: { kind: IntentKind; name: string }) {
  const i = INTENTS[kind];
  return (
    <span class={`intent intent--${kind}`}>
      <Icon name={`intent-${kind}`} fallback={i.icon} /> {i.label}: {name}
    </span>
  );
}

export function StatusChips({ statuses }: { statuses: { id: StatusId; turns: number }[] }) {
  if (statuses.length === 0) return null;
  return (
    <span class="statuses">
      {statuses.map((s) => {
        const d = gameData.statuses[s.id];
        return (
          <span key={s.id} class={`status status--${d.kind}`} title={`${d.name}: ${d.description}`}>
            <Icon name={`status-${s.id}`} fallback={d.icon} />{d.short} {s.turns}
          </span>
        );
      })}
    </span>
  );
}

/** Local calendar date, used for daily care. */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const BONUS_LABELS: Record<string, [string, 'flat' | 'pct']> = {
  strength: ['Strength', 'flat'], agility: ['Agility', 'flat'], arcana: ['Arcana', 'flat'], vigor: ['Vigor', 'flat'],
  might: ['Might', 'flat'], scale: ['Scale', 'flat'], swift: ['Swift', 'flat'], spirit: ['Spirit', 'flat'],
  riderHp: ['HP', 'flat'], riderMp: ['MP', 'flat'], riderDefense: ['Defense', 'flat'], riderCrit: ['Crit', 'pct'],
  riderDamagePct: ['Rider damage', 'pct'], dragonHp: ['Dragon HP', 'flat'], dragonDefense: ['Dragon defense', 'flat'],
  dragonCrit: ['Dragon crit', 'pct'], dragonDodge: ['Dodge', 'flat'], clawPct: ['Claw', 'pct'], breathPct: ['Breath', 'pct'],
  breathPerRound: ['Breath/round', 'flat'], breathStatusChance: ['Breath status', 'pct'], strongBonus: ['Strong hits', 'pct'],
  guardReduction: ['Guard', 'pct'], healPct: ['Healing', 'pct'], comboPct: ['Combo', 'pct'], goldPct: ['Gold', 'pct'], dropPct: ['Drops', 'pct'],
};

/** "+2 Strength, +10 HP" */
export function formatBonus(b: Partial<Record<string, number>>): string {
  return Object.entries(b)
    .filter(([, v]) => v)
    .map(([k, v]) => {
      const [label, kind] = BONUS_LABELS[k] ?? [k, 'flat'];
      const n = kind === 'pct' ? `${Math.round((v ?? 0) * 1000) / 10}%` : `${v}`;
      return `+${n} ${label}`;
    })
    .join(', ');
}


/** The current time, refreshed every `ms` so countdowns move. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

/** "2h 15m", "40m", "under a minute" */
export function formatDuration(ms: number): string {
  const mins = Math.ceil(ms / 60_000);
  if (mins <= 0) return 'now';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "+120 gold, +2 embers, 2 Iron Ore, 2 Potions" for story and bounty rewards. */
export function rewardText(r: StoryReward): string {
  const parts: string[] = [];
  if (r.xp) parts.push(`+${r.xp} XP`);
  if (r.gold) parts.push(`+${r.gold} gold`);
  if (r.embers) parts.push(`+${r.embers} ember${r.embers === 1 ? '' : 's'}`);
  for (const m of MATERIALS) if (r.materials?.[m]) parts.push(`+${r.materials[m]} ${gameData.forge.materials[m].name}`);
  for (const [id, n] of Object.entries(r.items ?? {})) {
    const name = gameData.items.find((i) => i.id === id)?.name ?? gameData.foods.find((f) => f.id === id)?.name ?? id;
    parts.push(`+${n} ${name}`);
  }
  return parts.join(', ');
}
