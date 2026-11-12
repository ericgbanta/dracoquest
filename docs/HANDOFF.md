# Handoff

Last updated 2026-11-12. Read this first, then `CLAUDE.md` and `docs/DESIGN.md`. Everything described here is merged to `main` and live (the art redesign and the Mossy Egg in the town shop were the last deploys). A ready-to-paste prompt for starting a new session is in `docs/NEXT_PROMPT.md`.

## Where things stand

All five build phases in `docs/DESIGN.md` are built and live at https://ericgbanta.github.io/dracoquest/.

| Phase | What it added | Done criteria |
| --- | --- | --- |
| 0 Scaffold | Vite, Preact, Vitest, Playwright, seeded RNG, data loader, versioned save with export and import, tab bar | Met |
| 1 Egg to first boss | Hatching, Roost care, battle engine, Mossy Hollow, leveling, the balance sim | Met in sim and tests; Eric has played it on his phone |
| 2 Growing up | Juvenile and Adult stages with quests, talents, gear and the town shop, zones 2 to 4, Ride mode | Met in sim and tests |
| 3 The Roost | Several dragons, Nest, Pantry, Hatchery, Training Yard, Expedition Board, embers, temperament, second partner | Met in sim and tests |
| 4 Full world | Zones 5 to 7, Elder stage, capstones, egg laying, offline play, sound, seasonal events | Met in sim and tests; "two real phones" not yet checked |

Also shipped: Home Screen install (manifest, icons, standalone tags), matching got-sim's setup.

Eric played the deployed game and said: "This is very good."

## Graphics overhaul: done

The stage, choreography and scenes from this pass are still in use. Its art (B3) and skin (B5) were replaced by the art redesign below.

Eric asked for AdventureQuest-style graphics with a real battle stage that stays fast on a phone. All six graphics phases in `docs/GRAPHICS_PLAN.md` are built and live:

| Phase | What it added | Eric's check |
| --- | --- | --- |
| B0 Look and feasibility | Mock battle (`#/dev/mock`), frame bench (`#/dev/bench`), style guide | "It looks great!"; iPhone 17 Pro bench: 60 fps, 0.8% dropped |
| B1 Stage and rigs | The real battle on a side-view stage: layouts for one or two dragons, Ride mode, one or two enemies, plates, status strip, Simple battle setting | Deployed with no complaints |
| B2 Choreography | Every engine event acted out (dashes, claws, breath, bolts, dives, combos, misses, crits, statuses, knockouts, victory), 450 ms beats, perf test | "These look great" |
| B3 Art | Every dragon stage, the rider's three weapons, all 49 enemies (7 bosses as their own rigs, 42 from 12 body plans), 7 zone backdrops, the Roost, eggs, `#/dev/art` contact sheet | "These look great" |
| B4 Scenes | Painted Roost with idling dragons, zone strips on the Map, the hatching scene | "These look great" |
| B5 UI skin | Panel and button skin, Fredoka headings (self-hosted), 44 SVG icons replacing emoji | "This actually feels good" |

After the graphics phases, Eric asked for more things to be tappable and for split targets. Built at the end of the same session and deployed, along with a fix for the battle log:

- The battle log no longer cuts off its second line, and tapping it opens the whole history again (Eric's report from his phone). A stage rule had pinned the box to 44 px, which also blocked the open state, and the B5 panel border made the old 52 px box too short in the Simple layout. The collapsed log now sizes to its last two lines.
- Gold and ember counters (Roost, Map, Town, Bag) open a sheet saying how many you have, how to earn more and what they buy (`src/ui/Wallet.tsx`; amounts come from the data).
- Enemy plates on the battle stage are buttons: a tap opens the enemy's details sheet with its exact HP, element, weakness and next move.
- The rider, the lead dragon and the second dragon each have their own target. With two living enemies, each order row starts with a chip naming the attacker and its target (`TargetChip` in `Battle.tsx`); a tap moves that attacker to the other enemy. Tapping an enemy on the stage aims everyone at it. Combos and duo combos use the lead dragon's target. Ride mode has one unit, so one target.

On the B4 build, Eric spotted his dragon showing gray on the Dragons and grooming screens but in color on the Roost. An old grayscale rule for tinting gray WebP sprites was hitting the new rig sprites. The B5 deploy fixed it, and a phone test now guards it.

## Art redesign: done and live

After the first graphics pass Eric asked for a more modern, professional look. The full story, including what was tried and dropped, is in `docs/GRAPHICS_PLAN_2.md`. Where it ended up, all deployed on 2026-11-11:

- **Style.** A cel-shaded cartoon built from simple shapes, which Eric picked from six samples ("A with C simpler shapes", `docs/img/style-options.jpg`). The rules are in `docs/ART_STYLE.md`.
- **Art.** Every character, backdrop and effect is a painted WebP in `src/art/painted/`: four dragon stages, the rider with three weapons and a mounted pose, all 49 enemies, seven zone backdrops and the Roost, a breath burst per element, tail tips, slash and spark. The egg and all 44 UI icons are painted too.
- **Poses.** Each character is one image that breathes and leans as a whole, plus an attack pose that is swapped in during its attack. No separately moving heads, jaws or wings.
- **Player colors.** Dragons are painted red and gold and recolored to player colors at load, with an element tail tip drawn on (`src/ui/stage/tint.ts`, `tintBitmap` in `rigs.ts`). The egg is recolored per element the same way.
- **Skin.** `src/ui/skin.css` matches the art: flat fills, a dark navy outline, one hard shade band and a hard drop edge. No gradients.
- **Stage feel.** A vignette, drifting specks per zone, and hit-stop, a camera punch and a glow on heavy hits.
- **Removed.** The old SVG rigs, body plans, backdrops, icons and the scripts that drew them. They are in git history before commit 9d17550.

Eric's verdict after seeing it on his phone: "I see the new art. It's great."

### How the art was made

The images were generated with the Codex CLI's built-in image tool, signed in to Eric's ChatGPT subscription by device code, from inside the cloud session: 61 generations in all, every one usable on the first run.

`docs/ART_GENERATION.md` is the full process: the chosen style, the environment, install and sign-in steps, the prompt shape, the commands and the gotchas. Any new art goes through it. In short: start the session on the "dracoquest" cloud environment, install the CLI, run `codex login --device-auth` and have Eric enter the code, generate with `tools/art/painted/`, and `codex logout` at the end. The earlier session was logged out when it closed.

The raw generated PNGs lived only in that session's container and are gone. The packed WebPs in the repo are the source of truth. Repacking an image means generating it again; changing sizes, boxes or placements only needs `assets.json`.

### Not done, and things to check

- Eric has not yet said whether enemies visibly snap to their attack pose on his phone. The phone test covers it, but no screenshot caught the moment.
- No hurt or defeat poses. The three crack lines on a warming egg are still SVG.
- The offline download was 4.7 MB; W0 cut the precache to 1.8 MB by caching zone art on first view. See "Numbers to keep in mind".
- `docs/GRAPHICS_PLAN_2.md` still lists phases C1 to C4, written before the painted art. Their ideas on camera moves and screen transitions are unbuilt.

## What to work on next

**World expansion (planned 2026-11-12).** Eric wants new areas that unlock every 10 or so rider levels and more kinds of adventure, AQ-style. The plan is `docs/WORLD_PLAN.md`: four side areas inside levels 10 to 50, five frontier areas that raise the cap to 100, and story quests with small choices plus daily bounties in every area. Dragons stay capped at 50. Eric answered the open questions (end of the plan). W0 to W3 (Whispering Fen, Rustcliff Ruins, Moonwell Woods) are built; next is W4, the Gilded Wastes (5 Codex generations, and the Light spell Radiant Lance).

No task is in progress. These are the open threads. Eric closed three on 2026-11-11: the B5 look, battle feel and split targets are good; tap for details is good as it stands; the 100-node stage budget is fine.

1. **Rider spells: built 2026-11-12, not yet deployed.** See "Rider spells" under Decisions. Open questions for Eric: whether Fire in Frostmere at about 95 percent is too easy now (it was 90 before spells), and whether he wants a "best for this zone" button in the Bag, since the sim assumes the best loadout for each zone and a player who never swaps will win a little less.
2. **Element spreads.** Spells mostly closed the two dips: Tide in Thunderspire went from about 60 to 70 percent, Verdant in Frostmere from about 52 to 68 percent. The high end is now Fire in Frostmere (about 95 percent). Any further tuning is data only (`src/data/enemies.json`, or spell numbers in `combat.json`), then rerun `npm run sim`.
3. **Real-phone check.** Phase 4's done criteria include passing the mobile UX rules on two real phones. Only his iPhone has been checked.
4. **Cosmetics** (an ember sink in the design) don't exist yet. They could be painted overlays drawn onto a dragon at load, the way tail tips are.
5. **Late-game save code.** Late-game play takes many hours; a save code for an Elder with two partners would let him look at late screens. `e2e/make-fixtures.ts` already builds such saves (`e2e/fixtures/elder.json`); turn one into an export code with `src/core/save.ts`.
6. **Download size.** Done in W0: zone art is cached on first view, and the precache is 1.8 MB.
7. **More art.** Hurt or defeat poses, painted crack lines for the egg, cosmetics as painted overlays. Needs Codex image generations (see "How the art was made").

## Decisions made along the way

These are in addition to the Decisions table in `docs/DESIGN.md`. Eric saw each one in a report and didn't object, but none were asked as direct questions.

| Topic | Decision |
| --- | --- |
| Deploys | Pages deploys from GitHub Actions (`.github/workflows/deploy.yml`) when `main` changes. `npm run deploy` runs the checks and pushes to `main`. Only deploy when Eric asks. |
| Win rate | "On-level win rate" means a full zone run, boss included, not a single fight. |
| Element multiplier | Same element is 0.75x (the design's starting value was 0.5x). Enemy basic attacks are physical; their special moves carry the element. |
| Level scaling | Player move damage grows 12 percent per level (`combat.json`, `levelDamageScale`), on top of gear. |
| XP curve | Enemy XP tapers so fights per level go from about 8 early to about 20 near level 50. |
| Bosses | Each zone's boss appears from one level below the zone's top level; before that, runs end with a mini-boss. First kill always drops an egg; later kills have a 10 percent chance. Eclipse Peak drops Light or Shadow. |
| Eggs in town | The shop's Supplies tab sells a Mossy (Verdant) Egg for 1,500 gold (`eggs` in `src/data/shop.json`, `buyEgg` in `game.ts`). No boss drops a Verdant egg, so before this a keeper who started with Fire or Tide could only get one from an Elder Verdant dragon. Added 2026-11-11 at Eric's request. The price is about a level 21 weapon. |
| Food | Costs gold in town (10, premium 45 to 60). The Pantry makes it over time. |
| Care | Meals and grooming count per dragon. Well kept needs a rest plus one dragon fed and groomed that day. Daily streaks give embers. |
| Ride mode | Offered for boss fights with an Adult (or Elder) lead. One merged unit, four moves. |
| Weapons | Melee scales with Strength, ranged with Agility, magic with Arcana. |
| Events | Four seasonal events give a yearly gift and limited town stock. They don't change fights. |
| Saves | Version 9 (W0 added story choices and bounties; v8 the Forge; v7 `rider.spells`; v6 `settings.simpleBattle`). Each bump has a migration and a fixture test (`tests/fixtures/save-v1.json` to `save-v8.json`). |
| Gear wave 1 | Eric asked on 2026-11-12 for more gear that fits the game; he picked trophies, zone loot, more tier choices and sets, with a Forge to follow. **Tier choices:** 40 more shop pieces. Each weapon tier from level 5 gets a second weapon per type in another element (same damage and main stat; melee twins trade crit for Vigor), so every ring element is on sale at most tiers; a light armor line (less defense and HP, plus Agility and Arcana); and dodge saddles, claw horn caps and status charms for Adults. **Sets:** one per zone in `src/data/sets.json`: three weapons (one per type, sharing the weapon slot), an armor and a trinket. 2 and 3 pieces give stacking bonuses (`equippedSets` in `loadout.ts`, added in `riderBonus`). Set weapons have no element and one more damage than the shop curve. **Trophies:** a zone's boss drops the set armor and its mini-boss the trinket, always on the first kill (counted from the bestiary, so players who beat a boss before this update rely on the 25 percent repeat chance), then 25 percent until owned (`boss.trophy`, `miniBoss.trophy` in `zones.json`). **Zone loot:** each regular fight won has a 6 percent chance to drop one of the zone's set weapons not yet owned (`gearDrops`). Quests drop no gear. Drops use `rollGear` in `run.ts`. The Map shows "Treasures: n of 5 found" per zone with a sheet saying where each piece drops; the Bag shows set progress; the results screen announces finds. No art: gear is text. No save change. |
| Forge (gear wave 2) | Built 2026-11-12. A sixth Roost building (`buildings.forge` in `roost.json`, 3 levels capping upgrades at +1, +2, +3). Three materials, Iron Ore, Sky Crystal and Dragonscale (`src/data/forge.json`), come from expeditions (`materials` per trip, scaled by the board's loot multiplier) and from fights: each mini-boss win gives 2 ore and each boss win 1 crystal and 1 scale. Upgrades work on rider gear only (weapon, armor, trinket), because dragon bonuses are computed from the dragon alone; each plus adds 8 percent of a weapon's damage (at least 1) and 15 percent of each bonus (flat bonuses at least +1). Costs scale with the gear's level; +2 and +3 also cost embers. Four Forge-only pieces are crafted from recipes (a level 2 Forge for the Forgeheart Amulet, level 3 for the Starforged Blade, Bow and Staff). Upgrades are stored as `rider.upgrades` (gear id to plus) and applied in `riderBonus` and `riderWeapon` (`forgedGear` in `src/core/forge.ts`); selling a piece drops its upgrade. Save v8 adds `rider.materials`, `rider.upgrades` and `roost.levels.forge`. Percent bonuses now show one decimal (2.3%) so upgrades are visible. In the sim, campaigns end with about 10 pluses and about 2,500 less gold left over, and run win rates move under a point. |
| World W3: Moonwell Woods | Built 2026-11-12. The third side area: levels 30 to 40, Shadow and Frost, opening at rider level 30 after the Storm Roc. Enemies: Hoot Shade, Frostcap Shroom, Snickerbark, Shadow Fox, Rimeback Badger, the mini-boss Duskhorn (a starry stag) and the boss Moonwell Wyrm, who turns Frost and drops a Shadow or Frost egg. Stats from Frostmere's, with attack 5 percent higher: Fire 83, Tide 81 and Verdant 77 percent. **Umbral Bolt** (`combat.json`), the first Shadow rider spell: level 32, 19 base, 7 MP, may Blind; it is strong only against Light, so it matters most in Eclipse Peak and the Gilded Wastes. Also: the Nightwatch set, a Moonwell shop line at level 33, the Moonsilver Locket recipe (level 2 Forge), a five-quest story with Lamplighter Nell and Duskhorn (two choices) and a bounty pool. Art from `tools/art/painted/jobs6.py`. The Gilded Wastes are the next teaser. |
| World W2: Rustcliff Ruins | Built 2026-11-12. The second side area: levels 20 to 30, Stone and Fire, opening at rider level 20 after the Magma Wyrm. Enemies: Cog Crawler, Brass Sentry, Boiler Bot, Spark Hound, Gargoyle Pup, the mini-boss Captain Clank and the boss Cinderforge Colossus, who stokes its furnace and turns Fire, and drops a Stone or Fire egg. Stats start from Thunderspire's, but copying them made the area far too easy (96 percent): Thunderspire's danger comes from Storm specials and stuns, and the Ruins' enemies spend turns hardening. Ruins enemies hit about 9 percent harder than Thunderspire's and have 20 percent more HP, which gives Fire 77, Tide 77 and Verdant 83 percent. Also: the Cogwright set, a Ruins shop line at level 23, the Clockwork Heart recipe (level 2 Forge), a five-quest story with Archivist Odd and Captain Clank (two choices) and a bounty pool. Art from `tools/art/painted/jobs5.py` (5 generations). The Colossus is nearly square, so its `boxScale` is 0.9 instead of the bosses' usual 1.15, or its head leaves the stage. The spell test now accepts a spell that beats either element of a two-element area. Moonwell Woods is the next teaser. |
| World W1: Whispering Fen | Built 2026-11-12. The first side area: levels 10 to 20, Verdant and Tide (`elements` on the zone), opening at rider level 10 after the Bramble Troll (`unlock` on the zone; `zoneLock` checks it before the old dragon-stage `gate`). Enemies: Murk Toad, Will-o'-Whisper, Reed Stalker, Bogling (Stone, so Fire starters aren't swamped by Tide), Lily Snapper, the mini-boss Old Croaker and the boss Whisperwillow, who turns Tide mid-fight and drops Verdant eggs. Fen enemies hit 5 percent softer than Cinder Pass's. Also: the Mirewalker set, a Fen shop line at level 13, the Whisperwood Charm recipe, a five-quest story with Ferryman Bo (two choices) and a bounty pool. The shop still sells the Mossy Egg even though a boss now drops Verdant eggs (Eric asked for the egg; the test now checks only that no early zone drops Verdant). Art: 5 Codex generations (`tools/art/painted/jobs4.py`), packed with `pack.py`; `fix_green.py` recolored key green inside the lantern that the cutout couldn't reach. The next teaser is Rustcliff Ruins. |
| World W0 | Built 2026-11-12 (`docs/WORLD_PLAN.md`, phase W0). **Regions:** the Map groups zones under region headers (`src/data/regions.json`) and shows the next planned area as a dimmed teaser card (`upcoming`, first entry only). **Story quests** (`src/data/stories.json`, logic in `src/core/adventures.ts`): chains of quests per zone, played once, unlocked by level and the previous quest, with fixed enemy levels; a step marked `boss` or `mini` counts as that fight (trophy, egg, embers, materials). The last fight adds the quest's reward XP; gold, items, embers and materials land on completion. One quest per chain has a choice: its option gives a reward and `storyChoiceTemper` points to the lead dragon, and can be made from the results screen or later from the story list. NPCs speak with `speaker: 'npc'` and a `name`. Mossy Hollow and Saltmarsh Shore have four quests each. **Bounties** (`src/data/bounties.json`): each zone with a pool posts three a day, picked from a seed of the date and zone; won fights in the zone count (defeat an enemy, win fights, finish hunts); the board resets when the day changes (`startRun` and `startStory` take `today`). **Save v9** adds `storyChoices` and `bounties`. **Art caching:** enemy art and zone backdrops are no longer precached (`globIgnores` in `vite.config.ts`); they are cached on first view (`dracoquest-area-art`), so the first download is 1.8 MB instead of 4.7 MB. Offline in a zone never visited shows placeholder shapes. The Map's run button now says "Start a hunt". |
| Rider spells | Eric's picks on 2026-11-12: spells unlock by rider level, about eight with elements, a loadout of 4 (`spellLoadoutSize` in `progression.json`), power from Arcana as before. Ten spells in `riderMoves.spells` (`combat.json`): Arc Bolt and Mend at 1, Frost Dart 3, Static Lash 6, Bright Ward 10 (Ward shield on the rider or lead dragon), Tide Surge 12, Ember Lance 15, Shale Spike 18, Greater Mend 24, Thorn Snare 30. Each ring element has one damage spell that may inflict its status, timed so the spell that beats a zone's element arrives within two levels of the zone opening. A new spell fills an empty loadout slot by itself; otherwise the results screen says to swap it in from the Bag (Spells card). The battle picker shows only the loadout and marks a spell that is strong against the rider's target. No new art: spells fly as the existing orb, colored by element (`spellColor` in `director.ts`). Logic is in `src/core/spells.ts`; the auto-battler picks heals, Ward before big hits and the best spell for the target's element, and `suggestedLoadout` (in `ai.ts`) picks a loadout for the sim. |
| Save slots | Up to 3 saved games per device, added 2026-11-12 at Eric's request. Slot 1 is the original `dracoquest.save` key, so a save made before slots existed stays put as slot 1. Slots 2 and 3 are `dracoquest.save.2` and `.3`, and `dracoquest.slot` holds the slot in play (missing or bad means slot 1). The save object did not change, so no version bump. The list is in Settings ("Saved games"): Play or New game on other slots, Delete with a confirm, and the slot in play can't be deleted (Start over clears it instead). Export, import and Start over act on the slot in play. Settings such as sound live in each save, so they are per slot. |
| Battle speed | Eric raised the beat limit from 300 ms to 450 ms after seeing B0 (GRAPHICS_PLAN.md, G5). Timings are in `src/data/stage.json`. |
| Offline | vite-plugin-pwa (Workbox), prompt-style updates: a "Reload" bar, never a forced reload mid-fight. The precache includes `woff2` for the heading font. |
| Art pipeline | Painted WebP generated with an image model and packed by `tools/art/painted/` (replaced the agent-drawn SVG of the first pass on 2026-11-11). One image per character; dragons are recolored to player colors once at load. |
| Battle details | Tap an enemy to aim everyone at it; tap it again (once everyone is on it), tap its plate, or tap a party member for the details sheet. Party plates are display only. |
| Split targets | Each attacker keeps its own target (rider, lead dragon, second dragon). The chip at the start of each order row shows and cycles it, only when two enemies are alive. |
| Currency info | Gold and ember counters are buttons that open an explainer sheet. |
| Simple battle | A setting (save v6) that brings back the old card layout instead of the stage. |
| Stage node budget | 100 DOM nodes on the stage. Eric confirmed it on 2026-11-11. |
| Headings | Fredoka (SIL Open Font License) from `@fontsource/fredoka`, latin 600 only. Body text is the system font at 16 px. |

## How the code is laid out

```
src/core/      pure game logic, no DOM (CLAUDE.md)
  battle.ts      battle engine: fighters, orders, events, Ride mode, second partner
  game.ts        save-level actions (care, runs, shop, talents, Roost, events)
  save.ts        save shape, migrations v1 to v9, export and import codes, save slots
  spells.ts      rider spells: what a level knows, the loadout, learning on level-up
  forge.ts       the Forge: gear upgrades, recipes, materials
  adventures.ts  story quests, choices and the daily bounty board
  roost.ts       buildings, timers, temperament
  loadout.ts     gear and talent bonuses, talent rules
  run.ts care.ts progression.ts characters.ts elements.ts events.ts ai.ts rng.ts data.ts types.ts
src/data/      every balance number and all content, as JSON (sets.json holds the gear sets)
src/ui/        Preact screens and pieces
  screens/Battle.tsx   the battle screen: orders, the round loop (plays events through the stage), sheets, results
  stage/               battle stage: Stage.tsx, BattleStage.tsx (engine state to stage), director.ts (events to moves),
                       choreo.ts (moves), rigs.ts (art loader), tint.ts (player colors on painted dragons),
                       Scene.tsx (Roost, Map strips, hatching)
  dev/                 hidden pages: #/dev/mock (mock battle), #/dev/bench (frame bench), #/dev/art (art sheet)
  Sprites.tsx          small dragon and enemy sprites: the rig when art exists, else a code-drawn shape
  Icon.tsx             UI icons from src/art/icons, with emoji fallbacks; Gold and Embers amounts
  Wallet.tsx           tappable gold and ember counters with their explainer sheets
  art.ts               old WebP sprite lookup (still used as a second fallback)
  styles.css           base styles; skin.css layers the B5 look on top
  pwa.ts sound.ts install.ts storage.ts useSave.ts router.ts bits.tsx
src/art/       painted/ (WebP characters, attack poses, backdrops, effects, tail tips), eggs/ and icons/ (WebP), palette.json, assets.json
src/data/stage.json  stage layouts, plate spots, beat timings, the demo fight (UI only, not read by src/core)
tests/         Vitest unit tests (196), sim.ts (the balance simulator), save fixtures
e2e/           Playwright phone tests (63, including a 4x-throttle perf test), save fixtures and make-fixtures.ts
scripts/       icons.mjs builds the Home Screen icons
tools/art/     painted/ (prompts, the style anchor, and the scripts that generate, cut out and pack the art)
docs/          DESIGN.md, HANDOFF.md, WORLD_PLAN.md (world expansion plan), ART_GENERATION.md (how to make new art), GRAPHICS_PLAN_2.md (second graphics pass: research, C0 result, C1 to C4), NEXT_PROMPT.md (prompt for a new session), GRAPHICS_PLAN.md (graphics plan and results), ART_STYLE.md (art rules)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Unit tests (196) |
| `npx tsc --noEmit` and `npm run lint` | Type check and lint. Lint blocks `Math.random` and browser globals in `src/core`. |
| `npm run e2e` | Phone tests at 375 by 667 (63), about 2 minutes |
| `npm run sim` | Balance sim: 1,000 runs per zone and level, plus campaigns from egg to level 50. Flags: `--runs`, `--campaigns`, `--zone`, `--no-campaign`, `--campaign-only`. The full run takes about 2.5 minutes. |
| `npx tsx e2e/make-fixtures.ts` | Rebuilds the saves the phone tests load |
| `npm run icons` | Rebuilds the Home Screen icons |
| `npm run deploy` | Checks, builds, and pushes to `main`, which publishes. Only when Eric asks. |
| `#/dev/mock`, `#/dev/bench`, `#/dev/art` | Hidden pages: the B0 mock battle, the frame bench (1 vs 1 or 2 vs 2), the art contact sheet. They load on demand and work without a save. |

## Numbers to keep in mind

- First load: 108 kB of JavaScript gzipped (down from 163, since the SVG art no longer ships as text). The painted art is about 4.6 MB of WebP (characters, poses and backdrops 4.2 MB, icons 0.3 MB, eggs 0.1 MB). A fight loads only what it needs. Since W0 the service worker precaches 1.8 MB (everything but enemy art and zone backdrops, which are cached on first view); before that it precached 4.7 MB.
- Stage: about 51 DOM nodes in a one-on-one fight, 69 at two dragons against two enemies (budget 100). The perf test (5% dropped frames at 4x CPU throttle) usually reads 0.3 to 2%, but it is noisy in the sandbox and sometimes reads 5 to 7% on unchanged code. Run it a few times before blaming a change.
- Battle pace: each event waits for its move, so a round at 1x takes about 2 to 3 seconds; 2x halves it.
- A full egg-to-level-50 campaign in the sim takes about 800 fights, roughly 27 hours of play at 2 minutes a fight.
- Content: 10 zones (7 main and 3 side areas), 50 regular enemies, 10 mini-bosses, 10 bosses, 8 foods, 3 items, 11 rider spells, 135 pieces of gear (90 in the shop, 35 in 7 zone sets, 4 Forge recipes, 6 starter or festival pieces), 3 Forge materials, 40 talents, 3 growth quests, 6 expedition trips, 4 events.

## Gotchas

- **CSS load order.** `stage.css` is imported by a component, so it loads before `styles.css` and `skin.css`. Equal-specificity rules in the later files win. That's why stage fighters use the class `.actor` (the card layout owns `.fighter`) and some stage rules are doubled up (`.stage .stage-header`).
- **The old grayscale rule.** `.sprite img { filter: grayscale(1) }` exists for tinting gray WebP sprites. Anything drawn from rigs must opt out (`.sprite--rig img`). A phone test checks this.
- **Move detection.** Hit events carry no move kind, so `src/ui/stage/director.ts` matches the move's name in the event text against the game data. A new move whose name isn't in the data falls back to a lunge or claw. If the engine ever adds a move field to events, use it.
- **HP lands on impact.** In stage mode the round loop applies each event's HP change when the move's `onImpact` fires, not when the event starts. The simple card layout still applies it at the start.
- **The bench measures the main thread.** It counts `requestAnimationFrame` frames, so it misses frames the GPU drops. Safari runs pages at 60 Hz even on ProMotion screens. Long tasks aren't reported in Safari.
- **Playwright.** A hash-only `page.goto` doesn't re-render the app in these tests; tap the link instead. Stage fighters bob, so element screenshots of them can time out waiting to be stable; use page screenshots with a clip.
- **Tests that end early.** A battle test that loops rounds and returns when the fight ends can pass without checking anything. Check after a fixed number of rounds with a seeded fixture, and fail if the fight is already over.
- **Order rows are tight.** The busiest row (Dragon with Skill, Duo and Combo, plus a target chip) is exactly 351 px at 375 wide. The split-target test fails if any order row overflows; adding a button to a row needs a layout change, not just another button.
- **Generating art.** `codex exec` needs `< /dev/null`, and a `-i` reference image must come before `--` and the prompt. The image tool can't make transparent backgrounds; characters come on flat green and `pack.py` cuts them out. Keep bright green out of the art itself.
- **Dragon colors.** New dragon art must stick to the key colors (red body, gold belly, cream horns) or the recolor will miss or hit the wrong areas. `tests/tint.test.ts` holds the measured colors.

## How Eric likes to work

- One phase at a time, stop at the done criteria, report what was built and how it was tested, with real test output.
- Ask before guessing when the design is unclear. When a call had to be made, list it in the report so he can overrule it.
- Commit after each completed task. Develop on the session's feature branch; `main` is what's live.
- Plain, direct writing in reports and docs. No em dashes.
- He checks things on his phone, so anything visual needs to look right at 375 wide first.
- He reports problems from his phone with screenshots. Reproduce in the sandbox at 375 wide with a save that matches his (the fixtures in `e2e/fixtures/` help), fix, and add a test that would have caught it.
- His other game, `ericgbanta/got-sim`, is a useful reference for how he set up PWA install, art pipelines and planning docs.
