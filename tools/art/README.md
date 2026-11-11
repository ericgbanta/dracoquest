# Art tools

The game's characters, backdrops and effects are painted images in `src/art/painted/`, listed in `src/art/assets.json`. They were generated with an image model (the Codex CLI's built-in image tool, on Eric's ChatGPT subscription), then cut out and packed by the scripts in `painted/`. Read `docs/ART_STYLE.md` before adding or replacing art.

The packed WebP files are the source of truth. The raw generated PNGs (about 2 MB each, 61 of them) lived in the session's container and were not kept, so `pack.py` has nothing to repack until images are generated again.

## painted/

| File | What it is |
| --- | --- |
| `style.txt` | The style block every prompt ends with. Change the look here. |
| `anchor.png` | The style reference image passed to every generation (`-i`). |
| `prompts/p-anchor.txt` | The prompt that made the anchor. |
| `jobs.py` | Writes one prompt per image into `v2/prompts/`: 4 dragon stages, tail tips, 4 rider poses, 7 bosses, 7 enemy sheets (six enemies each), 8 backdrops, effects. |
| `jobs2.py` | The second batch: the egg, four icon sheets, and attack poses. It copies each idle image to `v2/refs/` so `run.sh` passes it as a second reference. |
| `jobs3.py` | The third batch: the element breath sheet and attack poses for bosses and for each zone's enemy sheet. |
| `prompts/` | The prompts as they were run, for reference. |
| `run.sh` | Runs `codex exec` for each named prompt, five at a time, skipping images that already exist. |
| `pack.py` | Cuts characters out of the green background, splits sheets into single enemies and icons, places attack poses against their idle image, splits the egg, and writes WebP into `src/art/painted/`, `src/art/icons/` and `src/art/eggs/`. Needs Python 3 with numpy, scipy and Pillow. |
| `zones.json` | Which enemies are on which sheet, in reading order. |

## Making or replacing art

The scripts expect a scratch folder laid out as `v2/` (style.txt, anchor.png, prompts/, out/), with the commands run from its parent. Copy this folder to a scratch folder as `v2/` first.

1. Sign in once: `codex login --device-auth` (the session's environment must allow `chatgpt.com`, `auth.openai.com` and `api.openai.com`).
2. Edit `jobs.py` (or write a prompt file by hand), then `python3 v2/jobs.py`.
3. `./v2/run.sh <name> ...` for the images you want. Delete `v2/out/<name>.png` first to redo one.
4. Look at the results. The image tool can't make transparent backgrounds, so characters come on flat green.
5. `python3 v2/pack.py /path/to/repo` repacks everything it finds in `v2/out/`.
6. If an image's size changed, update its `size` (and `points`) in `assets.json`. For an attack pose, copy its `<name>-attack-box` from `v2/packed.json` into the part's `box`. Check `#/dev/art` at phone size.

Notes from the first run: each image takes one to two minutes; five at a time worked; a `-i` reference must come before `--` and the prompt; `codex exec` needs `< /dev/null` or it waits on stdin. Image turns use the subscription's Codex limits several times faster than normal turns.

Eric can also drop in his own art: a transparent WebP or PNG, facing right, pointed at from `assets.json`.
