# Looks plan: a rider you can color, and gear you can see

Written 2026-11-16 at Eric's request. Status (2026-11-17): L0, L1 (rider colors) and L2 (gear icons) are built, with the icon art in, and were deployed on 2026-11-17. See "Built" at the end. The sections before it are the plan as written; where the build differs, "Built" says so.

Eric's answers (2026-11-16): add the "Your keeper" step to new games; the five parts are fine for now and may change later; icon colors as recommended. "Let's build this."

The request, in Eric's words: "adding more art / customization. Like different weapons, armor etc should have different art. We should be able to customize our character." From eight options he picked two halves to plan: "the color half of 1 and the icon half of 2", and asked that both ideas be documented in full, "even the parts we didn't touch".

So this file covers four pieces of work. Two are planned for building, two are written down for later.

| Piece | What it is | Status |
| --- | --- | --- |
| 1a. Rider colors | Pick the rider's skin, hair, tunic, trousers and cape colors | Planned here, phases L0 and L1 |
| 1b. Outfits | Whole new painted outfits for the rider | Documented, not planned for building |
| 2a. Gear icons | A painted icon for every piece of gear in the Bag, Town, Forge and loot lines | Planned here, phase L2 |
| 2b. Weapons on the stage | The equipped weapon drawn in the rider's hand in battle | Documented, not planned for building |

## What exists today

| Fact | Detail |
| --- | --- |
| The rider's art | Seven painted images: `rider-sword`, `rider-bow`, `rider-staff`, an attack pose for each, and `rider-mounted` (252 KB together). Rigs `rider.sword`, `rider.bow`, `rider.staff`, `rider.mounted` in `src/art/assets.json` |
| What picks the image | Only the equipped weapon's type (`weaponArt` in `src/ui/stage/rigs.ts`). Every sword looks the same, and armor and trinkets change nothing |
| The rider's look | One fixed character: brown hair, a teal tunic, blue trousers, a crimson cape, brown leather boots, belt and bracers |
| Where the rider is drawn | Only on the battle stage (and the dev art sheet). The Bag, the Title and the Roost never show the rider |
| What the save knows | `rider.name` and nothing else about looks (`RiderState` in `src/core/types.ts`). The name is set in Settings |
| Gear | 331 pieces in `src/data/gear.json`: 183 weapons (61 each of melee, ranged and magic), 55 armors, 69 trinkets, and 8 each of saddles, horn caps and dragon charms. 105 weapons have an element |
| How gear is shown | Text only: a name, a stat summary and, for weapons, an element badge (`GearElement` in `src/ui/bits.tsx`). No piece has a picture |
| Icons that exist | 44 painted icons in `src/art/icons/` (336 KB), 136 x 136, cut from four sheets of up to twelve. `Icon` in `src/ui/Icon.tsx` falls back to an emoji when a file is missing |
| Dragon recoloring | `src/ui/stage/tint.ts` sorts each pixel into a color family by hue (red body, gold belly) and repaints it in the player's colors once at load, keeping the two-tone shading. Numbers are in `src/art/palette.json` under `paintedKeys`. Eggs use the same code |

## The recolor test

The first estimate for rider colors was about 7 generations, to repaint the rider in key colors the way dragons are painted. Before writing this plan I tested whether the art we already have can be recolored instead.

`tools/art/painted/rider_rekey_test.py` sorts each pixel of the seven rider images into families by hue and brightness, then repaints them: cape (red), tunic (teal), trousers (blue), skin (light warm tones) and hair (brown patches near the top of the figure). The result is `docs/img/rider-recolor-test.jpg`: the top row is today's art, the bottom row the same images with a blue cape, a purple tunic, gray trousers, darker skin and blonde hair.

What it showed:

- The cape, tunic and trousers recolor cleanly in all seven images. Their hues are far apart from each other and from everything else.
- Skin recolors cleanly too. It shares a hue with the leather but is much lighter.
- Hair is the hard one. It is the same brown as the boots, belt, bracers, bow and staff. Picking "brown near the top" got the hair right but also caught the top of the bow, the whole staff shaft, and a bracer on the raised arm in the mounted image.

So the plan is to fix hair once, when the art is packed, with a small list of hand-drawn boxes per image that say "this brown is not hair". The packer then repaints the hair in a key color no other part uses (magenta), and the game recolors by hue alone, as it does for dragons. That needs no generations. If the boxes turn out too fiddly on some image, the fallback is the first idea: regenerate the rider in key colors, 7 generations.

## 1a. Rider colors (to build)

### What the player gets

- Five colors to choose: skin, hair, tunic, trousers and cape. Leather, metal buckles and the weapon stay as painted.
- Six ready-made looks to tap, a Randomize button, and a row of swatches per part for anyone who wants to fiddle.
- A new Look tab in the Bag (beside Gear, Stats, Spells and Items) with the rider drawn large, changing as swatches are tapped. Changes are free and can be made at any time outside a fight.
- A short "Your keeper" step when starting a new game: name, the six ready-made looks, and a Customize button. It can be skipped.
- The chosen colors show everywhere the rider is drawn: all three weapon stances, their attack poses and Ride mode.
- The default look is today's rider, so existing saves look the same until the player changes something.

### How it works

1. **Pack time.** A new script, `tools/art/painted/rekey_rider.py`, reads the seven rider WebPs, finds the hair (brown patches high on the figure, minus the boxes listed per image in `tools/art/painted/rider_keys.json`) and repaints it magenta with its shading kept. It writes the seven files back. The raw PNGs are gone, so it works from the packed WebPs; it runs once and the result is committed.
2. **Load time.** `tint.ts` gains a general `recolorFamilies(px, families)` that takes a list of hue ranges and target colors. The dragon recolor becomes a call to it with two families, with the same results as now (its fixed-pixel tests must not change). The rider uses five families. The ranges live in `palette.json` under `riderKeys`.
3. **Loading the rig.** `loadRig('rider.<weapon>', look)` takes the rider's look and caches by it, the same way dragon rigs cache by color. `BattleStage.tsx` and `useRiderRig` in `Scene.tsx` pass `save.rider.look`.
4. **The choices.** `src/data/looks.json` holds the swatch lists (about 8 skin tones, 10 hair colors, 12 cloth colors shared by tunic, trousers and cape), the six ready-made looks and the default. The default's values are sampled from the art so the default rider matches today's.
5. **The save.** Version 17 adds `rider.look: { skin, hair, tunic, trousers, cape }`, five hex strings. The migration fills in the default. `tests/fixtures/save-v16.json` and a test load it. Export and import carry it with no extra work.
6. **Core stays pure.** `setRiderLook(data, save, look)` in `src/core/game.ts` checks every color is one of the listed swatches and refuses during a fight. The pixel work is UI code, already written so it runs under Vitest.

### Tests

- Unit: `recolorFamilies` on small fixed pixel arrays (each family lands on its target, shading tones survive, leather and outline are untouched, dragons give the same bytes as before). The v16 to v17 migration. `setRiderLook` rejects a color that isn't a swatch.
- Data: every swatch is a valid hex color; every ready-made look uses listed swatches.
- Phone (375 x 667): pick a look in the Bag, reload, it is still there; the stage rider's pixels differ from the default; the new game step can be skipped; the Look tab fits the Bag's height budget in `e2e/ui.spec.ts`. The new game helper in `e2e/helpers.ts` needs one more tap.
- By eye: the art sheet (`#/dev/art`) shows all seven images in the six ready-made looks. Look for brown left in the hair, magenta fringes at the hairline, and skin shadows that went muddy on the darkest and lightest tones.

### Cost and risk

No generations, if the boxes work. Save v17. Nothing added to the download except a few KB of data.

The risk is the hair edge: WebP is lossy, so magenta can bleed a pixel into the outline or the forehead. The fix is to save the seven re-keyed files at a higher quality (they are small) and check the hairline at 2x. The fallback is 7 generations.

## 2a. Gear icons (to build)

### What the player gets

- Every gear row in the Bag, the Town shop, the Forge and the Map's Loot sheet gets a painted icon, and so do the three equipped slots at the top of the Bag and the "Found the..." line after a fight.
- A sword looks like a sword and a cutlass like a cutlass. There are 48 shapes, not 331 paintings.
- Two things make pieces of the same shape differ. The icon's accent (a gem, a wrap, a glow) takes the weapon's element color, and its metal trim takes a tier color that changes with the piece's level, bronze at the start through to a star metal near 100. A level 5 fire blade and a level 80 void blade share a shape and look nothing alike.

### The 48 shapes

Four sheets of twelve, the pattern the existing icons used.

| Sheet | Icons |
| --- | --- |
| Melee (12) | sword, saber, greatsword, axe, cleaver, hammer, club, polearm, trident, sickle, pickaxe, training stick |
| Ranged and magic (12) | bow, longbow, horn bow, crossbow, repeater, sling, blowgun; staff, wand, scepter, orb, tome |
| Armor and dragon gear (12) | plate, mail, coat, robe, cloak, leathers, wraps, apron; saddle, horn cap, dragon charm; an empty-slot icon |
| Trinkets (12) | charm, pendant, ring, gem, sigil, heart, lantern, crown, feather, fang, flower, oddity |

Gear names already say which shape fits: 34 of the 61 ranged weapons end in "Bow", 20 magic weapons in "Staff", 11 melee in "Blade". A script, `tools/content/gear_icons.py`, assigns an `icon` to every piece from the last word of its name, with a hand table for the odd ones ("Rod of Ages", "Staff of Nothing", the "-breaker" hammers, trinkets called "Riddle" or "Echoes"). The `icon` field is stored in `gear.json` so Eric can change any piece by hand.

### How it works

1. **Art.** Each icon is painted in the dragon key colors: red for the accent, gold for the trim, with steel, wood and leather in their real colors. That lets `recolorFamilies` (from 1a) do the coloring with no new pixel code. If L2 is built before L1, it uses today's `recolorPixels`, which already handles these two families.
2. **Packing.** Four entries in `pack.py`'s `ICONS` table, saved as `src/art/icons/gear-<shape>.webp`. Pack them at 96 x 96, not 136: rows show them at 32 to 44 px, and the smaller size keeps 48 files near 200 KB.
3. **Coloring.** A small `GearIcon` component in `src/ui/bits.tsx` draws the icon to a canvas once per (shape, accent, trim), keeps the result in a memory cache, and shows it as an image. A row that scrolls into a long Town list colors its icon when it mounts.
4. **Which colors.** Accent: the weapon's element color; for a set piece without an element, the color of its zone's element; otherwise a neutral from the tier. Trim: the tier for the piece's level. Tiers (level bands and colors) live in `palette.json` under `gearTiers`. A Forge upgrade (+1 to +3) could add a small gold pip per plus, drawn in CSS.
5. **Missing art.** `GearIcon` falls back to the slot's emoji, like every other icon, so the data and UI can ship before the sheets exist.

### Tests

- Data: every gear piece has an `icon`, and every `icon` is one of the 48 names.
- Phone: Bag, Town and Forge rows show an icon at 375 wide without growing past the height budgets in `e2e/ui.spec.ts`; tap targets stay 44 px; with the icon files removed, rows still render.
- By eye: all 48 on the art sheet in three element colors and all tiers. Each must read as its object at 32 px.

### Cost and risk

4 generations, plus up to 2 redos if a sheet has an icon that doesn't read small. About 200 KB added to the precache. No save change. One optional fifth sheet would fill gaps the handoff doesn't list but the icon folder shows: the Forge and Nesting Grounds have no building icon, and the three Forge materials and the bag have none either. That would make 5.

The risk is small: twelve-icon sheets have worked four times. The thing to watch is the key colors, since an icon with red or gold in the wrong place recolors wrongly. The prompt has to say where each color goes, as the dragon prompts do.

## Phases

| Phase | Work | Art | Save | Done when |
| --- | --- | --- | --- | --- |
| L0 | Re-key the seven rider images with the box list; show six looks on the art sheet | 0 | none | Eric looks at the sheet and says the hair is clean, or picks the 7-generation fallback |
| L1 | `recolorFamilies`, `looks.json`, save v17, the Look tab, the new game step, tests | 0 | v17 | All checks pass and a look survives a reload and an export |
| L2 | Icon data and the script, `GearIcon`, tier colors, the four sheets, tests | 4 to 6 | none | Every gear row shows a painted icon at 375 wide |

L1 and L2 don't depend on each other. I'd build L0 and L1 first because they need no Codex login, then L2 in the same session if Eric is free to sign in.

## 1b. Outfits (documented, not planned)

Whole outfits for the rider: a ranger's hood, plate armor, a mage's robe, and so on.

- **Why it costs more.** The pose and weapon are baked into each painted image, so one outfit is seven images: three stances, three attack poses and the mounted one. That is 7 generations an outfit, each using the default rider as the second reference so the face and proportions hold. Six outfits would be 42.
- **How it would fit 1a.** Paint each outfit with the same color roles (a cape or cloak in red, the main garment in teal, legs in blue) and re-key its hair with the same script, so the player's five colors carry across every outfit. Each outfit needs its own box list, which is hand work per image.
- **Data.** `outfits` in `looks.json` (id, name, how it unlocks), `rider.look.outfit` in the save, rigs named `rider.<outfit>.<weapon>` that fall back to the default rider the way breed rigs fall back to `dragon.<stage>`.
- **How outfits unlock.** Three options: with armor tiers (wearing plate shows plate), as rewards for finishing a zone's hunter's log or gear set, or bought with embers. I'd pick rewards and embers and keep looks separate from stats, so nobody wears ugly armor for its numbers.
- **Download size.** About 250 KB an outfit. They should be cached on first use, like area art, not precached.
- **What it can't do cheaply.** Hair styles and body types. Hair is part of every image, so a second hair style doubles the art for every outfit. A second base character (for example a different build or face) costs the same as an outfit, 7 generations, and then every outfit has to be painted for both. If Eric wants a choice of character, the time to decide is before the first outfit is made.
- **Risk.** Keeping one face across 42 images. The second-reference trick held across the seven we have.

## 2b. Weapons on the stage (documented, not planned)

The equipped weapon drawn in the rider's hand, so a new sword shows up in the fight.

- **What it needs.** The rider repainted with empty hands in all seven images (7 generations), a larger sprite for each weapon shape (the 23 weapon shapes from 2a, about 2 more sheets at a bigger size), and for every pose a grip point and an angle in `assets.json` so the weapon sits in the hand.
- **Why it is the risky one.** A hand has to wrap a handle. Either the weapon is drawn behind a closed fist (simple, but the fist must be painted to look right holding nothing) or each pose gets a small "fingers" piece drawn over the weapon. The bow's attack pose needs a drawn string and an arrow, and the staff is held differently from a sword. One stage node is added per rider, which fits the 100-node budget.
- **A cheap proof first.** Sword only: an empty-handed idle and attack pose (2 generations) and two sword sprites. If the grip looks wrong there, stop.
- **A door to leave open in 2a.** Raw PNGs are never committed, so the weapon icons would have to be generated again for the stage. When packing 2a, also save the 23 weapon shapes at 320 px into `tools/art/painted/masters/` (in the repo, not shipped). That is about 350 KB and would save 2 generations later.
- **Armor on the stage** is the outfits idea (1b); there is no separate route to it.
- **A much smaller version.** The staff's gem is the only purple on the rider, so it could take the weapon's element color with one more family in 1a's recolor and no art. Blades are gray with no hue to key on, and the bow has nothing to tint, so this would be a staff-only touch.

## Questions for Eric

None of these block L0.

1. **The new game step.** Add "Your keeper" (name, six looks, skip) before the egg pick, or keep new games as they are and leave looks to the Bag? I'd add it; it also gives the rider's name a proper home.
2. **Which five parts.** Skin, hair, tunic, trousers and cape, with leather fixed. Is that the right set?
3. **Icon accents on plain gear.** Element color where there is one, the set's zone color for set pieces, a tier neutral otherwise. Or keep plain gear plain?
4. **The fifth icon sheet** (Forge, Nesting Grounds, materials, bag): add it for one more generation?
5. **Weapon masters.** Keep 320 px copies of the weapon icons in the repo for a possible 2b?
6. **A choice of character.** If a second base rider is ever wanted, it changes how outfits would be made (see 1b). Worth deciding before any outfit, not before this plan's work.

## Built (2026-11-17)

### L0 and L1: rider colors

- **No generations.** The hand-drawn boxes the plan expected weren't needed. In every rider image the hair is the single largest brown patch in the top of the picture, so `tools/art/painted/rekey_rider.py` finds it without help. Two details made it work: the hair's shadow tone leans red (hue near 5), so it is matched by its weak chroma; and the patch is grown by two pixels to take in its soft edge. The script repaints the hair yellow-green (hue about 86; the rider art has nothing between hue 60 and 140), not magenta as the plan said, because the staff's gem is purple.
- The seven rider files in `src/art/painted/` are the re-keyed ones (264 KB, up from 252). The script skips an image that already has key-colored hair.
- `recolorFamilies` in `src/ui/stage/tint.ts` is the shared recolor; `recolorPixels` (dragons, eggs, gear icons) and `recolorRider` call it. `hueFamily` sorts a pixel by hue ranges from data; the rider's five ranges are `riderKeys` in `src/art/palette.json`. Dragon results are byte-for-byte what they were (pinned in `tests/looks.test.ts`).
- `src/data/looks.json`: 8 skin tones, 12 hair colors, 14 cloth colors, six ready-made looks (Keeper, Ember, Frost, Moss, Dusk, Sun) and the default, which is the rider as painted. The part called trousers in the save is labeled "Legs" on screen so five part buttons fit across a phone.
- Save v17 adds `rider.look`. `setRiderLook` in `game.ts` accepts only listed swatches and refuses during a fight. `randomRiderLook` uses the seeded RNG.
- `src/ui/Look.tsx` has `RiderPreview` and `LookEditor` (ready-made looks, Random, one swatch grid for the chosen part). The Bag has a fifth tab, Look. Rows of five or more sub-tabs get tighter padding (`subtabs--tight`) so they fit at 375.
- New games open on **Your keeper** (`YourKeeper` in `Hatch.tsx`): a name, the look editor, Continue and Skip. It shows only for a game nobody has touched (default name and look, no egg), so it never comes back after it is answered, and nothing is saved until Continue. `enter()` in `e2e/helpers.ts` skips it for tests that aren't about it.
- The art sheet (`#/dev/art`) shows all four rider images in every ready-made look.

Calls made without asking: the yellow-green key; "Legs" as the label; the swatch lists and the six looks; Random on both screens; the step shown before the egg pick.

### L2: gear icons

- `src/data/gearLooks.json` lists the 48 shapes and five tiers: Bronze from level 1, Iron from 15, Silver from 30, Gold from 50, Star metal from 70. Each tier has a trim color and an accent for gear with no element.
- Every piece in `gear.json` has an `icon`. `tools/content/gear_icons.py` assigns it from the piece's name, reading the last word first ("Deepcrown Chancellor's Quill" is a feather, "Deepdelver Lantern Staff" a staff, "Lantern of Ages" a lantern). It keeps icons already set unless run with `--all`. Data validation rejects an unknown shape.
- `GearIcon` in `src/ui/bits.tsx` is on the Bag's three slots and its gear picker, Town rows, Forge rows and recipes, the Map's Loot sheet and the "Found the..." line after a fight. An empty slot draws the `empty` shape.
- **Art: 4 generations, all usable first try** (`tools/art/painted/jobs19.py`, prompts in `prompts/icons-gear-*.txt`). `pack.py` packs them at 96 px into `src/art/icons/gear-<shape>.webp` (48 files, 284 KB; the precache grew by about 240 KB) and keeps 320 px copies of the 24 weapon shapes in `tools/art/painted/masters/` (388 KB, not shipped) for a possible 2b.
- **The fifth sheet** (Eric, 2026-11-17: "generate the fifth icon sheet"): one generation, usable first try, from `jobs20.py`. Five icons painted in their final colors: `building-forge`, `building-nesting`, `material-ore`, `material-crystal`, `material-scale`. The buildings show on the Roost by name; the materials show in the Forge's materials line and costs. No bag icon was made because no screen draws one. Codex wrote the image to `v2/icons-forge.png`, not `v2/out/`, so `run.sh` reported a failure; moving the file fixed it.

### Checks

368 unit tests, types and lint pass. Phone tests: all 142 pass, with `e2e/looks.spec.ts` covering the new game step, Skip, the Look tab, the rider's colors in a fight and gear icons on three screens. No balance numbers changed, so the sim was not rerun.
