import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, startRun, zoneLock } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge, formatBonus, todayKey } from '../bits';
import { Sheet } from '../Sheet';
import { usePref } from '../Fold';
import { gearSummary } from './Town';
import type { RegionData, UpcomingArea, ZoneData } from '../../core/types';
import { bountiesReady, storiesFor, storyProgress, storyStatus } from '../../core/adventures';
import { BountySheet, StorySheet } from './Adventures';
import { EnemySprite } from '../Sprites';
import { Scene, useBackdrop, useEnemyRig } from '../stage/Scene';
import type { ElementId } from '../../core/types';
import { href, navigate } from '../router';
import { Icon } from '../Icon';
import { GoldButton } from '../Wallet';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

export function MapScreen({ save, update }: Props) {
  const dragon = activeDragon(save);
  const lowHp = save.rider.hp < riderMaxHp(data, save.rider) * 0.5;
  const [treasures, setTreasures] = useState<ZoneData | null>(null);
  const [sheet, setSheet] = useState<{ kind: 'story' | 'bounties'; zone: ZoneData } | null>(null);
  const today = todayKey();
  // The map starts on the region at the rider's level, and remembers the region last looked at.
  // That's the last region with an open area at the rider's level; failing that, the last one the rider has reached.
  const zonesOf = (r: RegionData) => data.zones.filter((z) => r.zones.includes(z.id));
  const lvl = save.rider.level;
  const here = [...data.regions.regions].reverse().find((r) => zonesOf(r).some((z) => !zoneLock(data, save, z) && lvl >= z.minLevel && lvl <= z.maxLevel))?.id
    ?? [...data.regions.regions].reverse().find((r) => {
      const zs = zonesOf(r);
      return zs.length > 0 && Math.min(...zs.map((z) => z.minLevel)) <= lvl;
    })?.id ?? data.regions.regions[0]!.id;
  const regionIds = data.regions.regions.map((r) => r.id);
  const [regionId, setRegion] = usePref<string>('map.region', here, regionIds);
  const regionIndex = Math.max(0, regionIds.indexOf(regionId));
  const region = data.regions.regions[regionIndex]!;
  const zones = region.zones.map((id) => data.zones.find((z) => z.id === id)!);
  // Each region teases its next planned area.
  const tease = data.regions.upcoming.find((u) => u.region === region.id) ?? null;
  const [view, setView] = usePref<'map' | 'list'>('map.view', 'map', ['map', 'list']);
  const [pinned, setPinned] = useState<string | null>(null);
  const pinnedZone = pinned ? zones.find((z) => z.id === pinned) ?? null : null;
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Map</h1><span class="gold"><GoldButton amount={save.rider.gold} /></span></header>
      <a class="card town-card" href={href('town')} data-testid="go-town">
        <span class="care-icon" aria-hidden="true"><Icon name="town" fallback="🏘" size={32} /></span>
        <span><strong>Town</strong><span class="muted"> · Gear, potions, and dragon food</span></span>
      </a>
      {lowHp && <p class="notice notice--error">You're hurt. Rest at the Roost first, unless you like living dangerously.</p>}
      {dragon && dragon.hp <= 0 && <p class="notice notice--error">{dragon.name} is knocked out and will sit this run out. Rest to wake them.</p>}
      <div class="map-view-switch" role="group" aria-label="Show areas as">
        {(['map', 'list'] as const).map((v) => (
          <button key={v} type="button" class={`tab-pill${view === v ? ' tab-pill--on' : ''}`} aria-pressed={view === v}
            onClick={() => setView(v)} data-testid={`map-view-${v}`}>
            {v === 'map' ? 'Map' : 'List'}
          </button>
        ))}
      </div>
      <RegionMapView save={save} region={region} regionIndex={regionIndex} onRegion={(i) => setRegion(data.regions.regions[i]!.id)}
        teaser={tease} onPin={(id) => (id === 'town' ? navigate('town') : setPinned(id))} today={today} showMap={view === 'map'} />
      {view === 'map' ? (
        <p class="muted region-blurb region-blurb--map">{region.blurb} Tap a place to see it.</p>
      ) : (
        <section class="region-list" aria-label={`Areas in ${region.name}`} data-testid={`region-${region.id}`}>
          <p class="muted region-blurb">{region.blurb}</p>
          {zones.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} save={save} today={today}
              onHunt={() => update((s) => startRun(data, s, zone.id, today))}
              onOpen={(kind) => (kind === 'treasures' ? setTreasures(zone) : setSheet({ kind, zone }))} />
          ))}
          {tease && <TeaserCard area={tease} save={save} />}
        </section>
      )}
      {pinnedZone && (
        <Sheet title={pinnedZone.name} onClose={() => setPinned(null)}>
          <div data-testid={`pin-sheet-${pinnedZone.id}`}>
            <ZoneDetails zone={pinnedZone} save={save} today={today} idPrefix="pin-"
              onHunt={() => { setPinned(null); update((s) => startRun(data, s, pinnedZone.id, today)); }}
              onOpen={(kind) => { setPinned(null); if (kind === 'treasures') setTreasures(pinnedZone); else setSheet({ kind, zone: pinnedZone }); }} />
          </div>
        </Sheet>
      )}
      {pinned === 'teaser' && tease && (
        <Sheet title={tease.name} onClose={() => setPinned(null)}>
          <TeaserCard area={tease} save={save} />
        </Sheet>
      )}
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
      {open && <ZoneDetails zone={zone} save={save} today={today} onHunt={onHunt} onOpen={onOpen} />}
    </article>
  );
}

/** A zone's banner, details, adventure buttons and hunt button: the open zone card, and the sheet a map pin opens. */
function ZoneDetails({ zone, save, today, onHunt, onOpen, idPrefix = '' }: {
  zone: ZoneData; save: SaveData; today: string; onHunt(): void; onOpen(kind: 'story' | 'bounties' | 'treasures'): void; idPrefix?: string;
}) {
  const boss = data.enemies[zone.boss.enemy]!;
  const lock = zoneLock(data, save, zone);
  const unlocked = bossUnlocked(zone, save.rider.level);
  const beaten = save.bossesDefeated.includes(zone.id);
  return (
    <>
      <ZoneBanner zoneId={zone.id} element={zone.element} bossId={boss.id} bossElement={boss.element} name={`${zone.name}, home of the ${boss.name}`} />
      <p class="muted">{(zone.elements ?? [zone.element]).map((el) => <ElementBadge key={el} element={el} small />)} Levels {zone.minLevel} to {zone.maxLevel}. {zone.blurb}</p>
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
          <AdventureButtons zone={zone} save={save} today={today} onOpen={onOpen} idPrefix={idPrefix} />
          <button type="button" class="button button--big button--block" onClick={onHunt} data-testid={`${idPrefix}start-${zone.id}`}>
            Start a hunt
          </button>
        </>
      )}
    </>
  );
}

/** The painted map of one region, with a pin per area, and arrows to cycle regions. */
function RegionMapView({ save, region, regionIndex, onRegion, teaser, onPin, today, showMap }: {
  save: SaveData; region: RegionData; regionIndex: number; onRegion(i: number): void; teaser: UpcomingArea | null; onPin(id: string): void; today: string; showMap: boolean;
}) {
  const art = useBackdrop(showMap ? region.map?.art ?? null : null);
  const url = art?.layers[0]?.url;
  const n = data.regions.regions.length;
  const pins = Object.entries(region.map?.pins ?? {});
  return (
    <div class="region-map-wrap" data-testid="region-map">
      <div class="region-switch">
        <button type="button" class="icon-button" aria-label="Previous region" disabled={regionIndex === 0} onClick={() => onRegion(regionIndex - 1)} data-testid="map-prev">‹</button>
        <div class="region-switch-title">
          <h2 data-testid="map-region-name">{region.name}</h2>
          <span class="muted">{region.levels}</span>
        </div>
        <button type="button" class="icon-button" aria-label="Next region" disabled={regionIndex === n - 1} onClick={() => onRegion(regionIndex + 1)} data-testid="map-next">›</button>
      </div>
      {showMap && <div class="region-map" style={url ? { backgroundImage: `url(${url})` } : undefined}>
        {pins.map(([id, [x, y]]) => {
          const zone = data.zones.find((z) => z.id === id);
          if (!zone) {
            return id === 'town' ? (
              <button key={id} type="button" class="map-pin map-pin--town" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} onClick={() => onPin('town')}
                aria-label="Town: gear, potions and dragon food" data-testid="pin-town">
                <span class="map-pin-dot"><Icon name="town" fallback="🏘" size={22} /></span><span class="map-pin-label">Town</span>
              </button>
            ) : null;
          }
          const lock = zoneLock(data, save, zone);
          const beaten = save.bossesDefeated.includes(zone.id);
          const ready = bountiesReady(data, save.bounties, zone.id, today);
          const choice = storiesFor(data, zone.id).some((q) => { const st = storyStatus(data, save, q); return st.state === 'done' && st.choicePending; });
          const here = !lock && save.rider.level >= zone.minLevel - 1 && save.rider.level <= zone.maxLevel;
          return (
            <button key={id} type="button" class={`map-pin${lock ? ' map-pin--locked' : ''}${here ? ' map-pin--here' : ''}`}
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, '--el': data.elements.info[zone.element].color }} onClick={() => onPin(id)}
              aria-label={`${zone.name}, levels ${zone.minLevel} to ${zone.maxLevel}${lock ? `, ${lock}` : beaten ? ', boss beaten' : ''}`} data-testid={`pin-${id}`}>
              <span class="map-pin-dot">{lock ? <Icon name="lock" fallback="🔒" size={18} /> : beaten ? '★' : data.elements.info[zone.element].symbol}</span>
              <span class="map-pin-label">{zone.name}</span>
              {(ready > 0 || choice) && <span class="count-pill map-pin-badge" aria-hidden="true">{choice ? '!' : ready}</span>}
            </button>
          );
        })}
        {teaser?.pin && (
          <button type="button" class="map-pin map-pin--teaser" style={{ left: `${teaser.pin[0] * 100}%`, top: `${teaser.pin[1] * 100}%` }}
            onClick={() => onPin('teaser')} aria-label={`${teaser.name}, coming in a future update`} data-testid="pin-teaser">
            <span class="map-pin-dot">?</span><span class="map-pin-label">{teaser.name}</span>
          </button>
        )}
      </div>}
      <div class="region-dots" aria-hidden="true">
        {data.regions.regions.map((r, i) => <span key={r.id} class={`region-dot${i === regionIndex ? ' region-dot--on' : ''}`} />)}
      </div>
    </div>
  );
}

/** One row of buttons for a zone: its story, its bounty board and its treasures (set gear). */
function AdventureButtons({ zone, save, today, onOpen, idPrefix = '' }: { zone: ZoneData; save: SaveData; today: string; onOpen(kind: 'story' | 'bounties' | 'treasures'): void; idPrefix?: string }) {
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
        <button type="button" class="button button--ghost" onClick={() => onOpen('story')} data-testid={`${idPrefix}story-${zone.id}`}
          aria-label={`Story, ${story.done} of ${story.total} done${pending ? ', a choice is waiting' : ''}`}>
          Story {story.done}/{story.total}{pending && <span class="count-pill" aria-hidden="true">!</span>}
        </button>
      )}
      {hasBounties && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('bounties')} data-testid={`${idPrefix}bounties-${zone.id}`}
          aria-label={ready ? `Bounties, ${ready} ready to claim` : 'Bounties'}>
          Bounties{ready > 0 && <span class="count-pill" aria-hidden="true">{ready}</span>}
        </button>
      )}
      {loot.length > 0 && (
        <button type="button" class="button button--ghost" onClick={() => onOpen('treasures')} data-testid={`${idPrefix}treasures-${zone.id}`}
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
