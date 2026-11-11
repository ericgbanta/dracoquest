import { gameData as data } from '../../core/data';
import { activeDragon, spendDragonPoint } from '../../core/game';
import { dragonMaxHp } from '../../core/characters';
import { dragonLevelCap, xpToNext } from '../../core/progression';
import type { SaveData } from '../../core/save';
import { DRAGON_STATS, type DragonStat } from '../../core/types';
import { DragonSprite } from '../Sprites';
import { Bar, ElementBadge } from '../bits';
import { beats, weaknessesOf } from '../../core/elements';
import type { ElementId } from '../../core/types';

const names = (els: ElementId[]) => els.map((e) => data.elements.info[e].name).join(', ') || 'nothing';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

const STAT_INFO: Record<DragonStat, { name: string; drives: string }> = {
  might: { name: 'Might', drives: 'Claw and breath damage' },
  scale: { name: 'Scale', drives: 'HP and damage reduction' },
  swift: { name: 'Swift', drives: 'Turn order and dodge' },
  spirit: { name: 'Spirit', drives: 'Breath charge and status chance' },
};

export function Dragons({ save, update }: Props) {
  const d = activeDragon(save);
  if (!d) return null;
  const stage = data.dragons.stages.find((s) => s.id === d.stage);
  const atCap = d.level >= dragonLevelCap(data, d);
  const favoriteKnown = d.foodsTried.includes(d.favoriteFood);
  const favorite = data.foods.find((f) => f.id === d.favoriteFood);
  const strong = data.elements.ids.filter((e) => beats(data.elements, d.element, e));
  const weak = weaknessesOf(data.elements, d.element);
  const nextStage = data.dragons.stages[data.dragons.stages.findIndex((s) => s.id === d.stage) + 1];

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Dragons</h1></header>
      <div class="card dragon-sheet">
        <DragonSprite element={d.element} stage={d.stage} primary={d.colors.primary} secondary={d.colors.secondary} size={140} class="idle" />
        <div>
          <h2>{d.name}</h2>
          <p class="muted">{stage?.name} · Level {d.level} <ElementBadge element={d.element} small /></p>
          <p class="muted">Breath is strong against {names(strong)}. Weak to {names(weak)}.</p>
        </div>
      </div>
      <div class="card">
        <Bar kind="hp" value={d.hp} max={dragonMaxHp(data, d)} label="HP" />
        <Bar kind="xp" value={d.xp} max={xpToNext(data.progression, d.level)} label={atCap ? `XP (max for a ${stage?.name})` : 'XP'} />
        <Bar kind="bond" value={d.bond} max={data.progression.bond.max} label="Bond" />
        <p class="muted">
          Combos unlock at bond {data.combat.combos.map((c) => c.bond).join(', ')}.
          {nextStage && ` Growing into a ${nextStage.name} needs level ${nextStage.minLevel} and bond ${nextStage.bond}.`}
        </p>
      </div>
      <div class="card">
        <h2>Stats {d.statPoints > 0 && <span class="pill" data-testid="dragon-points">{d.statPoints} to spend</span>}</h2>
        {DRAGON_STATS.map((k) => (
          <div key={k} class="stat-row">
            <div><strong>{STAT_INFO[k].name}</strong> <span class="muted">{STAT_INFO[k].drives}</span></div>
            <span class="stat-value">{d.stats[k]}</span>
            {d.statPoints > 0 && (
              <button type="button" class="icon-button plus" aria-label={`Add a point to ${STAT_INFO[k].name}`}
                onClick={() => update((s) => spendDragonPoint(s, k))} data-testid={`dragon-plus-${k}`}>+</button>
            )}
          </div>
        ))}
      </div>
      <div class="card">
        <h2>Favorite food</h2>
        <p>{favoriteKnown && favorite ? `${favorite.icon} ${favorite.name}. ${d.name} gets double bond from it.` : `Still a mystery. Tried ${d.foodsTried.length} of ${data.foods.length} foods.`}</p>
      </div>
    </section>
  );
}
