# World expansion: plan

Written 2026-11-12 at Eric's request. Status: proposed, nothing built. Questions for Eric are at the end; the plan assumes the recommended answers until he says otherwise.

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

### Raise the level cap to 100, one area at a time

Five new areas, one every 10 levels from 50 to 100. Each area raises the level cap by 10 when it ships, so the game is never capped above its content. Eric can stop after any area and the game is complete at that cap.

| Area | Rider levels | Unlocks at | Theme (working names, Eric can rename) | Main elements |
| --- | --- | --- | --- | --- |
| 8. Sunken Spires | 50 to 60 | Level 50, after the Eclipse Dragon | A drowned city, storms over the water | Tide, Storm |
| 9. Emberwild | 60 to 70 | Level 60, after the Sunken Spires boss | A volcanic jungle | Fire, Verdant |
| 10. Skyreach Isles | 70 to 80 | Level 70 | Floating islands, sun and wind | Storm, Light |
| 11. Hollow Crown | 80 to 90 | Level 80 | An underground kingdom | Stone, Shadow |
| 12. Starfall Summit | 90 to 100 | Level 90 | Where the stars land. The final area | Light, Shadow |

Two elements per area, unlike the single-element early zones. That makes the element choice in a fight matter more and gives every starter a good and a bad matchup in each area.

### Unlocking

An area opens when the rider reaches its level **and** has beaten the previous area's boss. The Map shows the next locked area as a teaser card ("Opens at level 60, after the Tidelord falls") so the player can see the world growing ahead of them.

### Three kinds of adventure per area

This is the "you could choose" part. Each new area's card on the Map offers:

1. **Hunt.** The zone run that exists today: 3 to 5 fights and the boss or mini-boss. Repeatable, for XP, gold and the area's gear set.
2. **Story.** A chain of 4 to 6 quests with dialogue, in the light AQ tone. Each quest is 2 or 3 fights with talk in between. The chain tells the area's story and ends at the area's boss. Each quest is done once and gives a one-time reward (gold, embers, materials, sometimes a set piece). Uses the growth-quest format that already exists.
3. **Bounties.** Three short daily jobs posted on the area's board ("Clear 5 Reef Stalkers", "Win a fight using only spells"). They refresh each day from the device date and pay embers and materials. A reason to come back to old areas too.

Story quests may offer a **choice** at one or two points, AQ-style ("Help the drowned merchant, or keep the treasure"). A choice changes that quest's reward and nudges the lead dragon's temperament. It does not branch the world, so there is no content that some players never see.

### The Map grows into regions

With 12 areas the Map list gets long. Group it into regions with a header each: "The Wilds" (zones 1 to 4), "The High Lands" (5 to 7), and "Beyond the Peak" (8 to 12). Each region collapses to a strip of banners once all its areas are done. Locked areas show as dimmed teaser cards.

A painted world map with areas lighting up is a possible extra later (one Codex image), not part of this plan.

### Dragons past level 50

Dragons currently stop at Elder, level 50. Recommended: a fifth life stage, **Ancient** (levels 50 to 100), unlocked by a growth quest in the Sunken Spires. Ancient dragons get one more talent point every two levels and a second capstone talent. It needs one new dragon painting and its attack pose (2 images), in the same key colors so the recolor works.

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
| Spell | 0 or 1 | Light and Shadow have no rider spell yet: Radiant Lance in Skyreach, Umbral Bolt in Hollow Crown |
| Forge recipe | 1 | A piece made from the area's materials |
| Art | about 15 images | 1 backdrop, 7 enemies with attack poses (14). See below |

### Art

Each area needs about 15 Codex images, made with `docs/ART_GENERATION.md` in the chosen style: 1 backdrop and 7 enemies with attack poses. The Ancient dragon adds 2. Five areas and the dragon come to about 77 images, against 61 for the whole art redesign.

The game never blocks on art (CLAUDE.md), so an area's code and data can be built and tested with placeholder shapes, and its art generated in one batch when Eric is ready to spend the Codex limits. Eric is told the count before each batch.

To keep the download in check as areas are added, art should be cached per area on first visit instead of all up front (`vite.config.ts`, Workbox runtime caching). That is already an open thread in the handoff; it becomes worth doing with the first new area.

## Phases

One phase at a time, each committed, tested and deployed when Eric says so.

### W0. Foundation (no new art, no new area yet)

- Regions on the Map, teaser cards for locked areas, the unlock rule (level plus previous boss).
- The three adventure kinds on each area card. Story quests reuse the growth-quest engine with a new `kind: 'story'`, an area id, rewards and optional choices. Bounties are new: a pool per area, three picked per day with the seeded RNG from the date, progress counted from fight events.
- Save v9: story progress (quest ids already go in `questsDone`), choices made, and today's bounty progress.
- Write the first story chains and bounty pools for two **existing** zones (Mossy Hollow and Saltmarsh Shore), so the new adventure kinds can be played and judged before any new area exists. No art needed.
- Per-area art caching.
- The sim learns to play story quests and bounties.

Done when: the Map shows regions and a teaser for area 8; Mossy Hollow and Saltmarsh Shore each have a playable story chain and daily bounties; save v9 migrates from a v8 fixture; tests, lint, type check and phone tests pass.

### W1. Sunken Spires and the level cap to 60

- The level cap goes to 60. The XP curve, enemy XP taper and gold are extended and checked in the sim (target about 20 to 22 fights per level).
- All the area content from the table above, the Ancient stage and its growth quest.
- Art batch: about 17 images (the area plus the Ancient dragon).

Done when: a level 50 character who has beaten the Eclipse Dragon can unlock the area, play its story to the boss, and reach level 60; the sim shows a 70 to 85 percent on-level win rate across the three starters; the campaign reaches 60.

### W2 to W5. One area each

Same checklist, each raising the cap by 10. Light and Shadow spells arrive in W3 and W4. W5 ends with a final boss and a short closing story.

### Story chains for the older zones

Once W0 proves the format, story chains for zones 3 to 7 can be written in any order, between new areas or after them. They need no art.

## Risks and how the plan handles them

- **Balance over a long curve.** Damage grows linearly with level and gear, and enemies scale linearly too, so the curve should hold, but every area is checked in the sim before it ships.
- **Playtime.** Each area is about 7 hours of hunting at the current pace. If that feels too long, story quests and bounties give bigger XP rewards so a player who mixes adventures levels faster than one who only hunts.
- **Art cost.** About 15 Codex images per area. Building with placeholders first means art never holds up the code.
- **Download size.** Solved by per-area caching in W0.
- **Talents running out.** At 50 a dragon has about 40 points. The Ancient stage's half-rate points and a second capstone keep growth going without new trees. If more is wanted, a sixth talent tree is a separate project.

## Questions for Eric

1. **How far:** level 100 with five areas (recommended), or a different cap?
2. **Unlock rule:** level plus beating the previous boss (recommended), or level alone?
3. **Story choices:** small choices that change rewards and temperament (recommended), or real branches where players can miss content?
4. **Dragons past 50:** a new Ancient stage (recommended, 2 more images), or dragons stay at 50 while the rider keeps going?
5. **Names and themes:** keep the working names above, or does he want to name the areas himself?
6. **Order:** start with W0 (new adventure kinds in existing zones, no art), or go straight to the first new area?
