# Spell effects: painted art and motion for every spell

Written 2026-11-19. Status: built, not deployed.

The request, in Eric's words: "The next thing I want to work on are spell animations. They are pretty basic right now and i think we need some new codex art for them." He was shown three options and picked the two bigger ones together: art for every spell with different motion (B), plus a second, larger piece for the five late spells (C). He also said the late spells may run longer than the usual 450 ms, and that enemy special moves should use the same art.

## Before

Every damage spell was one small CSS circle, tinted by element, crossing the stage (`shoot` in `choreo.ts`), with a soft glow where it landed. Mend and Greater Mend were four green dots; Bright Ward four gold dots. A magic weapon's plain attack used the same circle. Enemy special moves lunged like any other attack.

## What was built

### The art (3 generations, all usable first try)

`tools/art/painted/jobs21.py` writes three prompts. Effects have no outline, like the breath bursts. `docs/img/spell-effects.jpg` shows all 29 pieces.

| Sheet | Pieces | Files |
| --- | --- | --- |
| `fx-spells-1` (12) | Arc Bolt, Rot Spit, Frost Dart, Static Lash, Ember Lance, Steel Needles, Umbral Bolt, Radiant Lance, Comet Shard, the magic orb, the cast flare, Bright Ward's shield | `src/art/painted/fx/spell-<id>.webp`, `orb.webp`, `cast.webp` |
| `fx-spells-2` (12) | Shale Spike, Void Spike, Thorn Snare, Tide Surge, Inferno, Eventide, Tempest, Daybreak, Astral Nova, Mend, Greater Mend, the hit burst | `spell-<id>.webp`, `hit.webp` |
| `fx-spells-finish` (5) | Tempest, Inferno, Astral Nova, Daybreak, Eventide | `finish-<id>.webp` |

The orb, the cast flare and the hit burst are painted in the dragon key colors (red and gold) and recolored per element when a fight loads, the way the fallback breath puff is. Everything else is in its final colors.

Packing: `pack.py` cuts these sheets with `split_cells`, which sorts each blob to the nearest grid cell. The usual `split` takes the biggest blobs, and Mend's three hearts or a ring of stars would each have counted as a piece. Spell pieces are at most 360 px on the long side, finishers 560, the three tinted pieces 200. Together they are 472 KB and are precached (the offline install grew by about 440 KB).

### How a spell moves

`cast` in `src/ui/stage/choreo.ts` plays any damage spell. The caster swaps to the attack pose and leans back, a flare in the spell's color bursts at the staff or hand, the painted effect moves in the spell's style, and it lands with the usual knockback plus a painted hit burst in the spell's color.

| Style | Motion | Spells |
| --- | --- | --- |
| `bolt` | Flies from caster to target | Arc Bolt, Rot Spit, Umbral Bolt, the magic orb |
| `lance` | A fast streak that stretches as it flies | Frost Dart, Static Lash, Ember Lance, Steel Needles, Radiant Lance |
| `rise` | Grows out of the ground under the target | Shale Spike, Thorn Snare, Void Spike |
| `fall` | Drops from the sky along a diagonal | Comet Shard, Astral Nova |
| `strike` | A column from the top of the stage to the target's feet | Tempest, Daybreak |
| `wave` | Rolls along the ground from caster to target | Tide Surge, Inferno, Eventide |
| `self` | Plays on the spell's own target | Mend, Greater Mend (hearts rise), Bright Ward (a shield forms and holds) |

The five late spells are marked `long`: every duration is multiplied by `longFactor` (1.55), they land with the heavy hit (hit-stop and the camera punch), and at the moment of impact a second painted piece swells out of the target's center or up from its feet (`finisher`). `docs/img/spell-finishers.jpg` shows three frames of each.

Timing: a normal spell lands 264 to 440 ms after it starts, inside the 450 ms rule. A long spell lands at 419 to 682 ms, and its finisher plays for another 620 ms; Eric approved the longer time for these five.

A miss sends the effect past or beside the target, and no hit burst or finisher plays. Reduced motion uses the plain beat every move uses. With 2x speed everything halves.

### Data

`src/data/spellFx.json` holds every number: timings, each spell's style and size, which spells are long, each finisher's anchor and size, which spell's effect each element lends to enemies, the arcane color, and the list of enemy move words that stay a lunge. It is read by the UI only. A test checks every rider spell has an entry and a painted file.

`src/art/assets.json` `effects` gained `spell`, `finish`, `orb`, `cast` and `hit`.

### Who uses what

`src/ui/stage/director.ts` decides:

- **A rider spell** uses `spellLook(data, id)`: its own art, style, tone and extras.
- **A magic weapon's plain attack** uses `orbLook(element)`: the painted orb in the weapon's element, or arcane violet.
- **Heals and wards.** The engine says "Mira casts Mend." and then sends the heal (or the ward's status). The director plays the cast pose and flare on the first, remembers the spell, and plays its effect on the target when the next event lands.
- **Enemy special moves** use `enemyLook`: a move that isn't `physical` borrows the effect of its element's spell (Fire throws Ember Lance's flame, Stone raises Shale Spike under the rider, Tide rolls Tide Surge's wave), mirrored, never long and with no finisher. A hybrid uses the element the hit reports. Moves whose name ends in a body-blow word (Bite, Slam, Charge, about 75 words in `enemyMelee`) stay a lunge. The words were picked from the names of the 218 non-physical enemy attacks; 162 of them are now thrown.

If a piece of art is missing, a spell falls back to the old circle and an enemy to its lunge.

### Loading and the stage

`spellArtFor(data, battle)` lists what a fight can show: the loadout's spells, the spells its enemies' elements borrow (shift targets included), and the tones to tint. `loadSpellFx` in `rigs.ts` loads them with the rest of the fight's art and records each image's shape. The stage carries them as `data-fx-<key>="url|ratio"` on `.stage-fx`, the way breath art is carried, and has four pooled images for them: `fx-cast`, `fx-spell`, `fx-hit` and `fx-finish`. The busiest fight is still under the 100-node budget.

### A preview page

`#/dev/spells` shows the demo stage with a button for every rider spell, four orbs and every element's enemy special, with a 2x switch. It is the quickest way to judge a timing or size change.

## Calls made without asking

- Which style each spell got, and every size and timing.
- A painted hit burst instead of reusing the breath bursts for impacts, as first proposed: the sheet had a spare slot, and one recolored burst reads more clearly than twelve different ones.
- Heals are pink hearts, not green: the art is cut out of a green background, so light green can't be painted.
- Which enemy move words stay a lunge.
- The spell art is precached, not cached on first use, so spells look right offline.

## Ideas not built

- Dragon talent skills and duo combos still use the breath or the claw.
- Statuses (Burn, Chill, Rot and the rest) still show small dots when they land.
- A cast circle under the rider's feet.
- Sound per spell style.
