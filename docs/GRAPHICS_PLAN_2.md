# Graphics, second pass: research and plan

Written 2026-11-11 at Eric's request. Status: C0 (the look proof) is built and deployed. Eric wants a bigger change than C0 delivers; see "Eric's check of C0". The art has since been redone as painted images in a style Eric chose (see "The art redesign"). The C1 to C4 phases below were written before that and are kept for their ideas on effects, camera and interface. C1 to C4 are proposed, not started. `docs/GRAPHICS_PLAN.md` is the first pass (B0 to B5) and is finished.

The request, in Eric's words: "We just finished a redesign but I really think we can take art and graphics to the next level. We should try to modernize but still keep the same adventure quest feel. Please do some research. I want to be blown away by the graphics and art but still have this performant on my iPhone 17 pro."

## What the research found

A note on sources first. Most sites were blocked from the cloud session (webkit.org, aq2d.com, rive.app, bundlephobia.com). Two things were checked first hand: Apple's Safari 26.0 release notes, and library sizes measured from npm packages. The rest comes from search summaries of the linked pages, and is marked "search". Treat those as leads, and judge the result on the phone.

### How Artix updated its own look

- AQWorlds: Infinity, the Unity rewrite, keeps the old designs and gives them what its artists call "glow ups": more shading on the same shapes and edge highlights that make armor pop. Their stated rule is "80% the same and 20% better". (search: aq2d.com/posts/story, aq2d.com/posts/infinity_dailyupdate_week1)
- The old art "had little shading". The new art is still drawn as vector and then turned into bitmaps, because GPUs draw bitmaps faster. (search: aq2d.com/posts/new_vs_old)

That is the same position DracoQuest is in: flat vector art with one shade layer. The lesson is to keep the chunky outlined characters and add light, not to change the style.

### What makes 2D art read as modern

- Light. Rayman Origins lights flat art with a front light blended with a per-scene ambient color (search: Ubisoft's "Modern 2D techniques" talk). Dead Cells and others add rim light so characters separate from the background.
- Depth. Several backdrop layers, with distant ones lighter and hazier, a darker foreground in front of the characters, and a vignette.
- Hits that feel heavy. "Juice it or lose it" (Jonasson and Purho, 2012) and "The art of screenshake" (Nijman, 2013) cover the standard list: a short freeze on impact (hit-stop), a flash, a camera kick, a shake that fades fast, and squash and stretch.

### What iPhone Safari can do cheaply

- SVG filters inside an image are drawn at low resolution and then scaled, so they look blurry (search: WebKit bug 199706). Gradients and masks don't have that problem. The lighting pass uses masks only.
- Animated `filter` and `backdrop-filter` are expensive on iOS. Nothing here animates them.
- Too many `will-change` layers have crashed pages on an iPhone 17 Pro (search: WebKit bug 312727). The stage keeps `will-change` on fighters only.
- Safari still runs pages at 60 Hz unless the user changes a hidden setting, so 60 fps stays the target.
- Same-document View Transitions work in Safari 18 and later (search), which makes animated screen changes possible in C4.
- WebGPU shipped in Safari 26 (first hand), but with a reported canvas flicker bug on iOS (search: WebKit bug 301627).

### Libraries, and why none are used

Gzipped sizes, measured: PixiJS 8 about 255 kB; Rive 122 to 152 kB of JavaScript plus 353 kB to 1 MB of wasm; Spine 57 to 76 kB and it needs a paid editor; tsParticles 24 to 47 kB. The whole game is 163 kB today. For a stage with five fighters, moving images with transform and opacity is already the cheapest path, and a WebGL library would bring context-loss risk for a Home Screen app and a rebuild of the rig pipeline. The first plan reached the same answer and nothing found this time changes it.

## Direction

Keep the outlined, chunky, side-view look. Add what the first pass left out: light on the characters, depth and color in the scenes, and weight in the hits. Everything is baked into images at load or runs as transform and opacity, so the per-frame cost stays where it was.

## C0: the look proof (built)

One scene taken all the way, plus the engine pieces every scene will use. See `docs/img/c0-before-after.png`, `c0-breath-hit.png` and `c0-landscape.png`.

- **Lighting pass on every character.** When a rig part loads, `lightSvg` in `src/ui/stage/rigs.ts` adds a soft top light, a bottom shade and a rim on the edges facing the light, clipped to the part's own shape. It applies to all four dragon stages, the rider, the 7 bosses and the 42 body-plan enemies with no redrawing. The numbers are in `src/art/palette.json` under `lighting`.
- **Thunderspire repainted** as the model for the other zones: a dusk sky with a moon and light rays, three hazy ridges, the spire with a glowing tip, lit clouds, a ground with a pool of light where the fighters stand, and a dark foreground layer in front of them. Background shapes have no outline now, so the outlined characters stand out more.
- **Stage atmosphere.** A vignette on every stage, a `front` flag for backdrop layers drawn over the fighters, and an `ambient` option (drifting specks, one node). Both are set per zone in `src/art/assets.json`.
- **Heavier hits.** Strong hits and crits freeze the stage for 70 ms, punch the view in 4.5 percent toward the hit point with a fading rattle, and every hit gets a burst of light in the attack's color. Timings are in `src/data/stage.json` (`punch`, `hitStop`, `glow`). Reduced motion skips all of it, as before.

Numbers: the stage uses 98 nodes in the 2 vs 2 bench scene (budget 100) and about 67 one on one. Tests: 133 unit tests (3 new for the lighting pass) and 39 phone tests pass.

The perf test (5 percent dropped frames at 4x throttle) was noisy in the sandbox on the day C0 was built. Three runs on this branch gave 2.4, 7.0 and 4.4 percent; three runs of unchanged `main` gave 5.8, 7.5 and 4.8. So the sandbox shows no cost from C0, but it also can't prove there is none. The bench on Eric's phone is the real check.

### Calls made in C0 (Eric can overrule any of these)

| Topic | Call |
| --- | --- |
| No new library | Stay on DOM images, CSS and the Web Animations API. |
| Lighting by code | One automatic pass for all characters, not a redraw of each. It is subtle on purpose; the strength is three numbers in `palette.json`. |
| Outlines | Characters keep the dark outline. Backdrop scenery loses it. This updates the rule in `docs/ART_STYLE.md`. |
| Gradients | Backdrops may now use gradients freely. Character parts stay flat; the lighting pass adds their gradients. |
| Where it shows | The lighting, vignette and hit feel apply to the whole game now. Only Thunderspire has the new backdrop, so the other zones and the Roost show lit characters on old scenery until C1. |
| Hit-stop | 70 ms on strong hits and crits only, so a round is at most a few frames longer. |
| Old thread | Eric said the 100-node budget is fine. C0 uses 98 of it in the busiest scene. |

### Questions for Eric at the checkpoint

1. Is this the direction? The before and after image is the quickest way to judge. If the lighting should be stronger or the scene brighter, say so before seven more backdrops are painted in this style.
2. To see it on your phone I need to deploy. `#/dev/mock` shows the scene, and the bench's "After 10 rounds" line from 1 vs 1 and 2 vs 2 would settle the performance question.
3. How far should the dragons go? See C2. A redraw is the biggest art risk in this plan.

## Eric's check of C0 (2026-11-11)

C0 was deployed with a second style, look B (colored outlines, a tint toward the scene's light, paper grain), behind a switch on the mock. Eric's answer: "Definitely look A but I was hoping for a pretty different and professional look honestly." Look B's code was removed (it is in git history, commit 8953a68).

What that means for the plan: lighting and effects on top of the existing drawings are not enough. The drawings themselves are the limit, as the first plan's risk section predicted. The phases below need a new art source before they continue; that choice is open with Eric.

## The art redesign (built 2026-11-11)

Eric chose painted art from an image model. The Codex CLI, signed in to his ChatGPT subscription by device login, generates the images from inside the cloud session (`codex exec`, built-in image tool). The session's environment ("dracoquest") allows `chatgpt.com`, `auth.openai.com` and `api.openai.com` for this.

1. **First proof.** Four images in a detailed painterly style (dragon, rider, Storm Roc, Thunderspire) on the mock. Eric: "This is great but I don't like the generated art style."
2. **Style options.** The same dragon in six styles (`docs/img/style-options.jpg`): cel-shaded cartoon, storybook gouache, flat graphic, inked graphic novel, 3D toy, anime RPG. Eric: "let's go A with C simpler shapes. Go redesign the whole thing!"
3. **The full set.** One anchor dragon in the chosen style, then 32 images with the anchor as style reference: 4 dragon stages, a sheet of 8 tail tips, 4 rider poses, 7 bosses, 7 sheets of six enemies, 8 backdrops and an effects sheet. All 32 came out usable on the first run.

What changed in the game:

- Every rig in `assets.json` now points at a painted WebP in `src/art/painted/`: `dragon.<stage>`, `rider`, `rider.mounted` and all 49 `enemy.<id>`. Backdrops are one image per zone plus the Roost. The Roost, Map strips, Dragons screen, hatching scene and art sheet pick the new art up through the same loader.
- Dragons are painted red and gold and recolored to each player's colors when they load, keeping the flat shadow shapes (`src/ui/stage/tint.ts`). The element tail tip is drawn on in the same step.
- The breath puff is recolored per element the same way.
- Ride mode uses a seated rider image placed on the dragon's saddle point.
- Each character is one piece. It breathes by swelling from its feet, and battle moves lean the whole body where they used to turn a head or an arm.
- The old SVG rigs, enemy body plans, backdrops and effect files are deleted, along with the scripts that drew them.

Numbers: 2.2 MB of WebP for the art (dragons about 60 kB each, enemies 15 to 60 kB, backdrops about 100 kB). First-load JavaScript fell from 163 to 108 kB gzipped. The service worker precaches 2.6 MB in all. The stage uses 48 nodes one on one and 64 in the busiest fight (budget 100). Tests: 136 unit tests and 39 phone tests pass; the perf test read 0.3 to 1.8 percent dropped frames over four runs (and once 5.4, see the note on noise above).

### Calls made (Eric can overrule any of these)

| Topic | Call |
| --- | --- |
| One image per character | No separately moving heads, jaws, wings or arms. Simpler and lighter, but less lively than the old rigs. Extra poses (an attack frame) or cut parts could come later. |
| Enemy sheets | The 42 regular enemies and mini-bosses were generated six to a sheet, one sheet per zone, to save image generations. Bosses were generated alone at full size. |
| Dragon colors | Painted in fixed key colors and recolored in code, not generated per color. |
| Old art deleted | The SVG rigs are gone from the tree, not kept as a fallback. Git history has them. |
| Precache size | All art is precached so the game works offline: 2.6 MB, over the first plan's 1.5 MB art budget. |
| Not redone at first | Eggs and UI icons were still from the first pass; the second batch below replaced them. |
| Raw images | The generated PNGs (about 65 MB) were not committed; the packed WebPs, prompts and the style anchor were. |

### After the art: skin and fixes (2026-11-11)

Done without new image generations, at Eric's request:

- **UI skin.** `src/ui/skin.css` now follows the art: flat fills, a dark navy outline, one hard shade band along the bottom of buttons, a hard drop edge under panels, and two-tone flat HP, MP and breath bars. Border widths are unchanged, so no layout moved. See `docs/img/skin-screens.jpg`.
- **Two-enemy fights.** Enemies were too small there after the art swap. The two enemy slots in `src/data/stage.json` are wider now (43 and 36 percent of the stage, from 33 and 26).
- **Cutouts.** A few enemies had small green flecks left from the background. `pack.py` now removes enclosed pockets of key green down to 12 pixels, and the art was repacked from the raw images.

### Second batch: egg, icons and attack poses (2026-11-11)

Twelve more images, all usable on the first run:

- **Egg.** One painted egg, recolored per element like the dragons, and split along a zigzag into two halves for hatching.
- **Icons.** All 44 UI icons, from four sheets (statuses; battle and items; food and care; places).
- **Attack poses.** Each dragon stage roaring in a forward lunge, and the rider swinging the sword, drawing the bow and thrusting the staff. The idle image was passed as a second reference so the character stayed on model. During an attack the idle image is swapped for the pose by opacity, in hard steps, then swapped back.

Calls made: three rider poses came out smaller in the frame than their idle and the hatchling's larger, so `pack.py` scales them (`POSE_SCALE`). The rider is now three rigs (`rider.sword`, `rider.bow`, `rider.staff`) because each weapon's pose sits in a different box. Enemies and bosses have no attack poses. The egg's crack lines are still SVG. The precache is now 3.1 MB.

## Proposed phases

Each ends playable and deployable.

**C1. Scenes.** Repaint the other six zones and the Roost in the Thunderspire style: gradient sky, hazy layers, a light pool, a foreground layer, and ambient specks that fit the zone (embers, snow, fireflies, dust). Give each zone a light color so the rim on characters matches the scene. Map strips and the hatching scene pick these up for free.

**C2. Dragons.** The dragons are the stars and get the most screen time. Two options, to be chosen by Eric after C0: (a) keep the rigs and add detail parts (scale patterns, wing membrane gradients, eye shine, element features beyond the tail tip), or (b) redraw the Adult first as a higher-detail rig and, if it passes, the other three stages. Option (a) is safe. Option (b) could look much better but agent-drawn dragons are the known weak point (got-sim's lesson), so it needs its own checkpoint. A third route is Eric supplying dragon art as WebP parts through the manifest, which the loader already supports.

**C3. Effects and motion.** Redraw breath, slash and spark with soft cores and per-element shapes (flame tongues, ice shards, lightning forks, leaves). Add squash and stretch on landings, dust on dashes, a ghost bar on HP plates that drains after the hit, a short intro when a fight starts, and a victory flourish. If the pooled DOM effects run out of room, add one small Canvas 2D overlay for particles, capped at 2x pixel density, running only while an effect plays.

**C4. Interface.** Screen-to-screen transitions with the View Transitions API (with a plain fallback), plates and bars restyled to match the lit art, richer result and level-up screens, and a pass over the Roost and Dragons screens so the UI feels like one piece with the stage.

## Performance rules (unchanged, plus three)

The rules in `docs/GRAPHICS_PLAN.md` still hold: animate only transform and opacity, pooled effects, a still stage between rounds, 100 nodes at most. Added by this pass:

- No SVG filters in any art file, and no animated CSS `filter` or `backdrop-filter`.
- Lighting and color are baked into images once at load. Nothing is blended per frame.
- A full-stage layer that moves (ambient specks, a foreground) counts toward a limit of three per scene.

## Sources

- Apple, Safari 26.0 release notes (read first hand)
- aq2d.com posts: "story", "new_vs_old", "monster_making_101", "infinity_dailyupdate_week1" (search summaries)
- Jonasson and Purho, "Juice it or lose it" (2012); Nijman, "The art of screenshake" (2013) (search summaries)
- Fouletier and Martin, "Modern 2D techniques" (Ubisoft, Game Connection 2014); 80.lv, "Dead Cells character art pipeline" (search summaries)
- WebKit bugs 199706, 226321, 255358, 258007, 277392, 301627, 312727 (search summaries)
- `docs/GRAPHICS_PLAN.md` for the first pass and its measurements
