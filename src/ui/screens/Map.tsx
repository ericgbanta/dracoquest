import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, startRun, zoneLock } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge, formatBonus, todayKey } from '../bits';
import { Sheet } from '../Sheet';
import { Fold, usePref } from '../Fold';
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
  // The region at the rider's level starts open; the others fold away.
  const here = [...data.regions.regions].reverse().find((r) => {
    const zs = data.zones.filter((z) => r.zones.includes(z.id));
    return zs.length > 0 && Math.min(...zs.map((z) => z.minLevel)) <= save.rider.level;
  })?.id ?? data.regions.regions[0]!.id;
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
          <Fold key={region.id} id={`map.${region.id}`} class="region-fold" testid={`region-${region.id}`} title={region.name}
            summary={zones.length ? `${region.levels} · ${zones.filter((z) => save.bossesDefeated.includes(z.id)).length} of ${zones.length} bosses beaten` : region.levels}
            forceOpen={region.id === here || zones.length === 0}>
            <p class="muted region-blurb">{region.blurb}</p>
            {zones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} save={save} today={today}
                onHunt={() => update((s) => startRun(data, s, zone.id, today))}
                onOpen={(kind) => (kind === 'treasures' ? setTreasures(zone) : setSheet({ kind, zone }))} />
            ))}
            {tease && <TeaserCard area={tease} save={save} />}
          </Fold>
        );
      })}
      {treasures && <Treasures zone={treasures} save={save} onClose={() => setTreasures(null)} />}
      {sheet?.kind === 'story' && <StorySheet zone={sheet.zone} save={save} update={update} today={today} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'bounties' && <BountySheet zone={sheet.zone} save={save} update={update} today={today} onClose={() => setSheet(null)} />}
    </section>
  );
}

/**
 * A zone on the Map. Zones at the rider's level are open, with the banner, details and adventure buttons;
 * the rest fold to one row with a quick Hunt button, so the Map stays short as the world grows.
 */
function ZoneCard({ zone, save, today, onHunt, onOpen }: {
  zone: ZoneData; save: SaveData; today: string; onHunt(): void; onOpen(kind: 'story' | 'bounties' | 'treasures'): void;
}) {
  const boss = data.enemies[zone.boss.enemy]!;
  const lock = zoneLock(data, save, zone);
  const unlocked = bossUnlocked(zone, save.rider.level);
  const beaten = save.bossesDefeated.includes(zone.id);
  const current = !lock && save.rider.level >= zone.minLevel - 1 && save.rider.level <= zone.maxLevel;
  const [pref, setPref] = usePref<'open' | 'closed' | 'auto'>(`fold.map.zone.${zone.id}`, 'auto', ['open', 'closed', 'auto']);
  const open = pref === 'auto' ? current : pref === 'open';
  const status = lock ? lock : beaten ? 'Boss beaten' : unlocked ? 'Boss ready' : '';
  return (
    <article class={`card zone${lock ? ' zone--locked' : ''}${open ? '' : ' zone--closed'}`} data-testid={`zone-${zone.id}`}>
      <div class="zone-row">
        <button type="button" class="fold-head zone-toggle" aria-expanded={open} onClick={() => setPref(open ? 'closed' : 'open')}
          data-testid={`fold-map.zone.${zone.id}`}>
          <span class="zone-title">
            <strong>{lock && <><Icon name="lock" fallback="🔒" size={18} /> </>}{zone.name}</strong>
            <span class="muted">Lv {zone.minLevel} to {zone.maxLevel}{status ? ` · ${status}` : ''}</span>
          </span>
          <span class="fold-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
        {!open && !lock && (
          <button type="button" class="button zone-hunt" onClick={onHunt} data-testid={`start-${zone.id}`}>Hunt</button>
        )}
      </div>
      {open && (
        <>
          <ZoneBanner zoneId={zone.id} element={zone.element} bossId={boss.id} bossElement={boss.element} name={`${zone.name}, home of the ${boss.name}`} />
          <p class="muted">{(zone.elements ?? [zone.element]).map((el) => <ElementBadge key={el} element={el} small />)} {zone.blurb}</p>
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
              <AdventureButtons zone={zone} save={save} today={today} onOpen={onOpen} />
              <button type="button" class="button button--big button--block" onClick={onHunt} data-testid={`start-${zone.id}`}>
                Start a hunt
              </button>
            </>
          )}
        </>
      )}
    </article>
  );
}

/** One row of buttons for a zone: its story, its bounty board and its treasures (set gear). */
function AdventureButtons({ zone, save, today, onOpen }: { zone: ZoneData; save: SaveData; today: string; onOpen(kind: 'story' | 'bounties' | 'treasures'): void }) {
  const story = storyProgress(data, save, zone.id);
  const hasBounties = !!data.bounties.pools[zone.id];
  const loot = zoneTreasure(zone);
  if (!story.total && !hasBounties && !loot.length) return null;
  const pending = storiesFor(data, zone.id).some((q) => { const st = storyStatus(data, save, q); return st.state === 'done' && st.choicePending; });
  const ready = bountiesReady(data, save.bounties, zone.id, today);
  const found = loot.filter((id) => save.rider.gear.includes(id)).length;
  return (
    <div class="adventure-buttons adventure-buttons--three">
      {story.total > 0 && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('story')} data-testid={`story-${zone.id}`}
          aria-label={`Story, ${story.done} of ${story.total} done${pending ? ', a choice is waiting' : ''}`}>
          Story {story.done}/{story.total}{pending && <span class="count-pill" aria-hidden="true">!</span>}
        </button>
      )}
      {hasBounties && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('bounties')} data-testid={`bounties-${zone.id}`}
          aria-label={ready ? `Bounties, ${ready} ready to claim` : 'Bounties'}>
          Bounties{ready > 0 && <span class="count-pill" aria-hidden="true">{ready}</span>}
        </button>
      )}
      {loot.length > 0 && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('treasures')} data-testid={`treasures-${zone.id}`}
          aria-label={`Treasures: ${found} of ${loot.length} found`}>
          Loot {found}/{loot.length}
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
