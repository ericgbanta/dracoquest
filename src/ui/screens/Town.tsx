import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { activeDragon, buyEgg, buyGear, buyItem, GameError, itemPrice, shopEggs, shopGear } from '../../core/game';
import { activeEvent } from '../../core/events';
import type { SaveData } from '../../core/save';
import { setOf } from '../../core/loadout';
import type { GearData } from '../../core/types';
import { href } from '../router';
import { BackIcon } from '../icons';
import { ElementBadge, formatBonus, todayKey } from '../bits';
import { Gold, Icon } from '../Icon';
import { GoldButton } from '../Wallet';
import { usePref } from '../Fold';
import { riderWeapon } from '../../core/loadout';

const KINDS = ['all', 'melee', 'ranged', 'magic', 'armor', 'trinket'] as const;
type Kind = (typeof KINDS)[number];
const WEAPON_KINDS: readonly Kind[] = ['melee', 'ranged', 'magic'];
const KIND_LABELS: Record<Kind, string> = { all: 'All', melee: 'Melee', ranged: 'Ranged', magic: 'Magic', armor: 'Armor', trinket: 'Trinkets' };
/** "Near my level" shows gear from this many levels below to this many above. A UI filter, not a balance number. */
const NEAR_BELOW = 8;
const NEAR_ABOVE = 5;

interface Props { save: SaveData; update(change: (s: SaveData) => SaveData): void }

type Tab = 'weapons' | 'armor' | 'dragon' | 'supplies';
const TABS: { id: Tab; label: string }[] = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'dragon', label: 'Dragon' },
  { id: 'supplies', label: 'Supplies' },
];

export function gearSummary(g: GearData, withSet = true): string {
  const parts: string[] = [];
  if (g.slot === 'weapon') parts.push(`${g.damage} damage, ${g.weaponType}`);
  const b = formatBonus(g.bonus);
  if (b) parts.push(b);
  const set = withSet ? setOf(data, g.id) : undefined;
  if (set) parts.push(`${set.name} set`);
  return parts.join(' · ');
}

export function Town({ save, update }: Props) {
  const [tab, setTab] = useState<Tab>('weapons');
  const [notice, setNotice] = useState('');
  const gold = save.rider.gold;
  const dragon = activeDragon(save);
  const today = todayKey();
  const event = activeEvent(data, today);

  const act = (fn: (s: SaveData) => SaveData, ok: string) => {
    try {
      const next = fn(save);
      update(() => next);
      setNotice(ok);
    } catch (e) {
      setNotice(e instanceof GameError ? e.message : 'That did not work.');
    }
  };

  // Weapons start filtered to the type the rider wields.
  const [kind, setKind] = usePref<Kind>('town.kind', (riderWeapon(data, save.rider).weaponType ?? 'all') as Kind, KINDS);
  const [range, setRange] = usePref<'near' | 'all'>('town.range', 'near', ['near', 'all']);
  // "Near my level": a little below the rider's (or the lead dragon's, for dragon gear) level to a little above.
  const near = (g: GearData) => {
    const lv = tab === 'dragon' ? dragon?.level ?? save.rider.level : save.rider.level;
    return !!g.event || (g.level >= lv - NEAR_BELOW && g.level <= lv + NEAR_ABOVE);
  };
  const inTab = shopGear(data, today).map((id) => data.gear[id]!).filter((g) => {
    if (tab === 'weapons') return g.slot === 'weapon' && (kind === 'all' || !WEAPON_KINDS.includes(kind) || g.weaponType === kind);
    if (tab === 'armor') return (g.slot === 'armor' || g.slot === 'trinket') && (kind === 'all' || WEAPON_KINDS.includes(kind) || g.slot === kind);
    if (tab === 'dragon') return g.slot === 'saddle' || g.slot === 'horn' || g.slot === 'charm';
    return false;
  });
  const stock = inTab.filter((g) => range === 'all' || near(g)).sort((a, b) => a.level - b.level || a.price - b.price);
  const hidden = inTab.length - stock.length;
  const kinds: Kind[] = tab === 'weapons' ? ['all', 'melee', 'ranged', 'magic'] : tab === 'armor' ? ['all', 'armor', 'trinket'] : [];

  const supplies = [
    ...data.items.map((i) => ({ id: i.id, name: i.name, icon: i.icon, iconName: `item-${i.id}`, note: i.description })),
    ...data.foods.filter((f) => itemPrice(data, f.id, today) !== null)
      .map((f) => ({ id: f.id, name: f.name, icon: f.icon, iconName: `food-${f.id}`, note: `Dragon food. +${f.statPoints} stat point${f.statPoints === 1 ? '' : 's'} and bond.` })),
  ];

  return (
    <section class="screen" aria-labelledby="screen-title">
      <header class="screen-header">
        <a class="icon-button" href={href('map')} aria-label="Back to Map"><BackIcon /></a>
        <h1 id="screen-title">Town Shop</h1>
        <span class="gold" data-testid="gold"><GoldButton amount={gold} /></span>
      </header>
      <p class="muted">The shopkeeper, a retired adventurer named Brindle, promises everything is "mostly new".</p>
      {event && <p class="notice notice--ok" data-testid="event-shop">{event.name} is on! Festival goods are in stock for a limited time.</p>}
      <div class="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} class={`tab-pill${tab === t.id ? ' tab-pill--on' : ''}`}
            onClick={() => { setTab(t.id); setNotice(''); }} data-testid={`shop-tab-${t.id}`}>{t.label}</button>
        ))}
      </div>
      {notice && <p class="notice notice--ok" role="status" data-testid="shop-notice">{notice}</p>}
      {tab === 'dragon' && <p class="muted">Saddles, horn caps, and scale charms fit Adult dragons only{dragon ? `. ${dragon.name} is a ${dragon.stage}.` : '.'}</p>}

      {tab !== 'supplies' && (
        <div class="chip-row" role="group" aria-label="Filter the shop">
          {kinds.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k || (k === 'all' && !kinds.includes(kind))}
              class={`tab-pill${kind === k || (k === 'all' && !kinds.includes(kind)) ? ' tab-pill--on' : ''}`}
              onClick={() => setKind(k)} data-testid={`shop-kind-${k}`}>{KIND_LABELS[k]}</button>
          ))}
          <button type="button" aria-pressed={range === 'near'} class={`tab-pill${range === 'near' ? ' tab-pill--on' : ''}`}
            onClick={() => setRange(range === 'near' ? 'all' : 'near')} data-testid="shop-range">
            {range === 'near' ? 'Near my level' : 'All levels'}
          </button>
        </div>
      )}
      {tab !== 'supplies' && range === 'near' && hidden > 0 && (
        <p class="muted">Showing gear near your level. <button type="button" class="link-button" onClick={() => setRange('all')} data-testid="shop-show-all">Show all {inTab.length}</button></p>
      )}
      {tab !== 'supplies' ? (
        <div class="list">
          {stock.map((g) => {
            const owned = save.rider.gear.includes(g.id);
            const level = g.slot === 'saddle' || g.slot === 'horn' || g.slot === 'charm' ? `Dragon Lv ${g.level}` : `Lv ${g.level}`;
            return (
              <div key={g.id} class="shop-row">
                <div class="shop-info">
                  <strong>{g.name}</strong> {g.element && <ElementBadge element={g.element} small />}
                  {g.event && <span class="pill">Festival</span>}
                  <span class="muted">{level} · {gearSummary(g)}</span>
                  <span class="muted flavor">{g.description}</span>
                </div>
                <button type="button" class="button shop-buy" disabled={owned || gold < g.price} data-testid={`buy-${g.id}`}
                  onClick={() => act((s) => buyGear(data, s, g.id, today), `Bought the ${g.name}. Equip it from the Bag.`)}>
                  {owned ? 'Owned' : <Gold amount={g.price} />}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div class="list">
          {shopEggs(data).map(({ element, price }) => {
            const name = data.dragons.eggs[element]?.name ?? `${data.elements.info[element].name} egg`;
            const have = save.eggs.filter((e) => e === element).length;
            return (
              <div key={`egg-${element}`} class="shop-row">
                <div class="shop-info">
                  <strong><Icon name="egg" fallback="🥚" size={22} /> {name}</strong> <ElementBadge element={element} small />
                  <span class="muted">A dragon egg. Hatch it in the Roost's Hatchery. You have {have}.</span>
                </div>
                <button type="button" class="button shop-buy" disabled={gold < price} data-testid={`buy-egg-${element}`}
                  onClick={() => act((s) => buyEgg(data, s, element), `Bought a ${name}. It's in your Bag.`)}><Gold amount={price} /></button>
              </div>
            );
          })}
          {supplies.map((it) => {
            const price = itemPrice(data, it.id, today) ?? 0;
            return (
              <div key={it.id} class="shop-row">
                <div class="shop-info">
                  <strong><Icon name={it.iconName} fallback={it.icon} size={22} /> {it.name}</strong>
                  <span class="muted">{it.note} You have {save.rider.inventory[it.id] ?? 0}.</span>
                </div>
                <button type="button" class="button shop-buy" disabled={gold < price} data-testid={`buy-${it.id}`}
                  onClick={() => act((s) => buyItem(data, s, it.id, 1, today), `Bought a ${it.name}.`)}><Gold amount={price} /></button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
