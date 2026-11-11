# Handoff

Last updated 2026-11-11. Read this first, then `CLAUDE.md` and `docs/DESIGN.md`.

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

## What to work on next

**Graphics and UI, starting with the battle screen.** Eric wants an AdventureQuest-style battle: the rider and dragons on one side, enemies on the other, on a painted stage, with real attack animations, and it has to stay fast on a phone. The research and a phased plan are in `docs/GRAPHICS_PLAN.md`. Eric has answered its questions (vector art, agents draw it, every phase B0 to B5, iPhone 17 Pro in Safari); they're in its "Decisions" table. Phase B0 is built and deployed: a mock battle at `#/dev/mock` and a bench at `#/dev/bench`, plus a draft style guide in `docs/ART_STYLE.md`. Eric checked it on his iPhone ("It looks great!"; bench 60 fps, 0.8% dropped). B1 to B4 are built and deployed: the real battle is a side-view stage with every event acted out (B2), there is art for every dragon stage, weapon, enemy, boss and zone (B3), and the Roost, Map and hatching have painted scenes (B4). Eric asked for B2 to B4 in one go and will give feedback after seeing them. B5 (the UI skin) is the last graphics phase. See "B1 result" and "B2 to B4 result" in `docs/GRAPHICS_PLAN.md`, including the calls he may overrule.

After graphics, the open items below.

## Open items and known issues

- **Real-phone check.** Phase 4's done criteria include passing the mobile UX rules on two real phones. Only Eric can do this.
- **Element spreads.** Zone win rates average 70 to 85 percent across the three starters, but single starters dip: Tide in Thunderspire (about 60 percent, Storm beats Tide) and Verdant in Frostmere (about 52 percent, Frost beats Verdant). Eric hasn't said whether that's wanted. The fix would be data only (`src/data/enemies.json`).
- **Small sprites still use placeholders.** The battle stage, Roost, Map strips and hatching use the new art. The small sprites in the dragon picker, Dragons screen, Bag and results still use the code-drawn shapes in `src/ui/Sprites.tsx`; B5 can move them over.
- **Cosmetics** (an ember sink in the design) don't exist yet.
- **Late-game testing on the phone** takes many hours of play. A save code for a late-game character (Elder, two partners) would help Eric look at it; `e2e/make-fixtures.ts` already builds such saves.

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
| Food | Costs gold in town (10, premium 45 to 60). The Pantry makes it over time. |
| Care | Meals and grooming count per dragon. Well kept needs a rest plus one dragon fed and groomed that day. Daily streaks give embers. |
| Ride mode | Offered for boss fights with an Adult (or Elder) lead. One merged unit, four moves. |
| Weapons | Melee scales with Strength, ranged with Agility, magic with Arcana. |
| Events | Four seasonal events give a yearly gift and limited town stock. They don't change fights. |
| Saves | Version 6 (B1 added `settings.simpleBattle`). Each bump has a migration and a fixture test (`tests/fixtures/save-v1.json` to `save-v5.json`). |
| Battle speed | Eric raised the beat limit from 300 ms to 450 ms after seeing B0 (GRAPHICS_PLAN.md, G5). Timings are in `src/data/stage.json`. |
| Offline | vite-plugin-pwa (Workbox), prompt-style updates: a "Reload" bar, never a forced reload mid-fight. |

## How the code is laid out

```
src/core/      pure game logic, no DOM (CLAUDE.md)
  battle.ts      battle engine: fighters, orders, events, Ride mode, second partner
  game.ts        save-level actions (care, runs, shop, talents, Roost, events)
  save.ts        save shape, migrations v1 to v5, export and import codes
  roost.ts       buildings, timers, temperament
  loadout.ts     gear and talent bonuses, talent rules
  run.ts care.ts progression.ts characters.ts elements.ts events.ts ai.ts rng.ts data.ts types.ts
src/data/      every balance number and all content, as JSON
src/ui/        Preact screens and pieces
  screens/Battle.tsx   the battle screen (the graphics work starts here)
  stage/               battle stage: Stage.tsx, BattleStage.tsx (engine state to stage), director.ts (events to moves),
                       choreo.ts (moves), rigs.ts (art loader), Scene.tsx (Roost, Map strips, hatching)
  dev/                 hidden pages: #/dev/mock (mock battle), #/dev/bench (frame bench), #/dev/art (art sheet)
  Sprites.tsx          placeholder dragon and enemy art, and the manifest lookup
  art.ts               sprite manifest loader (lazy per sprite)
  pwa.ts sound.ts install.ts storage.ts useSave.ts router.ts bits.tsx styles.css
src/art/       SVG art (rigs, enemy body plans, backdrops, eggs, effects), palette.json and assets.json
tests/         Vitest unit tests (130), sim.ts (the balance simulator), save fixtures
e2e/           Playwright phone tests (34, including a 4x-throttle perf test), save fixtures and make-fixtures.ts
scripts/       icons.mjs builds the Home Screen icons
docs/          DESIGN.md, HANDOFF.md, GRAPHICS_PLAN.md, ART_STYLE.md
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Unit tests (130) |
| `npx tsc --noEmit` and `npm run lint` | Type check and lint. Lint blocks `Math.random` and browser globals in `src/core`. |
| `npm run e2e` | Phone tests at 375 by 667 (34), about 75 seconds |
| `npm run sim` | Balance sim: 1,000 runs per zone and level, plus campaigns from egg to level 50. Flags: `--runs`, `--campaigns`, `--zone`, `--no-campaign`, `--campaign-only`. The full run takes about 2.5 minutes. |
| `npx tsx e2e/make-fixtures.ts` | Rebuilds the saves the phone tests load |
| `npm run icons` | Rebuilds the Home Screen icons |
| `npm run deploy` | Checks, builds, and pushes to `main`, which publishes. Only when Eric asks. |

## Numbers to keep in mind

- First load: 84 kB of JavaScript gzipped (the battle stage and its art are part of it), 5.7 kB of CSS. The service worker precaches 399 kB in all.
- A full egg-to-level-50 campaign in the sim takes about 800 fights, roughly 27 hours of play at 2 minutes a fight.
- Content: 7 zones, 35 regular enemies, 7 mini-bosses, 7 bosses, 56 pieces of gear, 8 foods, 3 items, 40 talents, 3 growth quests, 6 expedition trips, 4 events.

## How Eric likes to work

- One phase at a time, stop at the done criteria, report what was built and how it was tested, with real test output.
- Ask before guessing when the design is unclear. When a call had to be made, list it in the report so he can overrule it.
- Commit after each completed task. Develop on the session's feature branch; `main` is what's live.
- Plain, direct writing in reports and docs. No em dashes.
- He checks things on his phone, so anything visual needs to look right at 375 wide first.
- His other game, `ericgbanta/got-sim`, is a useful reference for how he set up PWA install, art pipelines and planning docs.
