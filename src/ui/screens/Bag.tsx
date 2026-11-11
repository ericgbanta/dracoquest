import { gameData as data } from '../../core/data';
import { spendRiderPoint } from '../../core/game';
import { riderMaxHp, riderMaxMp } from '../../core/characters';
import { xpToNext } from '../../core/progression';
import type { SaveData } from '../../core/save';
import { RIDER_STATS, type RiderStat } from '../../core/types';
import { Bar } from '../bits';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

const STAT_INFO: Record<RiderStat, { name: string; drives: string }> = {
  strength: { name: 'Strength', drives: 'Weapon damage' },
  agility: { name: 'Agility', drives: 'Accuracy, crits, turn order' },
  arcana: { name: 'Arcana', drives: 'Spell power and MP' },
  vigor: { name: 'Vigor', drives: 'HP and defense' },
};

export function Bag({ save, update }: Props) {
  const r = save.rider;
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Bag</h1><span class="gold" data-testid="gold">🪙 {r.gold}</span></header>
      <div class="card">
        <h2>{r.name} <span class="muted">· Rider level {r.level}</span></h2>
        <Bar kind="hp" value={r.hp} max={riderMaxHp(data, r)} label="HP" />
        <Bar kind="mp" value={r.mp} max={riderMaxMp(data, r)} label="MP" />
        <Bar kind="xp" value={r.xp} max={xpToNext(data.progression, r.level)} label="XP" />
      </div>
      <div class="card">
        <h2>Stats {r.statPoints > 0 && <span class="pill" data-testid="rider-points">{r.statPoints} to spend</span>}</h2>
        {RIDER_STATS.map((k) => (
          <div key={k} class="stat-row">
            <div><strong>{STAT_INFO[k].name}</strong> <span class="muted">{STAT_INFO[k].drives}</span></div>
            <span class="stat-value">{r.stats[k]}</span>
            {r.statPoints > 0 && (
              <button type="button" class="icon-button plus" aria-label={`Add a point to ${STAT_INFO[k].name}`}
                onClick={() => update((s) => spendRiderPoint(s, k))} data-testid={`rider-plus-${k}`}>+</button>
            )}
          </div>
        ))}
      </div>
      <div class="card">
        <h2>Items</h2>
        {data.items.map((item) => (
          <div key={item.id} class="stat-row">
            <div><span aria-hidden="true">{item.icon}</span> <strong>{item.name}</strong> <span class="muted">{item.description}</span></div>
            <span class="stat-value">×{r.inventory[item.id] ?? 0}</span>
          </div>
        ))}
        <p class="muted">Use items in battle from the Item button. A shop opens in town later.</p>
      </div>
      <div class="card">
        <h2>Gear</h2>
        <p class="muted">Ash Training Blade. It's mostly a stick, but a confident stick. Real gear arrives with the town shop.</p>
      </div>
    </section>
  );
}
