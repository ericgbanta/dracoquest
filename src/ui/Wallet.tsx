import { useState } from 'preact/hooks';
import { gameData as data } from '../core/data';
import { Embers, Gold, Icon } from './Icon';
import { Sheet } from './Sheet';

/**
 * Tappable gold and ember counters. A tap opens a short sheet saying what the
 * currency is, how to earn it and what it buys. Amounts come from the game data.
 */

export function GoldButton({ amount }: { amount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" class="money-button" onClick={() => setOpen(true)} aria-label={`${amount} gold. What is gold for?`} data-testid="gold-info">
        <Gold amount={amount} />
      </button>
      {open && (
        <Sheet title="Gold" onClose={() => setOpen(false)}>
          <div class="wallet" data-testid="gold-sheet">
            <p class="wallet-amount"><Icon name="gold" fallback="🪙" size={32} /> {amount} gold</p>
            <h3>How to earn it</h3>
            <ul>
              <li>Win fights. Every enemy drops some.</li>
              <li>Send dragons on trips from the Expedition Board.</li>
              <li>Sell gear you've outgrown in town.</li>
            </ul>
            <h3>What it buys</h3>
            <ul>
              <li>Weapons, armor and trinkets in town.</li>
              <li>Dragon food, potions and tonics.</li>
              <li>Roost buildings and their upgrades (with embers).</li>
              <li>Resetting a dragon's talents.</li>
            </ul>
          </div>
        </Sheet>
      )}
    </>
  );
}

export function EmbersButton({ amount }: { amount: number }) {
  const [open, setOpen] = useState(false);
  const e = data.roost.embers;
  return (
    <>
      <button type="button" class="money-button" onClick={() => setOpen(true)} aria-label={`${amount} embers. What are embers for?`} data-testid="embers-info">
        <Embers amount={amount} />
      </button>
      {open && (
        <Sheet title="Embers" onClose={() => setOpen(false)}>
          <div class="wallet" data-testid="embers-sheet">
            <p class="wallet-amount"><Icon name="ember" fallback="🔥" size={32} /> {amount} embers</p>
            <p class="muted">Embers are rare sparks of dragon fire. They never run out on their own, and nothing is lost by saving them.</p>
            <h3>How to earn them</h3>
            <ul>
              <li>Finish a day's care (rest, then feed and groom a dragon): +{e.wellKeptDay}. Every {e.streakBonusEvery} days in a row: +{e.streakBonus} more.</li>
              <li>Beat a zone's boss: +{e.bossFirstKill} the first time, +{e.bossRepeat} after that.</li>
              <li>Expeditions sometimes bring some back.</li>
              <li>Seasonal festival gifts.</li>
            </ul>
            <h3>What they buy</h3>
            <ul>
              <li>Roost buildings and upgrades (with gold).</li>
              <li>Incubating an egg in the Hatchery: {data.roost.buildings.hatchery.incubateEmbers} embers.</li>
              <li>An Elder laying its egg: {data.dragons.eggLaying.cost.embers} embers.</li>
            </ul>
          </div>
        </Sheet>
      )}
    </>
  );
}
