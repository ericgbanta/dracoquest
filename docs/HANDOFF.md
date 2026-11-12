# Handoff

Last updated 2026-11-12, at the end of a long session that added save slots, rider spells, two gear waves, the Forge, phases W0 to W4 of the world expansion, and a less-scrolling UI pass. Everything below is merged to `main` and live at https://ericgbanta.github.io/dracoquest/ (last deploy `b9a9355`, W4 Gilded Wastes). The working branch for that session was `claude/eager-tesla-uvrdjs`; a new session should start from `main` and use its own branch.

A ready-to-paste prompt for a new session is in `docs/NEXT_PROMPT.md`.

## Read these, in this order

1. `CLAUDE.md`: the house rules (pure `src/core`, seeded RNG, every number in JSON, mobile first, save migrations, local testing, deploy only when asked).
2. This file: what exists, why, how to extend it, and what is next.
3. `docs/WORLD_PLAN.md`: the world expansion plan Eric approved. W5 is next.
4. `docs/ART_GENERATION.md` before making any art (Codex CLI on Eric's subscription), and `docs/ART_STYLE.md` for the rules a finished image must meet.
5. `docs/DESIGN.md` for the original game design and its Decisions table (still settled). `docs/GRAPHICS_PLAN.md` and `docs/GRAPHICS_PLAN_2.md` are history for the battle stage and the painted art.

## The game in one paragraph

DracoQuest is a mobile-first, turn-based browser RPG in the AdventureQuest style, built around hatching and raising dragons. You are a dragon keeper: you pick an egg, hatch it, care for it at the Roost, and fight beside it (later two of them) in short zone runs. Each round you give orders to the rider and each dragon. It is a static Vite + Preact + TypeScript site with no backend; saves live in `localStorage`. Art is painted, cel-shaded WebP, made with an image model through the Codex CLI. Eric (the owner) plays on an iPhone 17 Pro, in Safari and as a Home Screen app.

## History

### 2026-11-10 to 11-11: the base game and the art

| Work | What it added | Eric's check |
| --- | --- | --- |
| Phases 0 to 4 (`docs/DESIGN.md`) | Scaffold and saves; hatching, care, the battle engine, Mossy Hollow, leveling and the balance sim; Juvenile and Adult stages, talents, gear, the town, zones 2 to 4, Ride mode; the Roost buildings, several dragons, embers, temperament, a second partner; zones 5 to 7, the Elder stage, capstones, egg laying, offline play, sound, seasonal events | "This is very good." Two-real-phones check still open |
| Graphics B0 to B5 (`docs/GRAPHICS_PLAN.md`) | The side-view battle stage, choreography for every engine event, scenes, a UI skin | "These look great", "This actually feels good" |
| Taps and targets | Tappable currency counters, enemy plates that open details, split targets per attacker, a battle log fix | Approved |
| Art redesign (`docs/GRAPHICS_PLAN_2.md`) | Painted cel-shaded art for everything (61 Codex generations), attack poses, player-color recoloring of dragons, a flat UI skin | "I see the new art. It's great." |
| Mossy Egg in town | The shop sells a Verdant egg for 1,500 gold | His request |

### 2026-11-12: this session

Each row was built, tested, committed and deployed in this order. The Decisions section below has the details.

| Work | What it added | How it came about |
| --- | --- | --- |
| Save slots | Up to 3 saved games per device, without touching the existing save | Eric asked for it |
| Rider spells | 10 spells learned by level (now 12), a loadout of 4 picked in the Bag | Eric asked how spells are earned. He picked: by level, about 8 with elements, a loadout of 4 (not all spells), Arcana scaling |
| Gear wave 1 | 40 more shop pieces (a second element per weapon tier, light armor, Adult dragon gear), zone gear sets with 2 and 3 piece bonuses, boss and mini-boss trophies, zone loot drops | Eric asked for more gear "that flows naturally with the game" and picked these four ideas |
| Gear wave 2: the Forge | A Roost building that upgrades rider gear to +3 and crafts Forge-only pieces from three materials | The fifth idea, built after wave 1 |
| World plan | `docs/WORLD_PLAN.md`: side areas inside 1 to 50, frontier areas raising the cap to 100, story quests and bounties | Eric wants AQ-style unlockable areas "and the game grows". He also wants more areas inside 1 to 50, not only above it |
| W0 | Map regions and a teaser card, story quests with choices, daily bounties, save v9, per-area art caching | Plan phase W0 (no art) |
| W1 to W4 | Four side areas: Whispering Fen (10 to 20), Rustcliff Ruins (20 to 30), Moonwell Woods (30 to 40), Gilded Wastes (40 to 50). Two new spells: Umbral Bolt (Shadow) and Radiant Lance (Light) | Plan phases W1 to W4, 5 Codex generations each |
| Less scrolling (UI) | Folds (collapsible cards) and sub-tabs on every long screen; see `docs/UI_PLAN.md` | Eric: "a lot of scrolling at times... the bag tab where everything is expanded". He asked for a plan, the build, tests, docs and a deploy without a check-in |

## Where things stand now

- **Level cap 50.** 11 zones: the 7 main ones and 4 side areas, grouped on the Map into "The Wilds" (1 to 20), "The High Lands" (20 to 50) and "Beyond the Peak" (50 to 100, empty except for a teaser for Sunken Spires).
- **Three kinds of adventure per zone:** a hunt (the zone run), a story (28 quests across 6 zones), and daily bounties (6 zones).
- **Rider:** 12 spells, a loadout of 4, gear in 3 slots with 11 sets, the Forge.
- **Dragons:** up to 6 at the Roost, two in battle from rider level 25, four life stages, talents, gear for Adults, temperament.
- **Saves:** version 9, up to 3 slots per device, export and import codes.
- **Tests:** 196 unit tests and 69 phone tests pass. The sim shows every zone averaging 70 to 85 percent on level across the three starters.

## What to work on next

### W5: Sunken Spires and the level cap to 60 (the next phase)

This is the first frontier area, and the first phase that goes past level 50, so it is bigger than W1 to W4. Eric's standing choices: **dragons stay capped at 50** while the rider keeps leveling; areas unlock at a level after a named boss; story choices are small (reward and temperament only); about 10 levels per area.

The area itself follows the same recipe as W1 to W4 (see "How to add an area" below): levels 50 to 60, Tide and Storm, opening at rider level 50 after the Eclipse Dragon (`unlock: { level: 50, afterBoss: 'eclipse-peak' }`), in the `beyond` region. Remove it from `regions.json` `upcoming` and add the next teaser (Emberwild, 60 to 70, Fire and Verdant, after the Sunken Spires boss).

Raising the cap touches more than data:

- `progression.json` `levelCap` 50 to 60. `src/core/progression.ts` already caps dragons at their stage's `maxLevel` (Elder is 50), so dragons stop at 50 with no code change. Check that the XP bar and the results screen behave for a dragon at its cap while the rider levels.
- XP and gold past 50: `xpToNext` is `50 x level^1.6`, and enemy XP is `enemyXpBase x level^1.326`, so fights per level keep climbing slowly (about 22 at level 49). Aim for about 20 to 22 at levels 50 to 60 and check `Fights/level` in the sim.
- Gear past the top shop tier (weapons stop at 43 and 45, armor at 42). Add a tier around 52 to 55 for each slot and weapon type, plus the area's set.
- Spells: the newest is Radiant Lance at 42. Consider one stronger spell around 52 to 55, so the rider grows while the dragon doesn't.
- Talents: dragons get their last talent point at 50. Nothing to do unless Eric wants more.
- **Dragons at 50 against level 60 enemies** is the main balance risk. The sim's on-level table builds dragons at the character's level; for levels over 50 it must cap the dragon at 50 (check `onLevelCharacter` in `tests/sim.ts`). If dragons fall too far behind, the planned fix is letting the Forge upgrade dragon gear (`dragonBonus` would need the rider's upgrade map).
- Tests that assume 50: `tests/data.test.ts` (`levelCap` is 50), `tests/phase4.test.ts` (the last zone's `maxLevel` equals the cap), `tests/progression.test.ts`. The sim's campaign ends at the cap and the last zone's boss, so it will now run to 60 and the Sunken Spires boss.
- Art: 5 Codex generations (copy `tools/art/painted/jobs7.py` to `jobs8.py`, and add the area to `tools/art/painted/zones.json`).

Done when: a level 50 character who has beaten the Eclipse Dragon can unlock Sunken Spires, play its story to the boss and reach level 60; the sim shows 70 to 85 percent on level for all three starters; the campaign reaches 60; tests, lint, types and phone tests pass.

### After W5

- **W6 to W9**, one frontier area each, raising the cap to 70, 80, 90 and 100: Emberwild (Fire, Verdant), Skyreach Isles (Storm, Light), Hollow Crown (Stone, Shadow), Starfall Summit (Light, Shadow; a final boss and a closing story). Names and themes are working names; Eric never answered whether he wants to rename them, so ask.
- **No-art extras, any time:** story chains for Cinder Pass, Thunderspire, Frostmere, Deepstone Mines and Eclipse Peak (they have no story yet), and bounty pools for those five zones.

### Open questions for Eric

None of these block W5; mention them when they come up.

1. **Campaign win rates are above target.** On-level zone win rates are in range, but the sim's full campaigns (which collect sets, use the Forge, play stories and claim bounties) now win about 92 to 93 percent of runs. That's because the campaign plays like a thorough player. Ask whether the late game should be harder; the levers are set bonuses (`sets.json`) and Forge strength (`forge.json` `effect`).
2. **Fire in Frostmere** wins about 96 percent on level (it was 90 before spells). He said to leave balance as is when asked earlier; raise it again only if it comes up.
3. **A "best spells for this zone" button** in the Bag. The sim assumes the best loadout per zone (`suggestedLoadout` in `ai.ts`), so a player who never swaps wins a little less. Offered, not answered.
4. **Area names** for W5 to W9.
5. From before this session: whether enemies visibly snap to their attack pose on his phone, and the two-real-phones check.

### Older open threads (no art unless noted)

- Cosmetics as an ember sink (dragon dye colors would need no art; painted overlays would).
- A late-game save code so Eric can look at endgame screens (`e2e/fixtures/elder.json` turned into an export code with `src/core/save.ts`).
- Art ideas: hurt or defeat poses, painted egg cracks (needs Codex).
- `docs/GRAPHICS_PLAN_2.md` C1 to C4 ideas (camera moves, screen transitions) are unbuilt.

## How to add an area (the recipe W1 to W4 used)

Each side area took about the same steps. Following them in order keeps the game shippable at every commit.

1. **Pick the analog zone** at the same levels and copy its enemies' `base` and `perLevel` stats (`like()` in the generator scripts did this). Main zones were tuned with dragon stage gates and their own element quirks, so the copy is a starting point, not the answer.
2. **Data** (all JSON in `src/data/`):
   - `enemies.json`: 5 regular enemies, a mini-boss (`miniBoss: true, xpMultiplier: 2`) and a boss (`boss: true, xpMultiplier: 4, goldMultiplier: 5`). Each has 3 or 4 moves; give the boss a `shift` move (`shiftTo` its second element, `condition: 'notShifted'`).
   - `zones.json`: the zone, inserted after the main zone it sits beside (the sim's `pickZone` uses array order). Set `element` to the first of `elements`, `unlock: { level, afterBoss }`, `gate: null`, the encounter table (pairs from a couple of levels in), boss and mini-boss with `trophy`, `eggDrop` (with `elements` for a random pick), and `gearDrops`.
   - `gear.json`: the set (3 weapons, armor, trinket; set weapons have no element and one more damage than the shop curve), a shop line (a weapon per type in each of the area's elements, an armor, a trinket) added to `shop.json` `stock`, and a Forge recipe piece added to `forge.json` `recipes`.
   - `sets.json`: the set with 2 and 3 piece bonuses (rider bonuses only).
   - `stories.json`: 5 quests chained by `requires`, fixed `level` per step, the mini-boss step marked `mini: true` and the last step `boss: true`, two `choice`s. NPCs speak with `speaker: 'npc'` and a `name`.
   - `bounties.json`: a pool of 8 (5 `defeat`, a `wins`, a `clear`, the mini-boss).
   - `regions.json`: add the zone to its region and move the teaser (`upcoming`) on to the next planned area.
   - `combat.json`: a new spell if the plan calls for one.
3. **Tests that count things** need their numbers updated: `tests/phase4.test.ts` (zones, regular enemies, bosses), `tests/gear.test.ts` (gear and shop counts), `tests/spells.test.ts` (spell count and elements). `tests/spells.test.ts` also checks a spell beating one of each zone's elements exists within two levels of the zone opening.
4. **Balance:** `npm run sim -- --zone <id> --no-campaign` (about a minute). Aim for 70 to 85 percent on level for each starter and an average near 79. Adjust the area's enemies' `attack` and `hp` (base and perLevel together) and rerun. One starter dipping because of elements is acceptable and was accepted for Fire in the Fen (64 percent).
5. **Phone tests:** in `e2e/world.spec.ts`, update the teaser test (the Map folds regions and zones away from the rider's level, so open them with `openFold`), and add a hunt test and a boss test that check the painted art loads (they also save screenshots to look at).
6. **Art:** copy the last `jobsN.py` to the next number and change the backdrop, boss, sheet and attack descriptions; add the area to `tools/art/painted/zones.json`. Five generations: the backdrop, the boss and the sheet first, then the two attack versions. Look at every result before packing. Pack, check the cutouts, add the rigs and backdrop to `src/art/assets.json` (regular `boxScale` 0.5, mini-boss 0.65, boss 1.15, smaller for a tall or square boss), and look at the fight and boss screenshots at 375 wide.
7. **Docs:** a row in Decisions, the content counts, `docs/WORLD_PLAN.md` status, the job script in `docs/ART_GENERATION.md`.
8. **Ship:** `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run e2e`, a campaign sim (`npm run sim -- --campaign-only`), then commit, push and `npm run deploy` when Eric has said to.

## Making art (summary; the full process is `docs/ART_GENERATION.md`)

- The session must run on the "dracoquest" cloud environment, which allows `chatgpt.com`, `auth.openai.com` and `api.openai.com`.
- `npm install -g @openai/codex@0.167.1`, then run `codex login --device-auth` **as a tracked background task** and give Eric the link and code. Codes expire after 15 minutes; if one lapses, stop the waiting login and start a new one. The background task finishing tells you he's in.
- Install the packing libraries once: `pip install numpy scipy pillow`.
- Work in a scratch folder holding a copy of `tools/art/painted/` named `v2/`. Run `python3 v2/jobsN.py idle`, then `./v2/run.sh <names>` (it runs them five at a time), look at the results, then `python3 v2/jobsN.py attack` and generate again. `python3 v2/pack.py <repo>` packs everything in `v2/out/` and writes `v2/packed.json` (sizes and attack boxes).
- Tell Eric the number of generations before starting. Every area so far took 5, each usable on the first try.
- `codex logout` when the art work is done.

## Decisions made along the way

These are in addition to the Decisions table in `docs/DESIGN.md`. Most were shown to Eric in a report; ones he chose himself say so.

### Rules and balance

| Topic | Decision |
| --- | --- |
| Win rate | "On-level win rate" means a full zone run, boss included, not a single fight. The target is 70 to 85 percent averaged across the three starters. |
| Element multiplier | Same element is 0.75x (the design's starting value was 0.5x). Enemy basic attacks are physical; their special moves carry the element. Ring: Fire beats Frost beats Verdant beats Stone beats Storm beats Tide beats Fire; Light and Shadow beat only each other. |
| Level scaling | Player move damage grows 12 percent per level (`combat.json`, `levelDamageScale`), on top of gear. |
| XP curve | Enemy XP tapers so fights per level go from about 8 early to about 20 near level 50. |
| Bosses | Each zone's boss appears from one level below the zone's top level; before that, runs end with a mini-boss. First kill always drops an egg; later kills have a 10 percent chance. |
| Eggs in town | The shop sells a Mossy (Verdant) Egg for 1,500 gold (Eric's request, 2026-11-11). Whispering Fen's boss now also drops Verdant eggs; the shop keeps it. |
| Food, care, Ride mode, weapons, events | Food costs gold; the Pantry makes it over time. Care counts per dragon; Well kept needs a rest plus one dragon fed and groomed. Ride mode is offered for boss fights with an Adult or Elder lead. Melee scales with Strength, ranged with Agility, magic with Arcana. Seasonal events give a yearly gift and limited stock. |
| Side-area balance | Fen: enemies 5 percent softer than Cinder Pass's; Fire 64, Tide 88, Verdant 84 (Fire suffers because Tide beats Fire). Ruins: about 9 percent more attack than Thunderspire's and 20 percent more HP; 77, 77, 83. Moonwell: Frostmere's stats with 5 percent more attack; 83, 81, 77. Wastes: Eclipse Peak's stats unchanged; 81, 78, 84. |

### Rider spells (Eric's picks, 2026-11-12)

Spells unlock by rider level; the rider takes a **loadout of 4** into battle (`spellLoadoutSize` in `progression.json`), picked in the Bag's Spells card; power comes from Arcana. 12 spells in `riderMoves.spells` (`combat.json`): Arc Bolt and Mend (1), Frost Dart (3), Static Lash (6), Bright Ward (10, a Ward shield on the rider or lead dragon), Tide Surge (12), Ember Lance (15), Shale Spike (18), Greater Mend (24), Thorn Snare (30), Umbral Bolt (32, Shadow, may Blind), Radiant Lance (42, Light, no status because Light's status, Ward, is a buff). Each ring element's spell may inflict that element's status and is timed so a spell that beats a zone arrives within two levels of the zone opening. A new spell fills an empty loadout slot by itself; otherwise the results screen says to swap it in. The battle picker shows only the loadout and marks spells strong against the current target. Spells fly as the existing orb, colored by element (`spellColor` in `director.ts`). Logic: `src/core/spells.ts`. Save v7 added `rider.spells`.

### Gear and the Forge

| Topic | Decision |
| --- | --- |
| Tier choices | Each weapon tier from level 5 has a second weapon per type in another element (same damage and main stat; melee twins trade crit for Vigor). A light armor line trades defense for Agility and Arcana. Adults get dodge saddles, claw horn caps and status charms. |
| Sets | One per zone (11) in `src/data/sets.json`: three weapons (one per type, sharing the weapon slot), an armor and a trinket. 2 and 3 pieces give stacking rider bonuses (`equippedSets` in `loadout.ts`, applied in `riderBonus`). |
| Trophies and loot | A zone's boss drops the set armor and its mini-boss the trinket: always on the first kill (from the bestiary, so players who beat a boss before gear wave 1 rely on the repeat chance), then 25 percent until owned. Each regular fight won has a 6 percent chance to drop a set weapon not yet owned. Quests drop no gear. `rollGear` in `run.ts`. The Map shows "Treasures: n of 5 found" per zone. |
| The Forge | A sixth Roost building with 3 levels capping upgrades at +1, +2, +3. Upgrades work on rider gear only (weapon, armor, trinket), because dragon bonuses are computed from the dragon alone. Each plus adds 8 percent weapon damage (at least 1) and 15 percent to each bonus (flat ones at least +1). Costs scale with gear level; +2 and +3 also cost embers. Materials (Iron Ore, Sky Crystal, Dragonscale) come from expeditions, mini-bosses (2 ore), bosses (a crystal and a scale), stories and bounties. 8 recipes craft Forge-only pieces. Selling a piece drops its upgrade. `src/core/forge.ts`; save v8 added `rider.materials`, `rider.upgrades` and `roost.levels.forge`. Percent bonuses show one decimal (2.3%) so small upgrades are visible. |

### World expansion (Eric's answers, 2026-11-12)

| Question | Answer |
| --- | --- |
| How far | Level 100, and more areas inside 1 to 50 too: four side areas (built) and five frontier areas (W5 to W9) |
| Unlock rule | A rider level plus beating a named boss (`unlock` on the zone; `zoneLock` in `game.ts` checks it before the older dragon-stage `gate`) |
| Story choices | Small: a reward and temperament points (`storyChoiceTemper` in `progression.json`) for the lead dragon. No branches |
| Dragons past 50 | Dragons cap at 50; no new stage |
| Start | W0 first (no art) |

| Topic | Decision |
| --- | --- |
| Regions | `src/data/regions.json` groups zones on the Map. `upcoming` lists planned areas; only the first shows, as a dimmed teaser card in its region. A region with no zones and no teaser is hidden. |
| Story quests | `src/data/stories.json`, logic in `src/core/adventures.ts`. Played once, unlocked by level and the previous quest, with fixed enemy levels. A step marked `boss` or `mini` counts as that fight (trophy, egg, embers, materials, `bossesDefeated`). The last fight adds the quest's reward XP; gold, items, embers and materials land on completion. The choice can be made on the results screen or later from the story list. Mossy Hollow and Saltmarsh Shore have 4 quests; each side area has 5. |
| Bounties | `src/data/bounties.json`: three a day per zone with a pool, picked from a seed of the date and zone. Won fights in the zone count (defeat an enemy, win fights, finish hunts). The board resets when the day changes; `startRun` and `startStory` take `today`. Rewards are gold, embers and materials. |
| Art caching | Enemy art and zone backdrops are not precached (`globIgnores` in `vite.config.ts`, built from enemy and zone ids); they are cached on first view in `dracoquest-area-art`. The precache is about 1.8 MB instead of 4.7 MB. Offline in a zone never visited shows placeholder shapes. |
| Wording | The Map's run button says "Start a hunt". |

### Saves and settings

| Topic | Decision |
| --- | --- |
| Save version | 9. v6 added `settings.simpleBattle`, v7 `rider.spells`, v8 the Forge, v9 `storyChoices` and `bounties`. Each bump has a migration and a fixture test (`tests/fixtures/save-v1.json` to `save-v8.json`). |
| Save slots | Up to 3 per device (Eric's request). Slot 1 is the original `dracoquest.save` key so old saves stay put; slots 2 and 3 are `dracoquest.save.2` and `.3`; `dracoquest.slot` holds the slot in play. Not part of the save object, so no version bump. Settings has the list; export, import and Start over act on the slot in play. |
| Simple battle | A setting that brings back the old card layout instead of the stage. |

### Presentation

| Topic | Decision |
| --- | --- |
| Battle speed | Beats up to 450 ms (Eric raised it from 300 after B0). Timings in `src/data/stage.json`. |
| Offline | vite-plugin-pwa (Workbox), prompt-style updates: a "Reload" bar, never a forced reload mid-fight. |
| Art pipeline | Painted WebP from the Codex image tool, packed by `tools/art/painted/`. One image per character plus an attack pose; dragons recolored to player colors at load. |
| Battle details and targets | Tap an enemy to aim everyone at it; tap again, tap its plate, or tap a party member for details. Each attacker keeps its own target, shown by a chip on its order row when two enemies are alive. |
| Stage node budget | 100 DOM nodes (Eric confirmed). |
| Less scrolling | `docs/UI_PLAN.md`. Two shared pieces in `src/ui/Fold.tsx`: **Fold** (a card whose header is a button, with a one-line summary so a closed fold still says what's inside; `forceOpen` opens it when something needs attention) and **SubTabs** (tab pills with count badges). Both remember their state per device in `localStorage` under `dracoquest.ui.*` (a viewer convenience, never game state; `usePref`). Bag: tabs Gear, Stats, Spells, Items. Dragons: tabs Overview, Stats, Talents. Settings: folds (Saved games open; export and import merged into "Back up or move", forced open when the save can't be read). Roost: each building is a fold with a status summary, opening by itself when food, an egg or a returning dragon is waiting. Map: each region is a fold (the region at the rider's level is open; a region holding only the teaser always is); each zone is a fold that is open only at the rider's level, and a closed zone keeps a quick Hunt button (same `start-<zone>` hook). Story, Bounties and Loot (treasures) share one row. Town: filter chips by weapon type (defaulting to the type the rider wields) or Armor and Trinkets, and "Near my level" (8 below to 5 above, a UI constant in `Town.tsx`) with Show all. Heights at 375 x 667 went from Bag 4.3, Town 15.8, Map 9.6, Roost 3.9, Dragons 3.7, Settings 3.2 screens to about 1.3, 1.7 to 2.1, 2.1 to 2.6, about 2 (more when buildings have things waiting), 1.5 to 1.8 and 1.4; `e2e/ui.spec.ts` holds budgets for each. |
| Headings | Fredoka (`@fontsource/fredoka`, latin 600 only). Body text is the system font at 16 px. |
| Deploys | Pages deploys from GitHub Actions (`.github/workflows/deploy.yml`) when `main` changes. `npm run deploy` runs the checks and pushes the current branch to `main`. Only when Eric asks. |

## How the code is laid out

```
src/core/      pure game logic, no DOM (CLAUDE.md)
  battle.ts      battle engine: fighters, orders, events, Ride mode, second partner, spells
  game.ts        save-level actions (care, runs, stories, bounties, shop, Forge, talents, Roost, events), zoneLock
  save.ts        save shape, migrations v1 to v9, export and import codes, save slots
  spells.ts      rider spells: what a level knows, the loadout, learning on level-up
  forge.ts       the Forge: gear upgrades, recipes, materials
  adventures.ts  story quests, choices and the daily bounty board
  run.ts         zone runs, rewards, rollGear (trophies and zone loot)
  loadout.ts     gear, set and talent bonuses; riderWeapon applies Forge upgrades
  roost.ts       buildings, timers, expeditions (with materials), temperament
  ai.ts          the auto-battler and suggestedLoadout (used by the sim and tests)
  care.ts progression.ts characters.ts elements.ts events.ts rng.ts data.ts types.ts
src/data/      every balance number and all content, as JSON: zones, enemies, gear, sets, shop, combat (spells),
               progression, stories, bounties, regions, forge, roost, dragons, talents, quests, items, foods, events
src/ui/        Preact screens and pieces
  screens/       Roost, Buildings (incl. the Forge card), Forge (sheet), Map (regions, treasures, story and bounty buttons),
                 Adventures (story and bounty sheets), Battle (orders, round loop, results, story endings), Bag (gear, sets,
                 spells, materials), Town, Dragons, Hatch, Groom, Settings (incl. saved games)
  stage/         battle stage: Stage, BattleStage, director (events to moves, spell colors), choreo, rigs (art loader), tint, Scene
  dev/           hidden pages: #/dev/mock, #/dev/bench, #/dev/art
  Fold.tsx       Fold (collapsible card), SubTabs and usePref (remembered UI state)
  useSave.ts storage.ts  save slots and storage
  Sprites.tsx Icon.tsx Wallet.tsx art.ts bits.tsx (formatBonus, rewardText) styles.css skin.css pwa.ts sound.ts install.ts router.ts
src/art/       painted/ (characters, attack poses, backdrops, effects, tail tips), eggs/, icons/, assets.json (the art manifest)
tests/         Vitest unit tests (196), sim.ts (the balance simulator), save fixtures v1 to v8
e2e/           Playwright phone tests (69), fixtures/ (built by make-fixtures.ts), specs per feature
               (slots, spells, gear, forge, world, ui, stage, perf, smoke, phase2 to 4), helpers.ts (openFold, tab)
tools/art/painted/  style.txt and anchor.png (the style), jobs.py to jobs7.py (one per batch), run.sh, pack.py,
                    fix_green.py, zones.json (which sheet holds which enemies), prompts/ (every prompt that was run)
docs/          HANDOFF.md, NEXT_PROMPT.md, WORLD_PLAN.md, UI_PLAN.md, ART_GENERATION.md, ART_STYLE.md, DESIGN.md, GRAPHICS_PLAN.md, GRAPHICS_PLAN_2.md
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Unit tests (196) |
| `npx tsc --noEmit` and `npm run lint` | Type check and lint. Lint blocks `Math.random`, browser globals in `src/core`, and `any`. |
| `npm run e2e` | Phone tests at 375 by 667 (69), about 2 minutes. Builds the site first. |
| `npm run sim` | Balance sim: 1,000 runs per zone and level, then 100 campaigns per starter from egg to the cap. Flags: `--zone <id>`, `--no-campaign`, `--campaign-only`, `--runs`, `--campaigns`. The full run takes about 4 minutes; one zone about 1 minute. |
| `npx tsx e2e/make-fixtures.ts` | Rebuilds the saves the phone tests load (needed after every save version bump) |
| `npm run deploy` | Tests, lint and build, then pushes the current branch to `main`, which publishes. Only when Eric asks. |
| `#/dev/mock`, `#/dev/bench`, `#/dev/art` | Hidden pages: the mock battle, the frame bench, the art contact sheet |

## Numbers to keep in mind

- First load: about 110 kB of JavaScript gzipped. The service worker precaches about 1.8 MB; zone art (about 4 MB and growing by about 450 KB per area) is cached on first view.
- Stage: about 51 DOM nodes one on one, 69 at two dragons against two enemies (budget 100). The perf test (5 percent dropped frames at 4x CPU throttle) is noisy in the sandbox; run it a few times before blaming a change.
- Campaign in the sim: about 737 fights from egg to level 50, roughly 25 hours at 2 minutes a fight. It finishes all 28 story quests and claims about 30 bounties.
- Content: 11 zones (7 main, 4 side areas), 77 enemies (55 regular, 11 mini-bosses, 11 bosses), 191 gear pieces (122 in the shop, 55 in 11 sets, 8 Forge recipes, plus starter and festival pieces), 12 rider spells, 28 story quests, 6 bounty pools, 3 Forge materials, 40 talents, 3 growth quests, 6 expedition trips, 4 events.

## Gotchas

- **CSS load order.** `stage.css` is imported by a component, so it loads before `styles.css` and `skin.css`. Equal-specificity rules in the later files win. That's why stage fighters use `.actor` and some stage rules are doubled up.
- **The old grayscale rule.** `.sprite img { filter: grayscale(1) }` exists for gray WebP sprites; anything drawn from rigs opts out (`.sprite--rig img`). A phone test checks this.
- **Move detection.** Hit events carry no move kind, so `src/ui/stage/director.ts` matches the move name in the event text. A new spell or move whose name isn't in the data falls back to a lunge or claw.
- **HP lands on impact** in stage mode, not when the event starts.
- **Playwright.** A hash-only `page.goto` doesn't re-render the app; tap the link instead. Use page screenshots with a wait, since stage fighters bob.
- **Tests that end early.** A loop that stops when a fight ends can pass without checking anything. Use seeded fixtures and assert the outcome. A loop waiting for a "next" button must also check for the screen it expects to end on (the story ending).
- **Folds and tabs hide test hooks.** A control inside a closed fold or another sub-tab isn't rendered, so a phone test must open it first: `openFold(page, '<fold id>')` (ids like `roost.forge`, `settings.backup`, `map.highlands`, `map.zone.mossy-hollow`, `bag.spells.locked`) and `tab(page, 'bag' | 'dragons', '<tab>')` from `e2e/helpers.ts`. Fold and tab state is remembered in `localStorage`, and every Playwright test starts with empty storage, so defaults apply. A new long section should be a Fold or a tab, and `e2e/ui.spec.ts` should get a height budget for any new screen.
- **Order rows are tight.** The busiest row is exactly 351 px at 375 wide; adding a button needs a layout change.
- **Save fixtures and migrations.** The phone-test saves in `e2e/fixtures/` are at the current version. After a version bump, rebuild them (`npx tsx e2e/make-fixtures.ts`), or a migration may reset fields a test sets up (the v9 migration resets `bounties`, which broke a bounty test until the fixtures were rebuilt). Keep the previous version's fixture in `tests/fixtures/` for the migration test.
- **The sim's on-level characters** have every boss below their level marked beaten (`onLevelCharacter`), so side areas aren't locked in the table. `pickZone` grinds the highest open zone by array order, so a side area inserted after a main zone takes over its levels in the campaign.
- **Art: green left inside the art.** The image tool sometimes paints a glow in a green close to the key green inside a closed shape (the Will-o'-Whisper's lantern window); the cutout leaves it as a bright green patch. `python3 tools/art/painted/fix_green.py <webp>` recolors it. `pack.py` repacks everything in `v2/out/`, so rerun `fix_green.py` on `will-o-whisper.webp` and `will-o-whisper-attack.webp` after any repack in a session that still has the Fen's raw files.
- **Art: tall or square bosses.** Boss `boxScale` 1.15 suits wide bosses. The Cinderforge Colossus (square) uses 0.9 and the Aurum Basilisk 1.0, or they run off the stage or cover the rider's plate. Always look at the boss screenshot at 375 wide.
- **Art: sheets split by connected shapes**, not by grid cells, so a long spear crossing into the next cell is fine as long as it doesn't touch the next creature.
- **Codex sign-in** codes expire in 15 minutes, and Eric may not see a code posted mid-turn. Post the code at the end of a message and run the login as a tracked background task so its completion wakes you.
- **Raw art files** (about 2 MB PNGs) live only in the session's scratch folder and are gone when the session ends. The packed WebPs in the repo are the source of truth; repacking means generating again.
- **Dragon colors.** New dragon art must stick to the key colors (red body, gold belly, cream horns) or the recolor misses. `tests/tint.test.ts` holds the measured colors.
- **Two-element areas and the spell test.** `tests/spells.test.ts` accepts a spell that beats either of an area's elements; Light and Shadow areas are skipped there because those spells only beat each other.

## How Eric likes to work

- One phase at a time; stop at the done criteria and report what was built and how it was tested, with real numbers (test counts, sim win rates) and screenshots.
- He decides the direction. For a new feature, offer a short list of options with a recommendation, and use multiple-choice questions for design choices; he answers quickly. When a call had to be made without him, list it in the report so he can overrule it.
- He often pre-authorizes deploys for a batch ("do W3 and deploy it, then W4 and deploy it"). Otherwise, ask before deploying.
- Before any art, tell him how many Codex generations it needs. He signs in to Codex himself with the device code.
- Commit after each completed task; develop on the session's feature branch; `main` is what's live. A stop hook asks for uncommitted work to be committed and pushed before a turn ends.
- Plain, direct writing in reports and docs. No em dashes.
- He checks everything on his phone, so visuals must look right at 375 wide first. He reports problems with screenshots; reproduce at 375 wide with a matching save, fix it, and add a test that would have caught it.
- His other game, `ericgbanta/got-sim`, is a reference for how he set up PWA install, art pipelines and planning docs.
