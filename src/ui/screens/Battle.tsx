import { useEffect, useRef, useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import {
  breathReady, comboAvailable, duoAvailable, intentOf, livingEnemies, secondBreathReady, skillReady,
  type BattleEvent, type BattleState, type DragonOrder, type Fighter, type Orders, type RiderOrder,
} from '../../core/battle';
import { activeDragon, canRide, leaveRun, playRound, secondDragon, startFight, type FightReport } from '../../core/game';
import { talentById } from '../../core/loadout';
import type { DialogueLine } from '../../core/types';
import { getZone } from '../../core/run';
import { weaknessesOf } from '../../core/elements';
import type { SaveData } from '../../core/save';
import { DragonSprite, EnemySprite } from '../Sprites';
import { Bar, ElementBadge, IntentChip, prefersReducedMotion, StatusChips, vibrate } from '../bits';
import { BattleStage } from '../stage/BattleStage';
import { react } from '../stage/choreo';
import { Sheet } from '../Sheet';
import { play } from '../sound';

interface Props {
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
  onExit(): void;
}

type RiderPick = { type: 'attack' } | { type: 'spell'; spell: string; target: 'rider' | 'dragon' | 'enemy' } | { type: 'item'; item: string } | { type: 'defend' } | { type: 'flee' } | { type: 'ride'; move: string };
type DragonPick = { type: 'claw' } | { type: 'breath' } | { type: 'guard' } | { type: 'combo'; combo: string } | { type: 'skill'; skill: string } | { type: 'duo'; combo: string };

interface Float { id: number; target: string; text: string; kind: 'dmg' | 'heal' | 'miss' | 'crit' }

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function Battle({ save, update, onExit }: Props) {
  const run = save.run;
  const live = run?.battle ?? null;
  const [display, setDisplay] = useState<BattleState | null>(null);
  const [playing, setPlaying] = useState(false);
  const [report, setReport] = useState<FightReport | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [rider, setRider] = useState<RiderPick>({ type: 'attack' });
  const [dragonPick, setDragonPick] = useState<DragonPick>({ type: 'claw' });
  const [target, setTarget] = useState('e0');
  const [sheet, setSheet] = useState<'spell' | 'item' | 'skill' | 'skill2' | null>(null);
  const [secondPick, setSecondPick] = useState<DragonPick>({ type: 'claw' });
  const [lastPicks, setLastPicks] = useState<{ rider: RiderPick; dragon: DragonPick; second: DragonPick } | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const nodes = useRef(new Map<string, HTMLElement>());
  const floatId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const battle = display ?? live;
  const fast = save.settings.fastBattles;
  const simple = save.settings.simpleBattle;
  const zone = run ? getZone(data, run.zoneId) : null;

  // Start of a new fight: reset the log and orders.
  const battleKey = live ? `${run?.index}-${live.enemies.map((e) => e.enemyId).join()}` : '';
  useEffect(() => {
    if (!live) return;
    if (live.round === 1) {
      setLog([`${live.enemies.map((e) => e.name).join(' and ')} ${live.enemies.length > 1 ? 'appear' : 'appears'}!`]);
      setRider(live.mode === 'ride' ? { type: 'ride', move: 'dive' } : { type: 'attack' });
      setDragonPick({ type: 'claw' });
      setSecondPick({ type: 'claw' });
      setLastPicks(null);
    }
    setTarget(livingEnemies(live)[0]?.id ?? 'e0');
  }, [battleKey]);

  // Keep the target on a living enemy.
  useEffect(() => {
    if (battle && !livingEnemies(battle).some((e) => e.id === target)) setTarget(livingEnemies(battle)[0]?.id ?? 'e0');
  }, [battle, target]);

  if (!battle) {
    if (report) {
      const onNext = () => {
        const next = run?.fights[run.index];
        // Bosses (Ride mode choice) and quest fights (dialogue) go through the interlude first.
        if (next && (next.kind === 'boss' || next.intro?.length)) setReport(null);
        else { update((s) => startFight(data, s)); setReport(null); }
      };
      return <Results save={save} report={report} update={update} onExit={onExit} onNext={onNext} />;
    }
    if (run) return <Interlude save={save} update={update} onExit={onExit} />;
    return null;
  }

  const dragonState = activeDragon(save);
  const second2 = secondDragon(save);
  const dragonUp = !!battle.dragon && battle.dragon.hp > 0;
  const comboPicked = dragonUp && dragonPick.type === 'combo';
  const ready = breathReady(data, battle);

  const secondUp = !!battle.second && battle.second.fighter.hp > 0;
  const ready2 = secondBreathReady(data, battle);
  const duoPicked = dragonPick.type === 'duo';

  const toDragonOrder = (pick: DragonPick, which: 'lead' | 'second'): DragonOrder => {
    const full = which === 'lead' ? ready : ready2;
    switch (pick.type) {
      case 'claw': return { type: 'claw', target };
      case 'breath': return full ? { type: 'breath', target } : { type: 'claw', target };
      case 'guard': return { type: 'guard' };
      case 'combo': return { type: 'combo', combo: pick.combo, target };
      case 'duo': return { type: 'duo', combo: pick.combo, target };
      case 'skill': return skillReady(battle, pick.skill, which) ? { type: 'skill', skill: pick.skill, target } : { type: 'claw', target };
    }
  };

  const buildOrders = (picks = { rider, dragon: dragonPick, second: secondPick }): Orders => {
    const rider = picks.rider;
    const dragonPick = picks.dragon;
    let r: RiderOrder;
    switch (rider.type) {
      case 'attack': r = { type: 'attack', target }; break;
      case 'spell': r = { type: 'spell', spell: rider.spell, target: rider.target === 'enemy' ? target : rider.target }; break;
      case 'item': r = { type: 'item', item: rider.item }; break;
      case 'ride': r = { type: 'ride', move: rider.move, target }; break;
      default: r = { type: rider.type };
    }
    const orders: Orders = { rider: r };
    if (dragonUp) orders.dragon = toDragonOrder(dragonPick, 'lead');
    if (secondUp) orders.second = toDragonOrder(picks.second, 'second');
    return orders;
  };

  const addFloat = (f: Omit<Float, 'id'>) => {
    const id = ++floatId.current;
    setFloats((all) => [...all, { ...f, id }]);
    window.setTimeout(() => setFloats((all) => all.filter((x) => x.id !== id)), fast ? 450 : 800);
  };

  const animate = (id: string, kind: 'hit' | 'heal' | 'act') => {
    const node = nodes.current.get(id);
    if (!node || prefersReducedMotion()) return;
    const frames: Record<string, Keyframe[]> = {
      hit: [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      heal: [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }],
      act: [{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }],
    };
    node.animate(frames[kind]!, { duration: fast ? 150 : 300, easing: 'ease-out' });
  };

  const go = async (repeat = false) => {
    if (playing || !live) return;
    const picks = repeat && lastPicks ? lastPicks : { rider, dragon: dragonPick, second: secondPick };
    setLastPicks(picks);
    const orders = buildOrders(picks);
    const result = playRound(data, save, orders);
    update(() => result.save);
    setPlaying(true);
    let view = structuredClone(live);
    setDisplay(view);
    const step = fast ? 150 : 300;
    for (const ev of result.events) {
      view = applyEvent(view, ev);
      setDisplay(view);
      setLog((l) => [...l, ev.text].slice(-40));
      playEvent(ev);
      await sleep(ev.t === 'end' ? step : step + (fast ? 50 : 120));
    }
    setPlaying(false);
    if (result.report) {
      setDisplay(null);
      setReport(result.report);
      if (result.report.outcome === 'lost') vibrate([80, 60, 80]);
    } else {
      setDisplay(null);
      // Breath used or no longer full: go back to Claw so nobody wastes a turn.
      if (dragonPick.type === 'breath' || dragonPick.type === 'combo' || dragonPick.type === 'skill' || dragonPick.type === 'duo') setDragonPick({ type: 'claw' });
      if (secondPick.type === 'breath' || secondPick.type === 'skill') setSecondPick({ type: 'claw' });
      if (rider.type === 'ride' && rider.move !== 'dive') setRider({ type: 'ride', move: 'dive' });
      else if (rider.type === 'item' && live.mode === 'ride') setRider({ type: 'ride', move: 'dive' });
      else if (rider.type === 'item' || rider.type === 'flee' || rider.type === 'spell') setRider({ type: 'attack' });
    }
  };

  const playEvent = (ev: BattleEvent) => {
    const sound = save.settings.sound;
    if (!simple && stageRef.current) {
      react(stageRef.current, ev, { fast, reduced: prefersReducedMotion() });
      if (ev.t === 'hit' && ev.crit) vibrate(40);
      const cue = ev.t === 'hit' ? (ev.crit ? 'crit' : 'hit') : ev.t === 'miss' ? 'miss' : ev.t === 'heal' ? 'heal' : null;
      if (cue) play(cue, sound);
      if (ev.t === 'ko') { play('ko', sound); vibrate([60, 40, 60]); }
      if (ev.t === 'end') play(ev.outcome === 'won' ? 'victory' : ev.outcome === 'lost' ? 'defeat' : 'tap', sound);
      return;
    }
    switch (ev.t) {
      case 'end':
        play(ev.outcome === 'won' ? 'victory' : ev.outcome === 'lost' ? 'defeat' : 'tap', sound);
        break;
      case 'hit':
        play(ev.crit ? 'crit' : 'hit', sound);
        animate(ev.actor, 'act');
        animate(ev.target, 'hit');
        addFloat({ target: ev.target, text: `${ev.crit ? '★' : ''}-${ev.amount}`, kind: ev.crit ? 'crit' : 'dmg' });
        if (ev.crit) vibrate(40);
        break;
      case 'dot':
        animate(ev.target, 'hit');
        addFloat({ target: ev.target, text: `-${ev.amount}`, kind: 'dmg' });
        break;
      case 'miss':
        play('miss', sound);
        animate(ev.actor, 'act');
        addFloat({ target: ev.target, text: 'Miss', kind: 'miss' });
        break;
      case 'heal':
        play('heal', sound);
        animate(ev.target, 'heal');
        addFloat({ target: ev.target, text: `+${ev.amount}`, kind: 'heal' });
        break;
      case 'ko':
        play('ko', sound);
        vibrate([60, 40, 60]);
        break;
    }
  };

  const reg = (id: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id); };
  const floatsFor = (id: string) => floats.filter((f) => f.target === id).map((f) => (
    <span key={f.id} class={`float float--${f.kind}`} aria-hidden="true">{f.text}</span>
  ));

  const fightNo = (run?.index ?? 0) + 1;
  const totalFights = run?.fights.length ?? 1;
  const kind = run?.fights[run.index]?.kind;
  const combos = data.combat.combos.filter((c) => comboAvailable(data, battle, c.id));
  const bestCombo = combos[combos.length - 1];
  const nextCombo = data.combat.combos.find((c) => battle.bond < c.bond);
  const duo = data.roost.duoCombos.find((c) => duoAvailable(data, battle, c.id));

  return (
    <section class={`battle${simple ? '' : ' battle--stage'}`} aria-label="Battle">
      <div class="battle-field">
      {simple ? (
        <>
      <header class="battle-header">
        <span>{zone?.name} · {kind === 'boss' ? 'Boss' : kind === 'mini' ? 'Mini-boss' : `Fight ${fightNo}/${totalFights}`} · Round {battle.round}</span>
        <button type="button" class="chip-button" aria-pressed={fast} onClick={() => update((s) => ({ ...s, settings: { ...s.settings, fastBattles: !s.settings.fastBattles } }))}>
          {fast ? '2x' : '1x'}
        </button>
      </header>

      <div class="enemies" data-count={battle.enemies.length}>
        {battle.enemies.map((e) => (
          <EnemyCard key={e.id} enemy={e} battle={battle} save={save} targeted={e.id === target}
            onTarget={() => e.hp > 0 && setTarget(e.id)} reg={reg(e.id)} floats={floatsFor(e.id)} />
        ))}
      </div>

      <div class={`party${battle.mode === 'ride' && !battle.second ? ' party--ride' : ''}${battle.second && battle.mode !== 'ride' ? ' party--three' : ''}`}>
        <div class="fighter" ref={reg('rider')}>
          {battle.mode === 'ride' && dragonState && (
            <div class="fighter-row">
              <DragonSprite element={dragonState.element} stage={dragonState.stage} primary={dragonState.colors.primary}
                secondary={dragonState.colors.secondary} size={48} />
              <span class="pill">Riding</span>
            </div>
          )}
          <div class="fighter-name">{battle.rider.name} <StatusChips statuses={battle.rider.statuses} /></div>
          <Bar kind="hp" value={battle.rider.hp} max={battle.rider.maxHp} label="HP" />
          <Bar kind="mp" value={battle.rider.mp} max={battle.rider.maxMp} label="MP" />
          {battle.mode === 'ride' && <Bar kind="breath" value={battle.breath} max={data.combat.breath.max} label={ready ? 'Breath READY' : 'Breath'} showNumbers={false} />}
          {floatsFor('rider')}
        </div>
        {dragonState && battle.mode !== 'ride' && (
          <div class={`fighter${dragonUp ? '' : ' fighter--ko'}`} ref={reg('dragon')}>
            <div class="fighter-row">
              <DragonSprite element={dragonState.element} stage={dragonState.stage} primary={dragonState.colors.primary}
                secondary={dragonState.colors.secondary} size={48} />
              <div class="fighter-name">{dragonState.name}{!dragonUp && ' (KO)'} {battle.dragon && <StatusChips statuses={battle.dragon.statuses} />}</div>
            </div>
            <Bar kind="hp" value={battle.dragon?.hp ?? 0} max={battle.dragon?.maxHp ?? 1} label="HP" />
            <Bar kind="breath" value={battle.breath} max={data.combat.breath.max} label={ready ? 'Breath READY' : 'Breath'} showNumbers={false} />
            {floatsFor('dragon')}
          </div>
        )}
        {battle.second && second2 && (
          <div class={`fighter${secondUp ? '' : ' fighter--ko'}`} ref={reg('dragon2')} data-testid="second-card">
            <div class="fighter-row">
              <DragonSprite element={second2.element} stage={second2.stage} primary={second2.colors.primary} secondary={second2.colors.secondary} size={40} />
              <div class="fighter-name">{second2.name}{!secondUp && ' (KO)'} <StatusChips statuses={battle.second.fighter.statuses} /></div>
            </div>
            <Bar kind="hp" value={battle.second.fighter.hp} max={battle.second.fighter.maxHp} label="HP" />
            <Bar kind="breath" value={battle.second.breath} max={data.combat.breath.max} label={ready2 ? 'READY' : 'Breath'} showNumbers={false} />
            {floatsFor('dragon2')}
          </div>
        )}
      </div>

        </>
      ) : (
        <BattleStage save={save} battle={battle} zoneId={run?.zoneId ?? ''} zoneElement={zone?.element ?? 'stone'} target={target}
          onTarget={(id) => setTarget(id)} onDetails={setDetail} paused={sheet !== null || detail !== null} stageRef={stageRef}
          header={(
            <header class="battle-header stage-header">
        <span>{zone?.name} · {kind === 'boss' ? 'Boss' : kind === 'mini' ? 'Mini-boss' : `Fight ${fightNo}/${totalFights}`} · Round {battle.round}</span>
        <button type="button" class="chip-button" aria-pressed={fast} onClick={() => update((s) => ({ ...s, settings: { ...s.settings, fastBattles: !s.settings.fastBattles } }))}>
          {fast ? '2x' : '1x'}
        </button>
            </header>
          )} />
      )}

      <button type="button" class={`log${logOpen ? ' log--open' : ''}`} onClick={() => setLogOpen(!logOpen)} aria-label="Combat log, tap to expand" aria-expanded={logOpen} data-testid="log">
        <span aria-live="polite">
          {(logOpen ? log : log.slice(-2)).map((line, i) => <span key={i} class="log-line">{line}</span>)}
        </span>
      </button>
      </div>

      <div class="actions" aria-label="Orders">
        {battle.mode === 'ride' ? (
          <div class="action-row" role="group" aria-label="Mounted">
            <span class="row-label">Ride</span>
            {data.combat.ride.moves.map((m) => {
              const blocked = m.kind === 'breath' && !ready;
              return (
                <Act key={m.id} label={m.name.replace('Diving ', '')} on={rider.type === 'ride' && rider.move === m.id} disabled={blocked || playing}
                  sub={m.kind === 'breath' ? (ready ? 'Ready!' : `${Math.round((battle.breath / data.combat.breath.max) * 100)}%`) : undefined}
                  onClick={() => setRider({ type: 'ride', move: m.id })} testid={`ride-${m.id}`} />
              );
            })}
            <Act label="Item" on={rider.type === 'item'} disabled={playing} onClick={() => setSheet('item')} testid="act-item"
              sub={rider.type === 'item' ? data.items.find((i) => i.id === rider.item)?.name : undefined} />
          </div>
        ) : (
        <>
        <div class={`action-row${comboPicked ? ' action-row--muted' : ''}`} role="group" aria-label="Rider">
          <span class="row-label">Rider</span>
          <Act label="Attack" on={rider.type === 'attack'} disabled={comboPicked || playing} onClick={() => setRider({ type: 'attack' })} testid="act-attack" />
          <Act label="Spell" on={rider.type === 'spell'} disabled={comboPicked || playing} onClick={() => setSheet('spell')} testid="act-spell"
            sub={rider.type === 'spell' ? data.combat.riderMoves.spells.find((s) => s.id === rider.spell)?.name : undefined} />
          <Act label="Item" on={rider.type === 'item'} disabled={comboPicked || playing} onClick={() => setSheet('item')} testid="act-item"
            sub={rider.type === 'item' ? data.items.find((i) => i.id === rider.item)?.name : undefined} />
          <Act label="Defend" on={rider.type === 'defend'} disabled={comboPicked || playing} onClick={() => setRider({ type: 'defend' })} testid="act-defend" />
          {battle.canFlee && <Act label="Flee" on={rider.type === 'flee'} disabled={comboPicked || playing} onClick={() => setRider({ type: 'flee' })} testid="act-flee" />}
        </div>
        {dragonUp ? (
          <div class="action-row" role="group" aria-label="Dragon">
            <span class="row-label">Dragon</span>
            <Act label="Claw" on={dragonPick.type === 'claw'} disabled={playing} onClick={() => setDragonPick({ type: 'claw' })} testid="act-claw" />
            <Act label="Breath" on={dragonPick.type === 'breath'} disabled={!ready || playing} onClick={() => setDragonPick({ type: 'breath' })}
              sub={ready ? 'Ready!' : `${Math.round((battle.breath / data.combat.breath.max) * 100)}%`} testid="act-breath" />
            <Act label="Guard" on={dragonPick.type === 'guard'} disabled={playing} onClick={() => setDragonPick({ type: 'guard' })} testid="act-guard" />
            {battle.skills.length > 0 && (
              <Act label="Skill" on={dragonPick.type === 'skill'} disabled={playing || !battle.skills.some((id) => skillReady(battle, id))}
                sub={dragonPick.type === 'skill' ? talentById(data, dragonPick.skill)?.name : undefined}
                onClick={() => setSheet('skill')} testid="act-skill" />
            )}
            {duo && (
              <Act label="Duo" sub={duo.name} on={duoPicked} disabled={playing} onClick={() => setDragonPick({ type: 'duo', combo: duo.id })} testid="act-duo" />
            )}
            {bestCombo ? (
              <Act label="Combo" sub={bestCombo.name} on={dragonPick.type === 'combo'} disabled={playing}
                onClick={() => setDragonPick({ type: 'combo', combo: bestCombo.id })} testid="act-combo" />
            ) : nextCombo ? (
              <Act label="Combo" sub={`Bond ${nextCombo.bond}`} on={false} disabled onClick={() => undefined} testid="act-combo" />
            ) : null}
          </div>
        ) : (
          <p class="muted ko-note">Your dragon is knocked out.{secondUp ? '' : ' You fight on alone at reduced power.'}</p>
        )}
        </>
        )}
        {secondUp && battle.second && (
          <div class={`action-row${duoPicked ? ' action-row--muted' : ''}`} role="group" aria-label="Second dragon">
            <span class="row-label">{second2?.name.slice(0, 7) ?? '2nd'}</span>
            <Act label="Claw" on={secondPick.type === 'claw'} disabled={playing || duoPicked} onClick={() => setSecondPick({ type: 'claw' })} testid="act2-claw" />
            <Act label="Breath" on={secondPick.type === 'breath'} disabled={!ready2 || playing || duoPicked} onClick={() => setSecondPick({ type: 'breath' })}
              sub={ready2 ? 'Ready!' : `${Math.round((battle.second.breath / data.combat.breath.max) * 100)}%`} testid="act2-breath" />
            <Act label="Guard" on={secondPick.type === 'guard'} disabled={playing || duoPicked} onClick={() => setSecondPick({ type: 'guard' })} testid="act2-guard" />
            {battle.second.skills.length > 0 && (
              <Act label="Skill" on={secondPick.type === 'skill'} disabled={playing || duoPicked || !battle.second.skills.some((id) => skillReady(battle, id, 'second'))}
                sub={secondPick.type === 'skill' ? talentById(data, secondPick.skill)?.name : undefined} onClick={() => setSheet('skill2')} testid="act2-skill" />
            )}
          </div>
        )}
        <div class="go-row">
          {lastPicks && (
            <button type="button" class="button button--ghost repeat" onClick={() => go(true)} disabled={playing} data-testid="repeat">Repeat</button>
          )}
          <button type="button" class="button button--go" onClick={() => go()} disabled={playing} data-testid="go">
            {playing ? '…' : 'Go!'}
          </button>
        </div>
      </div>

      {sheet === 'spell' && (
        <Sheet title="Spells" onClose={() => setSheet(null)}>
          <div class="list">
            {data.combat.riderMoves.spells.map((s) => {
              const afford = battle.rider.mp >= s.mp;
              if (s.kind === 'damage') {
                return (
                  <button key={s.id} type="button" class="list-button" disabled={!afford} data-testid={`spell-${s.id}`}
                    onClick={() => { setRider({ type: 'spell', spell: s.id, target: 'enemy' }); setSheet(null); }}>
                    {s.name} <span class="muted">· {s.mp} MP · hits the target</span>
                  </button>
                );
              }
              return [
                <button key={`${s.id}-r`} type="button" class="list-button" disabled={!afford} data-testid={`spell-${s.id}-rider`}
                  onClick={() => { setRider({ type: 'spell', spell: s.id, target: 'rider' }); setSheet(null); }}>
                  {s.name} on {battle.rider.name} <span class="muted">· {s.mp} MP</span>
                </button>,
                dragonUp && (
                  <button key={`${s.id}-d`} type="button" class="list-button" disabled={!afford}
                    onClick={() => { setRider({ type: 'spell', spell: s.id, target: 'dragon' }); setSheet(null); }}>
                    {s.name} on {battle.dragon?.name} <span class="muted">· {s.mp} MP</span>
                  </button>
                ),
              ];
            })}
          </div>
        </Sheet>
      )}
      {sheet === 'skill' && (
        <Sheet title="Talent skills" onClose={() => setSheet(null)}>
          <div class="list">
            {battle.skills.map((id) => {
              const t = talentById(data, id)!;
              const cd = battle.cooldowns[id] ?? 0;
              return (
                <button key={id} type="button" class="list-button" disabled={!skillReady(battle, id)} data-testid={`skill-${id}`}
                  onClick={() => { setDragonPick({ type: 'skill', skill: id }); setSheet(null); }}>
                  {t.name} <span class="muted">· {cd > 0 ? `ready in ${cd} round${cd === 1 ? '' : 's'}` : t.description.replace('Skill: ', '')}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
      {sheet === 'skill2' && battle.second && (
        <Sheet title={`${second2?.name ?? 'Second dragon'}'s skills`} onClose={() => setSheet(null)}>
          <div class="list">
            {battle.second.skills.map((id) => {
              const t = talentById(data, id)!;
              const cd = battle.second!.cooldowns[id] ?? 0;
              return (
                <button key={id} type="button" class="list-button" disabled={!skillReady(battle, id, 'second')} data-testid={`skill2-${id}`}
                  onClick={() => { setSecondPick({ type: 'skill', skill: id }); setSheet(null); }}>
                  {t.name} <span class="muted">· {cd > 0 ? `ready in ${cd} round${cd === 1 ? '' : 's'}` : t.description.replace('Skill: ', '')}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
      {detail && <FighterDetails id={detail} battle={battle} save={save} onClose={() => setDetail(null)} />}
      {sheet === 'item' && (
        <Sheet title="Items" onClose={() => setSheet(null)}>
          <div class="list">
            {data.items.map((item) => {
              const n = battle.inventory[item.id] ?? 0;
              const blocked = n <= 0 || (item.effect === 'healDragon' && !dragonUp && battle.mode !== 'ride');
              return (
                <button key={item.id} type="button" class="list-button" disabled={blocked} data-testid={`item-${item.id}`}
                  onClick={() => { setRider({ type: 'item', item: item.id }); setSheet(null); }}>
                  <span aria-hidden="true">{item.icon}</span> {item.name} ×{n} <span class="muted">· {item.description}</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
    </section>
  );
}

function applyEvent(state: BattleState, ev: BattleEvent): BattleState {
  const s = structuredClone(state);
  const find = (id: string): Fighter | null => (id === 'rider' ? s.rider : id === 'dragon' ? s.dragon : id === 'dragon2' ? s.second?.fighter ?? null : s.enemies.find((e) => e.id === id) ?? null);
  if (ev.t === 'hit' || ev.t === 'dot') {
    const f = find(ev.target);
    if (f) f.hp = Math.max(0, f.hp - ev.amount);
  } else if (ev.t === 'heal') {
    const f = find(ev.target);
    if (f) f.hp = Math.min(f.maxHp, f.hp + ev.amount);
  } else if (ev.t === 'mp') {
    s.rider.mp = Math.min(s.rider.maxMp, s.rider.mp + ev.amount);
  } else if (ev.t === 'shift') {
    const f = find(ev.actor);
    if (f) f.element = ev.element;
  }
  return s;
}

function Act({ label, sub, on, disabled, onClick, testid }: {
  label: string; sub?: string; on: boolean; disabled?: boolean; onClick(): void; testid: string;
}) {
  return (
    <button type="button" class={`act${on ? ' act--on' : ''}`} aria-pressed={on} disabled={disabled} onClick={onClick} data-testid={testid}>
      <span>{label}</span>
      {sub && <span class="act-sub">{sub}</span>}
    </button>
  );
}

function EnemyCard({ enemy, battle, save, targeted, onTarget, reg, floats }: {
  enemy: Fighter; battle: BattleState; save: SaveData; targeted: boolean; onTarget(): void;
  reg(el: HTMLElement | null): void; floats: preact.ComponentChildren;
}) {
  const data_ = data.enemies[enemy.enemyId!]!;
  const intent = enemy.hp > 0 ? intentOf(data, battle, enemy) : null;
  const known = (save.bestiary[data_.id]?.fought ?? 0) > 0;
  const weak = enemy.element ? weaknessesOf(data.elements, enemy.element, enemy.resist) : [];
  return (
    <button type="button" ref={reg} class={`enemy${targeted ? ' enemy--target' : ''}${enemy.hp <= 0 ? ' enemy--down' : ''}`}
      onClick={onTarget} aria-pressed={targeted} aria-label={`Target ${enemy.name}`} data-testid={`enemy-${enemy.id}`}>
      <span class="enemy-top">
        {intent ? <IntentChip kind={intent.kind} name={intent.name} /> : <span class="intent">Down</span>}
        {targeted && enemy.hp > 0 && <span class="target-mark" aria-hidden="true">◎ Target</span>}
      </span>
      <span class="enemy-body">
        <EnemySprite enemyId={data_.id} element={enemy.element ?? data_.element} size={battle.enemies.length > 1 ? 56 : 72} />
        <span class="enemy-info">
          <span class="enemy-name">{enemy.name} <span class="muted">Lv {enemy.level}</span></span>
          <span class="enemy-tags">
            {enemy.element && <ElementBadge element={enemy.element} small />}
            <span class="weak">{known ? (weak.length ? `Weak: ${weak.map((w) => data.elements.info[w].name).join(', ')}` : 'No weakness') : 'Weak: ?'}</span>
          </span>
          <StatusChips statuses={enemy.statuses} />
        </span>
      </span>
      <Bar kind="hp" value={enemy.hp} max={enemy.maxHp} label="HP" />
      {floats}
    </button>
  );
}

function Dialogue({ lines, save }: { lines: DialogueLine[]; save: SaveData }) {
  const dragon = activeDragon(save);
  const who = (l: DialogueLine) => (l.speaker === 'rider' ? save.rider.name : l.speaker === 'dragon' ? dragon?.name ?? 'Dragon' : '');
  return (
    <ul class="dialogue" data-testid="dialogue">
      {lines.map((l, i) => (
        <li key={i} class={l.speaker}>
          {l.speaker !== 'narrator' && <span class="speaker">{who(l)}</span>}
          {l.text}
        </li>
      ))}
    </ul>
  );
}

function Interlude({ save, update, onExit }: Props) {
  const run = save.run!;
  const next = run.fights[run.index];
  const quest = run.questId ? data.quests[run.questId] : undefined;
  const boss = next?.kind === 'boss';
  const bossName = boss ? data.enemies[next!.enemies[0]!.enemyId]!.name : '';
  const rideable = canRide(data, save);
  const label = boss ? `Face the ${bossName} on foot` : next?.kind === 'mini' ? 'Fight the mini-boss' : `Fight ${run.index + 1} of ${run.fights.length}`;
  return (
    <section class="screen interlude" aria-labelledby="interlude-title">
      <h1 id="interlude-title">{quest ? quest.name : getZone(data, run.zoneId).name}</h1>
      {quest && run.index === 0 && <p class="lead">{quest.description}</p>}
      {next?.intro && <Dialogue lines={next.intro} save={save} />}
      {!quest && <p>Run so far: +{run.totals.xp} XP, +{run.totals.gold} gold.</p>}
      <p class="muted">HP and MP carry over between fights. Rest at the Roost to heal.</p>
      {rideable && (
        <button type="button" class="button button--big button--block" onClick={() => update((s) => startFight(data, s, { ride: true }))} data-testid="ride-fight">
          Ride into battle against the {bossName}!
        </button>
      )}
      {boss && rideable && <p class="muted">Riding merges you and your dragon into one unit with combined HP and big mounted moves.</p>}
      <button type="button" class={`button ${rideable ? 'button--ghost' : 'button--big'} button--block`} onClick={() => update((s) => startFight(data, s))} data-testid="next-fight">{quest && !boss ? 'Continue' : label}</button>
      <button type="button" class="button button--ghost button--block" onClick={() => { update((s) => leaveRun(s)); onExit(); }} data-testid="leave-run">
        {quest ? 'Try again later' : 'Head home with your loot'}
      </button>
    </section>
  );
}

function Results({ save, report, update, onExit, onNext }: {
  save: SaveData; report: FightReport; update: Props['update']; onExit(): void; onNext(): void;
}) {
  const dragon = activeDragon(save);
  const r = report.rewards;
  const title = { won: report.runComplete ? (report.kind === 'boss' ? 'Boss defeated!' : report.kind === 'quest' ? 'Quest complete!' : 'Zone run cleared!') : 'Victory!', lost: 'Defeated...', fled: 'You got away' }[report.outcome];
  const home = () => { if (save.run) update((s) => leaveRun(s)); onExit(); };
  return (
    <section class="screen results" aria-labelledby="results-title">
      <h1 id="results-title" class={`results-title results-title--${report.outcome}`}>{title}</h1>
      {r && (
        <ul class="rewards">
          <li data-testid="reward-xp">+{r.xp} XP{report.wellKept ? ' (Well kept bonus!)' : ''}</li>
          <li>+{r.gold} gold</li>
          {Object.entries(r.drops).map(([id, n]) => {
            const item = data.items.find((i) => i.id === id);
            return <li key={id}>+{n} {item?.icon} {item?.name}</li>;
          })}
          {report.bondGained > 0 && dragon && <li>+{report.bondGained} bond with {dragon.name}</li>}
        </ul>
      )}
      {report.egg && <p class="notice notice--ok" data-testid="egg-drop">🥚 The boss dropped a {data.dragons.eggs[report.egg]?.name ?? `${data.elements.info[report.egg].name} egg`}! Incubate it in the Hatchery at the Roost.</p>}
      {report.embers ? <p class="notice notice--ok" data-testid="embers-reward">🔥 +{report.embers} embers</p> : null}
      {report.grewTo && dragon && (
        <>
          <Dialogue lines={Object.values(data.quests).find((q) => q.stage === report.grewTo)?.outro ?? []} save={save} />
          <div class="hatch-preview">
            <DragonSprite element={dragon.element} stage={dragon.stage} primary={dragon.colors.primary} secondary={dragon.colors.secondary} size={140} class="pop-in" />
          </div>
          <p class="notice notice--ok" data-testid="grew">{dragon.name} grew into a {data.dragons.stages.find((st) => st.id === report.grewTo)?.name}! {data.dragons.stages.find((st) => st.id === report.grewTo)?.unlocks.join(', ')} unlocked.</p>
        </>
      )}
      {report.riderLevelsGained > 0 && <p class="notice notice--ok" data-testid="level-up">{save.rider.name} reached level {save.rider.level}! Spend stat points in the Bag.</p>}
      {report.dragonLevelsGained > 0 && dragon && <p class="notice notice--ok">{dragon.name} reached level {dragon.level}! Spend stat points in Dragons.</p>}
      {report.outcome === 'lost' && <p>You limp back to the Roost. Everything you earned this run is safe. Rest up and try again.</p>}
      {report.outcome === 'fled' && <p>You escape back to the Roost with everything you earned so far.</p>}
      {report.outcome === 'won' && !report.runComplete ? (
        <>
          <button type="button" class="button button--big button--block" onClick={onNext} data-testid="continue">Keep going</button>
          <button type="button" class="button button--ghost button--block" onClick={home} data-testid="go-home">Head home</button>
        </>
      ) : (
        <button type="button" class="button button--big button--block" onClick={home} data-testid="go-home">Back to the Roost</button>
      )}
    </section>
  );
}

/** Details for a fighter, opened by tapping its plate on the stage. */
function FighterDetails({ id, battle, save, onClose }: { id: string; battle: BattleState; save: SaveData; onClose(): void }) {
  const f = id === 'rider' ? battle.rider : id === 'dragon' ? battle.dragon : id === 'dragon2' ? battle.second?.fighter ?? null : battle.enemies.find((e) => e.id === id) ?? null;
  if (!f) return null;
  const enemy = f.kind === 'enemy' && f.enemyId ? data.enemies[f.enemyId] : undefined;
  const known = enemy ? (save.bestiary[enemy.id]?.fought ?? 0) > 0 : false;
  const weak = enemy && f.element ? weaknessesOf(data.elements, f.element, f.resist) : [];
  const intent = enemy && f.hp > 0 ? intentOf(data, battle, f) : null;
  return (
    <Sheet title={`${f.name} · Lv ${f.level}`} onClose={onClose}>
      <div class="fighter-details" data-testid="fighter-details">
        {f.element && <p><ElementBadge element={f.element} /></p>}
        <Bar kind="hp" value={f.hp} max={f.maxHp} label="HP" />
        {f.maxMp > 0 && <Bar kind="mp" value={f.mp} max={f.maxMp} label="MP" />}
        {f.statuses.length > 0 ? <p><StatusChips statuses={f.statuses} /></p> : <p class="muted">No status effects.</p>}
        {enemy && <p>{known ? (weak.length ? `Weak to ${weak.map((w) => data.elements.info[w].name).join(', ')}.` : 'No weakness.') : 'Weakness unknown until you\'ve fought one.'}</p>}
        {intent && <p><IntentChip kind={intent.kind} name={intent.name} /></p>}
        {enemy && <p class="muted">{enemy.flavor}</p>}
      </div>
    </Sheet>
  );
}
