# Generating art

This is the one process for making new art for DracoQuest. Every new character, pose, backdrop, effect or icon goes through it, so the game keeps one look. Written 2026-11-11 after the art redesign (`docs/GRAPHICS_PLAN_2.md`).

Read `docs/ART_STYLE.md` for the rules a finished image must meet. This file is about how to produce one.

## The style we chose

Eric picked it from six samples (`docs/img/style-options.jpg`): "A with C simpler shapes". In words:

- A clean, modern cel-shaded cartoon built from big, simple, slightly geometric shapes.
- A confident, even, dark navy outline around every character.
- Flat color fills with exactly two tones (a base and one hard-edged shadow shape) and at most one small highlight.
- No gradients, no painted texture, no fine detail: no individual scales, feathers or fur strands.
- Chunky, rounded proportions and a silhouette that reads at thumbnail size.
- Friendly, all-ages, a little silly. Original designs only; nothing copied from Artix Entertainment or any other game.
- Backdrops use the same flat shapes with no outlines, softer colors and hazier distance.

Two files pin the style down, and every generation uses both:

| File | Role |
| --- | --- |
| `tools/art/painted/style.txt` | The exact style paragraph that ends every prompt. Do not reword it per image. |
| `tools/art/painted/anchor.png` | The style reference image (the first Adult dragon in this style), attached to every generation. |

Styles Eric turned down, so they aren't tried again: the agent-drawn SVG art, a lighting pass over it, colored outlines with paper grain ("look B"), and a detailed painterly look with every scale drawn.

## The tool: Codex CLI on Eric's ChatGPT subscription

Images come from the Codex CLI's built-in image tool, run from inside the cloud session with `codex exec`. It uses Eric's ChatGPT subscription, so there is no API key and no separate bill.

About the plugin: Eric found `openai/codex-plugin-cc`, a Claude Code plugin that wraps the Codex CLI for code review and task hand-off. It was looked at and not used. It has no image commands, and the CLI can be run directly. Install the CLI, not the plugin.

Cost: image turns use the subscription's Codex limits several times faster than normal turns. The redesign took 61 images over one day without hitting a limit, but Eric did top up once. Before generating, tell Eric how many images the task needs and get his go-ahead.

## Setup, once per session

1. **Environment.** The session must run on the "dracoquest" cloud environment, which allows the three hosts the CLI needs: `chatgpt.com`, `auth.openai.com`, `api.openai.com`. On another environment those hosts are blocked (curl reports "CONNECT tunnel failed, response 403"). To move a running session onto it, use the environment tools (`get_environment`, then `switch_environment`); Eric approves a prompt.
2. **Install.** `npm install -g @openai/codex` (version 0.167.1 was used).
3. **Sign in.** Run `codex login --device-auth` in the background and read its output. It prints a link (`https://auth.openai.com/codex/device`) and a one-time code that expires in 15 minutes. Give Eric both. He opens the link on his phone, signs in to the ChatGPT account with the subscription, and enters the code. Never ask him for a password or key in chat.
4. **Check.** `codex login status` should say "Logged in using ChatGPT", and `codex features list` should show `image_generation` as true.
5. **When finished:** `codex logout`. The login lives only in the session's container, but log out anyway.

## Making images

The scripts expect a scratch folder holding a copy of `tools/art/painted/` named `v2/` (so `v2/style.txt`, `v2/anchor.png`, `v2/prompts/`, `v2/out/`), with commands run from its parent.

1. **Write the prompt.** Add a job to a `jobs*.py` script (or write `v2/prompts/<name>.txt` by hand). Every prompt has the same shape:
   - Tell it to use the built-in image tool, save to `./v2/out/<name>.png`, and not to draw with code.
   - Say the first attached image is the style reference only, not the subject.
   - Describe the subject: strict side profile facing RIGHT, full body, nothing cropped, a clear margin.
   - Ask for a perfectly flat `#00ff00` background, and no bright green in the art itself.
   - End with the contents of `style.txt`.
2. **Run it.** `./v2/run.sh <name> ...` generates the named images, five at a time, skipping any that already exist. Each takes one to two minutes. What it runs is:
   `codex exec --skip-git-repo-check --sandbox workspace-write -i v2/anchor.png [-i v2/refs/<name>.png] -- "<prompt>" < /dev/null`
3. **Look at every result** before using it. Check it against `anchor.png` and the checklist in `docs/ART_STYLE.md`.
4. **Pack.** `python3 v2/pack.py <repo>` cuts characters out of the green, splits sheets, crops, resizes and writes WebP into `src/art/` (needs Python 3 with numpy, scipy and Pillow).
5. **Wire it in.** List the file in `src/art/assets.json` with its `size`, `points` and, for an attack pose, the `box` that `pack.py` wrote to `v2/packed.json`.
6. **Check in the game** at 375 wide: a fight or `#/dev/art`. Then run the tests.

### Patterns that worked

| Need | How |
| --- | --- |
| One big character (dragon, boss) | One image each, landscape 1536 x 1024. |
| Many small things (enemies, icons, tail tips, effects) | A sheet: a grid of separate items with wide green space between them, listed in reading order. Six enemies per sheet, twelve icons per sheet. `pack.py` splits them in that order. |
| The same character in a new pose | Attach its idle image as a SECOND reference (`v2/refs/<name>.png`) and say "the SAME creature as the second attached image, same design, colors and size in the frame". Worked for dragons, the rider, bosses, and whole enemy sheets. |
| Dragons that take player colors | Paint them in the key colors: red-orange body, golden belly, wing membranes and spines, cream horns and claws, no other reds, oranges or yellows, a plain pointed tail. The game recolors them at load (`docs/ART_STYLE.md`, "Dragon colors"). The egg and the fallback breath puff use the same keys. |
| Backdrops | Full bleed, no characters, flat calm ground in the bottom quarter with a lighter pool in the middle, props only at the far left and right, one light source in the upper middle, no outlines. |

### Gotchas

- `codex exec` waits on stdin. Always add `< /dev/null`.
- `-i` takes several files, so it swallows the prompt. Put `--` before the prompt.
- Key green can survive inside a closed shape (the Will-o'-Whisper's lantern window), where the cutout can't reach it. After packing, `python3 tools/art/painted/fix_green.py <webp>` recolors it to a soft teal, keeping the shading.
- Sign-in codes expire after 15 minutes. If Eric can't enter one in time, stop the waiting `codex login` and start a new one for a fresh code.
- The image tool cannot make transparent backgrounds. Characters come on flat green and `pack.py` cuts them out. Bright green in the art gets cut out too.
- A pose is sometimes drawn a little smaller or larger than its idle image. Fix it with `POSE_SCALE` in `pack.py`, then repack.
- The raw PNGs (about 2 MB each) are not committed. They live in the scratch folder until the session ends. Repacking an image later means generating it again, so get the packing right while the raw files exist.
- Commit the prompts you ran (`tools/art/painted/prompts/`) and any change to `pack.py` or the job scripts, so the next session can repeat the work.

## What exists already

The current set, all in this style: four dragon stages, the rider (sword, bow, staff, mounted), all 49 enemies, an attack pose for every one of those, seven zone backdrops and the Roost, a breath burst per element, tail tips, slash and spark, the egg, and 44 UI icons. The job scripts that made them are `jobs.py`, `jobs2.py` and `jobs3.py` in `tools/art/painted/`. Whispering Fen (world plan W1) came from `jobs4.py` Rustcliff Ruins (W2) from `jobs5.py` and Moonwell Woods (W3) from `jobs6.py`, each five generations, run as `python3 v2/jobs4.py idle`, generate, then `python3 v2/jobs4.py attack` and generate again.

Not made yet: hurt or defeat poses, painted crack lines for the egg, cosmetics.
