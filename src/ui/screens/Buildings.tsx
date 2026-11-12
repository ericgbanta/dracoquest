import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import {
  collectExpedition, collectFood, collectTraining, GameError, incubateEgg, isPartner, startExpedition, startTraining,
  stopTraining, takeHatchedEgg, upgradeBuilding,
} from '../../core/game';
import { availableTrips, buildingLevel, nestSlots, pantryNextIn, tickPantry, trainingXp, tripById, upgradeCost } from '../../core/roost';
import type { SaveData } from '../../core/save';
import type { BuildingId, DragonState } from '../../core/types';
import { formatDuration, useNow } from '../bits';
import { Sheet } from '../Sheet';
import { Embers, Gold, Icon } from '../Icon';
import { ForgeSheet } from './Forge';
import { formatMaterials, maxPlus } from '../../core/forge';

interface Props {
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
  onMessage(text: string): void;
}

const ICONS: Record<BuildingId, string> = { nest: '🪺', pantry: '🧺', hatchery: '🥚', training: '🏋', expeditions: '🗺', forge: '⚒' };
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

  const head = (b: BuildingId) => (
    <div class="building-head">
      <h3><Icon name={`building-${b}`} fallback={ICONS[b]} size={24} /> {data.roost.buildings[b].name}</h3>
      <span class="pill pill--muted">{save.roost.levels[b] > 0 ? `Lv ${save.roost.levels[b]}` : 'Not built'}</span>
    </div>
  );

  const pantry = buildingLevel(data, roost, 'pantry');
  const pantryNext = pantryNextIn(data, roost, now);
  const hatchery = buildingLevel(data, roost, 'hatchery');
  const training = buildingLevel(data, roost, 'training');
  const board = buildingLevel(data, roost, 'expeditions');

  return (
    <section class="buildings" aria-labelledby="buildings-title">
      <h2 id="buildings-title" class="section-title">The Roost</h2>

      <div class="card building" data-testid="building-nest">
        {head('nest')}
        <p>{save.dragons.length} of {nestSlots(data, roost)} dragon spots used.</p>
        {upgradeButton('nest')}
      </div>

      <div class="card building" data-testid="building-pantry">
        {head('pantry')}
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
      </div>

      <div class="card building" data-testid="building-hatchery">
        {head('hatchery')}
        {!hatchery && <p class="muted">{data.roost.buildings.hatchery.description} Bosses drop eggs.</p>}
        {hatchery && (
          <>
            {roost.hatchery.eggs.length === 0 && <p class="muted">Empty. {hatchery.slots === 1 ? 'Room for one egg.' : `Room for ${hatchery.slots} eggs.`} Incubating takes {hatchery.hours}h.</p>}
            {roost.hatchery.eggs.map((egg, i) => {
              const ready = now >= egg.readyAt;
              return (
                <div key={i} class="slot-row">
                  <div>
                    <strong>{data.dragons.eggs[egg.element]?.name ?? `${data.elements.info[egg.element].name} egg`}</strong>
                    <span class="muted">{ready ? 'Ready to hatch!' : `Hatches in ${formatDuration(egg.readyAt - now)}`}</span>
                  </div>
                  <button type="button" class="button" disabled={!ready} data-testid={`hatch-${i}`}
                    onClick={() => act(() => takeHatchedEgg(data, save, i, Date.now()), 'Something is cracking...')}>Hatch</button>
                </div>
              );
            })}
            {save.eggs.map((el, i) => (
              <div key={`bag-${i}`} class="slot-row">
                <div>
                  <strong>{data.dragons.eggs[el]?.name ?? `${data.elements.info[el].name} egg`}</strong>
                  <span class="muted">In your bag</span>
                </div>
                <button type="button" class="button" data-testid={`incubate-${i}`}
                  disabled={save.embers < data.roost.buildings.hatchery.incubateEmbers || roost.hatchery.eggs.length >= hatchery.slots}
                  onClick={() => act(() => incubateEgg(data, save, i, Date.now()), 'The egg is tucked in, warm and safe.')}>
                  Incubate · <Embers amount={data.roost.buildings.hatchery.incubateEmbers} />
                </button>
              </div>
            ))}
          </>
        )}
        {upgradeButton('hatchery')}
      </div>

      <div class="card building" data-testid="building-training">
        {head('training')}
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
      </div>

      <div class="card building" data-testid="building-expeditions">
        {head('expeditions')}
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
      </div>

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
      <div class="card building" data-testid="building-forge">
        {head('forge')}
        {save.roost.levels.forge === 0 ? (
          <p class="muted">{data.roost.buildings.forge.description} Expeditions and bosses bring back materials.</p>
        ) : (
          <>
            <p data-testid="forge-status">Upgrades rider gear up to +{maxPlus(data, save.roost)}. Materials: {formatMaterials(data, save.rider.materials) || 'none yet'}.</p>
            <button type="button" class="button" disabled={!!save.run} onClick={() => setForgeOpen(true)} data-testid="open-forge">Open the Forge</button>
          </>
        )}
        {upgradeButton('forge')}
      </div>
      {forgeOpen && <ForgeSheet save={save} update={update} onClose={() => setForgeOpen(false)} />}
    </section>
  );
}
