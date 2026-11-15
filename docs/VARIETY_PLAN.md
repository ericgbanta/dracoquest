# Variety plan: less sameness when grinding

Written 2026-11-13 at Eric's request. Status (2026-11-15): V2, V1, V3 and V7 are built and live. See "Built" at the end for what was made and the calls behind it.

Eric's answers (2026-11-14): V2 first, then V1. Champions and rares get a color tint plus a gold ring, and rares are drawn bigger; no new Codex art. Champions are a little harder with better loot, something to welcome rather than flee. Rares are tougher but winnable on level. Events may carry risk (a mimic, an ambush), but the risky choice is always optional or pays well.

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

## Built

### V2: champions and rare spawns (2026-11-14, save v13)

Data is all in `src/data/champions.json`. Logic: `rollSpecials` and `specialOf` in `src/core/run.ts`, the trait rules in `src/core/battle.ts`, rewards in `rollRewards`.

- **Champions.** Each enemy in a regular hunt fight has a 7 percent chance (from rider level 2) to be a champion with one trait, or two (30 percent of champions). A champion has 1.1x HP plus its traits, and pays 1.6x XP, 1.8x gold, +50 percent item drop chance and twice the zone gear chance.
- **Traits (8).** Swift (1.6x swift and dodge), Armored (1.5x defense, plain hits with no element do 75 percent), Thorned (20 percent of contact damage comes back to the attacker, never below 1 HP; contact is a melee weapon swing, a claw, a damage skill, a dive or a combo), Vampiric (heals 30 percent of damage dealt), Enraged (1.35x damage below half HP, with a log line when it triggers), Shielded (starts with Ward), Hulking (1.5x HP), Mending (heals 5 percent at the end of each round). Each has a tint (a CSS filter) and an icon.
- **Rares (23, one per zone).** About 1 regular fight in 150 (0.67 percent, from rider level 3) is replaced by the zone's rare, alone, at the rider's level. Each uses a regular enemy's art and moves with 1.8x HP, 1.05x attack and two fixed traits. Rewards: 3x XP, 4x gold, +100 percent item drops, 5x gear chance, 3 embers, 2 potions and a mana tonic. The names are in the JSON (Old Mossjaw, Captain Pinchwell, The Glimmer Wisp, Embermaw and so on).
- **Never changed:** story fights, growth quests, mini-bosses and bosses.
- **Look.** The sprite gets its tint (a champion's first trait, or the rare's own), the shadow under its feet turns into a gold ring, and the plate gets a gold border with a gold name. Rares get a star before the name and are drawn 1.2x bigger, shifted left to stay on the stage. None of this adds DOM nodes (the ring is the actor's `::before`). Champion names carry the first trait as a prefix ("Thorned Thornling"); the details sheet lists every trait. The target chip shows the kind ("Thornli"), not the prefix.
- **Rare log.** `save.rares` counts each rare met and beaten (save v13). The Map's treasures sheet shows the zone's rare as "???" until met, then its name, flavor and counts.
- **Results.** A rare win says so (with "for the first time") and lists the embers; a champion win notes the bonus.
- **Auto-battler.** Focuses a self-healing champion (Vampiric or Mending) when there are two enemies, and a melee rider under 60 percent HP casts a damage spell instead of swinging into thorns. The sim prints champion and rare fight win rates per zone.

Tuning with the sim (1,000 runs per level):

- Champions are won 95 to 99 percent of the time. They cost on-level run win rates 1 to 3.5 points, mostly through HP carried into later fights.
- Rares are won 69 to 78 percent of the time in Mossy Hollow, 73 to 76 in Moonwell Woods and 83 to 99 elsewhere; later zones find them easier because on-level players are relatively stronger there.
- The first pass had rares at 2x HP, 1.12x attack, 1.2x defense and one level up: Mossy Hollow won only 27 to 42 percent. The Confluence's Grandmother Seal (Hulking and Mending) won 43 to 56 percent, so she now has Mending and Shielded (95 percent).
- Champions went from 8 percent and 1.15x HP to 7 percent and 1.1x HP. Cinder Pass (1 percent), the Steelspine Range (1 percent) and Skyreach Isles (2 percent) were eased with `tools/content/scale_enemies.py` so their weakest starter stays near 70.
- The campaign sim still reaches level 100 in every campaign, with 92.6 to 93.7 percent of runs won.
- Final sweep: every zone averages 75.5 to 81.8 percent on level across the three starters (before V2: 76.8 to 83.1). No starter fell out of 70 to 85. Nine rows sit outside it, all already outside before V2: Saltmarsh Shore Tide 86.4 and Verdant 87.2, Whispering Fen Fire 67.4, Tide 88.3 and Verdant 85.4, Thunderspire Tide 68.1 and Verdant 86.0, Frostmere Fire 88.3, Deepstone Mines Verdant 85.7.

Calls made without Eric (he can overrule any):

1. A rare replaces the whole fight and comes alone, at the rider's level, so a pair never hides it.
2. Thorns never knock anyone out.
3. Champions show the first trait's name only; the second is in the details sheet, since plates are narrow.
4. Rares are hidden as "???" on the Map until met.
5. Save v13 for the rare counts, so a "seen" badge is possible.

### V1: run events between fights (2026-11-15, save v14)

Data: `src/data/runEvents.json`. Logic: `src/core/runEvents.ts` (pure: rolling, resolving an option), `chooseEvent` and `dismissEvent` in `game.ts`, the screen in `src/ui/screens/RunEvent.tsx`.

- **When.** After a won regular fight in a zone hunt, when the next fight is not the boss (a mini-boss next is fine), a 33 percent roll picks an event by weight. Stories and growth quests never get one. In the sim, events follow 25.5 to 27 percent of won fights, about 1 in 4.
- **Saved.** The run holds `event: { id, seed }`. Choosing stores the option and the full result on the event, so a reload shows the same scene before a choice and the same result after. Starting the next fight clears it; the next fight can't start until a choice is made. Leaving the run clears it too.
- **Events (11, 7 with a choice).** Treasure chest (open: gold and two supplies, or 1 in 4 a mimic fight at 2.5x XP and gold; or leave it), mossy shrine (pray: heal half HP for everyone; offer blood: lose 15 percent HP for Fury next fight; walk on), wandering peddler (3 potions for 38 gold, an Iron Ore for 4 fights' worth of gold, or pass), lost egg from level 5 (take an egg of the zone's element, or leave it for 3 bond and gentle temperament), ambush (a pair fight at 1.75x, or slip away), fork in the path (quiet trail, or a champion fight at 1.25x), your dragon wanders off (let it explore: ore or gold and bold temperament; call it back: 3 bond and gentle), and four without a choice: an old campfire (a potion), a glittering stream (gold), a traveling keeper (a dragon treat and 2 bond), a lost satchel from level 8 (a potion and an ore).
- **Scaling.** Gold is counted in one regular enemy's gold at the rider's level (`goldFights`, `costFights`), so events pay the same share at level 3 and level 90. Extra fights use the zone's own enemies at the rider's level; a mimic uses the Treasure Mimic's art and moves with the zone's sturdiest regular enemy's stats.
- **Risk.** Every option that can cost HP or start a fight sits beside a safe one (a unit test checks this), and the risky ones pay more.
- **Screen.** A still strip of the zone's backdrop with the event's icon, the text, one button per option with a short line under it (and its gold cost, disabled when you can't pay), and Head home. After a choice: what happened, what it gave, then Keep going (or Fight! for an extra fight). Every option of every event fits on one 375 x 667 screen (a phone test checks each).
- **Auto-battler.** `eventChoice` in `ai.ts` heals at a shrine below 60 percent HP and otherwise takes the first safe option, so it never opens a chest or takes a fight.

Tuning:

- The first version healed fully at the shrine and 35 percent at a campfire, with MP too. The sim showed healing between fights lifting on-level win rates by 3 to 4 points, and the size of the heal hardly mattered. So the shrine now heals half and only HP, it shows up a little less often (weight 2), and the campfire leaves a potion instead.
- With V2 and V1 together, zone averages are 77.5 to 83.0 percent on level across the starters, against 76.8 to 83.1 before either. No starter left 70 to 85. The 12 rows outside were all outside before. Campaigns reach level 100 in every case and win 93.3 to 94.5 percent of runs.

Calls made without Eric (he can overrule any):

1. Events never come right before the boss, so the boss interlude and Ride choice stay as they were.
2. The shrine heals half instead of fully, and the campfire gives a potion instead of healing, to keep balance (see Tuning).
3. Events give no XP, so a level-up never happens outside a fight.
4. The mimic borrows the zone's sturdiest enemy's stats, since the Gilded Wastes mimic is tuned for level 40 to 50.
5. The lost egg is uncommon (weight 0.6 of about 27, from level 5), so it adds an egg about every 150 fights.
6. Head home works from an event, and ends the run like it does after a fight.

### V3: daily zone conditions (2026-11-15, save v15)

Data: `src/data/conditions.json`. Logic: `src/core/conditions.ts`.

- **Seven conditions.** Calm (weight 3), Fog (+8 dodge for every fighter, so about 8 percent fewer hits on both sides; weight 1.5), an element surge (hits of one of the zone's elements 20 percent stronger, for both sides; weight 1.5), Full moon (champions and rares twice as likely; 1), Bounty day (double gold; 1), Tailwind (+5 breath a round for every partner dragon; 1) and Treasure trail (+50 percent item drop chance, 1.5x zone gear chance; 1). So about 3 days in 10 are calm in any one zone.
- **Picked by day.** From a seed of the date and the zone (`conditionFor`), like the bounty board, so every zone has its own and they change at midnight.
- **Kept for a hunt.** `startRun` stores the day's condition in `run.condition` (save v15), so a run that crosses midnight keeps it. Story and growth-quest runs have none.
- **Where it shows.** A "Today" line in the zone details (the open zone card and the map pin sheet), a line in the battle log when a fight starts (not for Calm), and the between-fights screen.
- **Sim.** The on-level sim now plays each run on a different day, so conditions average out the way they would for a player.

Calls made without Eric:

1. The seven conditions and their sizes. Fog and the surge help both sides, so they change how a fight feels more than whether it's won.
2. Calm days exist and are the most common single condition, so the others stay notable.
3. No condition is shown on the battle stage itself (the header is full); the log and the Map carry it.

### V7: three more enemies in each of the first four zones (2026-11-15)

8 Codex generations (`tools/art/painted/jobs17.py`): one sheet of three creatures per zone and its attack sheet, all usable first try. `pack.py` packs `sheet-<zone>-more` from the `more` list in `tools/art/painted/zones.json`. The Puddle Newt and the Soot Mole's attack pose each had a small pocket of trapped key green, painted outline navy after packing. Data came from `tools/content/v7_enemies.py`.

| Zone | New enemies (element, stats copied from) |
| --- | --- |
| Mossy Hollow | Acorn Knight (Stone, Barkback Boar), Toadstool Tumbler (Verdant, Spore Puffer), Puddle Newt (Tide, Bog Hopper) |
| Saltmarsh Shore | Teacup Hermit (Stone, Shell Knight), Spiny Puffer (Tide, Pincher Crab), Zap Jelly (Storm, Gull Bandit) |
| Whispering Fen | Fog Heron (Tide, Reed Stalker), Croak Shaman (Verdant, Murk Toad), Peat Golem (Stone, Bogling) |
| Cinder Pass | Magma Snail (Fire, Lava Toad), Soot Mole (Stone, Cinder Beetle), Storm Crow (Storm, Smog Bat) |

- Each has three moves of its own, an encounter of its own (weight 2) and joins one new mixed pair (from level 3, 8, 12 and 14).
- Each has a defeat bounty in its zone's pool, except Cinder Pass, which has no bounty board yet (V5).
- These four zones now have 8 regular enemies each, 127 in the game.

Calls made without Eric: every name and look, the elements (they follow each zone's existing mix, except that Cinder Pass gains its first Storm regular), and copying stats from an existing enemy in the same zone rather than tuning new ones.

