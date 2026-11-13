import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, canHaveSecond, canLayEgg, GameError, layEgg, growthStatus, learnDragonTalent, respecTalents, secondDragon, setLead, setSecond, spendDragonPoint, startGrowthQuest } from '../../core/game';
import { temperament, leaning } from '../../core/roost';
import { canLearn, dragonBonus, pointsInTree, respecCost, signatureSkill, talentPointsLeft } from '../../core/loadout';
import type { TalentTree } from '../../core/types';
import { formatBonus } from '../bits';
import { dragonMaxHp } from '../../core/characters';
import { dragonLevelCap, xpToNext } from '../../core/progression';
import type { SaveData } from '../../core/save';
import { DRAGON_STATS, type DragonStat } from '../../core/types';
import { DragonSprite } from '../Sprites';
import { Bar, ElementBadge, VariantBadge } from '../bits';
import { beats, defenseMultiplier } from '../../core/elements';
import { elementLabel, elementsOf } from '../../core/eggs';
import type { ElementId } from '../../core/types';
import { Embers, Gold } from '../Icon';
import { SubTabs, usePref } from '../Fold';

const DRAGON_TABS = ['overview', 'stats', 'talents'] as const;
type DragonTab = (typeof DRAGON_TABS)[number];

const names = (els: ElementId[]) => els.map((e) => data.elements.info[e].name).join(', ') || 'nothing';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

const STAT_INFO: Record<DragonStat, { name: string; drives: string }> = {
  might: { name: 'Might', drives: 'Claw and breath damage' },
  scale: { name: 'Scale', drives: 'HP and damage reduction' },
  swift: { name: 'Swift', drives: 'Turn order and dodge' },
  spirit: { name: 'Spirit', drives: 'Breath charge and status chance' },
};

export function Dragons({ save, update }: Props) {
  const lead = activeDragon(save);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [tab, setTab] = usePref<DragonTab>('dragons.tab', 'overview', DRAGON_TABS);
  if (!lead) return null;
  const d = save.dragons.find((x) => x.id === selectedId) ?? lead;
  const second = secondDragon(save);
  const isLead = d.id === lead.id;
  const isSecond = d.id === second?.id;
  const temper = temperament(data, d);
  const lean = leaning(d);
  const partnerAct = (fn: () => SaveData, ok: string) => {
    try { const next = fn(); update(() => next); setNotice(ok); } catch (e) { setNotice(e instanceof Error ? e.message : 'That did not work.'); }
  };
  const stage = data.dragons.stages.find((s) => s.id === d.stage);
  const atCap = d.level >= dragonLevelCap(data, d);
  const favoriteKnown = d.foodsTried.includes(d.favoriteFood);
  const favorite = data.foods.find((f) => f.id === d.favoriteFood);
  const strong = data.elements.ids.filter((e) => elementsOf(d).some((own) => beats(data.elements, own, e)));
  const weak = data.elements.ids.filter((e) => defenseMultiplier(data.elements, e, d) > data.elements.multipliers.neutral);
  const growth = growthStatus(data, d);
  const signature = signatureSkill(data, d);
  const nextStage = growth.next;

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Dragons</h1><span class="muted">{save.dragons.length} in the Nest</span></header>
      {save.dragons.length > 1 && (
        <div class="dragon-picker" role="tablist" aria-label="Your dragons">
          {save.dragons.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={x.id === d.id} class={`pick${x.id === d.id ? ' pick--on' : ''}`}
              onClick={() => { setSelectedId(x.id); setNotice(''); }} data-testid={`dpick-${x.name}`}>
              <DragonSprite element={x.element} element2={x.element2} variant={x.variant} stage={x.stage} primary={x.colors.primary} secondary={x.colors.secondary} size={40} />
              <span>{x.name}</span>
              {x.id === lead.id ? <span class="pick-tag">Lead</span> : x.id === second?.id ? <span class="pick-tag">Second</span> : x.assignment.kind !== 'idle' ? <span class="pick-tag">{x.assignment.kind === 'training' ? 'Training' : 'Away'}</span> : null}
            </button>
          ))}
        </div>
      )}
      <SubTabs id="dragons" label="Dragon sections" value={tab} onChange={(t) => { setTab(t); setNotice(''); }} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'stats', label: 'Stats', badge: d.statPoints },
        { id: 'talents', label: 'Talents', badge: talentPointsLeft(data, d) },
      ]} />
      {notice && <p class="notice notice--ok" role="status" data-testid="dragons-notice">{notice}</p>}
      {tab === 'overview' && save.dragons.length > 1 && (
        <div class="card partners">
          <h2>Battle partner</h2>
          <p class="muted">
            {isLead ? `${d.name} is your lead partner.` : isSecond ? `${d.name} fights beside your lead as second partner.` : `${d.name} is on the bench.`}
            {!canHaveSecond(data, save) && ` A second partner joins at rider level ${data.progression.secondPartnerRiderLevel}.`}
          </p>
          <div class="row wrap">
            {!isLead && <button type="button" class="button" data-testid="make-lead" onClick={() => partnerAct(() => setLead(data, save, d.id, Date.now()), `${d.name} is now your lead.`)}>Make lead</button>}
            {!isLead && !isSecond && canHaveSecond(data, save) && <button type="button" class="button button--ghost" data-testid="make-second" onClick={() => partnerAct(() => setSecond(data, save, d.id, Date.now()), `${d.name} joins as second partner.`)}>Make second</button>}
            {isSecond && <button type="button" class="button button--ghost" data-testid="bench" onClick={() => partnerAct(() => setSecond(data, save, null, Date.now()), `${d.name} heads to the bench.`)}>Bench</button>}
          </div>
        </div>
      )}
      {tab === 'overview' && <>
      <div class="card dragon-sheet">
        <DragonSprite element={d.element} element2={d.element2} variant={d.variant} stage={d.stage} primary={d.colors.primary} secondary={d.colors.secondary} size={140} class="idle" />
        <div>
          <h2>{d.name}</h2>
          <p class="muted">{stage?.name}{d.breed !== 'dragon' ? ` ${data.dragons.breeds[d.breed]?.name ?? ''}` : ''} · Level {d.level} <ElementBadge element={d.element} element2={d.element2} small /> {d.variant && <VariantBadge variant={d.variant} />}</p>
          <p class="muted">Breath is strong against {names(strong)}. Weak to {names(weak)}.</p>
          {signature && <p class="muted" data-testid="signature-skill">Signature skill, {signature.name}: {signature.description.replace(/^Signature skill: /, '')}</p>}
          <p class="muted">{temper ? `${data.roost.temperament.types[temper].name}: ${data.roost.temperament.types[temper].passive}.` : lean ? `Leaning ${data.roost.temperament.types[lean].name} (${data.roost.temperament.types[lean].from.toLowerCase()}).` : 'Temperament not settled yet.'}</p>
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
          {growth.ready && !isLead && <p class="muted">Make {d.name} your lead to start the quest.</p>}
          {growth.ready && isLead && (
            <button type="button" class="button button--big button--block" data-testid="start-growth"
              onClick={() => update((s) => startGrowthQuest(data, s))}>
              Start {data.quests[nextStage.quest ?? '']?.name}
            </button>
          )}
        </div>
      )}
      </>}
      {tab === 'stats' && <div class="card">
        <h2>Stats {d.statPoints > 0 && <span class="pill" data-testid="dragon-points">{d.statPoints} to spend</span>}</h2>
        {DRAGON_STATS.map((k) => (
          <div key={k} class="stat-row">
            <div><strong>{STAT_INFO[k].name}</strong> <span class="muted">{STAT_INFO[k].drives}</span></div>
            <span class="stat-value">{d.stats[k]}</span>
            {d.statPoints > 0 && (
              <button type="button" class="icon-button plus" aria-label={`Add a point to ${STAT_INFO[k].name}`}
                onClick={() => update((s) => spendDragonPoint(s, k, d.id))} data-testid={`dragon-plus-${k}`}>+</button>
            )}
          </div>
        ))}
      </div>}
      {tab === 'overview' && data.dragons.stages.findIndex((st) => st.id === d.stage) >= data.dragons.stages.findIndex((st) => st.id === data.dragons.eggLaying.stage) && (
        <div class="card" data-testid="egg-laying">
          <h2>Lay an egg</h2>
          {d.laidEgg ? (
            <p class="muted">{d.name} has laid its egg. Every Elder lays just one.</p>
          ) : (
            <>
              <p class="muted">Elders can lay one {elementLabel(data.elements, d)} egg in their life. Hatch it in the Hatchery.</p>
              <button type="button" class="button button--block" data-testid="lay-egg" disabled={!canLayEgg(data, save, d.id).ok}
                onClick={() => partnerAct(() => layEgg(data, save, d.id), `${d.name} laid an egg! It's waiting in your Bag.`)}>
                Lay an egg · <Embers amount={data.dragons.eggLaying.cost.embers} />
              </button>
            </>
          )}
        </div>
      )}
      {tab === 'talents' && <Talents save={save} update={update} dragonId={d.id} />}
      {tab === 'overview' && <div class="card">
        <h2>Favorite food</h2>
        <p>{favoriteKnown && favorite ? `${favorite.icon} ${favorite.name}. ${d.name} gets double bond from it.` : `Still a mystery. Tried ${d.foodsTried.length} of ${data.foods.length} foods.`}</p>
      </div>}
    </section>
  );
}

function Talents({ save, update, dragonId }: Props & { dragonId: string }) {
  const d = save.dragons.find((x) => x.id === dragonId) ?? activeDragon(save)!;
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
              onClick={() => act(() => update((s) => learnDragonTalent(data, s, t.id, d.id)))} data-testid={`learn-${t.id}`}>+</button>
          </div>
        );
      })}
      {bonus && <p class="muted">From talents: {bonus}.</p>}
      {anyLearned && (
        <button type="button" class="button button--ghost button--block" data-testid="respec" disabled={save.rider.gold < cost}
          onClick={() => {
            if (window.confirm(cost ? `Reset all talents for ${cost} gold?` : 'Reset all talents? This is your free respec for this life stage.')) {
              act(() => update((s) => respecTalents(data, s, d.id)));
            }
          }}>
          Reset talents {cost ? <>(<Gold amount={cost} />)</> : '(free this stage)'}
        </button>
      )}
    </div>
  );
}
