# Handoff

Last updated 2026-11-11. Read this first, then `CLAUDE.md` and `docs/DESIGN.md`. Everything described here is merged to `main` and live. A ready-to-paste prompt for starting a new session is in `docs/NEXT_PROMPT.md`.

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

Eric asked for AdventureQuest-style graphics with a real battle stage that stays fast on a phone. All six graphics phases in `docs/GRAPHICS_PLAN.md` are built and live:

| Phase | What it added | Eric's check |
| --- | --- | --- |
| B0 Look and feasibility | Mock battle (`#/dev/mock`), frame bench (`#/dev/bench`), style guide | "It looks great!"; iPhone 17 Pro bench: 60 fps, 0.8% dropped |
| B1 Stage and rigs | The real battle on a side-view stage: layouts for one or two dragons, Ride mode, one or two enemies, plates, status strip, Simple battle setting | Deployed with no complaints |
| B2 Choreography | Every engine event acted out (dashes, claws, breath, bolts, dives, combos, misses, crits, statuses, knockouts, victory), 450 ms beats, perf test | "These look great" |
| B3 Art | Every dragon stage, the rider's three weapons, all 49 enemies (7 bosses as their own rigs, 42 from 12 body plans), 7 zone backdrops, the Roost, eggs, `#/dev/art` contact sheet | "These look great" |
| B4 Scenes | Painted Roost with idling dragons, zone strips on the Map, the hatching scene | "These look great" |
| B5 UI skin | Panel and button skin, Fredoka headings (self-hosted), 44 SVG icons replacing emoji | Deployed; feedback pending |

After the graphics phases, Eric asked for more things to be tappable and for split targets. Built at the end of the same session and deployed, along with a fix for the battle log:

- The battle log no longer cuts off its second line, and tapping it opens the whole history again (Eric's report from his phone). A stage rule had pinned the box to 44 px, which also blocked the open state, and the B5 panel border made the old 52 px box too short in the Simple layout. The collapsed log now sizes to its last two lines.
- Gold and ember counters (Roost, Map, Town, Bag) open a sheet saying how many you have, how to earn more and what they buy (`src/ui/Wallet.tsx`; amounts come from the data).
- Enemy plates on the battle stage are buttons: a tap opens the enemy's details sheet with its exact HP, element, weakness and next move.
- The rider, the lead dragon and the second dragon each have their own target. With two living enemies, each order row starts with a chip naming the attacker and its target (`TargetChip` in `Battle.tsx`); a tap moves that attacker to the other enemy. Tapping an enemy on the stage aims everyone at it. Combos and duo combos use the lead dragon's target. Ride mode has one unit, so one target.

On the B4 build, Eric spotted his dragon showing gray on the Dragons and grooming screens but in color on the Roost. An old grayscale rule for tinting gray WebP sprites was hitting the new rig sprites. The B5 deploy fixed it, and a phone test now guards it.

## Graphics, second pass: C0 built, waiting for Eric

Eric asked to take the art "to the next level", modern but still AdventureQuest in feel, and fast on his iPhone 17 Pro. The research, the plan (C0 to C4) and the calls made are in `docs/GRAPHICS_PLAN_2.md`. C0, the look proof, is built on the session branch and not deployed:

- Every rig part gets a lighting pass at load (`lightSvg` in `src/ui/stage/rigs.ts`, numbers in `palette.json` under `lighting`).
- Thunderspire is repainted as the model scene, with a foreground layer and drifting specks (`front` and `ambient` in `assets.json`). Every stage has a vignette.
- Strong hits and crits get hit-stop, a camera punch and a glow (`punch`, `hitStop`, `glow` in `stage.json`).

`#/dev/mock` also has a Look A / Look B switch. B is a second style Eric asked to compare: colored outlines, characters tinted toward the scene's light, and a paper grain. It exists only on the mock.

Next step: Eric compares the two looks (`docs/img/c0-look-a-b.png`, or the deployed `#/dev/mock`), picks one or a mix, and answers the checkpoint questions in the plan. Then C1 repaints the other zones and the Roost, which currently show lit characters on old scenery.

## What to work on next

Besides the graphics pass above, these are the open threads. Eric closed three on 2026-11-11: the B5 look, battle feel and split targets are good; tap for details is good as it stands; the 100-node stage budget is fine.

1. **Element spreads.** Zone win rates average 70 to 85 percent across the three starters, but single starters dip: Tide in Thunderspire (about 60 percent, Storm beats Tide) and Verdant in Frostmere (about 52 percent, Frost beats Verdant). He hasn't said whether that's wanted. The fix would be data only (`src/data/enemies.json`), then rerun `npm run sim`.
2. **Real-phone check.** Phase 4's done criteria include passing the mobile UX rules on two real phones. Only his iPhone has been checked.
3. **Cosmetics** (an ember sink in the design) don't exist yet. With rigs and extras, cosmetics could be extra parts on a dragon (hats, saddles, horn caps) listed in `assets.json`.
4. **Late-game save code.** Late-game play takes many hours; a save code for an Elder with two partners would let him look at late screens. `e2e/make-fixtures.ts` already builds such saves (`e2e/fixtures/elder.json`); turn one into an export code with `src/core/save.ts`.
5. **First-load size.** 163 kB of JavaScript gzipped, because all SVG art ships as text in the main bundle (colors are baked in at load). If load time ever matters, split the art per zone with lazy `import.meta.glob` and preload a zone's art when a run starts.
6. **Better art.** Everything is agent-drawn SVG. Eric may want to swap in his own art later: any part, backdrop or icon can be replaced through `src/art/assets.json` (or the icon file name) with no code change.

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
| Offline | vite-plugin-pwa (Workbox), prompt-style updates: a "Reload" bar, never a forced reload mid-fight. The precache includes `woff2` for the heading font. |
| Art pipeline | Agents draw SVG in the repo (GRAPHICS_PLAN.md, G2), not WebP from Eric. Parts are drawn in place on a shared canvas and rotate around pivots in `assets.json`. Tinted art uses gray tokens swapped for real colors once at load. |
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
  save.ts        save shape, migrations v1 to v6, export and import codes
  roost.ts       buildings, timers, temperament
  loadout.ts     gear and talent bonuses, talent rules
  run.ts care.ts progression.ts characters.ts elements.ts events.ts ai.ts rng.ts data.ts types.ts
src/data/      every balance number and all content, as JSON
src/ui/        Preact screens and pieces
  screens/Battle.tsx   the battle screen: orders, the round loop (plays events through the stage), sheets, results
  stage/               battle stage: Stage.tsx, BattleStage.tsx (engine state to stage), director.ts (events to moves),
                       choreo.ts (moves), rigs.ts (art loader), Scene.tsx (Roost, Map strips, hatching)
  dev/                 hidden pages: #/dev/mock (mock battle), #/dev/bench (frame bench), #/dev/art (art sheet)
  Sprites.tsx          small dragon and enemy sprites: the rig when art exists, else a code-drawn shape
  Icon.tsx             UI icons from src/art/icons, with emoji fallbacks; Gold and Embers amounts
  Wallet.tsx           tappable gold and ember counters with their explainer sheets
  art.ts               old WebP sprite lookup (still used as a second fallback)
  styles.css           base styles; skin.css layers the B5 look on top
  pwa.ts sound.ts install.ts storage.ts useSave.ts router.ts bits.tsx
src/art/       SVG art (rigs, enemy plans and extras, backdrops, eggs, effects, icons), palette.json, assets.json
src/data/stage.json  stage layouts, plate spots, beat timings, the demo fight (UI only, not read by src/core)
tests/         Vitest unit tests (137), sim.ts (the balance simulator), save fixtures
e2e/           Playwright phone tests (39, including a 4x-throttle perf test), save fixtures and make-fixtures.ts
scripts/       icons.mjs builds the Home Screen icons
tools/art/     rigpreview.mjs (render a rig or backdrop to PNG), BRIEF.md (brief for art agents), generators/
docs/          DESIGN.md, HANDOFF.md, GRAPHICS_PLAN_2.md (second graphics pass: research, C0 result, C1 to C4), NEXT_PROMPT.md (prompt for a new session), GRAPHICS_PLAN.md (graphics plan and results), ART_STYLE.md (art rules)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Unit tests (137) |
| `npx tsc --noEmit` and `npm run lint` | Type check and lint. Lint blocks `Math.random` and browser globals in `src/core`. |
| `npm run e2e` | Phone tests at 375 by 667 (39), about 95 seconds |
| `npm run sim` | Balance sim: 1,000 runs per zone and level, plus campaigns from egg to level 50. Flags: `--runs`, `--campaigns`, `--zone`, `--no-campaign`, `--campaign-only`. The full run takes about 2.5 minutes. |
| `npx tsx e2e/make-fixtures.ts` | Rebuilds the saves the phone tests load |
| `npm run icons` | Rebuilds the Home Screen icons |
| `npm run deploy` | Checks, builds, and pushes to `main`, which publishes. Only when Eric asks. |
| `node tools/art/rigpreview.mjs ...` | Renders a rig or backdrop to a PNG (see `tools/art/README.md`) |
| `#/dev/mock`, `#/dev/bench`, `#/dev/art` | Hidden pages: the B0 mock battle, the frame bench (1 vs 1 or 2 vs 2), the art contact sheet. They load on demand and work without a save. |

## Numbers to keep in mind

- First load: 163 kB of JavaScript gzipped and 7 kB of CSS, because all the SVG art is bundled as text so colors can be baked in. The service worker precaches 864 kB in all, under the plan's 1.5 MB art budget.
- Stage: about 67 DOM nodes in a one-on-one fight, 98 at two dragons against two enemies (budget 100). The perf test dropped 0 to 2.2% of frames at 4x CPU throttle when B2 was built (budget 5%), but it is noisy: on 2026-11-11 unchanged `main` scored 4.8 to 7.5% in the sandbox. Run it a few times and compare against `main` before blaming a change.
- Battle pace: each event waits for its move, so a round at 1x takes about 2 to 3 seconds; 2x halves it.
- A full egg-to-level-50 campaign in the sim takes about 800 fights, roughly 27 hours of play at 2 minutes a fight.
- Content: 7 zones, 35 regular enemies, 7 mini-bosses, 7 bosses, 56 pieces of gear, 8 foods, 3 items, 40 talents, 3 growth quests, 6 expedition trips, 4 events.

## Gotchas

- **CSS load order.** `stage.css` is imported by a component, so it loads before `styles.css` and `skin.css`. Equal-specificity rules in the later files win. That's why stage fighters use the class `.actor` (the card layout owns `.fighter`) and some stage rules are doubled up (`.stage .stage-header`).
- **The old grayscale rule.** `.sprite img { filter: grayscale(1) }` exists for tinting gray WebP sprites. Anything drawn from rigs must opt out (`.sprite--rig img`). A phone test checks this.
- **Move detection.** Hit events carry no move kind, so `src/ui/stage/director.ts` matches the move's name in the event text against the game data. A new move whose name isn't in the data falls back to a lunge or claw. If the engine ever adds a move field to events, use it.
- **HP lands on impact.** In stage mode the round loop applies each event's HP change when the move's `onImpact` fires, not when the event starts. The simple card layout still applies it at the start.
- **The bench measures the main thread.** It counts `requestAnimationFrame` frames, so it misses frames the GPU drops. Safari runs pages at 60 Hz even on ProMotion screens. Long tasks aren't reported in Safari.
- **Playwright.** A hash-only `page.goto` doesn't re-render the app in these tests; tap the link instead. Stage fighters bob, so element screenshots of them can time out waiting to be stable; use page screenshots with a clip.
- **Tests that end early.** A battle test that loops rounds and returns when the fight ends can pass without checking anything. Check after a fixed number of rounds with a seeded fixture, and fail if the fight is already over.
- **Order rows are tight.** The busiest row (Dragon with Skill, Duo and Combo, plus a target chip) is exactly 351 px at 375 wide. The split-target test fails if any order row overflows; adding a button to a row needs a layout change, not just another button.
- **Art agents.** Give them `tools/art/BRIEF.md`, their own folders and a fragment file, and review their renders before merging. Commit their folders only after review (`git add -A src` sweeps in work in progress).

## How Eric likes to work

- One phase at a time, stop at the done criteria, report what was built and how it was tested, with real test output.
- Ask before guessing when the design is unclear. When a call had to be made, list it in the report so he can overrule it.
- Commit after each completed task. Develop on the session's feature branch; `main` is what's live.
- Plain, direct writing in reports and docs. No em dashes.
- He checks things on his phone, so anything visual needs to look right at 375 wide first.
- He reports problems from his phone with screenshots. Reproduce in the sandbox at 375 wide with a save that matches his (the fixtures in `e2e/fixtures/` help), fix, and add a test that would have caught it.
- His other game, `ericgbanta/got-sim`, is a useful reference for how he set up PWA install, art pipelines and planning docs.
