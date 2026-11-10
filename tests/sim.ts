/**
 * Balance simulator: 1,000 auto-battles per zone, reporting win rates
 * and fights per level. Zones and combat arrive in Phase 1.
 */
import { gameData } from '../src/core/data';

console.log('DracoQuest balance sim');
console.log(`Data loaded: ${gameData.elements.ids.length} elements, level cap ${gameData.progression.levelCap}.`);
console.log('No zones yet. The simulator gets its battles in Phase 1.');
