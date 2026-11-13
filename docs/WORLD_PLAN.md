# World expansion: plan

Written 2026-11-12 at Eric's request. Status: W0 to W4 built (2026-11-12): all four side areas. W5 (Sunken Spires, level cap 60) built 2026-11-13 with the dragons plan's chunk 4; W6 next, paired with the dragons plan's chunks (see `docs/DRAGONS_PLAN.md`). Eric answered the open questions the same day (see "Eric's answers"); the plan below follows them.

The request, in Eric's words: "I now want to expand the game with unlockable areas and more levels to go on adventures. Just like adventure quest you could choose and the game grows. Maybe we can do 1 area at a time and they unlock every 10-15 levels for the rider."

## Where the game is today

- The rider and dragons cap at level 50 (`levelCap` in `progression.json`).
- Seven zones cover levels 1 to 50 in overlapping bands of 8 to 10 levels. Each has 5 regular enemies, a mini-boss, a boss, an egg drop and (since gear wave 1) a gear set.
- A zone run is 3 to 5 fights and a boss or mini-boss. That is the only kind of adventure, apart from three growth quests.
- Growth quests already use a quest format with dialogue between fights (`quests.json`: steps with an intro, enemies and an outro). `questsDone` is already in the save.
- Dragon life stages end at Elder (levels 40 to 50). Dragons earn a talent point per level from Juvenile, about 40 by level 50, against 40 talents.
- Near level 50 a level takes about 20 fights, so 10 levels is about 200 fights, or about 7 hours of play at 2 minutes a fight.
- The offline download is 4.7 MB of art. Each new area adds about 450 KB.

## What AdventureQuest does that this borrows

AQ's world grows by adding places to travel to, each with its own story, monsters and shop. From any town you choose where to go: a quest chain with a story, a repeatable hunt for loot and XP, or a boss. The game feels bigger because the list of places keeps growing and new ones are locked until you are ready.

DracoQuest has the hunting part (zone runs) but not the choosing part. The plan adds both: new places, and more than one kind of adventure in each place.

## The shape of the expansion

### Nine new areas: four inside levels 1 to 50, five above it

Eric wants the cap raised to 100 **and** more places to go below 50. So there are two kinds of new area:

- **Side areas (levels 10 to 50).** One new area in each 10-level band, next to the existing zones. They don't raise the cap. They give a player a second place to go at the same level, with its own story, enemies and gear set. This is the AQ feeling of choosing where to adventure.
- **Frontier areas (levels 50 to 100).** One every 10 levels. Each raises the level cap by 10 when it ships, so the game is never capped above its content. Eric can stop after any area and the game is complete at that cap.

| Area | Kind | Rider levels | Unlocks after | Theme (working names, Eric can rename) | Main elements |
| --- | --- | --- | --- | --- | --- |
| A. Whispering Fen | Side | 10 to 20 | Level 10 and the Bramble Troll | A foggy marsh of will-o'-wisps | Verdant, Tide |
| B. Rustcliff Ruins | Side | 20 to 30 | Level 20 and the Magma Wyrm | A ruined fortress of old machines | Stone, Fire |
| C. Moonwell Woods | Side | 30 to 40 | Level 30 and the Storm Roc | A forest that only wakes at night | Shadow, Frost |
| D. Gilded Wastes | Side | 40 to 50 | Level 40 and the Glacier Hydra | A desert of buried treasure | Light, Stone |
| 8. Sunken Spires | Frontier | 50 to 60 | Level 50 and the Eclipse Dragon | A drowned city, storms over the water | Tide, Storm |
| 9. Emberwild | Frontier | 60 to 70 | Level 60 and the Sunken Spires boss | A volcanic jungle | Fire, Verdant |
| 10. Skyreach Isles | Frontier | 70 to 80 | Level 70 and the Emberwild boss | Floating islands, sun and wind | Storm, Light |
| 11. Hollow Crown | Frontier | 80 to 90 | Level 80 and the Skyreach boss | An underground kingdom | Stone, Shadow |
| 12. Starfall Summit | Frontier | 90 to 100 | Level 90 and the Hollow Crown boss | Where the stars land. The final area | Light, Shadow |

Two elements per new area, unlike the single-element early zones. That makes the element choice in a fight matter more and gives every starter a good and a bad matchup in each area.

### Unlocking

An area opens when the rider reaches its level **and** has beaten the boss named in the table (Eric's pick). For a side area that is a main zone's boss just below its band; for a frontier area it is the previous frontier boss. The Map shows the next locked area as a teaser card ("Opens at level 60, after the Tidelord falls") so the player can see the world growing ahead of them.

### Three kinds of adventure per area

This is the "you could choose" part. Each new area's card on the Map offers:

1. **Hunt.** The zone run that exists today: 3 to 5 fights and the boss or mini-boss. Repeatable, for XP, gold and the area's gear set.
2. **Story.** A chain of 4 to 6 quests with dialogue, in the light AQ tone. Each quest is 2 or 3 fights with talk in between. The chain tells the area's story and ends at the area's boss. Each quest is done once and gives a one-time reward (gold, embers, materials, sometimes a set piece). Uses the growth-quest format that already exists.
3. **Bounties.** Three short daily jobs posted on the area's board ("Clear 5 Reef Stalkers", "Win a fight using only spells"). They refresh each day from the device date and pay embers and materials. A reason to come back to old areas too.

Story quests may offer a **choice** at one or two points, AQ-style ("Help the drowned merchant, or keep the treasure"). A choice changes that quest's reward and nudges the lead dragon's temperament. It does not branch the world, so there is no content that some players never see.

### The Map grows into regions

With 16 areas the Map list gets long. Group it into regions with a header each, by level band: "The Wilds" (levels 1 to 20: zones 1 to 3 and Whispering Fen), "The High Lands" (20 to 50: zones 4 to 7 and side areas B to D), and "Beyond the Peak" (50 to 100: frontier areas 8 to 12). Each region collapses to a strip of banners once all its areas are done. Locked areas show as dimmed teaser cards.

Update (2026-11-12): each region is now a painted map with a pin per area, one region at a time with arrows to cycle (see `docs/UI_PLAN.md`, "Painted maps"). The Beyond the Peak map already paints all five frontier areas (Sunken Spires clear, the rest under mist), so W5 to W9 each add one pin and need no map art.

A painted world map with areas lighting up is a possible extra later (one Codex image), not part of this plan.

### Dragons stay at level 50

Eric's call: dragons cap at 50 while the rider keeps leveling to 100. Dragons still share XP up to 50 and keep their talents and gear.

What this means for balance: past 50 the rider's power keeps growing (stat points, gear, the 12 percent per level damage scale) while the dragon's stops. Frontier enemies are tuned in the sim with that in mind, so the rider carries more of the fight at high levels and the dragon becomes the reliable support (breath, guard, heals, combos). If dragons fall too far behind, the gentlest fix is letting the Forge upgrade dragon gear too, which needs the Forge's dragon bonus path; a new dragon stage stays off the table unless Eric asks.

### What each new area contains

| Content | Amount | Notes |
| --- | --- | --- |
| Regular enemies | 5 | Two elements, each with 3 or 4 moves, built like the existing 35 |
| Mini-boss and boss | 2 | The boss ends the story chain and drops an egg of one of the area's elements |
| Encounter table | 1 | Singles, pairs, and mixed pairs from level 2 of the area |
| Gear set | 5 pieces | Same rules as gear wave 1: boss armor, mini-boss trinket, 3 zone-drop weapons |
| Shop tier | 6 to 9 pieces | One weapon per type in each of the area's elements, an armor, a trinket |
| Story quests | 4 to 6 | With one or two choices |
| Bounty pool | 8 to 10 | Three posted each day |
| Spell | 0 or 1 | Light and Shadow have no rider spell yet: Umbral Bolt from Moonwell Woods (about level 32), Radiant Lance from the Gilded Wastes (about level 42). Frontier areas may add stronger versions |
| Forge recipe | 1 | A piece made from the area's materials |
| Art | 5 generations | 1 backdrop, 1 boss, 1 sheet of 6 enemies, and attack versions of the boss and the sheet (15 pictures from 5 generations). See below |

### Art

Each area needs 5 Codex generations, made with `docs/ART_GENERATION.md` in the chosen style: a backdrop, the boss, one sheet holding the five enemies and the mini-boss, and attack versions of the boss and the sheet. That gives 15 pictures per area. Nine areas come to about 45 generations. The Fen's are in `tools/art/painted/jobs4.py`; copy it for the next area.

The game never blocks on art (CLAUDE.md), so an area's code and data can be built and tested with placeholder shapes, and its art generated in one batch when Eric is ready to spend the Codex limits. Eric is told the count before each batch.

To keep the download in check as areas are added, art should be cached per area on first visit instead of all up front (`vite.config.ts`, Workbox runtime caching). That is already an open thread in the handoff; it becomes worth doing with the first new area.

## Phases

One phase at a time, each committed, tested and deployed when Eric says so.

### W0. Foundation (no new art, no new area yet): built

- Regions on the Map, teaser cards for locked areas, the unlock rule (level plus previous boss).
- The three adventure kinds on each area card. Story quests reuse the growth-quest engine with a new `kind: 'story'`, an area id, rewards and optional choices. Bounties are new: a pool per area, three picked per day with the seeded RNG from the date, progress counted from fight events.
- Save v9: story progress (quest ids already go in `questsDone`), choices made, and today's bounty progress.
- Write the first story chains and bounty pools for two **existing** zones (Mossy Hollow and Saltmarsh Shore), so the new adventure kinds can be played and judged before any new area exists. No art needed.
- Per-area art caching.
- The sim learns to play story quests and bounties.

Done when: the Map shows regions and a teaser for the next locked area (Whispering Fen until it ships); Mossy Hollow and Saltmarsh Shore each have a playable story chain and daily bounties; save v9 migrates from a v8 fixture; tests, lint, type check and phone tests pass.

### W1 to W4. Side areas, one at a time (all built: W1 Whispering Fen, W2 Rustcliff Ruins, W3 Moonwell Woods, W4 Gilded Wastes)

Whispering Fen (10 to 20), then Rustcliff Ruins, Moonwell Woods and the Gilded Wastes. Each phase:

- All the area content from the table above, built and tested with placeholder shapes first.
- Its art batch (about 15 images), generated when Eric is ready.
- The sim gets the area added: on-level win rate 70 to 85 percent across the three starters, and the main zone at the same level is not made worse.

Done when: a character at the area's level who has beaten the gate boss can unlock it, play its story to the boss, hunt it and take bounties; tests and phone tests pass.

### W5. Sunken Spires and the level cap to 60

- The level cap goes to 60. The XP curve, enemy XP taper and gold are extended and checked in the sim (target about 20 to 22 fights per level).
- Rider-only growth past 50: stat points, gear tiers, the Forge, spells. The dragon stays at 50.
- All the area content and its art batch.

Done when: a level 50 character who has beaten the Eclipse Dragon can unlock the area, play its story to the boss, and reach level 60; the sim shows a 70 to 85 percent on-level win rate across the three starters; the campaign reaches 60.

### W6 to W9. One frontier area each

Same checklist, each raising the cap by 10. W9 ends with a final boss and a short closing story.

### Story chains for the older zones

Once W0 proves the format, story chains for zones 3 to 7 can be written in any order, between new areas or after them. They need no art. Eric can also reorder the phases, for example doing the first frontier area before the last side area.

## Risks and how the plan handles them

- **Balance over a long curve.** Damage grows linearly with level and gear, and enemies scale linearly too, so the curve should hold, but every area is checked in the sim before it ships.
- **Playtime.** Each area is about 7 hours of hunting at the current pace. If that feels too long, story quests and bounties give bigger XP rewards so a player who mixes adventures levels faster than one who only hunts.
- **Art cost.** About 15 Codex images per area. Building with placeholders first means art never holds up the code.
- **Download size.** Solved by per-area caching in W0.
- **Dragons falling behind past 50.** Dragons stop at 50 by Eric's choice. The sim watches how much of the damage the dragon still deals in frontier fights; Forge upgrades for dragon gear are the planned fix if it drops too far.
- **The 1 to 50 curve.** Side areas add places to go, not XP to the curve, so leveling speed below 50 does not change. Their XP and gold match the main zone at the same level.

## Eric's answers (2026-11-12)

| Question | Answer |
| --- | --- |
| How far | Level 100, and also more areas inside levels 1 to 50. That gives four side areas and five frontier areas |
| Unlock rule | Level plus beating the gate boss |
| Story choices | Small: they change rewards and temperament, no branches |
| Dragons past 50 | Dragons cap at 50; no new stage |
| Where to start | W0: story quests and bounties in existing zones, no art |
| Names and themes | Not answered yet; the working names stand until Eric renames them |
