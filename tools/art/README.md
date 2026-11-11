# Art tools

The game's art is SVG in `src/art/`, listed in `src/art/assets.json`. Those files are the source of truth: edit them directly, or regenerate a set with the scripts here. Read `docs/ART_STYLE.md` before drawing anything.

## rigpreview.mjs

Renders a rig or a backdrop the way the battle stage does (nested parts, pivots, gray tokens swapped for colors), so you can check joints, tints and poses without running the game.

```
node tools/art/rigpreview.mjs --manifest src/art/assets.json --rig dragon.elder --out tools/art/out/elder.png
  [--width 400] [--bg "#8a74b8"] [--colors "#e8603c,#f2a541,#5fbf5a"]   primary, secondary, accent
  [--vars element=fire,weapon=bow] [--pose head=-18,jaw=26] [--flip] [--grid]
node tools/art/rigpreview.mjs --manifest src/art/assets.json --backdrop frostmere --out tools/art/out/bg.png --width 800
```

`--manifest` can be any JSON with a `rigs` (or `backdrops`) object in the `assets.json` format, so a draft rig can be previewed before it's merged. Enemies drawn from body plans live under `enemies` in `assets.json`; to preview one with its extras, write a scratch rig entry with the extras added as children of their parent part. `tools/art/out/` is git-ignored scratch space.

The in-game check is the hidden contact sheet at `#/dev/art`, which shows every sprite at phone size and tags anything missing as a placeholder.

## BRIEF.md

The brief given to the agents that drew the B3 to B5 art: the rules (original designs only, plain SVG, gray tokens, pivots, no edits outside their folders), the animation names, the rig points and how to check work. Reuse it when handing art to an agent, and add the task-specific part (what to draw, which folder, where the manifest fragment goes). Agents write a manifest fragment; merge it into `assets.json` yourself after looking at their renders.

## generators/

The scripts the agents wrote to produce each set. They are a convenience, not a build step. They were run once from a scratch folder in a cloud session, so expect to fix paths before rerunning: scratch paths now point at `/home/user/dracoquest/tools/art/out/`, and some preview helpers expect `rigpreview.mjs` or manifest files in that folder. Each writes SVGs into `src/art/` and a manifest fragment to merge.

| Folder | Draws | Needs |
| --- | --- | --- |
| `dragons/` | Hatchling, Juvenile and Elder rigs, element tail tips, the rider's bow and staff | Python 3 |
| `bosses/` | The six bosses other than the Storm Roc (one script per boss, shared `lib.py`) | Python 3 |
| `enemies/` | The 12 enemy body plans, the 66 per-enemy extras and the `enemies` table (`make.py` runs it all) | Python 3, `shapely`, Pillow |
| `icons/` | The 44 UI icons (`gen.py`), and a contact sheet (`sheet.mjs`) | Python 3 |

The B0 art (Adult dragon, rider, Storm Roc, Thunderspire, effects), the backdrops and the eggs have no generator here; edit their SVGs directly.
