import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, claimEventGift, eventGiftClaimed, feedDragon, GameError, groomDragon, isPartner, rest, secondDragon } from '../../core/game';
import { activeEvent } from '../../core/events';
import { careFor, dragonCareFor } from '../../core/care';
import { dragonMaxHp, riderMaxHp } from '../../core/characters';
import { leaning, temperament } from '../../core/roost';
import type { SaveData } from '../../core/save';
import type { DragonState } from '../../core/types';
import { href } from '../router';
import { GearIcon } from '../icons';
import { DragonSprite } from '../Sprites';
import { dragonFallback, IDLE_PACE, Scene, useBackdrop, useDragonRigs, type SceneActor } from '../stage/Scene';
import { Bar, ElementBadge, todayKey } from '../bits';
import { Sheet } from '../Sheet';
import { Groom } from './Groom';
import { Buildings } from './Buildings';
import { Icon } from '../Icon';
import { EmbersButton } from '../Wallet';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

/** A line about what the dragon is up to, picked by temperament and the day. */
function idleLine(dragon: DragonState, today: string): string | null {
  const t = temperament(data, dragon);
  if (!t) return null;
  const lines = data.roost.temperament.types[t].lines;
  const n = [...(dragon.id + today)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return lines[n % lines.length]!.replaceAll('{name}', dragon.name);
}

export function Roost({ save, update }: Props) {
  const lead = activeDragon(save);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'feed' | 'groom' | null>(null);
  const [toast, setToast] = useState('');
  if (!lead) return null;
  const dragon = save.dragons.find((d) => d.id === selectedId) ?? lead;

  const today = todayKey();
  const care = careFor(save.care, today);
  const dCare = dragonCareFor(dragon, today);
  const mealsLeft = data.care.mealsPerDay - dCare.meals;
  const dMax = dragonMaxHp(data, dragon);
  const rMax = riderMaxHp(data, save.rider);
  const hurt = save.dragons.some((d) => d.hp < dragonMaxHp(data, d)) || save.rider.hp < rMax;
  const temper = temperament(data, dragon);
  const lean = leaning(dragon);
  const line = idleLine(dragon, today);
  const away = dragon.assignment.kind === 'expedition';

  const act = (fn: () => void) => {
    try { fn(); } catch (e) { setToast(e instanceof GameError || e instanceof RangeError ? e.message : 'That did not work.'); }
  };

  const doFeed = (foodId: string) => act(() => {
    const r = feedDragon(data, save, foodId, today, dragon.id);
    const food = data.foods.find((f) => f.id === foodId)!;
    update(() => r.save);
    setToast(r.result.favorite
      ? `${dragon.name} LOVES ${food.name}! +${r.result.bondGained} bond, +${r.result.statPoints} stat point${r.result.statPoints === 1 ? '' : 's'}.`
      : `${dragon.name} munches the ${food.name}. +${r.result.bondGained} bond, +${r.result.statPoints} stat point${r.result.statPoints === 1 ? '' : 's'}.`);
    setSheet(null);
  });

  const doGroom = (taps: number) => act(() => {
    const r = groomDragon(data, save, taps, today, dragon.id);
    update(() => r.save);
    setToast(`${dragon.name} is purring. Probably. +${r.bondGained} bond.`);
    setSheet(null);
  });

  const doRest = () => act(() => {
    update((s) => rest(data, s, today));
    setToast(save.dragons.length > 1 ? 'Everyone naps in the nest. Fully rested!' : `You and ${dragon.name} nap in the nest. Fully rested!`);
  });

  const second = secondDragon(save);
  const event = activeEvent(data, today);
  const home = save.dragons.filter((d) => d.assignment.kind !== 'expedition' || d.id === dragon.id);

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <h1 id="screen-title">Roost</h1>
        <span class="embers" data-testid="embers"><EmbersButton amount={save.embers} /></span>
        <a class="icon-button" href={href('settings')} aria-label="Settings" data-testid="open-settings"><GearIcon /></a>
      </header>

      <RoostScene dragons={home} selectedId={dragon.id} onPick={(id) => { setSelectedId(id); setToast(''); }} />

      {event && (
        <div class="card event-card" data-testid="event-card">
          <h2><Icon name="event" fallback="🎉" size={24} /> {event.name}</h2>
          <p>{event.blurb}</p>
          {eventGiftClaimed(data, save, today) ? (
            <p class="muted">You've opened this year's gift. Check the town for festival goods.</p>
          ) : (
            <button type="button" class="button button--block" data-testid="claim-gift"
              onClick={() => act(() => { update((s) => claimEventGift(data, s, today)); setToast(`Festival gift: +${event.gift.embers} embers and some treats!`); })}>
              Open your festival gift
            </button>
          )}
        </div>
      )}

      {save.dragons.length > 1 && (
        <div class="dragon-picker" role="tablist" aria-label="Your dragons">
          {save.dragons.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={d.id === dragon.id} class={`pick${d.id === dragon.id ? ' pick--on' : ''}`}
              onClick={() => { setSelectedId(d.id); setToast(''); }} data-testid={`pick-${d.name}`}>
              <DragonSprite element={d.element} element2={d.element2} variant={d.variant} stage={d.stage} primary={d.colors.primary} secondary={d.colors.secondary} size={40} />
              <span>{d.name}</span>
              {d.id === lead.id ? <span class="pick-tag">Lead</span> : d.id === second?.id ? <span class="pick-tag">Second</span> : null}
            </button>
          ))}
        </div>
      )}

      <div class="card roost-dragon">
        <div class="roost-dragon-info">
          <p class="welcome" data-testid="welcome">{dragon.name}</p>
          <p class="muted">Lv {dragon.level} · {data.dragons.stages.find((s) => s.id === dragon.stage)?.name} <ElementBadge element={dragon.element} element2={dragon.element2} small /></p>
          <p class="muted" data-testid="temperament">
            {temper ? `${data.roost.temperament.types[temper].name}: ${data.roost.temperament.types[temper].passive}` : lean ? `Leaning ${data.roost.temperament.types[lean].name}` : 'Temperament: still figuring itself out'}
          </p>
          <Bar kind="hp" value={dragon.hp} max={dMax} label="HP" />
          <Bar kind="bond" value={dragon.bond} max={data.progression.bond.max} label="Bond" />
          {isPartner(save, dragon.id) && <Bar kind="hp" value={save.rider.hp} max={rMax} label={save.rider.name} />}
        </div>
      </div>
      {line && <p class="idle-line" data-testid="idle-line">{line}</p>}
      {away && <p class="notice notice--ok">{dragon.name} is away on an expedition.</p>}

      {toast && <p class="notice notice--ok" role="status" data-testid="toast">{toast}</p>}
      {save.wellKeptFights > 0 && <p class="notice notice--ok">Well kept: +{Math.round(data.care.wellKept.xpBonus * 100)}% XP for {save.wellKeptFights} more fight{save.wellKeptFights === 1 ? '' : 's'}.</p>}

      <h2 class="section-title">Daily care{save.dragons.length > 1 ? ` · ${dragon.name}` : ''}</h2>
      <div class="care-grid">
        <button type="button" class="care-button" disabled={mealsLeft <= 0 || away} onClick={() => setSheet('feed')} data-testid="care-feed">
          <span class="care-icon" aria-hidden="true"><Icon name="feed" fallback="🍖" size={32} /></span>
          <span>Feed</span>
          <span class="care-sub">{mealsLeft > 0 ? `${mealsLeft} of ${data.care.mealsPerDay} meals left` : 'Full for today'}</span>
        </button>
        <button type="button" class="care-button" disabled={dCare.groomed || away} onClick={() => setSheet('groom')} data-testid="care-groom">
          <span class="care-icon" aria-hidden="true"><Icon name="groom" fallback="✨" size={32} /></span>
          <span>Groom &amp; Play</span>
          <span class="care-sub">{dCare.groomed ? 'Done today' : '10-second game'}</span>
        </button>
        <button type="button" class="care-button" onClick={doRest} disabled={!!save.run} data-testid="care-rest">
          <span class="care-icon" aria-hidden="true"><Icon name="rest" fallback="💤" size={32} /></span>
          <span>Rest</span>
          <span class="care-sub">{hurt ? 'Heal everyone' : care.rested ? 'Rested' : 'Fully healthy'}</span>
        </button>
      </div>
      <p class="muted">
        {care.wellKeptGiven
          ? `All care done today. Care streak: ${save.careStreak.count} day${save.careStreak.count === 1 ? '' : 's'}.`
          : `Rest, then feed and groom a dragon today for the Well kept buff (+${Math.round(data.care.wellKept.xpBonus * 100)}% XP for ${data.care.wellKept.fights} fights) and an ember. Skipping a day never hurts.`}
      </p>

      <a class="button button--big button--block" href={href('map')} data-testid="go-map">Adventure →</a>

      <Buildings save={save} update={update} onMessage={setToast} />

      {sheet === 'feed' && (
        <Sheet title={`Feed ${dragon.name}`} onClose={() => setSheet(null)}>
          <p class="muted">Each meal gives stat points and bond. Every dragon has a secret favorite.</p>
          <div class="list">
            {data.foods.map((f) => {
              const known = dragon.foodsTried.includes(f.id) && f.id === dragon.favoriteFood;
              const have = save.rider.inventory[f.id] ?? 0;
              if (f.premium && have <= 0) return null;
              return (
                <button key={f.id} type="button" class="list-button" disabled={have <= 0} onClick={() => doFeed(f.id)} data-testid={`food-${f.id}`}>
                  <Icon name={`food-${f.id}`} fallback={f.icon} size={22} /> {f.name} ×{have}{f.premium ? ` (+${f.statPoints} points)` : ''}{known ? ' ♥ Favorite' : ''}
                </button>
              );
            })}
            <a class="button button--ghost button--block" href={href('town')}>Buy food in town</a>
          </div>
        </Sheet>
      )}
      {sheet === 'groom' && (
        <Sheet title="Groom & Play" onClose={() => setSheet(null)}>
          <Groom dragon={dragon} onDone={doGroom} />
        </Sheet>
      )}
    </section>
  );
}

/** The painted Roost with every dragon at home idling in it. Tap a dragon to pick it. */
function RoostScene({ dragons, selectedId, onPick }: { dragons: DragonState[]; selectedId: string; onPick(id: string): void }) {
  const backdrop = useBackdrop('roost');
  const shown = dragons.slice(0, 5);
  const rigs = useDragonRigs(shown);
  const n = shown.length;
  const width = n <= 1 ? 46 : n === 2 ? 40 : n === 3 ? 33 : 27;
  const actors: SceneActor[] = shown.map((d, i) => {
    const t = temperament(data, d);
    const back = n > 2 && i % 2 === 1;
    return {
      id: d.id, rig: rigs[d.id] ?? null, fallback: dragonFallback(d),
      left: n <= 1 ? 27 : 2 + (i * (96 - width)) / (n - 1), bottom: back ? 20 : 7, width, z: d.id === selectedId ? 5 : back ? 1 : 2,
      pace: t ? IDLE_PACE[t] : 1, selected: n > 1 && d.id === selectedId,
      label: `${d.name}${d.id === selectedId ? ', selected' : ''}`, onTap: n > 1 ? () => onPick(d.id) : undefined, testid: `roost-${d.name}`,
    };
  });
  return (
    <div class="roost-scene" data-testid="roost-scene">
      <Scene backdrop={backdrop} plainColor="#a58c6a" actors={actors} label={n > 1 ? undefined : `${shown[0]?.name ?? 'Your dragon'} in the Roost`} />
    </div>
  );
}
