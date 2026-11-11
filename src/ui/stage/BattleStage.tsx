import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import layout from '../../data/stage.json';
import { gameData as data } from '../../core/data';
import { breathReady, intentOf, secondBreathReady, type BattleState, type Fighter } from '../../core/battle';
import { activeDragon, secondDragon } from '../../core/game';
import type { SaveData } from '../../core/save';
import type { DragonState, ElementId } from '../../core/types';
import { INTENTS } from '../bits';
import { DragonSprite, EnemySprite } from '../Sprites';
import { decodeAll, loadBackdrop, loadEffects, loadEnemyRig, loadRig, rigUrls, weaponArt, type Backdrop, type Effects, type Rig } from './rigs';
import { Stage, type Place, type StageFighter } from './Stage';

/** Everything one fight draws, loaded and decoded before the fighters show. */
interface BattleArt {
  key: string;
  backdrop: Backdrop | null;
  rider: Rig | null;
  lead: Rig | null;
  second: Rig | null;
  enemies: Record<string, Rig | null>;
  effects: Effects;
}

const none: Effects = { slash: null, spark: null, puff: null };
const look = (d: DragonState) => ({ element: d.element, primary: d.colors.primary, secondary: d.colors.secondary });
const lookKey = (d: DragonState | null) => (d ? `${d.element}.${d.stage}.${d.colors.primary}.${d.colors.secondary}` : '-');

function useBattleArt(zoneId: string, weapon: string, lead: DragonState | null, second: DragonState | null, enemyIds: string[]): BattleArt | null {
  const key = [zoneId, weapon, lookKey(lead), lookKey(second), ...enemyIds].join('|');
  const [art, setArt] = useState<BattleArt | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const ids = [...new Set(enemyIds)];
      const [backdrop, rider, leadRig, secondRig, effects, ...enemyRigs] = await Promise.all([
        loadBackdrop(zoneId),
        loadRig('rider', undefined, { weapon }),
        lead ? loadRig(`dragon.${lead.stage}`, look(lead)) : Promise.resolve(null),
        second ? loadRig(`dragon.${second.stage}`, look(second)) : Promise.resolve(null),
        loadEffects(lead?.element ?? 'fire'),
        ...ids.map((id) => loadEnemyRig(id)),
      ]);
      const enemies = Object.fromEntries(ids.map((id, i) => [id, enemyRigs[i] ?? null]));
      await decodeAll([
        ...(backdrop?.layers.map((l) => l.url) ?? []), ...rigUrls(rider), ...rigUrls(leadRig), ...rigUrls(secondRig),
        ...Object.values(enemies).flatMap(rigUrls), effects.puff, effects.slash, effects.spark,
      ]);
      if (live) setArt({ key, backdrop, rider, lead: leadRig, second: secondRig, enemies, effects });
    })();
    return () => { live = false; };
  }, [key]);
  return art;
}

interface Props {
  save: SaveData;
  battle: BattleState;
  zoneId: string;
  zoneElement: ElementId;
  target: string;
  onTarget(id: string): void;
  onDetails(id: string): void;
  header: ComponentChildren;
  paused: boolean;
  stageRef: Ref<HTMLDivElement>;
}

const parties = layout.layouts.party as Record<string, Record<string, Place>>;
const enemyPlaces = layout.layouts.enemies as Record<'one' | 'two', Place[]>;

/** A place resized by the rig's box scale, keeping its center and feet where they were. */
function sized(place: Place, rig: Rig | null): Place {
  const s = rig?.boxScale ?? 1;
  if (s === 1) return place;
  return { ...place, left: place.left + (place.width * (1 - s)) / 2, width: place.width * s };
}

const marks = (f: Fighter) => f.statuses.map((s) => ({ id: s.id, icon: data.statuses[s.id].icon, turns: s.turns }));

/** The battle stage for a real fight, plus the status strip with exact numbers under it. */
export function BattleStage({ save, battle, zoneId, zoneElement, target, onTarget, onDetails, header, paused, stageRef }: Props) {
  const lead = activeDragon(save);
  const two = battle.second ? secondDragon(save) : null;
  const ride = battle.mode === 'ride';
  const art = useBattleArt(zoneId, weaponArt(battle.weapon.type), lead, two, battle.enemies.map((e) => e.enemyId ?? ''));
  const ready = !!art;
  const party = parties[ride ? (two ? 'rideDuo' : 'ride') : (two ? 'duo' : 'solo')]!;
  const riderFallback = <RiderPlaceholder />;
  const dragonFallback = (d: DragonState) => <DragonSprite element={d.element} stage={d.stage} primary={d.colors.primary} secondary={d.colors.secondary} size={120} plain />;

  const fighters: StageFighter[] = [];
  if (two && battle.second && party.dragon2) {
    const f = battle.second.fighter;
    fighters.push({
      id: 'dragon2', place: sized(party.dragon2, art?.second ?? null), rig: art?.second ?? null, fallback: dragonFallback(two), name: two.name,
      hp: f.hp, maxHp: f.maxHp, facing: 'right', marks: marks(f), onTap: () => onDetails('dragon2'), tapLabel: `${two.name} details`, testid: 'stage-dragon2',
    });
  }
  if (ride) {
    fighters.push({
      id: 'rider', place: sized(party.rider!, art?.lead ?? null), rig: art?.lead ?? null, fallback: lead ? dragonFallback(lead) : riderFallback,
      mount: { rig: art?.rider ?? null, fallback: riderFallback }, name: battle.rider.name,
      hp: battle.rider.hp, maxHp: battle.rider.maxHp, facing: 'right', marks: marks(battle.rider), onTap: () => onDetails('rider'), tapLabel: `${battle.rider.name} details`, testid: 'stage-rider',
    });
  } else {
    if (lead && party.dragon) {
      fighters.push({
        id: 'dragon', place: sized(party.dragon, art?.lead ?? null), rig: art?.lead ?? null, fallback: dragonFallback(lead), name: lead.name,
        hp: battle.dragon?.hp ?? 0, maxHp: battle.dragon?.maxHp ?? 1, facing: 'right', marks: battle.dragon ? marks(battle.dragon) : [],
        onTap: () => onDetails('dragon'), tapLabel: `${lead.name} details`, testid: 'stage-dragon',
      });
    }
    fighters.push({
      id: 'rider', place: party.rider!, rig: art?.rider ?? null, fallback: riderFallback, name: battle.rider.name,
      hp: battle.rider.hp, maxHp: battle.rider.maxHp, facing: 'right', marks: marks(battle.rider), onTap: () => onDetails('rider'), tapLabel: `${battle.rider.name} details`, testid: 'stage-rider',
    });
  }
  const places = enemyPlaces[battle.enemies.length > 1 ? 'two' : 'one'];
  battle.enemies.forEach((e, i) => {
    const intent = e.hp > 0 ? intentOf(data, battle, e) : null;
    const enemyId = e.enemyId ?? '';
    fighters.push({
      id: e.id, place: sized(places[Math.min(i, places.length - 1)]!, art?.enemies[enemyId] ?? null), enemy: true, rig: art?.enemies[enemyId] ?? null,
      fallback: <EnemySprite enemyId={enemyId} element={e.element ?? data.enemies[enemyId]?.element ?? 'stone'} size={120} plain />,
      name: battle.enemies.length > 1 ? e.name : `${e.name} · Lv ${e.level}`, hp: e.hp, maxHp: e.maxHp, facing: 'left', marks: marks(e),
      intent: intent ? { kind: intent.kind, icon: INTENTS[intent.kind].icon, text: `${INTENTS[intent.kind].label}: ${intent.name}`, big: intent.kind === 'big' } : undefined,
      targeted: e.id === target && e.hp > 0, testid: `enemy-${e.id}`,
      // First tap targets; tapping the target again opens its details.
      onTap: () => (e.id === target ? onDetails(e.id) : onTarget(e.id)),
      tapLabel: e.id === target ? `${e.name} details` : `Target ${e.name}`,
    });
  });

  return (
    <>
      <div class="stage-box">
        <Stage stageRef={stageRef} backdrop={art?.backdrop ?? null} plainColor={data.elements.info[zoneElement].color}
          effects={art?.effects ?? none} fighters={fighters} header={header} paused={paused} loading={!ready} />
      </div>
      <StatusStrip save={save} battle={battle} />
    </>
  );
}

function StatusStrip({ save, battle }: { save: SaveData; battle: BattleState }) {
  const lead = activeDragon(save);
  const two = battle.second ? secondDragon(save) : null;
  const max = data.combat.breath.max;
  const ready = breathReady(data, battle);
  const ready2 = secondBreathReady(data, battle);
  const r = battle.rider;
  if (battle.mode === 'ride') {
    return (
      <div class="status-strip" data-testid="status-strip">
        <span class="who" data-testid="status-rider">{save.rider.name}<span class="pill">Riding</span></span>
        <StageBar kind="hp" value={r.hp} max={r.maxHp} label="HP" testid="status-rider-hp" />
        <StageBar kind="mp" value={r.mp} max={r.maxMp} label="MP" />
        <span class="who">{battle.ride?.dragonName ?? lead?.name}</span>
        <div class="span2"><StageBar kind="breath" value={battle.breath} max={max} label={ready ? 'Breath READY' : 'Breath'} numbers={false} /></div>
        {two && battle.second && <SecondRow name={two.name} battle={battle} ready={ready2} />}
      </div>
    );
  }
  const d = battle.dragon;
  const dragonUp = !!d && d.hp > 0;
  return (
    <div class="status-strip" data-testid="status-strip">
      <span class="who" data-testid="status-rider">{r.name}</span>
      <StageBar kind="hp" value={r.hp} max={r.maxHp} label="HP" testid="status-rider-hp" />
      <StageBar kind="mp" value={r.mp} max={r.maxMp} label="MP" />
      {lead && (
        <>
          <span class={`who${dragonUp ? '' : ' who--ko'}`} data-testid="status-dragon">{lead.name}{dragonUp ? '' : ' (KO)'}</span>
          <StageBar kind="hp" value={d?.hp ?? 0} max={d?.maxHp ?? 1} label="HP" />
          <StageBar kind="breath" value={battle.breath} max={max} label={ready ? 'Breath READY' : 'Breath'} numbers={false} />
        </>
      )}
      {two && battle.second && <SecondRow name={two.name} battle={battle} ready={ready2} />}
    </div>
  );
}

function SecondRow({ name, battle, ready }: { name: string; battle: BattleState; ready: boolean }) {
  const f = battle.second!.fighter;
  const up = f.hp > 0;
  return (
    <>
      <span class={`who${up ? '' : ' who--ko'}`} data-testid="second-card">{name}{up ? '' : ' (KO)'}</span>
      <StageBar kind="hp" value={f.hp} max={f.maxHp} label="HP" />
      <StageBar kind="breath" value={battle.second!.breath} max={data.combat.breath.max} label={ready ? 'READY' : 'Breath'} numbers={false} />
    </>
  );
}

export function StageBar({ kind, value, max, label, numbers = true, testid }: {
  kind: 'hp' | 'mp' | 'breath'; value: number; max: number; label: string; numbers?: boolean; testid?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div class={`sbar sbar--${kind}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} data-testid={testid}>
      <div class="sbar-fill" style={{ transform: `scaleX(${pct})` }} />
      <span class="sbar-text"><span>{label}</span>{numbers && <span>{Math.round(value)}/{max}</span>}</span>
    </div>
  );
}

export function RiderPlaceholder() {
  return (
    <svg viewBox="0 0 120 170" role="img" aria-label="Rider">
      <circle cx="60" cy="40" r="20" fill="#f1c7a0" stroke="#1d1a2b" stroke-width="4" />
      <rect x="40" y="62" width="40" height="64" rx="10" fill="#2f8f6f" stroke="#1d1a2b" stroke-width="4" />
      <rect x="44" y="124" width="12" height="40" rx="4" fill="#3d4a6b" /><rect x="64" y="124" width="12" height="40" rx="4" fill="#3d4a6b" />
    </svg>
  );
}
