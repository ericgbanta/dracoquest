import { gameData } from '../core/data';
import type { ElementId, IntentKind, StatusId } from '../core/types';

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

const INTENTS: Record<IntentKind, { icon: string; label: string }> = {
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
      <span aria-hidden="true">{i.icon}</span> {i.label}: {name}
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
            <span aria-hidden="true">{d.icon}</span>{d.short} {s.turns}
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
