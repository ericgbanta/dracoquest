import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, canEquip, equip, GameError, sellGear, setSpells, spendRiderPoint, unequip } from '../../core/game';
import { riderLoadout, spellById } from '../../core/spells';
import type { SpellData } from '../../core/types';
import { riderMaxHp, riderMaxMp } from '../../core/characters';
import { equippedSets, gearItem, setSize } from '../../core/loadout';
import { xpToNext } from '../../core/progression';
import type { SaveData } from '../../core/save';
import { DRAGON_SLOTS, RIDER_SLOTS, RIDER_STATS, type GearSlot, type RiderStat } from '../../core/types';
import { Bar, ElementBadge, formatBonus } from '../bits';
import { Sheet } from '../Sheet';
import { gearSummary } from './Town';
import { href } from '../router';
import { Icon } from '../Icon';
import { GoldButton } from '../Wallet';

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

const STAT_INFO: Record<RiderStat, { name: string; drives: string }> = {
  strength: { name: 'Strength', drives: 'Melee weapon damage' },
  agility: { name: 'Agility', drives: 'Ranged damage, accuracy, crits, turn order' },
  arcana: { name: 'Arcana', drives: 'Magic weapons, spells, MP' },
  vigor: { name: 'Vigor', drives: 'HP and defense' },
};

const SLOT_NAMES: Record<GearSlot, string> = {
  weapon: 'Weapon', armor: 'Armor', trinket: 'Trinket', saddle: 'Saddle', horn: 'Horn cap', charm: 'Scale charm',
};

export function Bag({ save, update }: Props) {
  const r = save.rider;
  const dragon = activeDragon(save);
  const [slot, setSlot] = useState<GearSlot | null>(null);
  const [notice, setNotice] = useState('');
  const equippedIn = (s: GearSlot) => (DRAGON_SLOTS as readonly string[]).includes(s) ? dragon?.equipment[s as 'saddle'] : r.equipment[s as 'weapon'];

  const act = (fn: (s: SaveData) => SaveData, ok: string) => {
    try {
      const next = fn(save);
      update(() => next);
      setNotice(ok);
    } catch (e) {
      setNotice(e instanceof GameError ? e.message : 'That did not work.');
    }
  };

  const slotRow = (s: GearSlot) => {
    const g = gearItem(data, equippedIn(s));
    return (
      <div key={s} class="slot-row">
        <div>
          <strong>{SLOT_NAMES[s]}</strong>
          <span class="muted">{g ? `${g.name} · ${gearSummary(g)}` : 'Empty'}</span>
        </div>
        <button type="button" class="button button--ghost" onClick={() => { setSlot(s); setNotice(''); }} data-testid={`slot-${s}`}>Change</button>
      </div>
    );
  };

  const foods = data.foods.filter((f) => (r.inventory[f.id] ?? 0) > 0);

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header"><h1 id="screen-title">Bag</h1><span class="gold" data-testid="gold"><GoldButton amount={r.gold} /></span></header>
      <div class="card">
        <h2>{r.name} <span class="muted">· Rider level {r.level}</span></h2>
        <Bar kind="hp" value={r.hp} max={riderMaxHp(data, r)} label="HP" />
        <Bar kind="mp" value={r.mp} max={riderMaxMp(data, r)} label="MP" />
        <Bar kind="xp" value={r.xp} max={xpToNext(data.progression, r.level)} label="XP" />
      </div>
      {notice && <p class="notice notice--ok" role="status" data-testid="bag-notice">{notice}</p>}
      <div class="card">
        <h2>Gear</h2>
        {RIDER_SLOTS.map(slotRow)}
        {equippedSets(data, r.equipment).map(({ set, count }) => (
          <div key={set.id} class="set-status" data-testid={`set-${set.id}`}>
            <strong>{set.name} set · {count} of {setSize(data, set)}</strong>
            {set.bonuses.map((b) => (
              <span key={b.pieces} class={`muted${count >= b.pieces ? ' set-on' : ''}`}>
                {count >= b.pieces ? '✓' : '○'} {b.pieces} pieces: {formatBonus(b.bonus)}
              </span>
            ))}
          </div>
        ))}
        {dragon && (
          <>
            <h2 class="section-title">{dragon.name}'s gear (lead)</h2>
            {dragon.stage === 'adult' ? DRAGON_SLOTS.map(slotRow) : <p class="muted">Dragon gear slots open when {dragon.name} becomes an Adult.</p>}
          </>
        )}
        <a class="button button--ghost button--block" href={href('town')}>Shop in town</a>
      </div>
      <div class="card">
        <h2>Stats {r.statPoints > 0 && <span class="pill" data-testid="rider-points">{r.statPoints} to spend</span>}</h2>
        {RIDER_STATS.map((k) => (
          <div key={k} class="stat-row">
            <div><strong>{STAT_INFO[k].name}</strong> <span class="muted">{STAT_INFO[k].drives}</span></div>
            <span class="stat-value">{r.stats[k]}</span>
            {r.statPoints > 0 && (
              <button type="button" class="icon-button plus" aria-label={`Add a point to ${STAT_INFO[k].name}`}
                onClick={() => update((s) => spendRiderPoint(s, k))} data-testid={`rider-plus-${k}`}>+</button>
            )}
          </div>
        ))}
      </div>
      <SpellsCard save={save} act={act} />
      <div class="card">
        <h2>Items</h2>
        {data.items.map((item) => (
          <div key={item.id} class="stat-row">
            <div><Icon name={`item-${item.id}`} fallback={item.icon} size={22} /> <strong>{item.name}</strong> <span class="muted">{item.description}</span></div>
            <span class="stat-value">×{r.inventory[item.id] ?? 0}</span>
          </div>
        ))}
        {foods.map((f) => (
          <div key={f.id} class="stat-row">
            <div><Icon name={`food-${f.id}`} fallback={f.icon} size={22} /> <strong>{f.name}</strong> <span class="muted">Dragon food</span></div>
            <span class="stat-value">×{r.inventory[f.id] ?? 0}</span>
          </div>
        ))}
      </div>
      <div class="card">
        <h2>Eggs</h2>
        {save.eggs.length === 0 ? (
          <p class="muted">No eggs yet. Zone bosses guard eggs of their element.</p>
        ) : (
          <>
            <div class="egg-row" data-testid="eggs">
              {save.eggs.map((el, i) => <span key={i} class="badge" style={{ '--el': data.elements.info[el].color }}><Icon name="egg" fallback="🥚" size={16} /> {data.dragons.eggs[el]?.name ?? `${data.elements.info[el].name} egg`}</span>)}
            </div>
            <p class="muted">Incubate them in the Hatchery at the Roost.</p>
          </>
        )}
      </div>

      {slot && (
        <Sheet title={SLOT_NAMES[slot]} onClose={() => setSlot(null)}>
          <div class="list">
            {r.gear.map((id) => data.gear[id]!).filter((g) => g.slot === slot).sort((a, b) => b.level - a.level).map((g) => {
              const on = equippedIn(slot) === g.id;
              const check = canEquip(data, save, g.id);
              return (
                <div key={g.id} class="shop-row">
                  <div class="shop-info">
                    <strong>{g.name}{on ? ' (equipped)' : ''}</strong>
                    <span class="muted">{gearSummary(g)}</span>
                    {!check.ok && <span class="muted">{check.reason}</span>}
                  </div>
                  {!on && (
                    <>
                      <button type="button" class="button" disabled={!check.ok} data-testid={`equip-${g.id}`}
                        onClick={() => { act((s) => equip(data, s, g.id), `Equipped the ${g.name}.`); setSlot(null); }}>Equip</button>
                      <button type="button" class="button button--ghost" data-testid={`sell-${g.id}`}
                        onClick={() => act((s) => sellGear(data, s, g.id), `Sold the ${g.name} for ${Math.floor(g.price * data.shop.sellFraction)} gold.`)}>Sell</button>
                    </>
                  )}
                </div>
              );
            })}
            {slot !== 'weapon' && equippedIn(slot) && (
              <button type="button" class="list-button" onClick={() => { act((s) => unequip(data, s, slot), 'Unequipped.'); setSlot(null); }}>Take it off</button>
            )}
            {r.gear.every((id) => data.gear[id]?.slot !== slot) && <p class="muted">You don't own anything for this slot yet. Try the town shop.</p>}
          </div>
        </Sheet>
      )}
    </section>
  );
}

/** The rider's spells: the loadout taken into battle, other learned spells, and spells still to learn. */
function SpellsCard({ save, act }: { save: SaveData; act(fn: (s: SaveData) => SaveData, ok: string): void }) {
  const r = save.rider;
  const size = data.progression.spellLoadoutSize;
  const loadout = riderLoadout(data, r);
  const all = [...data.combat.riderMoves.spells].sort((a, b) => a.level - b.level);
  const spare = all.filter((sp) => sp.level <= r.level && !loadout.includes(sp.id));
  const locked = all.filter((sp) => sp.level > r.level);
  const full = loadout.length >= size;

  const info = (sp: SpellData) => (
    <div>
      <strong class="spell-name">{sp.name} {sp.element && <ElementBadge element={sp.element} small />}</strong>
      <span class="muted">{sp.mp} MP · {sp.description}</span>
    </div>
  );

  return (
    <div class="card" data-testid="spells">
      <h2>Spells <span class="loadout-count muted" data-testid="loadout-count">{loadout.length} of {size} in battle</span></h2>
      {loadout.map((id) => spellById(data, id)!).map((sp) => (
        <div key={sp.id} class="spell-row" data-testid={`spell-row-${sp.id}`}>
          {info(sp)}
          <button type="button" class="button button--ghost" data-testid={`spell-remove-${sp.id}`}
            onClick={() => act((s) => setSpells(data, s, loadout.filter((x) => x !== sp.id)), `${sp.name} stays home.`)}>Remove</button>
        </div>
      ))}
      {loadout.length === 0 && <p class="muted">No spells picked. Add some below.</p>}
      {spare.length > 0 && <h3 class="section-title">Learned</h3>}
      {spare.map((sp) => (
        <div key={sp.id} class="spell-row" data-testid={`spell-row-${sp.id}`}>
          {info(sp)}
          <button type="button" class={`button${full ? ' button--ghost' : ''}`} disabled={full} data-testid={`spell-add-${sp.id}`}
            onClick={() => act((s) => setSpells(data, s, [...loadout, sp.id]), `${sp.name} is ready for battle.`)}>{full ? 'Full' : 'Add'}</button>
        </div>
      ))}
      {spare.length > 0 && full && <p class="muted">Remove a spell to make room.</p>}
      {locked.length > 0 && <h3 class="section-title">Still to learn</h3>}
      {locked.map((sp) => (
        <div key={sp.id} class="spell-row spell-row--locked" data-testid={`spell-row-${sp.id}`}>
          {info(sp)}
          <span class="muted">Level {sp.level}</span>
        </div>
      ))}
    </div>
  );
}
