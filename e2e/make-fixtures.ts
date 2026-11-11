/**
 * Builds the save fixtures the phone smoke tests load. Run with:
 *   npx tsx e2e/make-fixtures.ts
 */
import { writeFileSync } from 'node:fs';
import { gameData as data } from '../src/core/data';
import { activeDragon, buyGear, chooseEgg, equip, hatchEgg, incubateEgg, learnDragonTalent, setSecond, startExpedition, upgradeBuilding, warmEgg } from '../src/core/game';
import { newSave, type SaveData } from '../src/core/save';
import { dragonMaxHp, riderMaxHp, riderMaxMp } from '../src/core/characters';
import type { DragonState } from '../src/core/types';

const NOW = 1794355200000;

function base(name: string): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, name, { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
}

function patchDragon(s: SaveData, patch: Partial<DragonState>): SaveData {
  return { ...s, dragons: s.dragons.map((d) => ({ ...d, ...patch })) };
}

function heal(s: SaveData): SaveData {
  const d = activeDragon(s)!;
  return { ...patchDragon(s, { hp: dragonMaxHp(data, d) }), rider: { ...s.rider, hp: riderMaxHp(data, s.rider), mp: riderMaxMp(data, s.rider) } };
}

// A hatchling at the stage cap with enough bond: ready for First Flight.
let grow = base('Sprout');
grow = { ...grow, rider: { ...grow.rider, level: 9, gold: 400, stats: { strength: 14, agility: 5, arcana: 12, vigor: 13 } } };
grow = patchDragon(grow, { level: 9, bond: 34, stats: { might: 17, scale: 13, swift: 5, spirit: 12 } });
grow = heal(grow);
grow = { ...grow, settings: { ...grow.settings, fastBattles: true } };
writeFileSync('e2e/fixtures/ready-to-grow.json', JSON.stringify(grow));

// A Juvenile with talent points and a learned skill.
let juv = base('Scorch');
juv = { ...juv, rider: { ...juv.rider, level: 15, gold: 2500, stats: { strength: 19, agility: 5, arcana: 17, vigor: 18 } } };
juv = patchDragon(juv, { stage: 'juvenile', level: 15, bond: 45, stats: { might: 24, scale: 18, swift: 5, spirit: 17 } });
juv = learnDragonTalent(data, learnDragonTalent(data, juv, 'sharp-claws'), 'sharp-claws');
juv = learnDragonTalent(data, juv, 'twin-claws');
juv = heal(juv);
juv = { ...juv, settings: { ...juv.settings, fastBattles: true } };
writeFileSync('e2e/fixtures/juvenile.json', JSON.stringify(juv));

// An Adult at the top of Thunderspire with the Storm Roc next.
let adult = base('Blaze');
adult = { ...adult, rider: { ...adult.rider, level: 27, gold: 20000, stats: { strength: 32, agility: 5, arcana: 30, vigor: 31 } } };
adult = patchDragon(adult, { stage: 'adult', level: 27, bond: 72, stats: { might: 40, scale: 31, swift: 5, spirit: 30 } });
for (const id of ['thunder-glaive', 'skyforged-plate', 'stormglass-pendant', 'ridgeback-saddle', 'gilded-horn-cap', 'ember-scale-charm']) {
  adult = equip(data, buyGear(data, adult, id), id);
}
for (const id of ['sharp-claws', 'sharp-claws', 'sharp-claws', 'keen-eye', 'keen-eye', 'twin-claws', 'ferocity', 'ferocity', 'ferocity', 'pounce', 'keen-eye', 'rending-strike', 'thick-hide', 'thick-hide', 'taunting-roar', 'kindled-breath', 'kindled-breath', 'soothing-hum']) {
  adult = learnDragonTalent(data, adult, id);
}
adult = heal({ ...adult, rider: { ...adult.rider, gold: 3000 }, bossesDefeated: ['mossy-hollow', 'saltmarsh-shore', 'cinder-pass'], eggs: ['tide', 'fire'] });
adult = { ...adult, run: { zoneId: 'thunderspire', fights: [{ kind: 'boss', enemies: [{ enemyId: 'storm-roc', level: 28 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
adult = { ...adult, settings: { ...adult.settings, fastBattles: true } };
writeFileSync('e2e/fixtures/adult-at-roc.json', JSON.stringify(adult));
// Phase 3: a level 26 rider with two Adult partners, a built Roost, a ready egg, and a dragon on a trip.
let roost = adult;
roost = { ...roost, run: null, rider: { ...roost.rider, level: 26, gold: 20000 }, embers: 120, eggs: ['storm'] };
for (const b of ['hatchery', 'training', 'expeditions'] as const) roost = upgradeBuilding(data, roost, b, NOW);
roost = { ...roost, eggs: ['storm', 'tide'] };
roost = incubateEgg(data, roost, 1, NOW - 48 * 3600_000);
const lead = activeDragon(roost)!;
const make = (id: string, name: string, element: 'tide' | 'verdant', primary: string): DragonState => ({
  ...lead, id, name, element, colors: { primary, secondary: '#e9e4da' }, talents: {}, equipment: {}, bond: 60,
  temper: { bold: 0, gentle: 30, clever: 0, proud: 0 }, assignment: { kind: 'idle' },
});
roost = { ...roost, dragons: [...roost.dragons, make('dragon-2', 'Ripple', 'tide', '#3f8fd8'), make('dragon-3', 'Fern', 'verdant', '#5fbf5a')] };
roost = upgradeBuilding(data, roost, 'nest', NOW);
roost = { ...roost, rider: { ...roost.rider, hp: riderMaxHp(data, roost.rider) }, dragons: roost.dragons.map((d) => ({ ...d, hp: dragonMaxHp(data, d) })) };
roost = setSecond(data, roost, 'dragon-2', NOW);
roost = startExpedition(data, roost, 'dragon-3', 'berry-run', NOW - 3 * 3600_000);
roost = { ...roost, roost: { ...roost.roost, pantry: { lastAt: NOW - 48 * 3600_000, stored: 0 } } };
roost = { ...roost, run: { zoneId: 'thunderspire', fights: [{ kind: 'normal', enemies: [{ enemyId: 'thunder-goat', level: 25 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
writeFileSync('e2e/fixtures/roost.json', JSON.stringify({ ...roost, run: null }));
writeFileSync('e2e/fixtures/two-partners-fight.json', JSON.stringify(roost));
// Phase 4: an Elder at level 45 with an egg left to lay.
let elder = { ...roost, run: null, rider: { ...roost.rider, level: 45 }, embers: 60 };
elder = { ...elder, dragons: elder.dragons.map((d) => (d.id === elder.activeDragonId ? { ...d, stage: 'elder', level: 45, bond: 95 } : d)) };
elder = { ...elder, rider: { ...elder.rider, hp: riderMaxHp(data, elder.rider) }, dragons: elder.dragons.map((d) => ({ ...d, hp: dragonMaxHp(data, d) })) };
writeFileSync('e2e/fixtures/elder.json', JSON.stringify(elder));
console.log('fixtures written');
