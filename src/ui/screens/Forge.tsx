import { useState } from 'preact/hooks';
import { gameData as data } from '../../core/data';
import { forgeCraft, forgeUpgrade, GameError } from '../../core/game';
import { canAfford, forgeable, forgedGear, formatMaterials, maxPlus, plusOf, upgradeBlocker, upgradeCostFor, type ForgeCost } from '../../core/forge';
import type { SaveData } from '../../core/save';
import type { GearData } from '../../core/types';
import { MATERIALS } from '../../core/types';
import { Sheet } from '../Sheet';
import { Embers, Gold } from '../Icon';
import { gearSummary } from './Town';

interface Props {
  save: SaveData;
  update(change: (s: SaveData) => SaveData): void;
  onClose(): void;
}

function Cost({ cost }: { cost: ForgeCost }) {
  return (
    <span class="muted forge-cost">
      <span><Gold amount={cost.gold} /></span>
      {cost.embers > 0 && <span><Embers amount={cost.embers} /></span>}
      {MATERIALS.filter((m) => cost.materials[m]).map((m) => <span key={m}>{cost.materials[m]} {data.forge.materials[m].name}</span>)}
    </span>
  );
}

/** The Forge: upgrade rider gear and craft Forge-only pieces. */
export function ForgeSheet({ save, update, onClose }: Props) {
  const [tab, setTab] = useState<'upgrade' | 'craft'>('upgrade');
  const [notice, setNotice] = useState('');
  const r = save.rider;
  const top = maxPlus(data, save.roost);
  const equipped = new Set(Object.values(r.equipment));

  const act = (fn: (s: SaveData) => SaveData, ok: string) => {
    try {
      const next = fn(save);
      update(() => next);
      setNotice(ok);
    } catch (e) {
      setNotice(e instanceof GameError ? e.message : 'That did not work.');
    }
  };

  const pieces = r.gear.map((id) => data.gear[id]!).filter((g) => g && forgeable(g))
    .sort((a, b) => Number(equipped.has(b.id)) - Number(equipped.has(a.id)) || b.level - a.level);

  const upgradeRow = (g: GearData) => {
    const plus = plusOf(r, g.id);
    const now = forgedGear(data, g, plus);
    const cost = upgradeCostFor(data, g, plus + 1);
    const blocker = upgradeBlocker(data, r, save.embers, save.roost, g.id);
    return (
      <div key={g.id} class="forge-row" data-testid={`forge-row-${g.id}`}>
        <div class="forge-info">
          <strong>{now.name}{equipped.has(g.id) ? ' (equipped)' : ''}</strong>
          <span class="muted">{gearSummary(now)}</span>
          {cost && <span class="muted">Next: {gearSummary(forgedGear(data, g, plus + 1), false)}</span>}
          {cost && <Cost cost={cost} />}
          {blocker && cost && <span class="muted">{blocker}.</span>}
        </div>
        {cost ? (
          <button type="button" class="button" disabled={!!blocker} data-testid={`forge-up-${g.id}`}
            onClick={() => act((s) => forgeUpgrade(data, s, g.id), `${g.name} is now +${plus + 1}.`)}>+{plus + 1}</button>
        ) : <span class="muted">Max</span>}
      </div>
    );
  };

  return (
    <Sheet title="Forge" onClose={onClose}>
      <p class="muted" data-testid="forge-materials">
        Materials: {formatMaterials(data, r.materials) || 'none yet'}. The Forge can reach +{top}.
      </p>
      <div class="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'upgrade'} class={`tab-pill${tab === 'upgrade' ? ' tab-pill--on' : ''}`}
          onClick={() => { setTab('upgrade'); setNotice(''); }} data-testid="forge-tab-upgrade">Upgrade</button>
        <button type="button" role="tab" aria-selected={tab === 'craft'} class={`tab-pill${tab === 'craft' ? ' tab-pill--on' : ''}`}
          onClick={() => { setTab('craft'); setNotice(''); }} data-testid="forge-tab-craft">Craft</button>
      </div>
      {notice && <p class="notice notice--ok" role="status" data-testid="forge-notice">{notice}</p>}
      {tab === 'upgrade' ? (
        <div class="list">
          <p class="muted">Each plus adds damage to a weapon, or about 15% to a piece's bonuses. Rider gear only.</p>
          {pieces.map(upgradeRow)}
        </div>
      ) : (
        <div class="list">
          {data.forge.recipes.map((rec) => {
            const g = data.gear[rec.gear]!;
            const owned = r.gear.includes(g.id);
            const cost: ForgeCost = { gold: rec.gold, embers: rec.embers, materials: rec.materials };
            const levelOk = (save.roost.levels.forge ?? 0) >= rec.forgeLevel;
            const ok = !owned && levelOk && canAfford({ gold: r.gold, embers: save.embers, materials: r.materials }, cost);
            return (
              <div key={g.id} class="forge-row" data-testid={`recipe-${g.id}`}>
                <div class="forge-info">
                  <strong>{g.name}</strong>
                  <span class="muted">Lv {g.level} · {gearSummary(g)}</span>
                  <span class="muted flavor">{g.description}</span>
                  <Cost cost={cost} />
                  {!levelOk && <span class="muted">Needs a level {rec.forgeLevel} Forge.</span>}
                </div>
                <button type="button" class="button" disabled={!ok} data-testid={`craft-${g.id}`}
                  onClick={() => act((s) => forgeCraft(data, s, g.id), `Crafted the ${g.name}! Equip it from the Bag.`)}>
                  {owned ? 'Owned' : 'Craft'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
