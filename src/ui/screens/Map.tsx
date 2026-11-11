import { gameData as data } from '../../core/data';
import { activeDragon, startRun } from '../../core/game';
import { bossUnlocked } from '../../core/run';
import { riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { ElementBadge } from '../bits';
import { EnemySprite } from '../Sprites';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

const LATER_ZONES = [
  { name: 'Saltmarsh Shore', levels: '6 to 14', note: 'Opens in a future update' },
  { name: 'Cinder Pass', levels: '12 to 20', note: 'Needs a Juvenile dragon' },
  { name: 'Thunderspire', levels: '18 to 28', note: 'Needs a Juvenile dragon that can fly' },
];

export function MapScreen({ save, update }: Props) {
  const dragon = activeDragon(save);
  const lowHp = save.rider.hp < riderMaxHp(data, save.rider) * 0.5;
  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Map</h1></header>
      {data.zones.map((zone) => {
        const boss = data.enemies[zone.boss.enemy]!;
        const unlocked = bossUnlocked(zone, save.rider.level);
        const beaten = save.bossesDefeated.includes(zone.id);
        return (
          <article key={zone.id} class="card zone">
            <div class="zone-head">
              <div>
                <h2>{zone.name}</h2>
                <p class="muted">Levels {zone.minLevel} to {zone.maxLevel} · <ElementBadge element={zone.element} small /></p>
              </div>
              <EnemySprite enemyId={boss.id} element={boss.element} size={64} />
            </div>
            <p>{zone.blurb}</p>
            <p class="muted">
              {zone.fights.min} to {zone.fights.max} fights, then{' '}
              {unlocked ? <strong>the {boss.name}{beaten ? ' (beaten!)' : ''}</strong> : `a mini-boss. The ${boss.name} shows up at rider level ${zone.boss.unlockRiderLevel}.`}
            </p>
            {lowHp && <p class="notice notice--error">You're hurt. Rest at the Roost first, unless you like living dangerously.</p>}
            {dragon && dragon.hp <= 0 && <p class="notice notice--error">{dragon.name} is knocked out and will sit this run out. Rest to wake them.</p>}
            <button type="button" class="button button--big button--block" onClick={() => update((s) => startRun(data, s, zone.id))}
              data-testid={`start-${zone.id}`}>
              Start run
            </button>
          </article>
        );
      })}
      {LATER_ZONES.map((z) => (
        <article key={z.name} class="card zone zone--locked" aria-disabled="true">
          <h2><span aria-hidden="true">🔒</span> {z.name}</h2>
          <p class="muted">Levels {z.levels} · {z.note}</p>
        </article>
      ))}
    </section>
  );
}
