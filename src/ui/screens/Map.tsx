import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, startRun, zoneLock } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge, formatBonus, todayKey } from '../bits';
import { Sheet } from '../Sheet';
import { gearSummary } from './Town';
import type { UpcomingArea, ZoneData } from '../../core/types';
import { bountiesReady, storiesFor, storyProgress, storyStatus } from '../../core/adventures';
import { BountySheet, StorySheet } from './Adventures';
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
  const [sheet, setSheet] = useState<{ kind: 'story' | 'bounties'; zone: ZoneData } | null>(null);
  const today = todayKey();
  const teaser = data.regions.upcoming[0];
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Map</h1><span class="gold"><GoldButton amount={save.rider.gold} /></span></header>
      <a class="card town-card" href={href('town')} data-testid="go-town">
        <span class="care-icon" aria-hidden="true"><Icon name="town" fallback="🏘" size={32} /></span>
        <span><strong>Town</strong><span class="muted"> · Gear, potions, and dragon food</span></span>
      </a>
      {lowHp && <p class="notice notice--error">You're hurt. Rest at the Roost first, unless you like living dangerously.</p>}
      {dragon && dragon.hp <= 0 && <p class="notice notice--error">{dragon.name} is knocked out and will sit this run out. Rest to wake them.</p>}
      {data.regions.regions.map((region) => {
        const zones = region.zones.map((id) => data.zones.find((z) => z.id === id)!);
        const tease = teaser && teaser.region === region.id ? teaser : null;
        if (!zones.length && !tease) return null;
        return (
          <section key={region.id} class="region" aria-labelledby={`region-${region.id}`} data-testid={`region-${region.id}`}>
            <header class="region-head">
              <h2 id={`region-${region.id}`}>{region.name}</h2>
              <span class="muted">{region.levels} · {region.blurb}</span>
            </header>
            {zones.map((zone) => {
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
                      <AdventureButtons zone={zone} save={save} today={today} onOpen={(kind) => setSheet({ kind, zone })} />
                      <button type="button" class="button button--big button--block" onClick={() => update((s) => startRun(data, s, zone.id, today))}
                        data-testid={`start-${zone.id}`}>
                        Start a hunt
                      </button>
                    </>
                  )}
                </article>
              );
            })}
            {tease && <TeaserCard area={tease} save={save} />}
          </section>
        );
      })}
      {treasures && <Treasures zone={treasures} save={save} onClose={() => setTreasures(null)} />}
      {sheet?.kind === 'story' && <StorySheet zone={sheet.zone} save={save} update={update} today={today} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'bounties' && <BountySheet zone={sheet.zone} save={save} update={update} today={today} onClose={() => setSheet(null)} />}
    </section>
  );
}

/** Story and bounty buttons for a zone that has them. */
function AdventureButtons({ zone, save, today, onOpen }: { zone: ZoneData; save: SaveData; today: string; onOpen(kind: 'story' | 'bounties'): void }) {
  const story = storyProgress(data, save, zone.id);
  const hasBounties = !!data.bounties.pools[zone.id];
  if (!story.total && !hasBounties) return null;
  const pending = storiesFor(data, zone.id).some((q) => { const st = storyStatus(data, save, q); return st.state === 'done' && st.choicePending; });
  const ready = bountiesReady(data, save.bounties, zone.id, today);
  return (
    <div class="adventure-buttons">
      {story.total > 0 && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('story')} data-testid={`story-${zone.id}`}>
          Story {story.done} of {story.total}{pending ? ' · choose!' : ''}
        </button>
      )}
      {hasBounties && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('bounties')} data-testid={`bounties-${zone.id}`}
          aria-label={ready ? `Bounties, ${ready} ready to claim` : 'Bounties'}>
          Bounties{ready > 0 && <span class="count-pill" aria-hidden="true">{ready}</span>}
        </button>
      )}
    </div>
  );
}

/** The next area from the world plan, shown dimmed until it arrives. */
function TeaserCard({ area, save }: { area: UpcomingArea; save: SaveData }) {
  const gate = data.zones.find((z) => z.id === area.gate)!;
  const boss = data.enemies[gate.boss.enemy]!;
  const ready = save.rider.level >= area.minLevel && save.bossesDefeated.includes(gate.id);
  return (
    <article class="card zone zone--teaser" data-testid="zone-teaser">
      <h2><Icon name="lock" fallback="🔒" size={20} /> {area.name}</h2>
      <p class="muted">Levels {area.minLevel} to {area.maxLevel} · {area.elements.map((el) => <ElementBadge key={el} element={el} small />)}</p>
      <p>{area.blurb}</p>
      <p class="muted">
        {ready ? 'You are ready for it. ' : `Opens at level ${area.minLevel}, after you beat the ${boss.name}. `}
        Arrives in a future update.
      </p>
    </article>
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
