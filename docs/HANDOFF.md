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

**Graphics and UI, starting with the battle screen.** Eric wants an AdventureQuest-style battle: the rider and dragons on one side, enemies on the other, on a painted stage, with real attack animations, and it has to stay fast on a phone. The research and a phased plan are in `docs/GRAPHICS_PLAN.md`. Start with its "Questions for Eric" and phase B0 (a mock battle plus a bench route he can open on his phone). Don't build B1 onward until he has answered and looked at B0.

After graphics, the open items below.

## Open items and known issues

- **Real-phone check.** Phase 4's done criteria include passing the mobile UX rules on two real phones. Only Eric can do this.
- **Element spreads.** Zone win rates average 70 to 85 percent across the three starters, but single starters dip: Tide in Thunderspire (about 60 percent, Storm beats Tide) and Verdant in Frostmere (about 52 percent, Frost beats Verdant). Eric hasn't said whether that's wanted. The fix would be data only (`src/data/enemies.json`).
- **Placeholder art everywhere.** No real sprites exist. `src/art/assets.json` is empty and every sprite falls back to the code-drawn shapes in `src/ui/Sprites.tsx`.
- **Landscape battle with two partners** truncates dragon names in the party cards. The graphics work replaces these cards anyway.
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
| Saves | Version 5. Each bump has a migration and a fixture test (`tests/fixtures/save-v1.json` to `save-v4.json`). |
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
  Sprites.tsx          placeholder dragon and enemy art, and the manifest lookup
  art.ts               sprite manifest loader (lazy per sprite)
  pwa.ts sound.ts install.ts storage.ts useSave.ts router.ts bits.tsx styles.css
src/art/       sprite files and assets.json (empty so far)
tests/         Vitest unit tests (125), sim.ts (the balance simulator), save fixtures
e2e/           Playwright phone tests (28), save fixtures and make-fixtures.ts
scripts/       icons.mjs builds the Home Screen icons
docs/          DESIGN.md, HANDOFF.md, GRAPHICS_PLAN.md
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Unit tests (125) |
| `npx tsc --noEmit` and `npm run lint` | Type check and lint. Lint blocks `Math.random` and browser globals in `src/core`. |
| `npm run e2e` | Phone tests at 375 by 667 (28), about 75 seconds |
| `npm run sim` | Balance sim: 1,000 runs per zone and level, plus campaigns from egg to level 50. Flags: `--runs`, `--campaigns`, `--zone`, `--no-campaign`, `--campaign-only`. The full run takes about 2.5 minutes. |
| `npx tsx e2e/make-fixtures.ts` | Rebuilds the saves the phone tests load |
| `npm run icons` | Rebuilds the Home Screen icons |
| `npm run deploy` | Checks, builds, and pushes to `main`, which publishes. Only when Eric asks. |

## Numbers to keep in mind

- First load: 69 kB of JavaScript gzipped, 4.4 kB of CSS. The service worker precaches 327 kB in all.
- A full egg-to-level-50 campaign in the sim takes about 800 fights, roughly 27 hours of play at 2 minutes a fight.
- Content: 7 zones, 35 regular enemies, 7 mini-bosses, 7 bosses, 56 pieces of gear, 8 foods, 3 items, 40 talents, 3 growth quests, 6 expedition trips, 4 events.

## How Eric likes to work

- One phase at a time, stop at the done criteria, report what was built and how it was tested, with real test output.
- Ask before guessing when the design is unclear. When a call had to be made, list it in the report so he can overrule it.
- Commit after each completed task. Develop on the session's feature branch; `main` is what's live.
- Plain, direct writing in reports and docs. No em dashes.
- He checks things on his phone, so anything visual needs to look right at 375 wide first.
- His other game, `ericgbanta/got-sim`, is a useful reference for how he set up PWA install, art pipelines and planning docs.
