# Art style guide

Written in phase B0 of `docs/GRAPHICS_PLAN.md`. Eric looked at the mock battle (`#/dev/mock`) on his iPhone and approved the look. Everything below describes the B0 samples: the Adult fire dragon, the rider, the Storm Roc, the Thunderspire backdrop and three effects.

## The look

Smooth vector art in the spirit of a Flash-era RPG: flat fills, one shade layer, a dark outline, and chunky, rounded shapes. Friendly and a little silly, readable at phone size. Nothing is copied from Artix Entertainment games.

- Outline color is `#1d1a2b` (the app background). Outer outlines are 4 units on a canvas about 200 units tall, which comes out near 2.5 px on a 375-wide phone. The rider, on a 170-unit canvas, uses 3.5. Inner detail lines are 2 to 3 units.
- Light comes from the top front. Each shape gets one shade layer on its lower back side, drawn as a separate flat shape under the outline. The shade color is the base color mixed 25 percent toward the outline color (`shadeMix` in `src/art/palette.json`).
- Eyes are big, with a white highlight dot. Enemies get a heavy brow so they read as unfriendly from across the stage.
- Horns, claws and teeth use bone (`#efe4c8`, shade `#cbbd99`).
- No gradients, filters, text or embedded bitmaps in character parts. Backdrops may use one gradient for the sky.

## Colors

Shared colors live in `src/art/palette.json`. Element colors come from `src/data/elements.json`; don't copy them into art files.

Dragon parts are drawn in neutral gray tokens, which the game swaps for the player's colors once, when the fight loads:

| Token | Becomes |
| --- | --- |
| `#9a9a9a` | primary color |
| `#6e6e6e` | primary shade |
| `#d6d6d6` | secondary color (belly, wing membrane, spines) |
| `#b0b0b0` | secondary shade |

Don't use these four grays for anything else in a dragon part. Element details that shouldn't follow the player's colors (the fire tail flame, for example) use fixed colors and live in their own overlay part.

Enemy body plans (see below) use the same four grays plus an accent pair: `#505050` accent and `#3c3c3c` accent shade. Each enemy's three colors (primary, secondary, accent) are listed in `assets.json`; the shades are mixed from them.

The breath puff uses three tokens (`#555555` edge, `#888888` middle, `#cccccc` core). The edge becomes the element color and the other two come from `palette.json`, `breath.<element>`.

## Rigs: characters built from parts

Each character is a rig: a set of SVG parts stacked in one box. Every part is drawn in place on the rig's full canvas (same `viewBox` for all parts of a rig), so stacking them rebuilds the character. Parts move by rotating around a pivot listed in `src/art/assets.json` as a fraction of the canvas.

- Draw everything facing right. The stage mirrors enemies.
- Keep feet on a shared ground line near the bottom of the canvas.
- Leave room for motion. A wing that flaps up needs empty canvas above it (the Roc canvas starts at y = -40 for this).
- Hide joints: draw the base of a moving part so it tucks under the part in front of it, and the seam won't open when it rotates.

| Rig | Canvas | Parts, back to front |
| --- | --- | --- |
| Hatchling dragon | 200 x 170 | the Adult's parts, no tail tip |
| Juvenile dragon | 240 x 190 | the Adult's parts |
| Adult dragon | 260 x 200 | back leg; torso group (back wing, tail with element tip, body, head with jaw, front wing); front leg |
| Elder dragon | 300 x 244 (drawn 14 units down for wing room) | the Adult's parts |
| Rider | 120 x 170 | one group (cape, body with legs and back arm, head, weapon arm) |
| Bosses | 260 x 270 (viewBox starts at y = -40) | 4 to 6 parts: legs, a torso group (body, head, arm, jaw, wings or tail), drawn in fixed colors |
| Enemy body plans | per plan | 3 to 6 parts in gray tokens, shared by many enemies |

All four dragon stages share part ids and pivots so every battle beat works on each. A rig's `boxScale` sets its size on stage relative to its slot (Hatchling 0.62, Juvenile 0.84, Adult 1, Elder 1.12; bosses 1 to 1.1).

Groups exist so idle loops can move several parts together. The torso breathes while the legs stay planted. A part with children (the head and its jaw) moves its children with it.

The manifest also lists named points per rig, as fractions of the canvas: `mouth` (where breath starts), `hit` (where sparks land and numbers start) and `front` (where a dash stops).

### Enemies from body plans

Bosses have their own rigs (`enemy.<id>`). The other 42 enemies are drawn from shared body plans (`plan.<name>` rigs with `"tint": "enemy"`, files in `src/art/rigs/plans/`). Each enemy's entry under `enemies` in `assets.json` names its plan, its three colors, a `scale` (small critters about 0.6, mini-bosses about 1) and up to two extra parts (horns, a crown, a lantern) from `src/art/rigs/extras/`. An extra hangs from a named part of the plan, so it moves with it; `"root"` puts it on the rig itself.

### Weapons

The rider's arm file is `arm-{weapon}.svg`: `sword` for melee weapons, `bow` for ranged, `staff` for magic. All three share the shoulder pivot.

### Element overlays

A part file name may contain `{element}`, as in `tail-tip-{element}.svg`. The game fills in the dragon's element. If that file doesn't exist the part is skipped, so the dragon still draws without it. B0 has only the fire tail tip.

## Backdrops

A backdrop is 1600 x 1100 (the stage's 16:11 shape), split into layers that stack in order: sky, far scenery, an optional drifting layer (clouds), and ground.

- The ground's top edge sits about 75 percent of the way down. Fighters stand between 86 and 93 percent.
- Keep the band where fighters stand (about 35 to 90 percent down) calmer and lower in contrast than the characters, and avoid the zone's enemy colors there. In Thunderspire the ground is a warm gray-violet so the dark blue Roc stands out.
- Only one layer moves, and only slowly (`drift`, a 40 second sideways sway).

## Eggs

`src/art/eggs/`: `egg.svg` (120 x 150, gray tokens: the shell takes the element color, spots and the band a lighter mix of it), three crack overlays that grow, and a top and bottom half that rebuild the egg for the hatching moment.

## Effects

Effects have no outline, except the hit spark. They are flat shapes in two or three tones: `slash.svg` (a crescent swoosh), `spark.svg` (a starburst) and `puff.svg` (a breath blob tinted per element).

## UI icons

`src/art/icons/<name>.svg`, viewBox 48 x 48, fixed colors, the same outline at about 3 units. They show at 16 to 32 px on the dark plum UI, so they are bold, simple silhouettes. Names follow the data: `item-<id>`, `food-<id>`, `status-<id>`, `intent-<kind>`, `building-<id>`, plus `gold`, `ember`, `egg`, `lock`, `town`, `event`, `feed`, `groom`, `rest`, `xp` and `bond`. A missing icon falls back to its emoji.

## Files and the manifest

- Parts are SVG under `src/art/rigs/<rig>/`, backdrops under `src/art/backdrops/<zone>/`, effects under `src/art/effects/`. Each one is listed in `src/art/assets.json`.
- Keep each part small (B0 parts are 0.4 to 2 kB).
- Eric can replace any part with his own art: a transparent WebP of the same canvas size, drawn in place and facing right, pointed at from the manifest. Dragon parts should be neutral gray so they can be tinted. Tinting bitmap parts is a B1 job.
- If a part is missing, the rig still draws without it. If a rig's body is missing, the stage falls back to today's placeholder shape.

## Rules that keep it fast

- Every part is its own `<img>`. Never animate inside an inline SVG.
- Animate only `transform` and `opacity`.
- The stage stays under 100 DOM nodes, effects included (the B0 draft said 60; see GRAPHICS_PLAN.md, B2 to B4 calls). A one-on-one fight uses about 63, two dragons against two enemies about 93. Every part and extra is a node, so prefer fewer parts.

## Review checklist

Look at each new piece on a phone at 375 wide, in the mock battle or the art contact sheet (`#/dev/art`):

1. Does it read as what it is at a glance, at its real size?
2. Does it stand out from the zone backdrop?
3. Outline weight matches its neighbors?
4. Do the joints stay closed when the part swings through its full range?
5. Does it look right mirrored (enemies) and tinted in a few player colors (dragons)?
