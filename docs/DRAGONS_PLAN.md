# More elements and dragons: plan

Written 2026-11-13 at Eric's request. Status: approved 2026-11-13. Chunks 1, 2 and 3 (E0 to E5) built the same day; chunk 4 is next. A breed's four stages fit on one sheet, so each breed costs 2 generations, not 8. Eric's answers are in "What Eric asked for" and "Eric's answers" at the end.

This plan runs alongside `docs/WORLD_PLAN.md`. W5 to W9 (the frontier areas that raise the cap to 100) stay as planned. The new areas here are extra places to go, on new maps, from level 30 to 100.

## What Eric asked for

- **Elements:** all four ideas he was offered, "sequenced in whatever way makes sense": a new opposed pair like Light and Shadow, a bigger ring, and hybrid elements made by mixing two. How many is left to the plan.
- **Dragons:** all four ideas: new breeds (different body shapes), breeding, a bigger roster, and rare variants.
- **Where they come from:** "a new map, or however many maps needed. They should start at level 30 and go to level 100. This is in addition to the work planned for the new areas."

## Where the game is today

- **Elements.** Eight, all data in `src/data/elements.json`: a ring of six where each beats the next (Fire, Frost, Verdant, Stone, Storm, Tide, back to Fire) and the Light and Shadow pair, which only beat each other. Strong is 1.5x, weak and same element 0.75x. Each element has a status (`statuses.json`), a stat bonus for dragons, an egg name, a color and symbol, a painted tail tip and a painted breath burst. `ElementId` is a fixed union in `src/core/types.ts`; `src/core/elements.ts` reads the ring and pairs from data.
- **Statuses.** Each status has its own rule in `src/core/battle.ts` (Soak even checks for Storm by name). A new status means new engine code, not just data.
- **Dragons.** One body shape. Each life stage (Hatchling, Juvenile, Adult, Elder) is one painted image plus an attack pose, in key colors (red body, gold belly), recolored at load to the two colors the player picks at hatching (`src/ui/stage/tint.ts`). The element shows only as the tail tip and the breath. All eight elements can already hatch.
- **Roster.** The Nest holds 3, 4 or 6 dragons. Two fight from rider level 25. An Elder can lay one egg of its own element, once.
- **Eggs.** The save counts eggs per element (`eggs: { fire: 1 }`). There is one painted egg, recolored per element.
- **Battle screen.** The busiest order row is exactly 351 px of 375. The stage uses 69 of its 100 DOM nodes in a two dragon, two enemy fight.

## The shape of it

### Elements: 8 now, 12 when this is done, plus hybrids

The three element ideas don't cost the same, so they come in order of risk.

1. **A new pair first: Aether and Void.** They beat each other and nothing else, like Light and Shadow. No existing matchup changes, so no old zone needs rebalancing.
2. **Hybrids next, through breeding.** A hybrid dragon has two elements. Hybrids aren't new entries in the matchup table, so they also leave old zones alone.
3. **The ring grows last: Blight and Steel**, taking it from 6 to 8. Every new element on the ring breaks one old matchup and adds two, so this phase rebalances every zone those elements touch.

| Element | Kind | Beats | Status | Dragon stat bonus | Egg | First seen |
| --- | --- | --- | --- | --- | --- | --- |
| Aether | Pair | Void | Silence: no spells, breath or special moves for 2 rounds | +1 Spirit, +1 Swift | Starlit Egg | Starglass Hollow (30 to 40) |
| Void | Pair | Aether | Hollow: healing received halved, breath fills at half speed, 3 rounds | +1 Might, +1 Scale | Hollow Egg | Voidmarch (40 to 50) |
| Blight | Ring, between Frost and Verdant | Verdant | Rot: damage each round that grows each round, 3 rounds | +2 Might | Rotten Egg | Rotroot Thicket (50 to 60) |
| Steel | Ring, between Stone and Storm | Storm | Rend: basic attacks against it deal 25 percent more, 3 rounds | +2 Scale | Iron Egg | The Steelspine Range (60 to 70) |

With Blight and Steel in place the ring reads: Fire beats Frost beats **Blight** beats Verdant beats Stone beats **Steel** beats Storm beats Tide beats Fire. Two old matchups go away: Frost no longer beats Verdant, and Stone no longer beats Storm. That is why the ring phase comes after the safer work and needs a full sim pass (open question 1).

### Hybrids

- A hybrid has a first and a second element, from its two parents. Opposed pairs can't mix (no Light and Shadow, no Aether and Void).
- **Defending:** it takes the average of its two matchups. A Fire and Tide dragon hit by Storm takes (1.0 + 1.5) / 2 = 1.25x.
- **Breathing:** its breath uses whichever of its two elements does better against the target, at 90 percent power. The status it can inflict comes from the element it used. Spells and gear are unchanged.
- **Stats:** +1 from each element's bonus instead of +2 from one.
- **Names:** a table in `elements.json` names the common mixes (Fire and Tide is Steam, Fire and Stone is Magma, Frost and Tide is Glacier, and so on). Any mix without a name shows as "Fire-Aether".
- **Looks:** the first element's tail tip, ringed in the second element's color, drawn in code. Breath alternates the two bursts. No new art.
- Late areas can have hybrid enemies too (The Confluence, below).

### Breeds

A breed is a body shape with its own stat lean and one signature move. The dragon that exists today becomes the **Dragon** (balanced). Three new breeds, working names:

| Breed | Body | Stat lean | Signature move | First found |
| --- | --- | --- | --- | --- |
| Wyvern | Two legs, wings as arms, long tail | More Swift, less Scale | Rake: two quick strikes, high crit | Starglass Hollow egg drops |
| Wyrm | Long serpent body, small wings | More Spirit, breath fills faster | Coil: binds one enemy, which can't dodge | Voidmarch egg drops |
| Behemoth | Heavy, armored, short wings | More Scale, less Swift | Brace: guards the whole party for a round | Dragonsrest egg drops |

- Breed is chosen when an egg is made (drops, breeding, Elder eggs) and never changes. Talents, gear, life stages and Ride mode work the same for every breed. All breeds have wings so Ride mode still fits.
- Each new breed needs 8 Codex generations: 4 life stages, idle and attack. They must be painted in the key colors so the player recolor works (`docs/ART_STYLE.md`), and each needs its tail tip point marked for the code-drawn tip. Before generating, I'll try one sheet holding all four stages; if it holds up, a breed drops to about 2 generations. If not, it's 8.

### Breeding

- A new Roost building, the **Nesting Grounds**, with three levels.
- Pick two Adult or Elder dragons that are resting at the Roost. After a real-time wait (working number 8 hours) an egg appears. It costs gold and embers, and each dragon can breed again only after a cooldown (working number 3 days), so eggs don't flood the Nest.
- The egg is rolled with the seeded RNG: the first parent's element 40 percent, the second's 40 percent, a hybrid of the two 20 percent (when they can mix). Breed: either parent's, 50/50. A rare variant: 1 in 50, or 1 in 10 when a parent has one. Every number goes in `roost.json`.
- Hybrids can breed. Their egg gets one of their two elements or the same hybrid.
- Elder egg laying stays as it is, one egg of the Elder's own element and breed.

### A bigger roster

- **Nest levels 4 and 5:** 8 and 10 dragons. The Dragons screen gets a compact list so 10 dragons don't mean a long scroll (with a height budget in `e2e/ui.spec.ts`).
- **A third dragon in battle from rider level 60.** Dragons stop at level 50 while the rider goes to 100, which is the main balance risk past 50. A third partner at 60 helps with that. It needs a new layout for the order rows (the current one has no room) and a stage check against the 100-node budget. It gets its own phase and a layout checkpoint with Eric before it's built.

### Rare variants

Players already pick their dragon's colors, so a variant is a finish on top of those colors, not a color. Four to start, all drawn in code in the recolor step: **Shimmer** (a metallic sheen), **Starry** (speckles), **Ghost** (soft see-through edges with a glow) and **Ember-eyed** (glowing eyes and spines). Cosmetic only, shown with a badge on the Dragons screen. No art; painted markings could come later.

### New maps: the Hidden Reach and the Elder Wilds, levels 30 to 100

Seven new areas, one per 10 levels, on two new painted maps. Together with W5 to W9 this gives two places to go in every band from 30 to 100. The areas above 50 can only ship once the matching W phase has raised the cap.

| Area | Map | Levels | Elements | Unlocks after | What it brings |
| --- | --- | --- | --- | --- | --- |
| Starglass Hollow | The Hidden Reach | 30 to 40 | Aether, Frost | Level 30 and the Storm Roc | Aether, Wyvern eggs |
| Voidmarch | The Hidden Reach | 40 to 50 | Void, Stone | Level 40 and the Starglass boss | Void, Wyrm eggs |
| Rotroot Thicket | The Hidden Reach | 50 to 60 | Blight, Verdant | Level 50 and the Voidmarch boss | Blight |
| The Steelspine Range | The Elder Wilds | 60 to 70 | Steel, Storm | Level 60 and the Rotroot boss | Steel |
| Twilight Rift | The Elder Wilds | 70 to 80 | Aether, Void | Level 70 and the Steelspine boss | The pair at full strength |
| The Confluence | The Elder Wilds | 80 to 90 | Hybrid enemies (Steam, Magma and others) | Level 80 and the Twilight Rift boss | Hybrid enemies |
| Dragonsrest | The Elder Wilds | 90 to 100 | All four new elements | Level 90 and the Confluence boss | Behemoth eggs, the home of the first dragons, a closing story |

Each area follows the recipe in `docs/HANDOFF.md` ("How to add an area"): 5 enemies, a mini-boss and a boss, a story chain, a bounty pool, a gear set, a shop line, a Forge recipe and 5 Codex generations. Each new element also gets a rider spell timed to its area (the spell test requires one within two levels of the area opening), weapons in that element and a gear line.

The Map gets two new regions in `regions.json`, each with a painted map (1 generation each, `jobs8.py` is the pattern). The Hidden Reach sits next to the High Lands, and the Elder Wilds next to Beyond the Peak.

## Chunks (Eric's grouping, 2026-11-13)

The phases ship in chunks. Each chunk ends with something to play on the phone, so it's the natural point to deploy.

| Chunk | Phases | Codex generations | What it gives |
| --- | --- | --- | --- |
| 1. Groundwork | E0 | 0 | Room for 10 dragons, eggs returned to the wild for embers, the save and engine ready for what follows |
| 2. The Roost grows | E1, E3 | 0 | Rare finishes, breeding, hybrids |
| 3. The Hidden Reach | E2, E4, E5 | 29 (about 17) | The new map with Starglass Hollow and Voidmarch, Aether and Void, the Wyvern and the Wyrm |
| 4. Level 60 | W5, E8 | 5 | The cap goes to 60 and a third dragon joins fights at 60 |
| 5. The ring grows | E6, E7 | 5 | Blight and Steel, the rebalance, Rotroot Thicket |
| 6 to 9. One level band each | W6 and E9, W7 and E10, W8 and E11, W9 and E12 | 11, 10, 10, 18 | Each raises the cap by 10 and opens two areas at those levels |

Fixed order: E0 first, W5 before anything above level 50. Chunks 2 and 3 can swap, and so can 4 and 5 (E7 waits for both).

## Phases

One at a time, each tested and committed. Deploy when Eric says.

### E0. Foundation (no art)

- Status rules in `battle.ts` read each status's effect fields (no dodge, a defense multiplier, an element it amplifies, and so on) instead of checking status ids, so a status that reuses existing effects is only data. `ElementId` stays a typed union; each phase that adds elements adds them to the union and to `elements.json` together, and the data test checks the two match.
- Save v10: each dragon gets `breed` (default `dragon`), `element2` (default none) and `variant` (default none); eggs become a list of objects (element, second element, breed, variant) instead of counts per element. Migration and a v9 fixture test.
- Nest levels 4 and 5 (8 and 10 dragons) and the compact Dragons list.
- Returning unwanted eggs to the wild for embers.
- The sim and AI understand breeds, hybrids and the new egg shape.

Done when: every existing test, the sim and the phone tests pass unchanged on v10; a v9 save loads; the Nest reaches 10.

### E1. Rare variants (no art)

The four finishes in the recolor step, the hatch roll, the badge, a phone test with screenshots at 375 wide. Small, and a quick visible win.

### E2. Aether, Void and Starglass Hollow

- Both new elements in data: statuses, stat bonuses, eggs, colors, symbols. Void eggs can't drop until Voidmarch, but a test hatches one.
- One rider spell (Aether), gear lines in Aether.
- The Hidden Reach region and its map. Starglass Hollow with Wyvern eggs as placeholders until E4.
- **Art: 8 generations.** The Hidden Reach map (1), the area (5), a sheet of tail tips for all four new elements (1) and a sheet of their breath bursts (1). Doing all four now means Blight and Steel need no tips or bursts later.

### E3. Breeding and hybrids (no art)

The Nesting Grounds, the breeding roll, hybrid rules in the engine, hybrid names, the two-tone tail tip and alternating breath. Save v11 for breeding timers and cooldowns. Unit tests for hybrid damage with fixed seeds.

### E4. The Wyvern

The breed system with its first new breed: stat lean, signature move, the art in the rigs, egg drops in Starglass Hollow. **Art: 8 generations** (about 2 if the stage sheet works).

### E5. Voidmarch and the Wyrm

The area (Void enters play, a Void spell), Wyrm eggs. **Art: 5 for the area and 8 (or about 2) for the Wyrm.**

### Then W5 (Sunken Spires, cap 60), as planned in `docs/WORLD_PLAN.md`

### E6. The ring grows: Blight and Steel (no new art)

Statuses, stat bonuses, eggs, spells, gear lines. The two broken matchups change several old zones, so every zone goes through the sim again (70 to 85 percent on level for each starter) and gets retuned where it falls out. The Blight and Steel tips and bursts already exist from E2.

### E7. Rotroot Thicket (50 to 60). Art: 5

### E8. A third partner from rider level 60 (no art)

The new order-row layout and the stage check, with a layout mockup for Eric before it's built. Frontier balance from W6 on is tuned with three dragons.

### Then W6 (Emberwild, cap 70)

### E9. The Steelspine Range and the Elder Wilds map. Art: 6 (5 for the area, 1 for the map)

### Then W7. E10 Twilight Rift (art: 5). W8. E11 The Confluence (art: 5). W9. E12 Dragonsrest and the Behemoth (art: 5 plus 8 or about 2)

## Art budget

| Phase | Generations |
| --- | --- |
| E2 | 8 |
| E4 | 8 (about 2 if a stage sheet works) |
| E5 | 13 (about 7) |
| E7, E10, E11 | 5 each |
| E9 | 6 |
| E12 | 13 (about 7) |
| **Total** | **63 (about 45 with stage sheets)** |

That's on top of the 25 for W5 to W9. E0, E1, E3, E6 and E8 need no art, so they can be done any time Eric's Codex limits are low.

## Risks

- **Balance.** The ring change in E6 is the big one. The pair, hybrids and breeds can each be checked in the sim on their own first. Hybrids that average their weaknesses are steadier than single elements, so their breath is weaker (90 percent) to keep them from being strictly better.
- **Screens with more elements.** Weakness lists, element filters and egg lists were built for 8. With 12 plus hybrid names, each needs a check at 375 wide.
- **Download size.** Each breed adds about 480 KB of dragon art (8 images at about 60 KB). Breed art should be cached on first view like area art, not precached.
- **Breed art and the recolor.** New body shapes must keep to the key colors, or the recolor misses. `tests/tint.test.ts` gets the new breeds' measured colors.

## Eric's answers (2026-11-13)

1. **Where Blight and Steel join the ring:** "where it makes sense". So the plan's placement stands: Blight between Frost and Verdant, Steel between Stone and Storm.
2. **A third dragon in battle at rider level 60:** yes.
3. **Breeding pace:** 8 hours and a 3 day cooldown are fine. He also asked what happens to eggs a player doesn't want. Selling them for gold "doesn't feel right", so an unwanted egg can be **returned to the wild**, and the wild dragons leave embers in thanks. Built in E0 (see below).
4. **Names:** settled in a round of discovery questions the same day. See "Names" below.

### Returning eggs to the wild

- Any egg in the bag can be returned from the Roost's egg list, after a confirm ("Return the Ember Egg to the wild? The wild dragons will leave 3 embers.").
- Embers by egg (in `roost.json`, `releaseEmbers`): 3 for a plain egg, +2 if it's a hybrid, +2 for a breed other than the Dragon, +7 for a rare variant. A plain egg pays about what one bounty pays, so it never beats hatching and raising a dragon. An incubating egg can't be returned; the egg being hatched can't either.

## Names (decided 2026-11-13)

Eric chose these in a round of discovery questions. Everything above already uses them.

| Kind | Names |
| --- | --- |
| New elements | Aether and Void (the pair), Blight and Steel (the ring) |
| Their statuses | Silence (Aether), Hollow (Void), Rot (Blight), Rend (Steel) |
| Their eggs | Starlit Egg, Hollow Egg, Rotten Egg, Iron Egg |
| Breeds | Dragon (today's body), Wyvern, Wyrm, Behemoth. Classic dragon words, his pick of style |
| Rare finishes | Shimmer, Starry, Ghost, Ember-eyed |
| New maps | The Hidden Reach (30 to 60), The Elder Wilds (60 to 100) |
| Hidden Reach areas | Starglass Hollow (30 to 40), Voidmarch (40 to 50), Rotroot Thicket (50 to 60) |
| Elder Wilds areas | The Steelspine Range (60 to 70), Twilight Rift (70 to 80), The Confluence (80 to 90), Dragonsrest (90 to 100) |
| Frontier areas W5 to W9 | Kept as planned: Sunken Spires, Emberwild, Skyreach Isles, Hollow Crown, Starfall Summit |

### Hybrid names

Eric wants every mix named. Twelve elements make 64 mixes once the two opposed pairs (Light and Shadow, Aether and Void) are left out. The order of the two elements doesn't change the name. These go into `elements.json` in E3; Eric can change any of them.

| First | Second | Hybrid |
| --- | --- | --- |
| Fire | Frost | Thaw |
| Fire | Blight | Brimstone |
| Fire | Verdant | Wildfire |
| Fire | Stone | Magma |
| Fire | Steel | Forge |
| Fire | Storm | Plasma |
| Fire | Tide | Steam |
| Fire | Light | Solar |
| Fire | Shadow | Smoke |
| Fire | Aether | Comet |
| Fire | Void | Ash |
| Frost | Blight | Frostbite |
| Frost | Verdant | Winterbloom |
| Frost | Stone | Permafrost |
| Frost | Steel | Coldiron |
| Frost | Storm | Blizzard |
| Frost | Tide | Glacier |
| Frost | Light | Prism |
| Frost | Shadow | Nightfrost |
| Frost | Aether | Aurora |
| Frost | Void | Deepfreeze |
| Blight | Verdant | Spore |
| Blight | Stone | Sulfur |
| Blight | Steel | Rust |
| Blight | Storm | Acid |
| Blight | Tide | Bog |
| Blight | Light | Pallor |
| Blight | Shadow | Plague |
| Blight | Aether | Miasma |
| Blight | Void | Decay |
| Verdant | Stone | Overgrowth |
| Verdant | Steel | Ironwood |
| Verdant | Storm | Pollen |
| Verdant | Tide | Mangrove |
| Verdant | Light | Bloom |
| Verdant | Shadow | Nightshade |
| Verdant | Aether | Lotus |
| Verdant | Void | Wither |
| Stone | Steel | Ore |
| Stone | Storm | Sandstorm |
| Stone | Tide | Coral |
| Stone | Light | Crystal |
| Stone | Shadow | Obsidian |
| Stone | Aether | Meteor |
| Stone | Void | Chasm |
| Steel | Storm | Volt |
| Steel | Tide | Anchor |
| Steel | Light | Silver |
| Steel | Shadow | Razor |
| Steel | Aether | Starsteel |
| Steel | Void | Gravity |
| Storm | Tide | Monsoon |
| Storm | Light | Flash |
| Storm | Shadow | Thunderhead |
| Storm | Aether | Ion |
| Storm | Void | Vortex |
| Tide | Light | Rainbow |
| Tide | Shadow | Abyss |
| Tide | Aether | Moontide |
| Tide | Void | Maelstrom |
| Light | Aether | Astral |
| Light | Void | Halo |
| Shadow | Aether | Nebula |
| Shadow | Void | Oblivion |
