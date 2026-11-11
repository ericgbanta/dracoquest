import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, feedDragon, groomDragon, rest } from '../../core/game';
import { careFor } from '../../core/care';
import { dragonMaxHp, riderMaxHp } from '../../core/characters';
import type { SaveData } from '../../core/save';
import { href } from '../router';
import { GearIcon } from '../icons';
import { DragonSprite } from '../Sprites';
import { Bar, ElementBadge, todayKey } from '../bits';
import { Sheet } from '../Sheet';
import { Groom } from './Groom';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

export function Roost({ save, update }: Props) {
  const dragon = activeDragon(save);
  const [sheet, setSheet] = useState<'feed' | 'groom' | null>(null);
  const [toast, setToast] = useState('');
  if (!dragon) return null;

  const today = todayKey();
  const care = careFor(save.care, today);
  const mealsLeft = data.care.mealsPerDay - care.meals;
  const dMax = dragonMaxHp(data, dragon);
  const rMax = riderMaxHp(data, save.rider);
  const hurt = dragon.hp < dMax || save.rider.hp < rMax;

  const doFeed = (foodId: string) => {
    const r = feedDragon(data, save, foodId, today);
    const food = data.foods.find((f) => f.id === foodId)!;
    update(() => r.save);
    setToast(r.result.favorite
      ? `${dragon.name} LOVES ${food.name}! +${r.result.bondGained} bond, +${r.result.statPoints} stat point.`
      : `${dragon.name} munches the ${food.name}. +${r.result.bondGained} bond, +${r.result.statPoints} stat point.`);
    setSheet(null);
  };

  const doGroom = (taps: number) => {
    const r = groomDragon(data, save, taps, today);
    update(() => r.save);
    setToast(`${dragon.name} is purring. Probably. +${r.bondGained} bond.`);
    setSheet(null);
  };

  const doRest = () => {
    update((s) => rest(data, s, today));
    setToast(`You and ${dragon.name} nap in the nest. Fully rested!`);
  };

  const wellKeptBanner = save.wellKeptFights > 0;

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <h1 id="screen-title">Roost</h1>
        <a class="icon-button" href={href('settings')} aria-label="Settings" data-testid="open-settings"><GearIcon /></a>
      </header>

      <div class="card roost-dragon">
        <DragonSprite element={dragon.element} stage={dragon.stage} primary={dragon.colors.primary} secondary={dragon.colors.secondary} size={150} class="idle" />
        <div class="roost-dragon-info">
          <p class="welcome" data-testid="welcome">{dragon.name}</p>
          <p class="muted">Lv {dragon.level} · {data.dragons.stages.find((s) => s.id === dragon.stage)?.name} <ElementBadge element={dragon.element} small /></p>
          <Bar kind="hp" value={dragon.hp} max={dMax} label="HP" />
          <Bar kind="bond" value={dragon.bond} max={data.progression.bond.max} label="Bond" />
          <Bar kind="hp" value={save.rider.hp} max={rMax} label={save.rider.name} />
        </div>
      </div>

      {toast && <p class="notice notice--ok" role="status" data-testid="toast">{toast}</p>}
      {wellKeptBanner && <p class="notice notice--ok">Well kept: +{Math.round(data.care.wellKept.xpBonus * 100)}% XP for {save.wellKeptFights} more fight{save.wellKeptFights === 1 ? '' : 's'}.</p>}

      <h2 class="section-title">Daily care</h2>
      <div class="care-grid">
        <button type="button" class="care-button" disabled={mealsLeft <= 0} onClick={() => setSheet('feed')} data-testid="care-feed">
          <span class="care-icon" aria-hidden="true">🍖</span>
          <span>Feed</span>
          <span class="care-sub">{mealsLeft > 0 ? `${mealsLeft} of ${data.care.mealsPerDay} meals left` : 'Full for today'}</span>
        </button>
        <button type="button" class="care-button" disabled={care.groomed} onClick={() => setSheet('groom')} data-testid="care-groom">
          <span class="care-icon" aria-hidden="true">✨</span>
          <span>Groom &amp; Play</span>
          <span class="care-sub">{care.groomed ? 'Done today' : '10-second game'}</span>
        </button>
        <button type="button" class="care-button" onClick={doRest} data-testid="care-rest">
          <span class="care-icon" aria-hidden="true">💤</span>
          <span>Rest</span>
          <span class="care-sub">{hurt ? 'Heal up' : care.rested ? 'Rested' : 'Fully healthy'}</span>
        </button>
      </div>
      <p class="muted">
        {care.wellKeptGiven
          ? 'All care done today. Nice keeping!'
          : `Do all three today for the Well kept buff: +${Math.round(data.care.wellKept.xpBonus * 100)}% XP for ${data.care.wellKept.fights} fights. Skipping a day never hurts.`}
      </p>

      <a class="button button--big button--block" href={href('map')} data-testid="go-map">Adventure →</a>

      {sheet === 'feed' && (
        <Sheet title={`Feed ${dragon.name}`} onClose={() => setSheet(null)}>
          <p class="muted">Each meal gives a stat point and bond. Every dragon has a secret favorite.</p>
          <div class="list">
            {data.foods.map((f) => {
              const known = dragon.foodsTried.includes(f.id) && f.id === dragon.favoriteFood;
              return (
                <button key={f.id} type="button" class="list-button" onClick={() => doFeed(f.id)} data-testid={`food-${f.id}`}>
                  <span aria-hidden="true">{f.icon}</span> {f.name}{known ? ' ♥ Favorite' : ''}
                </button>
              );
            })}
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
