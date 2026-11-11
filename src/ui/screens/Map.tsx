import { gameData as data } from '../../core/data';
import { activeDragon, startRun, zoneLock } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge } from '../bits';
import { EnemySprite } from '../Sprites';
import { Scene, useBackdrop, useEnemyRig } from '../stage/Scene';
import type { ElementId } from '../../core/types';
import { href } from '../router';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

export function MapScreen({ save, update }: Props) {
  const dragon = activeDragon(save);
  const lowHp = save.rider.hp < riderMaxHp(data, save.rider) * 0.5;
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Map</h1><span class="gold">🪙 {save.rider.gold}</span></header>
      <a class="card town-card" href={href('town')} data-testid="go-town">
        <span class="care-icon" aria-hidden="true">🏘</span>
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
                <h2>{lock && <span aria-hidden="true">🔒 </span>}{zone.name}</h2>
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
                <button type="button" class="button button--big button--block" onClick={() => update((s) => startRun(data, s, zone.id))}
                  data-testid={`start-${zone.id}`}>
                  Start run
                </button>
              </>
            )}
          </article>
        );
      })}
    </section>
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
