# DracoQuest: research and design brief

Nov 10, 2026 · @Eric

## Summary

The game is a single-player, turn-based fantasy RPG in the AdventureQuest mold, rebuilt around one idea: you are a dragon keeper, and the dragon you hatch and raise is your main weapon. It runs in the phone browser, plays in short sessions, and ships as a static site on GitHub Pages with no backend.

This brief has three parts. The research covers what AdventureQuest is and why it held players for two decades. The design section adapts that formula to dragon raising. The last part is a build plan a coding agent can follow phase by phase.

Title: DracoQuest. Repo: `dracoquest` (public, served as a GitHub Pages project page).

## Research: AdventureQuest and its dragon cousin

AdventureQuest (AQ) is a Flash browser RPG that Artix Entertainment launched in October 2002. It is single-player, though character data lives on Artix's servers. Almost everything happens in one screen: a turn-based fight between your character and a monster ([Wikipedia](https://en.wikipedia.org/wiki/AdventureQuest)).

### How AQ plays

Most fights start from random encounters or quests. On your turn you can attack, swap gear, use an item, cast a spell, use a gear skill, call a pet or guest, or flee. Players and monsters both carry elemental and weapon-type resistances, so picking the right element matters. Wins pay out XP, gold, and occasionally the premium Z-Token currency ([Wikipedia](https://en.wikipedia.org/wiki/AdventureQuest)).

Characters get 5 stat points per level, up to 750, spread across six stats ([AQ forums](https://forums2.battleon.com/f/tm.asp?m=22423333)):

| Stat | What it drives in AQ |
| --- | --- |
| STR | Melee damage and accuracy |
| DEX | Ranged attacks, blocking, initiative |
| INT | Magic weapons, spells, MP |
| END | HP and staying power |
| CHA | Pet and guest damage and accuracy |
| LUK | Small bonus to nearly everything |

AQ's formulas are public and players optimize them hard ([AQ Wiki formula list](https://adventurequestwiki.fandom.com/wiki/Big_List_of_AQ_Formulas)). CHA is the closest thing AQ has to a "companion stat", which matters for a dragon game.

### What surrounds the fights

| System | How it works in AQ |
| --- | --- |
| Alignment | Good vs. Evil and Unity vs. Chaos shift with your choices and unlock rewards and events |
| Holiday events | Seasonal storylines and a limited-time shop (Frostval, Mogloween, Snugglefest) |
| Clans | Eight clans tied to eight elemental realms, each with its own shop |
| Houses | Bought with Z-Tokens, decorated, guarded by monsters, and some produce potions |
| Monetization | One-time $19.95 Guardian upgrade (level cap 150 vs. 135, extra areas), plus Z-Token purchases since 2005 |

Reviewers praised the art, humor, and steady stream of quests, events, and gear. The common complaints were little interaction between players and a battle system that is easy to learn but not very exciting ([Wikipedia](https://en.wikipedia.org/wiki/AdventureQuest)).

### DragonFable: AQ's dragon-raising precedent

Artix released DragonFable in 2006, set in the same world. Its paid Dragon Amulet unlocks raising your own dragon, and this is the closest existing model for what you want ([Complete Dragon Guide](https://forums2.battleon.com/f/printable.asp?m=17972076)):

1. Finish a quest chain to get an egg, then hatch it.
2. Pick one of eight elements on a wheel. You can change it later for free.
3. Customize name, head, wings, tail, and colors.
4. Feed once per real day. Food grants dragon stat points: 1 for gold food, up to 5 for premium food.
5. Spend points in five skill pools: Protection, Magic, Fighting, Assistance, Mischief. Respec costs 1,200 gold.
6. Pay 10,000 gold to grow the baby so it fights as a full guest with its own HP, MP, and potions.
7. Later, ride it as a "Titan" dragon in special boss fights, learning one skill per training quest.

Artix also made AdventureQuest Dragons, an idle mobile game built with Orteil, the Cookie Clicker creator ([Artix Entertainment, Wikipedia mirror](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/HeroSmash.html)).

## Analysis: what to keep, change, and drop

Keep AQ's one-screen turn-based fight and its element system, and make the dragon the reason both are interesting. AQ's biggest weakness was flat combat, and DragonFable's dragon was a late, paywalled side feature. This game fixes both by putting the dragon at the center from the first minute.

| AQ / DragonFable feature | Verdict | What this game does |
| --- | --- | --- |
| One-screen turn-based battle | Keep | Core of the game. One fight takes 1 to 3 minutes, which suits a phone. |
| Elemental resistances | Keep, expand | The dragon's element is the main build choice. Enemies show their weakness after you have fought them once. |
| Six stats, points per level | Change | Rider gets 4 stats, dragon gets its own 4. Fewer numbers, two characters to build. |
| Pets and guests (CHA) | Promote | The dragon is a full second combatant every fight, never a side slot. |
| Feed once per day for stat points | Keep, soften | Daily care gives a bonus. Skipping days never hurts the dragon or loses progress. |
| Five dragon skill pools | Keep | Becomes the dragon's talent tree (see dragon systems). |
| Grow the dragon for gold | Change | Growth comes from bond and level milestones, each with a short story quest. |
| Titan dragon riding | Keep | Adult stage unlocks Ride mode, a combined rider and dragon form for boss fights. |
| Houses that produce potions | Adapt | The Roost: a home base you upgrade, which produces food and potions over real time. |
| Holiday events, limited shop | Keep, later | Date-checked on the device. Phase 4 or later. |
| Alignment (Good/Evil) | Optional | A simpler "temperament" axis on the dragon, shaped by your choices. |
| Clans | Drop | No server, no multiplayer. |
| Server-stored character | Drop | Saves live on the device, with export and import codes. |
| Paid Guardian upgrade, Z-Tokens | Drop | No real-money purchases unless you decide otherwise. |
| Random encounter grind | Change | Short zone runs of 3 to 5 fights plus a boss, so every session has an ending. |

AQ also published its damage formulas, and players loved working them out. The build should keep every number in data files so balance changes never need code changes.

## Design: core loop

A session is one lap: care for the dragon at the Roost, run a zone, collect rewards, and spend them on growth. Benched dragons feed the same loop through timed expeditions and training while you play.

&#91;embedded content: core loop · 4 steps and a side loop\]

A lap takes about 5 minutes, so the game works in a short break. Long-term goals sit on top of the lap: the next life stage, the next zone's egg, and the next Roost upgrade.

## Design: dragon systems

Each dragon has an element, a life stage, its own level and stats, a bond score with the rider, and a talent build. The player owns up to 3 dragons at first (more with Roost upgrades) and picks one active partner (two from rider level 25).

### Life stages

Growth needs a dragon level, a bond score, and a short story quest. Stages change what the dragon can do, so growing up feels like a real unlock and not just bigger numbers.

| Stage | Dragon level | Bond needed | What unlocks |
| --- | --- | --- | --- |
| Egg | n/a | n/a | Pick an egg, warm it with taps in the tutorial, hatch in the first session |
| Hatchling | 1 to 9 | 0 | Claw and a weak breath. Care actions. First zone. |
| Juvenile | 10 to 24 | 30 | Talent trees open. Short flights reach sky zones. |
| Adult | 25 to 39 | 60 | Ride mode for bosses. Full breath. Dragon gear slots. |
| Elder | 40 to 50 | 90 | One capstone talent. Can lay an egg once per Elder dragon. |

### Elements

Use eight elements: a ring of six where each beats the next, plus Light and Shadow, which only beat each other. The ring is Fire > Frost > Verdant > Stone > Storm > Tide > Fire. Starter eggs come in Fire, Tide, and Verdant. The other elements come from boss drops and the Hatchery.

| Matchup | Damage multiplier |
| --- | --- |
| Attacker's element beats defender's | 1.5x |
| Neutral | 1.0x |
| Defender's element beats attacker's | 0.75x |
| Same element | 0.5x |

The multipliers are starting values and live in `elements.json`. Enemies can also carry per-element resist overrides, like AQ monsters.

### Stats

Rider and dragon each get 4 stats. Both gain 3 free points per level, and food adds extra dragon points.

| Character | Stat | Drives |
| --- | --- | --- |
| Rider | Strength | Weapon damage |
| Rider | Agility | Accuracy, crit chance, turn order |
| Rider | Arcana | Spell power, MP |
| Rider | Vigor | HP, status resistance |
| Dragon | Might | Claw and breath damage |
| Dragon | Scale | HP and damage reduction |
| Dragon | Swift | Turn order, dodge |
| Dragon | Spirit | Breath charge rate, healing, status power |

### Bond

Bond is a 0 to 100 score per dragon. It rises from daily care, winning fights together, and story quests. It never decays. Bond gates life stages and unlocks combo moves at 20, 50, and 80.

### Care at the Roost

Care is a daily bonus, never a chore. Missing days costs nothing.

- Feed: food gives dragon stat points, as in DragonFable. Each dragon has a hidden favorite food that gives double bond. Up to 3 meals a day count.
- Groom and Play: a 10-second tap mini-game that gives bond.
- Rest: restores HP between runs.
- Doing all care actions in a day gives the "Well kept" buff: +10% XP for the next 5 fights.

### Talents

From Juvenile on, each dragon level gives 1 talent point in one of five trees, borrowed from DragonFable's pools.

| Tree | Focus |
| --- | --- |
| Protection | Shields the rider, taunts, damage reduction |
| Elemental | Breath power, element-specific effects |
| Fighting | Claw combos, crits |
| Assistance | Healing, buffs, faster breath charge |
| Mischief | Debuffs, steals, odd tricks |

One free respec per life stage. After that, respecs cost gold.

### Temperament and looks

A dragon's temperament (Bold, Gentle, Clever, or Proud) comes from how it is raised. Lots of fighting leans Bold and lots of care leans Gentle, for example. Each gives a small passive bonus and changes idle animations and dialogue lines.

Looks come from AI-assisted sprites: one base sprite per element and life stage, plus a few horn, wing, and pattern overlays. The game tints each sprite at runtime from the element palette and the colors the player picks at hatching, so every dragon looks a little different without per-dragon art.

### Benched dragons

Dragons not in the active slot can train in the Training Yard (slow passive XP) or go on timed expeditions for food, gold, and materials. This borrows the idle loop from AdventureQuest Dragons and gives the player a reason to check in.

## Design: combat

Each round the player gives two orders, one to the rider and one to the dragon, then everyone acts in initiative order. Two actors per turn and visible enemy intents are the main fixes for AQ's "easy but not exciting" combat.

### A round

1. Every enemy shows an intent icon for its next move (attack, big attack, buff, heal, element shift).
2. The player picks a rider action and a dragon action, then taps Go.
3. Rider, dragon, and enemies act in order of initiative (Agility or Swift, plus a small random roll).
4. Status effects tick, the breath meter fills, and the next round starts.

| Rider actions | Dragon actions |
| --- | --- |
| Attack with the equipped weapon | Claw (basic attack) |
| Spell or skill (costs MP) | Breath (needs a full breath meter, uses the dragon's element) |
| Item (potions, food) | Guard Rider (takes hits aimed at the rider) |
| Defend (halves damage, small breath gain for the dragon) | Talent skill (from talent trees) |
| Flee (Agility check, zone runs only) | Combo (needs bond threshold, uses both actions) |

The breath meter fills each round, and faster when the dragon takes or deals damage. Spirit speeds it up. Breath is the big hit that uses the element system, so players learn to save it for the enemy's weak element.

### Damage

Start with this formula and tune it with the balance simulator:

```latex
\text{damage} = \text{base} \cdot \left(1 + \frac{\text{stat}}{50}\right) \cdot \text{element} \cdot \text{crit} \cdot \text{rand}(0.9, 1.1) - \text{defense}
```

Crit is 1.5x. Damage never drops below 1. All constants live in `combat.json`.

### Status effects

Keep the list short: Burn (Fire), Chill (Frost, slows), Root (Verdant, no dodge), Crack (Stone, lowers defense), Shock (Storm, chance to skip a turn), Soak (Tide, raises Storm damage taken), Blind (Shadow), Ward (Light, a shield). Each has one clear effect and an icon.

### Knockouts and defeat

If the dragon reaches 0 HP, it is knocked out and the rider fights on alone at reduced power. If the rider reaches 0 HP, the fight is lost. Losing sends you back to the Roost. You keep the XP and loot from fights already won in that run, so a loss never wipes progress.

### Ride mode

Adult dragons unlock Ride mode, borrowed from DragonFable's Titan battles. Rider and dragon merge into one unit with combined HP and a separate move set. Boss fights and some story fights use it. It gives the player one action per round with bigger effects, which changes the pace for the big fights.

### Two partners

A second dragon slot opens at rider level 25. With two partners, each round takes three orders: rider, lead dragon, and second dragon. A Repeat button reuses last round's orders so phone play stays quick. Two dragons that both have bond 50 or more unlock dragon-and-dragon combos. In Ride mode the rider rides the lead dragon and the second fights alongside.

## Design: progression, economy, and content

Rider and dragon both cap at level 50 and share XP from every fight. The world is seven zones, each tied to an element and gated by dragon stage, with a boss that drops an egg of that element.

### Zones

| Zone | Main enemy element | Levels | Gate | Boss |
| --- | --- | --- | --- | --- |
| Mossy Hollow | Verdant | 1 to 8 | None | Bramble Troll |
| Saltmarsh Shore | Tide | 6 to 14 | None | Crab King |
| Cinder Pass | Fire | 12 to 20 | Juvenile | Magma Wyrm |
| Thunderspire | Storm | 18 to 28 | Juvenile (flight) | Storm Roc |
| Frostmere | Frost | 26 to 36 | Adult | Glacier Hydra |
| Deepstone Mines | Stone | 34 to 42 | Adult | Iron Golem |
| Eclipse Peak | Light and Shadow | 40 to 50 | Elder | Eclipse Dragon |

A zone run is 3 to 5 fights picked from the zone's enemy table, then the boss or a mini-boss. Story quests are short scripted fight chains with dialogue between fights, in AQ's light, joking tone.

### Currencies and items

Gold comes from fights, quests, and expeditions. It buys gear, food, and respecs. Embers are rare, earned from bosses and daily care streaks, and buy cosmetics, Roost upgrades, and Hatchery incubation. Neither can be bought with real money.

Riders equip a weapon (melee, ranged, or magic, each with an element), armor, and a trinket. Adult dragons add a saddle, a horn cap, and a scale charm. Gear has a level requirement and a few fixed stats. Avoid random affixes in v1.

### Leveling

XP to the next level starts as `50 × level^1.6`, defined in `progression.json`. The target is about 10 fights per level early and about 20 near the cap. Zones overlap by 2 levels so a player is never stuck.

### The Roost

| Building | Does | Upgrades add |
| --- | --- | --- |
| Nest | Holds dragons | More dragon slots (3, 4, 6) |
| Pantry | Makes food over real time | Better food, larger store |
| Hatchery | Incubates eggs from bosses | Faster hatching, two eggs at once |
| Training Yard | Passive XP for benched dragons | Higher XP rate |
| Expedition Board | Timed trips for benched dragons | Longer trips, better loot |

Timers use the device clock and are capped (for example, the Pantry stores 8 hours of food) so idle play rewards check-ins without punishing absence.

### v1 content target

About 7 zones, 35 regular enemies, 7 bosses, 60 items, 8 elements of dragon, and 5 talent trees with 8 talents each. Phase 1 ships only the first zone, so the rest can come in later phases as JSON.

## Mobile-first UX requirements

Design for a phone held in one hand in portrait, 360 to 430 px wide, and let it scale up to tablet and desktop. Every action must be reachable with a thumb.

### Battle screen layout (portrait, top to bottom)

1. Enemy area with HP bars, intent icons, and element badges.
2. Rider and dragon with HP, MP, and the breath meter.
3. Combat log, 2 lines, tap to expand.
4. Action panel in the bottom third: a Rider row, a Dragon row, and a Go button.

### Rules for the build

| Area | Requirement |
| --- | --- |
| Tap targets | At least 44 x 44 px. No hover-only controls. No double-tap actions. |
| Text | Body text at least 16 px. Numbers on HP bars readable at arm's length. |
| Safe areas | Respect notches and home bars with `env(safe-area-inset-*)`. |
| Speed | Battle animations 300 ms or less, with a 2x speed toggle. Honor `prefers-reduced-motion`. |
| Sessions | A zone run fits in about 5 minutes. The game saves after every fight and every Roost action. |
| Offline | Installable PWA with a manifest and service worker. Plays fully offline after first load. |
| Load size | First load under 2 MB. Sprites are WebP and load per zone. |
| Feedback | Vibration on crits and knockouts where the browser supports it. Sound off by default. |
| Orientation | Portrait first. Landscape moves the action panel to the right side. |
| Accessibility | Element and status icons also show text or shape, never color alone. |

### Main navigation

A bottom tab bar with four tabs: Roost, Map, Dragons, and Bag. Settings and save export sit behind a gear icon on the Roost screen.

## Technical architecture and deployment

Build a static TypeScript app with Vite, keep all game rules in a pure logic core with no DOM, and deploy the built files to a `gh-pages` branch from your own machine. There is no server and no custom GitHub Actions workflow.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite + TypeScript | Fast local dev, small static output |
| UI | Preact (or plain TS + DOM) | Screens are menus and one battle scene; a game engine is overkill |
| Animation | CSS and the Web Animations API | Enough for AQ-style hits, shakes, and breath effects |
| Art | AI-assisted sprites (WebP), tinted per element at runtime | Few source images, many color variants |
| Game logic | Pure TS module with a seeded RNG | Same seed gives the same battle, so tests are exact |
| Data | JSON files for elements, species, enemies, items, zones, talents, curves | Balance without code changes |
| Save | localStorage, versioned JSON with migrations | Saves stay small (under 100 KB) |
| Offline | Service worker and web manifest (vite-plugin-pwa) | Install to home screen, play offline |
| Tests | Vitest for logic, Playwright for a phone-size smoke test, both run locally | Matches the local-first testing habit |

### Repo layout

```
/src
  /core        pure game logic: combat, dragons, progression, rng, save
  /data        JSON content and balance constants
  /ui          screens: roost, map, battle, dragons, bag, settings
  /art         WebP sprites, icons, assets.json manifest
/tests         vitest unit tests and balance sim
/e2e           playwright smoke tests
/public        manifest, icons, .nojekyll
```

### Saves

The save is one JSON object with a `version` field. Every load runs migrations up to the current version. Settings has Export (copies a base64 save code) and Import (pastes one back), since a cleared browser deletes localStorage. Cloud save can come later.

### Art pipeline

Eric makes sprites with AI image tools and drops them into `/src/art` as transparent WebP. Dragon base sprites are drawn in neutral gray so runtime tinting works: about 40 (8 elements x 5 stages), plus overlays. Enemies get one sprite each. Every sprite is listed in `assets.json`, and the agent ships simple placeholder shapes for anything missing, so new art never needs a code change.

### GitHub Pages deployment

1. Set `base: '/<repo-name>/'` in `vite.config.ts` and use hash routing (`#/roost`), so deep links never 404 on Pages.
2. Put an empty `.nojekyll` in `/public` so Pages serves the files as they are without a Jekyll build ([GitHub changelog](https://github.blog/changelog/label/pages)).
3. Add the `gh-pages` npm package and a `deploy` script: `npm run test && npm run build && gh-pages -d dist`.
4. In the repo's Settings, under Pages, choose Deploy from a branch, branch `gh-pages`, folder root.
5. Deploy by hand at milestones, not on every commit.

GitHub still runs its own built-in pages deployment job each time the `gh-pages` branch changes. Deploying only at milestones keeps those runs rare. Skip any custom workflow file; tests run locally in step 3.

> Update (2026-11-11): Eric switched Pages to deploy from GitHub Actions. Steps 3 and 4 are replaced by one workflow, `.github/workflows/deploy.yml`, that builds and publishes whenever `main` changes. `npm run deploy` runs the local checks and pushes to `main`. It stays the only workflow in the repo.

### Notes for the coding agent

Keep `/src/core` free of DOM and browser APIs so it runs under Vitest. Read every number from `/src/data`. Use original art and names only, with nothing copied from Artix games. Write a balance simulator (`npm run sim`) that plays 1,000 auto-battles per zone and reports win rates and fights per level.

## Build phases for the coding agent

Build in five phases, each ending with a deploy to GitHub Pages and a check on a real phone. Do not start a phase until the previous one meets its done criteria.

### Phase 0: Scaffold

- [ ] Vite + TypeScript project, repo layout as above, Vitest and Playwright set up
- [ ] Seeded RNG, JSON data loader, versioned save with export and import
- [ ] Bottom tab bar with four placeholder screens
- [ ] Deploy script and Pages config from the deployment section

Done when the Pages URL loads on iPhone Safari and Android Chrome, a save survives a reload, and an exported save code imports into a fresh browser.

### Phase 1: Egg to first boss

- [ ] Pick one of 3 starter eggs, hatch it, name it, choose colors
- [ ] Dragon sprite renderer with runtime tinting and placeholder art
- [ ] Roost screen with Feed, Groom and Play, Rest, and the Well kept buff
- [ ] Battle screen with rider and dragon actions, intents, breath meter, elements, statuses
- [ ] Mossy Hollow zone run: 5 enemies and the Bramble Troll
- [ ] XP, leveling, stat points for rider and dragon, bond score

Done when a new player hatches a dragon and wins a fight within 5 minutes, unit tests cover damage, elements, and leveling, and the sim shows a 70 to 85 percent win rate for an on-level player in Mossy Hollow.

### Phase 2: Growing up

- [ ] Life stages through Adult, with bond gates and stage quests
- [ ] Five talent trees and respecs
- [ ] Gear for rider and dragon, a town shop, gold economy
- [ ] Zones 2 to 4 with bosses that drop eggs
- [ ] Ride mode for boss fights

Done when a player can take one dragon from egg to Adult and beat the Storm Roc, and the sim confirms zone win rates and fights per level.

### Phase 3: The Roost

- [ ] Multiple dragons, Nest slots, partner switching, second partner slot at rider level 25 with three-order rounds
- [ ] Pantry, Hatchery, Training Yard, Expedition Board, with capped real-time timers
- [ ] Embers currency and Roost upgrades
- [ ] Temperament and its passives

Done when timers behave correctly after the app is closed for a day, and a second dragon can be hatched and raised without touching the first.

### Phase 4: Full world and polish

- [ ] Zones 5 to 7, Elder stage, capstone talents, egg laying
- [ ] PWA install and offline play
- [ ] Sound (off by default), 2x speed, reduced-motion support
- [ ] Seasonal events checked against the device date

Done when the game plays fully offline after install, reaches level 50, and passes the mobile UX rules table on two real phones.

## Decisions

Eric settled the open questions on 2026-11-10. The level for the second partner slot (25) is a starting value in `progression.json`.

| Question | Decision |
| --- | --- |
| Standalone or prototype for the iOS dragon game | Standalone, its own world |
| Tone | Light and joking, in AQ's style |
| Art | AI-assisted sprites for v1 |
| Monetization | None |
| Dragons in battle | One partner, two from rider level 25 |
| Repo | Public `dracoquest`, GitHub Pages project page |
| Audience | General, all ages |
| Name | DracoQuest |

## Sources

- [AdventureQuest, Wikipedia](https://en.wikipedia.org/wiki/AdventureQuest)
- [Big List of AQ Formulas, AQ Wiki](https://adventurequestwiki.fandom.com/wiki/Big_List_of_AQ_Formulas)
- [AQ stat guide, BattleOn forums](https://forums2.battleon.com/f/tm.asp?m=22423333)
- [Complete Dragon Guide (DragonFable), BattleOn forums](https://forums2.battleon.com/f/printable.asp?m=17972076)
- [GitHub Pages changelog](https://github.blog/changelog/label/pages)
