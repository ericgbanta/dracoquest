# Variety plan: less sameness when grinding

Written 2026-11-13 at Eric's request, for the next agent to build. Status: research done, nothing built yet. Eric answers the open questions at the end before building starts.

The request, in Eric's words: "come up with a plan on how we can expand and give more variability to some of the levels. I often 'grind' and revisit some levels in the first area of the game. Maybe we should add more areas that are similar leveled? Or add more enemies? Let's do some research on what we can do to solve this problem and document it."

## What the early game looks like today

Numbers from the data and the balance sim (`npm run sim -- --zone mossy-hollow --no-campaign`, 2026-11-13).

| Fact | Detail |
| --- | --- |
| Zones in The Wilds | Mossy Hollow (1 to 8), Saltmarsh Shore (6 to 14), Whispering Fen (10 to 20), Cinder Pass (12 to 20) |
| Levels 1 to 5 | Mossy Hollow is the only place to fight |
| Enemies per zone | 5 regular enemies, a mini-boss and a boss. Every regular enemy has 3 moves |
| Encounter mixes | Mossy Hollow has 6 (`zones.json` `encounters`). By weight, about 3 fights in 4 are against a single enemy |
| A run | 3 to 5 fights, then a mini-boss (or the boss from one level below the zone's top) |
| Fights per level | About 5 at level 1, rising to about 10 by levels 5 to 8. Getting from level 1 to 8 takes about 63 fights, about 13 runs, nearly all in Mossy Hollow |
| Enemy levels | The rider's level, plus or minus `levelSpread`, clamped to the zone's range (`clampLevel` in `run.ts`). Once you outlevel a zone, its enemies stop growing and the fights stop paying |
| Reasons to go back | Daily bounties (3 a day in 18 zones), the 6 percent set weapon drop until the set is done, the boss's 10 percent egg chance |
| Zones without a story or bounties | Cinder Pass, Thunderspire, Frostmere, Deepstone Mines, Eclipse Peak (5 of the 11 zones from 1 to 50) |

Why it feels like a grind:

1. **The same five faces.** About thirteen runs in one zone means seeing each Mossy Hollow enemy dozens of times, usually alone, always with the same three moves.
2. **Every run is shaped the same.** Fight, fight, fight, mini-boss. Nothing happens between fights and there's no choice to make.
3. **Nothing changes from day to day.** Bounties change, but the fights don't.
4. **Old zones go dead.** A zone stops scaling at its top level, so going back to Mossy Hollow later gives almost nothing.
5. **One zone for the first five levels**, and two up to level 9.

## How other games handle this

Some well-known patterns from games with a lot of repeat fighting. These are general design patterns, not checked against sources.

| Pattern | Seen in | What it does | Fit here |
| --- | --- | --- | --- |
| Elite or champion enemies with random traits | Diablo, Path of Exile, Torchlight | A familiar enemy shows up with a prefix ("Swift", "Armored", "Vampiric"), more health and better loot. Same art, new problem | Very good. Data only, works with the battle engine's statuses and moves |
| Rare named spawns | Pokémon shinies, WoW rare elites, Monster Hunter variants | A small chance of a special version with a name and its own drop. Makes every fight a lottery ticket | Very good. Reuses an enemy's art with a tint or a bigger size |
| Events between fights | Slay the Spire, FTL, Darkest Dungeon | A short scene with a choice (a chest, a shrine, a trader, an ambush). Breaks up the fight, fight, fight rhythm | Very good. Text and icons, the quest format already has dialogue |
| Path choices | Slay the Spire map, Hades doors | Pick the next room: harder fight for better loot, or a safe one | Good. A two-button choice between fights |
| Daily modifiers | Destiny weekly modifiers, AQ daily specials | Today the Fen is foggy: more dodging, a rare spawn, double drops of one thing | Good. Seeded by date like the bounty board already is |
| Scaled replays | Diablo III torment levels, Guild Wars hard mode | An old zone at your level with better rewards | Good. Keeps the early art in use for the whole game |
| Kill goals and a collection log | RuneScape slayer, Pokédex, achievements | Turns grinding into goals ("defeat 25 Thornlings") with small rewards | Good. The bestiary already counts kills |
| More content | Every MMO | New enemies or a new area | Works, but costs Codex generations and only helps for a while before the new faces get familiar too |

The lesson across all of them: adding content helps for a while, but **systems that vary the content you already have** keep paying for the whole game, cost no art, and also help every zone up to level 100.

## The options

Art counts are Codex generations (`docs/ART_GENERATION.md`). Every option needs unit tests with fixed seeds and phone tests, like everything else.

| # | Option | Art | Save change | Effort | What it fixes |
| --- | --- | --- | --- | --- | --- |
| V1 | Run events between fights | 0 | Yes (an event waiting in the run) | Medium | 2 |
| V2 | Champions and rare spawns | 0 | Small (a rare count in the bestiary, optional) | Medium | 1, 3 |
| V3 | Daily zone conditions | 0 | No | Small | 3 |
| V4 | Hunter's log (kill goals) | 0 | Yes (claimed goals) | Small | 1, 4 |
| V5 | Stories and bounties for the five zones without them | 0 | No | Small | 4 |
| V6 | Echo runs (old zones at your level) | 0 | No | Medium, needs the sim | 4 |
| V7 | Three more enemies in each of the first four zones | 8 (2 a zone: a sheet and its attack sheet) | No | Medium | 1, 5 |
| V8 | A new low-level side area (about 3 to 12) | 5 | No | Large (the area recipe in the handoff) | 5 |
| V9 | Faster early levels | 0 | No | Small, balance only | 5 |

### V1. Run events between fights

After a won fight (not before the boss), roll a chance for an event instead of going straight to the next fight. Each event is a short scene in the battle screen's existing results area, with one to three buttons. Ideas:

- **Treasure chest:** gold and an item. Sometimes a mimic (a fight).
- **Mossy shrine:** heal fully, or trade HP for a buff on the next fight.
- **Wandering peddler:** buy one random item cheaply, or sell a duplicate.
- **Lost egg:** a small chance of finding an egg of the zone's element.
- **Ambush:** the next fight is a pair, with better rewards.
- **Fork in the path:** "the quiet trail" (normal) or "the bramble path" (a champion fight, more loot).
- **Your dragon wanders off:** a bond or temperament moment, ties into care.

How: a new `runEvents.json` with events, weights, the zones or elements they can appear in, and their outcomes as data (the same reward shapes as stories: gold, items, embers, materials, XP). Logic in a new `src/core/runEvents.ts`, called from `run.ts` after a win. `save.run` gains `event: { id, seed } | null`, so a reload can't reroll it: **save version bump with a migration and fixture test**. All rolls go through the seeded RNG. The auto-battler and the sim need a rule to pick an option (take the safe one), and the sim should count events so balance stays readable.

Done when: about 1 fight in 4 is followed by an event, there are at least 8 events with a choice in at least 5, reloading mid-event shows the same event, and every option works at 375 x 667.

### V2. Champions and rare spawns

- **Champions:** each regular enemy has a small chance (say 8 percent, in JSON) to be a champion with one or two traits from `affixes.json`. Traits are data: a name prefix, stat multipliers, and optionally a status it starts with, a move it gains, or a rule the engine already knows (Ward, Rend, dodge). Examples: Swift (acts first, more dodge), Armored (takes less from plain hits), Thorned (hurts melee attackers), Vampiric (heals a share of its damage), Enraged (hits harder under half HP), Shielded (starts warded). Champions give more XP and gold and a better drop chance. A gold ring and the prefix on the enemy plate show it.
- **Rare spawns:** each zone gets one named rare (`"rares"` in `zones.json`) built on a regular enemy's art: Old Mossjaw (a huge Barkback Boar), the Glimmer Wisp. About 1 in 150 fights, a better stat line, a fixed trait set, a guaranteed item drop or a small ember gift, and a bestiary entry with a "seen" badge. Drawn bigger, and with a tint if Eric approves it (see the questions).

How: `spawnEnemies` in `run.ts` decides champions and rares with the run's RNG; `battle.ts` reads the traits as fighter modifiers (the status engine already reads effects from data). The battle sheet and the enemy plate show traits. The bestiary can count rares seen (a small optional save change).

Done when: champions show up at about the set rate in the sim, on-level win rates stay in the 70 to 85 range (tune the champion chance and trait strength with the sim), and each trait has a fixed-seed test.

### V3. Daily zone conditions

Each zone gets a condition for the day, picked from a seed of the date and the zone, exactly like the bounty board (`adventures.ts`). Ideas: Fog (everyone dodges more), Bloom (Verdant moves 20 percent stronger), Full moon (champions twice as likely), Bounty day (double gold), Calm (no condition). Shown on the Map pin sheet and the zone card ("Today: Fog"). Data in `zones.json` or a new `conditions.json`; read in `createBattle`. No save change, since it comes from the date.

### V4. Hunter's log

Kill goals per enemy (10, 25, 50 and 100 defeats) using the bestiary's existing counts, each paying a little gold, a material or an ember, plus a title for finishing a zone's set of goals. A new fold in the Map's zone sheet or a Bag tab. Save: claimed goals (`hunterLog: string[]`), a version bump.

### V5. Stories and bounties for five zones

Already on the handoff's "After that" list: 5-quest story chains with two choices and bounty pools for Cinder Pass, Thunderspire, Frostmere, Deepstone Mines and Eclipse Peak. Data only, following the recipe the side areas used. It doesn't touch the first zone, but it makes levels 12 to 50 less samey.

### V6. Echo runs

Once you're past a zone's top level and its boss is beaten, the zone sheet offers an **Echo run**: the same zone with enemies at your level (no clamp), the same enemies and art, and a reward bonus (more gold, a material each fight, a higher egg chance). Balance needs care: early enemies grow by their `perLevel` stats, which were tuned for their own range, so an echo of Mossy Hollow at level 40 may be too easy or too hard. Plan to scale echo enemies to the stats of the zone at the rider's level, and check with the sim at a few levels. Story fights stay at their fixed levels.

### V7. More enemies in the first four zones

Three new regular enemies each for Mossy Hollow, Saltmarsh Shore, Whispering Fen and Cinder Pass, plus more mixed pairs and a trio in each encounter table. Art: one sheet of three creatures and its attack sheet per zone, 2 generations each, 8 in all, following `docs/ART_GENERATION.md` and the zone's `zones.json` sheet entry in `tools/art/painted/`. Stats copied from the zone's existing enemies (the `like()` approach in the area scripts), then the sim. Bounty pools gain a defeat goal for each new enemy. This is the most direct answer to "the same five faces", but it costs art and the new faces get familiar too, so it works best together with V1 and V2.

### V8. A new low-level side area

A fifth area in The Wilds for about levels 3 to 12, opening after the Mossy Hollow mini-boss, so levels 3 to 5 have two places to go. It follows "How to add an area" in the handoff: 7 enemies, a story, bounties, a set, a pin on the Wilds map (on open ground if the painted map has room, otherwise a landmark sticker for 1 more generation; check the map image first). 5 Codex generations. The name, elements and theme are Eric's call. Ideas: a sunny meadow with Storm and Verdant (bees, hares, a thunder-ram boss), or a creek cave with Stone and Tide.

### V9. Faster early levels

Lower XP needed or more XP per fight for levels 1 to 10 (`progression.json`), so levels 1 to 8 take about 40 fights instead of about 63. Quick, but it cuts content rather than adding variety, so it's a supplement only. Check that the dragon stage gates and Saltmarsh's opening still line up.

## Recommendation

Build it in this order. Each step ships on its own and can stop at any point:

1. **V2 Champions and rare spawns**, then **V1 Run events**. These change every run in every zone, cost no art, and hit the main complaint directly. About one session each.
2. **V3 Daily conditions** and **V4 Hunter's log** together: small, data-heavy, and they give a reason to come back each day and to keep fighting the same enemies.
3. **V7 More enemies** for the first four zones (8 generations), if Eric still wants new faces after trying 1 and 2.
4. **V5** and **V6** whenever there's a gap. They help the middle of the game more than the start.
5. **V8 A new low-level area** last, or not at all if 1 to 3 do the job. It's the most work for the narrowest band.

V9 only if the first five levels still drag after the rest.

## Questions for Eric

1. **Which first?** (a) Champions and rare spawns, then run events (recommended); (b) more enemies in the first four zones first (8 generations); (c) a new low-level area first (5 generations); (d) something else.
2. **Can champions and rares be tinted?** A color shift (CSS `filter`) on the painted sprite would mark them at a glance, but it changes the look of painted art, which `CLAUDE.md` says needs his OK. Options: (a) a tint plus a gold ring (recommended); (b) only a gold ring and a bigger size, no tint; (c) paint rares properly with Codex (1 generation each).
3. **How hard should champions be?** (a) A little harder with better loot, something to welcome (recommended); (b) a real threat you might want to flee from.
4. **Run events:** should some events carry risk (a mimic, an ambush), or only good outcomes?
5. **A new low-level area:** wanted at all? If yes, which elements and theme?
6. **Echo runs:** would he use old zones at his level, or does he only revisit the first area while leveling?

## Notes for whoever builds it

- Read `CLAUDE.md` and `docs/HANDOFF.md` first. Every number goes in JSON under `src/data`; all randomness through `src/core/rng.ts`; `src/core` stays pure.
- Any save change bumps the version (12 at the time of writing), with a migration, a fixture of the previous version in `tests/fixtures/`, and rebuilt phone fixtures (`npx tsx e2e/make-fixtures.ts`).
- The sim is the guard for balance: `npm run sim -- --zone <id> --no-campaign` for a zone, the full sim at the end. Keep on-level runs at 70 to 85 percent for each starter. `autoOrders` in `ai.ts` must handle anything new (event choices, champion traits).
- The stage has a budget of 100 DOM nodes and order rows are tight (351 px of 375). A champion ring or a trait chip must fit on the enemy plate without breaking those.
- Phone tests: every page load opens the main menu, so call `enter(page)` from `e2e/helpers.ts` after a load. New screens or folds need a height budget in `e2e/ui.spec.ts`.
- Tell Eric the number of Codex generations before any art, and sign Codex out after.
