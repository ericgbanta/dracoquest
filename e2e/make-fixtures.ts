/**
 * Builds the save fixtures the phone smoke tests load. Run with:
 *   npx tsx e2e/make-fixtures.ts
 */
import { writeFileSync } from 'node:fs';
import { gameData as data } from '../src/core/data';
import { activeDragon, buyGear, chooseEgg, equip, hatchEgg, learnDragonTalent, warmEgg } from '../src/core/game';
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
console.log('fixtures written');
