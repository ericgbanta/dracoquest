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

The breath puff uses three tokens (`#555555` edge, `#888888` middle, `#cccccc` core). The edge becomes the element color and the other two come from `palette.json`, `breath.<element>`.

## Rigs: characters built from parts

Each character is a rig: a set of SVG parts stacked in one box. Every part is drawn in place on the rig's full canvas (same `viewBox` for all parts of a rig), so stacking them rebuilds the character. Parts move by rotating around a pivot listed in `src/art/assets.json` as a fraction of the canvas.

- Draw everything facing right. The stage mirrors enemies.
- Keep feet on a shared ground line near the bottom of the canvas.
- Leave room for motion. A wing that flaps up needs empty canvas above it (the Roc canvas starts at y = -40 for this).
- Hide joints: draw the base of a moving part so it tucks under the part in front of it, and the seam won't open when it rotates.

| Rig | Canvas | Parts, back to front |
| --- | --- | --- |
| Adult dragon | 260 x 200 | back leg; torso group (back wing, tail with element tip, body, head with jaw, front wing); front leg |
| Rider | 120 x 170 | one group (cape, body with legs and back arm, head, sword arm) |
| Storm Roc | 260 x 270 (viewBox starts at y = -40) | legs; torso group (back wing, tail, body, front wing, head) |

Groups exist so idle loops can move several parts together. The torso breathes while the legs stay planted. A part with children (the head and its jaw) moves its children with it.

The manifest also lists named points per rig, as fractions of the canvas: `mouth` (where breath starts), `hit` (where sparks land and numbers start) and `front` (where a dash stops).

### Element overlays

A part file name may contain `{element}`, as in `tail-tip-{element}.svg`. The game fills in the dragon's element. If that file doesn't exist the part is skipped, so the dragon still draws without it. B0 has only the fire tail tip.

## Backdrops

A backdrop is 1600 x 1100 (the stage's 16:11 shape), split into layers that stack in order: sky, far scenery, an optional drifting layer (clouds), and ground.

- The ground's top edge sits about 75 percent of the way down. Fighters stand between 86 and 93 percent.
- Keep the band where fighters stand (about 35 to 90 percent down) calmer and lower in contrast than the characters, and avoid the zone's enemy colors there. In Thunderspire the ground is a warm gray-violet so the dark blue Roc stands out.
- Only one layer moves, and only slowly (`drift`, a 40 second sideways sway).

## Effects

Effects have no outline, except the hit spark. They are flat shapes in two or three tones: `slash.svg` (a crescent swoosh), `spark.svg` (a starburst) and `puff.svg` (a breath blob tinted per element).

## Files and the manifest

- Parts are SVG under `src/art/rigs/<rig>/`, backdrops under `src/art/backdrops/<zone>/`, effects under `src/art/effects/`. Each one is listed in `src/art/assets.json`.
- Keep each part small (B0 parts are 0.4 to 2 kB).
- Eric can replace any part with his own art: a transparent WebP of the same canvas size, drawn in place and facing right, pointed at from the manifest. Dragon parts should be neutral gray so they can be tinted. Tinting bitmap parts is a B1 job.
- If a part is missing, the rig still draws without it. If a rig's body is missing, the stage falls back to today's placeholder shape.

## Rules that keep it fast

- Every part is its own `<img>`. Never animate inside an inline SVG.
- Animate only `transform` and `opacity`.
- The stage stays under 60 DOM nodes, effects included. The B0 mock uses 59 and the bench 56.

## Review checklist

Look at each new piece on a phone at 375 wide, in the mock battle or the art contact sheet (B3):

1. Does it read as what it is at a glance, at its real size?
2. Does it stand out from the zone backdrop?
3. Outline weight matches its neighbors?
4. Do the joints stay closed when the part swings through its full range?
5. Does it look right mirrored (enemies) and tinted in a few player colors (dragons)?
