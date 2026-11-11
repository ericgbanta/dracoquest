# Art style guide

The current look was chosen by Eric on 2026-11-11 from six samples (`docs/img/style-options.jpg`): "A with C simpler shapes", a cel-shaded cartoon built from big simple shapes. It replaced the agent-drawn SVG art of the first graphics pass. The history is in `docs/GRAPHICS_PLAN_2.md`.

## The look

Clean modern cel shading, like a 2D animated series crossed with a flat graphic poster. Nothing is copied from Artix Entertainment games or any other game.

- A confident, even, dark navy outline around every character.
- Flat color fills with exactly two tones (a base and one hard-edged shadow shape) and at most one small highlight. No gradients, texture or fine detail on characters: no individual scales, feathers or fur strands.
- Chunky, rounded proportions and a silhouette that reads at thumbnail size.
- Friendly and a little silly. Enemies are grumpy, not scary.
- Backdrops use the same flat shapes but no outlines, softer colors and hazier distant layers, so the outlined characters stand out.

The exact wording is `tools/art/painted/style.txt`, and `tools/art/painted/anchor.png` is the reference image every generation is given.

## Where art comes from

Images are generated with an image model and packed by the scripts in `tools/art/painted/` (see `tools/art/README.md`). Every file is listed in `src/art/assets.json`; nothing is loaded any other way. A missing file falls back to a simple placeholder shape, so a feature never waits on art.

Eggs (`src/art/eggs/`) and UI icons (`src/art/icons/`) are still SVG from the first pass.

## Characters

Each character is one painted WebP, facing right, cropped to its edges with its feet on the bottom edge. The stage mirrors enemies.

In `assets.json` a character is a rig: its image `size`, a `boxScale` (its size on stage relative to its slot), named `points` as fractions of the image (`mouth` where breath starts, `hit` where sparks land, `front` where a dash stops, `saddle` on dragons), and its parts. A painted rig has a `torso` group that breathes (`anim: swell`) holding one `body` image. Battle moves that used to turn a head or an arm lean the whole body by a share of the angle (`onePiece` in `src/data/stage.json`).

A rig can still be built from several parts (SVG or WebP) drawn in place on a shared canvas with pivots; the loader and the stage support both. SVG parts get a lighting pass at load (`lighting` in `palette.json`).

| Rig | File | Notes |
| --- | --- | --- |
| `dragon.hatchling`, `.juvenile`, `.adult`, `.elder` | `painted/dragon-<stage>.webp` | Recolored per player; tail tip per element |
| `rider` | `painted/rider-{weapon}.webp` | `sword`, `bow` or `staff`, from the equipped weapon's type |
| `rider.mounted` | `painted/rider-mounted.webp` | The seated rider for Ride mode, placed at the dragon's `saddle` |
| `enemy.<id>` | `painted/enemies/<id>.webp` | All 49: 7 bosses drawn alone, 42 others cut from six-enemy sheets |

### Dragon colors

Dragons are painted with fixed key colors and recolored once at load to each player's colors (`src/ui/stage/tint.ts`, numbers under `paintedKeys` in `palette.json`):

| Painted as | Becomes |
| --- | --- |
| Red-orange body (and its darker red shadow) | The player's primary color |
| Golden belly, wing membranes and spines (and their orange-gold shadow) | The player's secondary color |
| Cream horns and claws, dark outline, eye | Unchanged |

Rules for new dragon art: use no other reds, oranges or yellows; keep horns pale cream so they aren't mistaken for gold; end the tail in a plain point.

### Tail tips

`painted/tips/<element>.webp` is drawn onto a dragon's tail when it is colored. Each rig's `tip` in `assets.json` says where: the tip's bottom-left corner goes at `at`, it is `width` wide (a share of the image), turned `rotate` degrees. Hatchlings have none. Dragon images are padded with transparent margin where the tip needs room.

## Backdrops

One 1280 x 880 WebP per zone and one for the Roost (`painted/backdrops/`), the stage's 16:11 shape.

- The bottom quarter is wide, flat, calm ground with a lighter pool in the middle. Fighters stand between 86 and 93 percent down. Props sit only at the far left and right.
- The middle band is calmer and lower in contrast than the top.
- One light source sits in the upper middle of the sky, between the name plates.
- `"ambient": { "kind": "rise" | "fall", "color": ... }` in `assets.json` adds drifting specks. A layer marked `"front": true` is drawn over the fighters (none use it now). Every stage has a vignette.

## Effects

`painted/fx/`: `puff.webp` (the breath blob, painted red and gold and recolored per element the same way dragons are), `slash.webp` and `spark.webp`. No outlines. Glows, rings, flashes and particles are CSS shapes in `stage.css`.

## Rules that keep it fast

- Animate only `transform` and `opacity`.
- Colors and tail tips are baked into images once at load. Nothing is blended per frame.
- No SVG filters in art, and no animated CSS `filter` or `backdrop-filter`.
- The stage stays under 100 DOM nodes. With one image per character the busiest fight uses about 64.
- Keep images near their largest on-screen size: dragons 640 px wide, bosses 720, other enemies 400 on the long side, riders 460 tall.

## Review checklist

Look at each new piece at 375 wide, in a fight or on the art sheet (`#/dev/art`):

1. Does it match the anchor: line weight, two-tone shading, simple shapes?
2. Does it read as what it is at its real size, and stand out from its zone's backdrop?
3. Is the cutout clean, with no green fringe and no missing pieces?
4. For dragons: does it recolor cleanly in a few player colors, and does the tail tip sit on the tail?
5. Does it look right mirrored (enemies)?
