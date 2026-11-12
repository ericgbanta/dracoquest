import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, startRun, zoneLock } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge, formatBonus } from '../bits';
import { Sheet } from '../Sheet';
import { gearSummary } from './Town';
import type { ZoneData } from '../../core/types';
import { EnemySprite } from '../Sprites';
import { Scene, useBackdrop, useEnemyRig } from '../stage/Scene';
import type { ElementId } from '../../core/types';
import { href } from '../router';
import { Icon } from '../Icon';
import { GoldButton } from '../Wallet';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

export function MapScreen({ save, update }: Props) {
  const dragon = activeDragon(save);
  const lowHp = save.rider.hp < riderMaxHp(data, save.rider) * 0.5;
  const [treasures, setTreasures] = useState<ZoneData | null>(null);
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Map</h1><span class="gold"><GoldButton amount={save.rider.gold} /></span></header>
      <a class="card town-card" href={href('town')} data-testid="go-town">
        <span class="care-icon" aria-hidden="true"><Icon name="town" fallback="🏘" size={32} /></span>
        <span><strong>Town</strong><span class="muted"> · Gear, potions, and dragon food</span></span>
      </a>
      {lowHp && <p class="notice notice--error">You're hurt. Rest at the Roost first, unless you like living dangerously.</p>}
      {dragon && dragon.hp <= 0 && <p class="notice notice--error">{dragon.name} is knocked out and will sit this run out. Rest to wake them.</p>}
      {data.zones.map((zone) => {
        const boss = data.enemies[zone.boss.enemy]!;
        const lock = zoneLock(data, save, zone);
        const unlocked = bossUnlocked(zone, save.rider.level);
        const beaten = save.bossesDefeated.includes(zone.id);
        return (
          <article key={zone.id} class={`card zone${lock ? ' zone--locked' : ''}`} data-testid={`zone-${zone.id}`}>
            <ZoneBanner zoneId={zone.id} element={zone.element} bossId={boss.id} bossElement={boss.element} name={`${zone.name}, home of the ${boss.name}`} />
            <div class="zone-head">
              <div>
                <h2>{lock && <><Icon name="lock" fallback="🔒" size={20} /> </>}{zone.name}</h2>
                <p class="muted">Levels {zone.minLevel} to {zone.maxLevel} · <ElementBadge element={zone.element} small /></p>
              </div>
            </div>
            <p>{zone.blurb}</p>
            {lock ? (
              <p class="notice notice--error">{lock}.</p>
            ) : (
              <>
                <p class="muted">
                  {zone.fights.min} to {zone.fights.max} fights, then{' '}
                  {unlocked ? <strong>the {boss.name}{beaten ? ' (beaten!)' : ''}</strong> : `a mini-boss. The ${boss.name} shows up at rider level ${zone.boss.unlockRiderLevel}.`}
                  {zone.eggDrop && !beaten && ` The ${boss.name} guards a ${data.elements.info[zone.eggDrop.element].name} egg.`}
                </p>
                {save.rider.level < zone.minLevel - 1 && <p class="muted">Recommended level {zone.minLevel}. It's going to sting.</p>}
                <TreasureButton zone={zone} save={save} onOpen={() => setTreasures(zone)} />
                <button type="button" class="button button--big button--block" onClick={() => update((s) => startRun(data, s, zone.id))}
                  data-testid={`start-${zone.id}`}>
                  Start run
                </button>
              </>
            )}
          </article>
        );
      })}
      {treasures && <Treasures zone={treasures} save={save} onClose={() => setTreasures(null)} />}
    </section>
  );
}

/** Gear a zone hides: its set's pieces. */
function zoneTreasure(zone: ZoneData): string[] {
  return data.sets.filter((s) => s.zone === zone.id).flatMap((s) => s.pieces);
}

function TreasureButton({ zone, save, onOpen }: { zone: ZoneData; save: SaveData; onOpen(): void }) {
  const ids = zoneTreasure(zone);
  if (!ids.length) return null;
  const found = ids.filter((id) => save.rider.gear.includes(id)).length;
  return (
    <button type="button" class="button button--ghost button--block" onClick={onOpen} data-testid={`treasures-${zone.id}`}>
      Treasures: {found} of {ids.length} found
    </button>
  );
}

/** Where each piece of a zone's gear comes from, and what its set does. */
function Treasures({ zone, save, onClose }: { zone: ZoneData; save: SaveData; onClose(): void }) {
  const boss = data.enemies[zone.boss.enemy]!;
  const mini = data.enemies[zone.miniBoss.enemy]!;
  const source = (id: string) => {
    if (zone.boss.trophy?.gear === id) return `Dropped by the ${boss.name}.`;
    if (zone.miniBoss.trophy?.gear === id) return `Dropped by the ${mini.name}, the mini-boss.`;
    return 'Sometimes found after regular fights here.';
  };
  return (
    <Sheet title={`${zone.name} treasures`} onClose={onClose}>
      {data.sets.filter((s) => s.zone === zone.id).map((set) => (
        <div key={set.id} data-testid={`treasure-set-${set.id}`}>
          <h3>{set.name} set</h3>
          <p class="muted">{set.description} Its three weapons share one slot, so a full set is a weapon, the armor and the trinket.</p>
          {set.bonuses.map((b) => <p key={b.pieces} class="muted">{b.pieces} pieces: {formatBonus(b.bonus)}</p>)}
          {set.pieces.map((id) => {
            const g = data.gear[id]!;
            const owned = save.rider.gear.includes(id);
            return (
              <div key={id} class={`treasure-row${owned ? ' treasure-row--owned' : ''}`} data-testid={`treasure-${id}`}>
                <strong>{g.name}</strong>
                <span class="muted">Lv {g.level} · {gearSummary(g, false)}</span>
                <span class="muted">{owned ? 'Found.' : source(id)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </Sheet>
  );
}

/** A strip of the zone's backdrop with its boss standing on the right. Still, to save battery on a long list. */
function ZoneBanner({ zoneId, element, bossId, bossElement, name }: { zoneId: string; element: ElementId; bossId: string; bossElement: ElementId; name: string }) {
  const backdrop = useBackdrop(zoneId);
  const rig = useEnemyRig(bossId);
  return (
    <div class="zone-banner">
      <Scene backdrop={backdrop} plainColor={data.elements.info[element].color} still aspect="16 / 7" focus="center 78%" label={name}
        actors={[{ id: bossId, rig, fallback: <EnemySprite enemyId={bossId} element={bossElement} size={96} />, left: 62, bottom: 4, width: 34, facing: 'left' }]} />
    </div>
  );
}
