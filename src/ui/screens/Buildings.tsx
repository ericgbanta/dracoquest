import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import {
  collectExpedition, collectFood, collectTraining, GameError, incubateEgg, isPartner, releaseEgg, startExpedition, startTraining,
  stopTraining, takeHatchedEgg, upgradeBuilding,
} from '../../core/game';
import { availableTrips, buildingLevel, nestSlots, pantryNextIn, tickPantry, trainingXp, tripById, upgradeCost } from '../../core/roost';
import type { SaveData } from '../../core/save';
import type { BuildingId, DragonState } from '../../core/types';
import { formatDuration, useNow } from '../bits';
import { Sheet } from '../Sheet';
import { Embers, Gold, Icon } from '../Icon';
import { ForgeSheet } from './Forge';
import { Fold } from '../Fold';
import { formatMaterials, maxPlus } from '../../core/forge';
import { eggName, releaseValue } from '../../core/eggs';

interface Props {
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
  onMessage(text: string): void;
}

const ICONS: Record<BuildingId, string> = { nest: '🪺', pantry: '🧺', hatchery: '🥚', nesting: '🪹', training: '🏋', expeditions: '🗺', forge: '⚒' };
const foodName = (id: string) => data.foods.find((f) => f.id === id)?.name ?? id;

export function Buildings({ save, update, onMessage }: Props) {
  const now = useNow();
  const [tripFor, setTripFor] = useState<DragonState | null>(null);
  const [forgeOpen, setForgeOpen] = useState(false);
  const roost = tickPantry(data, save.roost, now);

  const act = (fn: () => SaveData, ok: string) => {
    try {
      const next = fn();
      update(() => next);
      onMessage(ok);
    } catch (e) {
      onMessage(e instanceof GameError || e instanceof RangeError ? e.message : 'That did not work.');
    }
  };

  const benched = save.dragons.filter((d) => !isPartner(save, d.id));
  const idleBench = benched.filter((d) => d.assignment.kind === 'idle');

  const upgradeButton = (b: BuildingId) => {
    const cost = upgradeCost(data, save.roost, b);
    if (!cost) return <span class="muted">Max level</span>;
    const built = save.roost.levels[b] > 0;
    const afford = save.rider.gold >= cost.gold && save.embers >= cost.embers;
    return (
      <button type="button" class="button button--ghost upgrade" disabled={!afford || !!save.run} data-testid={`upgrade-${b}`}
        onClick={() => act(() => upgradeBuilding(data, save, b, Date.now()), `${data.roost.buildings[b].name} ${built ? 'upgraded' : 'built'}!`)}>
        {built ? 'Upgrade' : 'Build'} · <Gold amount={cost.gold} /> · <Embers amount={cost.embers} />
      </button>
    );
  };

  const title = (b: BuildingId) => (
    <><Icon name={`building-${b}`} fallback={ICONS[b]} size={24} /> {data.roost.buildings[b].name}</>
  );

  const pantry = buildingLevel(data, roost, 'pantry');
  const pantryNext = pantryNextIn(data, roost, now);
  const hatchery = buildingLevel(data, roost, 'hatchery');
  const training = buildingLevel(data, roost, 'training');
  const board = buildingLevel(data, roost, 'expeditions');
  const lv = (b: BuildingId) => (save.roost.levels[b] > 0 ? `Lv ${save.roost.levels[b]}` : 'Not built');
  const readyEggs = roost.hatchery.eggs.filter((e) => now >= e.readyAt).length;
  const trainees = benched.filter((d) => d.assignment.kind === 'training');
  const trips = benched.filter((d) => d.assignment.kind === 'expedition');
  const tripsBack = trips.filter((d) => d.assignment.kind === 'expedition' && now >= d.assignment.endsAt).length;
  const summaries: Record<BuildingId, string> = {
    nest: `${lv('nest')} · ${save.dragons.length} of ${nestSlots(data, roost)} dragons`,
    pantry: pantry ? `${lv('pantry')} · ${roost.pantry.stored} of ${pantry.store} food ready` : lv('pantry'),
    hatchery: !hatchery ? lv('hatchery') : readyEggs ? `${readyEggs} ready to hatch!` : roost.hatchery.eggs.length ? `${roost.hatchery.eggs.length} incubating` : save.eggs.length ? `${save.eggs.length} egg${save.eggs.length === 1 ? '' : 's'} to incubate` : `${lv('hatchery')} · empty`,
    training: !trainees.length ? lv('training') : `${trainees.map((d) => d.name).join(', ')} training`,
    expeditions: !board ? lv('expeditions') : tripsBack ? `${tripsBack} back home!` : trips.length ? `${trips.length} away` : `${lv('expeditions')} · ${idleBench.length} free`,
    forge: save.roost.levels.forge > 0 ? `Up to +${maxPlus(data, save.roost)}` : lv('forge'),
    nesting: lv('nesting'),
  };
  const attention: Record<BuildingId, boolean> = {
    nest: false, pantry: roost.pantry.stored > 0, hatchery: readyEggs > 0, nesting: false, training: false, expeditions: tripsBack > 0, forge: false,
  };

  return (
    <section class="buildings" aria-labelledby="buildings-title">
      <h2 id="buildings-title" class="section-title">The Roost</h2>

      <Fold id="roost.nest" class="building" testid="building-nest" title={title('nest')} summary={summaries.nest} forceOpen={attention.nest}>
        <p>{save.dragons.length} of {nestSlots(data, roost)} dragon spots used.</p>
        {upgradeButton('nest')}
      </Fold>

      <Fold id="roost.pantry" class="building" testid="building-pantry" title={title('pantry')} summary={summaries.pantry} forceOpen={attention.pantry}>
        {pantry && (
          <>
            <p data-testid="pantry-status">
              {roost.pantry.stored} of {pantry.store} food ready{pantryNext !== null ? ` · next in ${formatDuration(pantryNext * 60_000)}` : ' · full'}
            </p>
            <button type="button" class="button" disabled={roost.pantry.stored <= 0} data-testid="collect-food"
              onClick={() => {
                try {
                  const r = collectFood(data, save, Date.now());
                  update(() => r.save);
                  const counts = r.food.reduce<Record<string, number>>((a, f) => ({ ...a, [f]: (a[f] ?? 0) + 1 }), {});
                  onMessage(`Collected ${Object.entries(counts).map(([f, n]) => `${n} ${foodName(f)}`).join(', ')}.`);
                } catch { onMessage('That did not work.'); }
              }}>
              Collect food
            </button>
          </>
        )}
        {upgradeButton('pantry')}
      </Fold>

      <Fold id="roost.hatchery" class="building" testid="building-hatchery" title={title('hatchery')} summary={summaries.hatchery} forceOpen={attention.hatchery}>
        {!hatchery && <p class="muted">{data.roost.buildings.hatchery.description} Bosses drop eggs.</p>}
        {hatchery && (
          <>
            {roost.hatchery.eggs.length === 0 && <p class="muted">Empty. {hatchery.slots === 1 ? 'Room for one egg.' : `Room for ${hatchery.slots} eggs.`} Incubating takes {hatchery.hours}h.</p>}
            {roost.hatchery.eggs.map((egg, i) => {
              const ready = now >= egg.readyAt;
              return (
                <div key={i} class="slot-row">
                  <div>
                    <strong>{eggName(data, egg)}</strong>
                    <span class="muted">{ready ? 'Ready to hatch!' : `Hatches in ${formatDuration(egg.readyAt - now)}`}</span>
                  </div>
                  <button type="button" class="button" disabled={!ready} data-testid={`hatch-${i}`}
                    onClick={() => act(() => takeHatchedEgg(data, save, i, Date.now()), 'Something is cracking...')}>Hatch</button>
                </div>
              );
            })}
          </>
        )}
        {save.eggs.map((egg, i) => {
          const name = eggName(data, egg);
          const embers = releaseValue(data, egg);
          return (
            <div key={`bag-${i}`} class="slot-row">
              <div>
                <strong>{name}</strong>
                <span class="muted">In your bag</span>
              </div>
              <div class="slot-actions">
                {hatchery && (
                  <button type="button" class="button" data-testid={`incubate-${i}`}
                    disabled={save.embers < data.roost.buildings.hatchery.incubateEmbers || roost.hatchery.eggs.length >= hatchery.slots}
                    onClick={() => act(() => incubateEgg(data, save, i, Date.now()), 'The egg is tucked in, warm and safe.')}>
                    Incubate · <Embers amount={data.roost.buildings.hatchery.incubateEmbers} />
                  </button>
                )}
                <button type="button" class="button button--ghost" data-testid={`release-${i}`}
                  onClick={() => {
                    if (!window.confirm(`Return the ${name} to the wild? The wild dragons will leave ${embers} embers.`)) return;
                    act(() => releaseEgg(data, save, i).save, `The ${name} is back in the wild. You found ${embers} embers where it was.`);
                  }}>
                  Return · <Embers amount={embers} />
                </button>
              </div>
            </div>
          );
        })}
        {upgradeButton('hatchery')}
      </Fold>

      <Fold id="roost.training" class="building" testid="building-training" title={title('training')} summary={summaries.training} forceOpen={attention.training}>
        {!training && <p class="muted">{data.roost.buildings.training.description}</p>}
        {training && (
          <>
            <p class="muted">Benched dragons earn XP here, up to {training.maxHours}h at a time.</p>
            {benched.filter((d) => d.assignment.kind === 'training').map((d) => {
              const since = d.assignment.kind === 'training' ? d.assignment.since : now;
              const xp = trainingXp(data, roost, d, since, now);
              return (
                <div key={d.id} class="slot-row">
                  <div><strong>{d.name}</strong><span class="muted">{xp} XP banked</span></div>
                  <button type="button" class="button" disabled={xp <= 0} data-testid={`collect-training-${d.name}`}
                    onClick={() => {
                      try {
                        const r = collectTraining(data, save, d.id, Date.now());
                        update(() => r.save);
                        onMessage(`${d.name} earned ${r.xp} XP from training.`);
                      } catch (e) { onMessage(e instanceof Error ? e.message : 'That did not work.'); }
                    }}>Collect</button>
                  <button type="button" class="button button--ghost"
                    onClick={() => act(() => stopTraining(data, save, d.id, Date.now()), `${d.name} stops training.`)}>Stop</button>
                </div>
              );
            })}
            {idleBench.map((d) => (
              <button key={d.id} type="button" class="list-button" data-testid={`train-${d.name}`}
                onClick={() => act(() => startTraining(data, save, d.id, Date.now()), `${d.name} starts training.`)}>
                Train {d.name}
              </button>
            ))}
            {benched.length === 0 && <p class="muted">Your battle partners train by fighting. Benched dragons can train here.</p>}
          </>
        )}
        {upgradeButton('training')}
      </Fold>

      <Fold id="roost.expeditions" class="building" testid="building-expeditions" title={title('expeditions')} summary={summaries.expeditions} forceOpen={attention.expeditions}>
        {!board && <p class="muted">{data.roost.buildings.expeditions.description}</p>}
        {board && (
          <>
            {benched.filter((d) => d.assignment.kind === 'expedition').map((d) => {
              const a = d.assignment.kind === 'expedition' ? d.assignment : null;
              const done = !!a && now >= a.endsAt;
              return (
                <div key={d.id} class="slot-row">
                  <div>
                    <strong>{d.name}</strong>
                    <span class="muted">{tripById(data, a?.trip ?? '')?.name} · {done ? 'Back home!' : `back in ${formatDuration((a?.endsAt ?? now) - now)}`}</span>
                  </div>
                  <button type="button" class="button" disabled={!done} data-testid={`collect-trip-${d.name}`}
                    onClick={() => {
                      try {
                        const r = collectExpedition(data, save, d.id, Date.now());
                        update(() => r.save);
                        const parts = [`${r.loot.gold} gold`, `${r.loot.food.length} food`, r.loot.embers ? `${r.loot.embers} embers` : '', formatMaterials(data, r.loot.materials)].filter(Boolean);
                        onMessage(`${d.name} is back with ${parts.join(', ')}.`);
                      } catch (e) { onMessage(e instanceof Error ? e.message : 'That did not work.'); }
                    }}>Collect</button>
                </div>
              );
            })}
            {idleBench.map((d) => (
              <button key={d.id} type="button" class="list-button" data-testid={`send-${d.name}`} onClick={() => setTripFor(d)}>
                Send {d.name} on a trip
              </button>
            ))}
            {benched.length === 0 && <p class="muted">Benched dragons can go on trips. Your battle partners stay home.</p>}
          </>
        )}
        {upgradeButton('expeditions')}
      </Fold>

      {tripFor && (
        <Sheet title={`Send ${tripFor.name}`} onClose={() => setTripFor(null)}>
          <div class="list">
            {availableTrips(data, roost, tripFor).map((t) => (
              <button key={t.id} type="button" class="list-button" data-testid={`trip-${t.id}`}
                onClick={() => { act(() => startExpedition(data, save, tripFor.id, t.id, Date.now()), `${tripFor.name} sets off: ${t.name}.`); setTripFor(null); }}>
                <strong>{t.name}</strong> · {t.hours}h <span class="muted">· {t.blurb}{t.materials ? ` Brings back ${Object.keys(t.materials).map((m) => data.forge.materials[m as 'ore'].name).join(', ')}.` : ''}</span>
              </button>
            ))}
            {availableTrips(data, roost, tripFor).length === 0 && <p class="muted">No trips for a level {tripFor.level} dragon yet.</p>}
          </div>
        </Sheet>
      )}
      <Fold id="roost.forge" class="building" testid="building-forge" title={title('forge')} summary={summaries.forge} forceOpen={attention.forge}>
        {save.roost.levels.forge === 0 ? (
          <p class="muted">{data.roost.buildings.forge.description} Expeditions and bosses bring back materials.</p>
        ) : (
          <>
            <p data-testid="forge-status">Upgrades rider gear up to +{maxPlus(data, save.roost)}. Materials: {formatMaterials(data, save.rider.materials) || 'none yet'}.</p>
            <button type="button" class="button" disabled={!!save.run} onClick={() => setForgeOpen(true)} data-testid="open-forge">Open the Forge</button>
          </>
        )}
        {upgradeButton('forge')}
      </Fold>
      {forgeOpen && <ForgeSheet save={save} update={update} onClose={() => setForgeOpen(false)} />}
    </section>
  );
}
