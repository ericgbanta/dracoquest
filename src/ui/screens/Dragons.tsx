import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, GameError, growthStatus, learnDragonTalent, respecTalents, spendDragonPoint, startGrowthQuest } from '../../core/game';
import { canLearn, dragonBonus, pointsInTree, respecCost, talentPointsLeft } from '../../core/loadout';
import type { TalentTree } from '../../core/types';
import { formatBonus } from '../bits';
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
  const growth = growthStatus(data, d);
  const nextStage = growth.next;

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
        <p class="muted">Combos unlock at bond {data.combat.combos.map((c) => c.bond).join(', ')}.</p>
      </div>
      {nextStage && (
        <div class={`card${growth.ready ? ' growth' : ''}`} data-testid="growth">
          <h2>Growing up: {nextStage.name}</h2>
          <ul class="checklist">
            <li class={growth.levelOk ? 'done' : ''}>{growth.levelOk ? '✓' : '○'} Reach level {stage?.maxLevel} (now {d.level})</li>
            <li class={growth.bondOk ? 'done' : ''}>{growth.bondOk ? '✓' : '○'} Bond {nextStage.bond} (now {d.bond})</li>
            <li>○ Finish the quest: {data.quests[nextStage.quest ?? '']?.name}</li>
          </ul>
          <p class="muted">Unlocks: {nextStage.unlocks.join(', ')}.</p>
          {growth.ready && (
            <button type="button" class="button button--big button--block" data-testid="start-growth"
              onClick={() => update((s) => startGrowthQuest(data, s))}>
              Start {data.quests[nextStage.quest ?? '']?.name}
            </button>
          )}
        </div>
      )}
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
      <Talents save={save} update={update} />
      <div class="card">
        <h2>Favorite food</h2>
        <p>{favoriteKnown && favorite ? `${favorite.icon} ${favorite.name}. ${d.name} gets double bond from it.` : `Still a mystery. Tried ${d.foodsTried.length} of ${data.foods.length} foods.`}</p>
      </div>
    </section>
  );
}

function Talents({ save, update }: Props) {
  const d = activeDragon(save)!;
  const [tree, setTree] = useState<TalentTree>('protection');
  const [notice, setNotice] = useState('');
  const left = talentPointsLeft(data, d);
  const isHatchling = data.dragons.stages.findIndex((s) => s.id === d.stage) < 1;
  if (isHatchling) {
    return (
      <div class="card">
        <h2>Talents</h2>
        <p class="muted">Five talent trees open when {d.name} grows into a Juvenile. Each level after that gives a talent point.</p>
      </div>
    );
  }
  const cost = respecCost(data, d);
  const anyLearned = Object.keys(d.talents).length > 0;
  const treeInfo = data.talents.trees.find((t) => t.id === tree)!;
  const bonus = formatBonus(dragonBonus(data, { talents: d.talents, equipment: {} }));
  const act = (fn: () => void) => {
    try { fn(); setNotice(''); } catch (e) { setNotice(e instanceof GameError || e instanceof RangeError ? e.message : 'That did not work.'); }
  };
  return (
    <div class="card">
      <h2>Talents {left > 0 && <span class="pill" data-testid="talent-points">{left} to spend</span>}</h2>
      <div class="tabs" role="tablist">
        {data.talents.trees.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tree === t.id} class={`tab-pill${tree === t.id ? ' tab-pill--on' : ''}`}
            onClick={() => setTree(t.id)} data-testid={`tree-${t.id}`}>{t.name} {pointsInTree(data, d, t.id) || ''}</button>
        ))}
      </div>
      <p class="muted">{treeInfo.focus}.</p>
      {notice && <p class="notice notice--error" role="alert">{notice}</p>}
      {data.talents.talents.filter((t) => t.tree === tree).map((t) => {
        const rank = d.talents[t.id] ?? 0;
        const check = canLearn(data, d, t.id);
        const locked = pointsInTree(data, d, t.tree) < t.tier;
        return (
          <div key={t.id} class={`talent${locked ? ' talent--locked' : ''}`}>
            <div>
              <strong>{t.name}</strong>{t.skill && <span class="pill pill--skill">Skill</span>}
              <span class="muted">{t.description}{locked ? ` Needs ${t.tier} points in ${treeInfo.name}.` : ''}</span>
            </div>
            <span class="rank">{rank}/{t.ranks}</span>
            <button type="button" class="icon-button plus" disabled={!check.ok} aria-label={`Learn ${t.name}`}
              onClick={() => act(() => update((s) => learnDragonTalent(data, s, t.id)))} data-testid={`learn-${t.id}`}>+</button>
          </div>
        );
      })}
      {bonus && <p class="muted">From talents: {bonus}.</p>}
      {anyLearned && (
        <button type="button" class="button button--ghost button--block" data-testid="respec" disabled={save.rider.gold < cost}
          onClick={() => {
            if (window.confirm(cost ? `Reset all talents for ${cost} gold?` : 'Reset all talents? This is your free respec for this life stage.')) {
              act(() => update((s) => respecTalents(data, s)));
            }
          }}>
          Reset talents {cost ? `(🪙 ${cost})` : '(free this stage)'}
        </button>
      )}
    </div>
  );
}
