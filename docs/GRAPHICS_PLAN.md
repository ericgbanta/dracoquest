# Graphics and battle overhaul: plan

Written 2026-11-11 at Eric's request. Status: B0 done and checked on Eric's iPhone (see "B0 result" below). Next is B1. Read `docs/HANDOFF.md` first.

The request, in Eric's words: "I think we can implement AdventureQuest-like graphics. The battling especially needs a lot of touch up. We should have us (rider and dragons) on one side and enemy on the other. Let's step it up with the graphics please but also make sure it's performant."

This plan is the research and a phased build that a coding agent can follow. It borrows heavily from `ericgbanta/got-sim`, `docs/GRAPHICS_PLAN.md`, which went through the same kind of overhaul and shipped it. Its lessons are noted where they apply.

## The ask, made concrete

Today the battle screen is a stack of cards: one card per enemy at the top, one card per party member below, the log, then the order buttons. Sprites are small placeholders and nothing moves except a short shake. It plays well and reads clearly, but it doesn't look like a fight.

The target is a side-view battle stage in the AdventureQuest mold:

- One wide scene at the top of the screen with a backdrop for the zone.
- The party on the left facing right: the rider in front, the lead dragon beside or behind the rider, the second dragon a step back.
- The enemies on the right facing left. One enemy stands center-right; two stand staggered.
- Small name plates with HP bars float above each fighter. Intent icons float above the enemies.
- Attacks are acted out: the attacker steps or dashes toward the target, strikes, the target flinches and is knocked back a little, and the damage number pops above it. Breath crosses the stage as a burst in the element's color.
- The order buttons stay below the stage, so phone play stays one-thumb.

What we take from AdventureQuest is the layout and the feel: big characters on a painted stage, facing each other, with lively, readable attack animations. Its art, characters and interface graphics are Artix Entertainment's and must not be copied (CLAUDE.md). Everything is drawn fresh.

Notes on AdventureQuest's battle screen are from what's widely known about the game. The two reference sites tried during research (strategywiki.org and the AQ fandom wiki) were blocked by this session's network or returned nothing on layout. A person can confirm the layout from any gameplay video. The points that matter here: a landscape Flash stage, the player on the left facing a monster on the right in front of an area backdrop, HP and mana shown near the top, and a row of action buttons along the bottom. Attacks play out as short animations of the player moving in to strike, followed by a damage number. Pets and guests stand next to the player.

## Decisions

Eric answered the questions below on 2026-11-11. These are settled:

| Question | Decision |
| --- | --- |
| G1. Art style | Smooth vector art: flat colors, one shade layer, dark outline, AdventureQuest's Flash feel. Not pixel art. |
| G2. Who draws the art | Agents draw everything as SVG in the repo, built from parts so it animates. Eric may swap in his own art per part later through `src/art/assets.json`. |
| G3. How far it goes | Everything: the battle stage (B0 to B3), scenes outside battle (B4) and the UI skin (B5). |
| G4. Target phone | iPhone 17 Pro in Safari, played both in the browser and as a Home Screen app. The budgets below are judged on that phone; the sandbox numbers are a stand-in. |

B0 still ends at a checkpoint: Eric looks at the mock battle and the bench numbers on his iPhone before B1 starts.

## B0 result

Built 2026-11-11. Eric checked it on his iPhone the same day and said: "It looks great!"

Phone numbers (iPhone 17 Pro, Safari, bench at 1x): "After 10 rounds: 60 fps, 0.8% dropped, worst frame 61 ms, 60 Hz." That is within the 5% budget. The Home Screen app wasn't measured; Eric expects it to be similar, since it runs the same Safari engine. The 61 ms worst frame is one hitch of about three frames; B2's perf test should watch for it. Safari runs pages at 60 Hz by default even on ProMotion screens, so 60 is the ceiling there.

The art style in `docs/ART_STYLE.md` is accepted as the base for B1 to B3.

- Mock battle at `#/dev/mock`: the Thunderspire backdrop, the rider, an Adult fire dragon (Blaze), the Storm Roc, name plates, the status strip, the log and the order panel. Go plays a round: the rider's Attack (dash, swing, return), the dragon's Breath (rear back, a stream of fire puffs across the stage, shake) or Claw, then the Roc's Talon Rake on the dragon. The 1x/2x chip works. Tap the Roc to target it.
- Bench at `#/dev/bench`: loops a demo round (rider attack, breath, Roc attack, claw) and shows fps, dropped frames, worst frame, refresh rate, long tasks, stage node count, and whether it runs in the browser or as a Home Screen app. After 10 rounds it pins a result line to read back. Restart clears the numbers.
- Style guide draft: `docs/ART_STYLE.md`.
- Code: `src/ui/stage/` (stage, rig loader, beats), `src/ui/dev/` (mock, bench, frame meter), `src/data/stage.json` (layout and timings), art under `src/art/`. The dev pages load only when opened, so the game's first load didn't grow. The real battle screen and `src/core` are untouched.

Sandbox numbers (headless Chromium, no GPU, 20 seconds of the bench loop): 60 fps and 0 of about 1,190 frames dropped, both unthrottled and with the CPU throttled 4x, in portrait and landscape. Worst frame 17 ms, no long tasks. The stage uses 59 DOM nodes in the mock and 56 in the bench (budget 60). All art is 25 kB of SVG.

Caveat on the bench: it counts frames with `requestAnimationFrame`, so it catches main-thread stalls (scripts, layout, style work). Safari doesn't tell a page when the compositor itself drops a frame, so a stutter that comes only from the GPU won't show in the numbers. Watch for visible hitches too. Safari also doesn't report long tasks; the bench shows "n/a" there.

### Calls made in B0 (Eric can overrule any of these)

| Topic | Call |
| --- | --- |
| 300 ms per beat | Each beat's action, up to and including the hit, takes at most 300 ms (240 ms for the rider's attack). The walk back runs into the existing 120 ms pause between events. Attacks are quick as a result. |
| Where the mock lives | A hidden route, not the real battle. The real battle switches over in B1. |
| Party layout | The dragon stands at the back left and the rider in front of it, closer to the enemy. |
| Plates | Dragon plate top left, rider plate above the rider, enemy plate top right with the intent inside it. Exact numbers are in the status strip below the stage. |
| Outline weight | About 2.5 px on a 375-wide phone, a little under the draft's 3 to 4 px. It looked right in the screenshots; raising it is a one-number change per part. |
| Art loading | SVG parts ship as text inside the stage's code chunk (15 kB gzipped) so colors can be baked in without a network fetch. B3, with 49 enemies, should split this per zone. |
| Node budget | Plate HP fills and the target ring are CSS pseudo-elements, to fit the mock under 60 nodes. |
| Extra beats | The mock also has Claw and the Roc's counterattack, so a round looks like a round. |

### Questions for Eric at the checkpoint

1. Does the art style work for you on the phone? Anything to change before it's used for 32 dragon looks and 49 enemies? (Answered: "It looks great!")
2. Do the attacks feel too fast at 1x? The 300 ms rule could become, say, 450 ms for the action.
3. The bench numbers from your iPhone, in Safari and as a Home Screen app: the "After 10 rounds" line from each. (Answered for Safari: 60 fps, 0.8% dropped, worst frame 61 ms.)

## Questions for Eric (answered)

Kept for the reasoning. My recommendation was first in each.

1. **Art style.** (a) Smooth vector art with flat colors and a dark outline, close to AdventureQuest's Flash look, drawn as SVG in the repo. Or (b) pixel art, like got-sim. AQ is a vector game, so (a) matches the ask better. It also scales cleanly on any phone, files stay small, and it fits how the game already draws dragons (code-drawn SVG). Pixel art would need every sprite redrawn on a grid.
2. **Who draws the art.** (a) Agents draw everything in SVG in the repo, built from parts so they can animate. Eric can swap in AI-assisted art per part later through the existing manifest. Or (b) Eric makes the art first and agents only animate it. CLAUDE.md expects AI-assisted WebP from Eric, but the pipeline must never block on art. I recommend (a) as the base, because it ships without waiting and every piece has a working placeholder. got-sim's lesson: agent art is "serviceable at small sizes and visibly amateur at large sizes, most of all for dragons". A dragon here is about 140 px tall on screen, so expect to want better dragon art from Eric eventually.
3. **How far it goes.** The battle stage alone (phases B0 to B3 below) gives most of the effect. Zone backdrops on the Map, a painted Roost and a UI skin (B4, B5) are optional and can wait.
4. **Phones.** Which phones and browsers should the budgets be checked on? (got-sim: iPhone 17 Pro in Safari.) The sandbox has no GPU, so real frame numbers can only come from a real phone.

## Rendering: recommendation

**Keep the battle in the DOM, as one stage element with absolutely positioned layers, and animate only `transform` and `opacity`.** No canvas, no WebGL, no new dependency.

Why this and not got-sim's Canvas 2D:

- got-sim drew a whole map with hundreds of sprites. A DracoQuest battle has at most 5 fighters (rider, two dragons, two enemies) plus a few effects. That's 20 to 40 elements, well within what the DOM handles on a phone.
- Transform and opacity animations run on the compositor thread, so they stay smooth even while the main thread is busy. Changing any other property risks layout or paint on every frame ([web.dev: How to create high-performance CSS animations](https://web.dev/articles/animations-guide); [web.dev: Stick to compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)). The game already uses the Web Animations API, which CLAUDE.md asks for.
- The DOM keeps what works today: tap an enemy to target it, `data-testid` hooks for the 28 phone tests, readable text, and screen reader labels.
- WebGL (PixiJS) brings context-loss risk when a Home Screen app is put in the background, and an unknown bundle cost. got-sim rejected it for the same reasons.

Use a canvas only if B0 shows the DOM missing the budget on a real phone, and then only for particles (one small overlay canvas for breath and hit sparks).

### How a fighter is built: a cutout rig

AdventureQuest's Flash characters were animated by moving body parts, not by playing frame-by-frame sprites. That style is cheap on the web too:

- Each fighter is a `div` (the rig) containing a few part images: for a dragon, the back wing, tail, body, head, front wing, and a front leg if needed. For the rider: body, head, weapon arm, weapon. For an enemy: body plus one to three moving parts (a club, a claw, a head).
- Each part is an `<img>` (SVG or WebP) with its pivot set by `transform-origin`. Animations rotate and move parts with `transform`, so every move stays on the compositor.
- Do not animate elements inside an inline `<svg>`. Transforms on SVG child elements are not reliably composited, and that's where repaint cost comes from. Each part is its own image element.
- Idle loops are slow and cheap: a breathing bob (2 to 3 s), a wing flap, a tail swish. They follow the temperament (Bold bobs faster, Gentle slower, as the Roost does today).
- Facing: the party faces right and enemies face left. Draw everything facing right and mirror enemies with `scaleX(-1)` on the rig.

### Player colors without runtime cost

Dragons are tinted per element and per player color. Today a real sprite would be tinted with a CSS mask plus `mix-blend-mode: multiply`, which costs a blend on every frame the dragon moves. Better: build each dragon's part images once, with its colors baked in.

- For SVG parts drawn in code: substitute the two player colors into the SVG text, make a `Blob` URL per part per dragon, and cache it for the session. Zero cost per frame.
- For WebP parts from Eric (neutral gray): tint once into an offscreen canvas (`globalCompositeOperation = 'multiply'`, then `destination-in` with the original alpha), export with `toBlob`, and cache the URL. Do it at battle start, behind the `img.decode()` wait below.

### Before a fight starts

- Preload and decode every image the fight needs (`await img.decode()`) before the first frame, so nothing pops in or stutters mid-attack.
- Sprites load per zone (Vite's `import.meta.glob` already lazy-loads them), and the service worker precaches them for offline play. The Workbox pattern already includes `svg`, `png` and `webp`.

## The stage, by screen size

Portrait first, at 375 by 667:

```
+-----------------------------------+
| Thunderspire  Fight 2/5  Rd 3  2x |  header, 32 px
|                                   |
|  [Blaze HP]           [!! Big]    |  name plates, intents
|        __    [Rider]   [Roc  HP]  |
|   ~~ /Blaze\  o-|=        <\\ROC  |  stage: about 260 to 300 px,
|      \Ripple                  //  |  zone backdrop behind,
|  ___________________________/____ |  ground line about 80% down
+-----------------------------------+
| Keeper HP ===  MP ==  Breath ===  |  status strip, 2 rows
| "Blaze's Claw hits the Roc for 42"|  log, 1 to 2 lines, tap to expand
| RIDER  [Attack][Spell][Item][Def] |
| DRAGON [Claw][Breath][Guard][Skl] |
| SECOND [Claw][Breath][Guard]      |  only with two partners
| [Repeat]            [   Go!   ]   |
+-----------------------------------+
```

- The stage keeps an aspect ratio of about 16:11 and scales by width. Fighters are positioned in stage units (percent), not pixels, so 430-wide phones just scale up.
- Full HP numbers move off the stage into the status strip under it. Floating plates show a bar and a name, and the number when space allows. Tapping a plate opens the details sheet (statuses, weakness, next move).
- Landscape (height under 500 px): the stage takes the left side at full height and the orders go on the right, as today.
- Ride mode: the rider sits on the lead dragon (a "mounted" pose: the rider rig parented to a saddle point on the dragon's body). The second dragon still stands behind.
- Two enemies: one front, one back, smaller and higher. The targeted enemy gets a ring under its feet, not just a border.
- Knocked-out fighters slump and fade to 40%. A defeated enemy topples and fades out.

## Choreography: battle events to moves

The engine already returns an ordered event list per round (`BattleEvent` in `src/core/battle.ts`). The UI plays them one by one (`Battle.tsx`, `go()`). Keep that loop and swap the effects. Every beat is at most 300 ms (CLAUDE.md), and 2x speed halves it.

| Event | On stage |
| --- | --- |
| `hit` from the rider | Rider dashes most of the way to the target (translateX), swings (weapon part rotates), returns. Target flashes and is knocked back 8 px. Damage number pops and rises. |
| `hit` from a dragon (Claw) | Dragon lunges, the head or front leg swipes. Same reaction on the target. |
| `hit` labeled Breath or Skyfire | Dragon rears back (head rotates up), then a cone of the element's color crosses to the target (a few scaled, fading divs, or the particle canvas). Strong hits add a short screen shake on the stage, not the page. |
| `hit` from an enemy | Enemy lunges left. A big attack gets a short wind-up first, so the telegraph feels earned. |
| `miss` | The attacker moves as usual and the target sidesteps. "Miss" floats up. |
| `crit` (a `hit` with `crit`) | Brief white flash on the target (an overlay at opacity 0.8 to 0), a larger yellow number, and a vibration, as today. |
| `heal` | Green rising sparkles on the target. Replace today's `filter: brightness` animation, which repaints every frame. |
| `status` | The status icon pops onto the plate. Burn adds small flame particles; Chill a frost tint overlay (opacity); Shock a quick jitter. |
| `ko` | The fighter slumps (rotate and translate down) and fades to 40%. An enemy topples and fades out. |
| `shift` | The enemy's element badge flips and a ring of the new color pulses once. |
| Combo or duo | Both party members dash in together. |
| `end` | Victory: party hop and cheer, the enemy fades. Defeat: the rider kneels. |

Reduced motion: no dashes, knockbacks or shakes. Numbers and short fades only. The fast-battles setting halves every duration.

## Art plan

### What needs drawing

| Group | Count | Notes |
| --- | --- | --- |
| Dragons | 8 elements by 4 stages | Start with one body plan per stage. Elements differ in horns, crest, tail tip and pattern overlays; colors come from the player. That's about 4 base rigs plus overlay parts, not 32 drawings. |
| Rider | 1 rig | Weapon part swaps by weapon type: sword, bow, staff. The gear look can come later. |
| Enemies | 49 (35 regular, 7 mini-bosses, 7 bosses) | Placeholder shapes for all of them exist in `src/ui/Sprites.tsx`. Bosses get proper rigs first; regular enemies can share body plans (crab, bird, slime, beast, golem, imp, sprite) with parts swapped. |
| Backdrops | 7 zones, plus quest variants later | Three layers each: sky, far scenery, ground. No animation, or a slow cloud drift at most. |
| Effects | About 10 | Hit spark, slash, breath cone per element (8 colors from one shape), heal sparkle, status particles. |

### Where it comes from

- Agents draw SVG parts in the repo, following one style guide (below). Each part is a file under `src/art/` listed in `src/art/assets.json`, so the manifest rule in CLAUDE.md still holds.
- Eric can replace any part or backdrop with AI-assisted art at any time by dropping a file in and pointing the manifest at it. No code changes.
- The current placeholder shapes stay as the fallback when a file is missing.

### Style guide (draft, settle in B0)

- Flat fills with one shade layer, a 3 to 4 px dark outline (`#1d1a2b`), and rounded, chunky shapes: friendly, all ages, light and joking.
- One shared palette file. Element colors come from `src/data/elements.json`.
- Characters face right. Parts are drawn in place, with their pivot point noted in the manifest (for example `"pivot": [0.35, 0.8]`).
- A dragon at its largest is about 160 px tall on a 375-wide screen. Draw at 2x for crisp edges on retina screens.

## Performance budgets

Measured in the sandbox at a 375 by 667 viewport with Chrome's CPU throttled 4x, then by Eric on his phone.

| What | Budget |
| --- | --- |
| Battle animation | 60 fps, under 5% dropped frames over a scripted round at 4x throttle |
| Idle stage | Compositor-only loops; main thread under 10% busy |
| Stage elements | At most 60 DOM nodes on the stage, including effects |
| Layers | `will-change: transform` only on fighter rigs while a battle is open, never on every part |
| Art download | At most 1.5 MB for all art. Today's whole precache is 327 kB. |
| First fight frame | All images decoded before the stage shows; no pop-in |
| Round time | Unchanged. The engine isn't touched. |

Rules that keep it cheap (several are from got-sim's plan, which held up in practice):

- Animate `transform` and `opacity` only. No animated `filter`, `box-shadow`, `width`, `top` or `left`.
- The stage is still when nothing happens: idle loops are CSS animations, and nothing runs `requestAnimationFrame` between rounds.
- Pause idle loops when a sheet covers the stage or the page is hidden (`animation-play-state: paused`).
- Particles: at most about 30 at once, pooled and reused, never created per frame.
- A "Simple battle" setting draws today's card layout instead. It's also the fallback if art fails to load, and the default when the phone asks for reduced motion and the player turns animations fully off.

### How to measure

- Add a Playwright perf test that opens the battle with a fixture, sets the CPU throttle through CDP (`Emulation.setCPUThrottlingRate`, rate 4), runs a scripted round with fast battles off, counts frames with `requestAnimationFrame` timestamps, and records long tasks with a `PerformanceObserver`. It fails when more than 5% of frames are dropped.
- Add a hidden bench route (`#/dev/bench`) that plays a looping demo round and shows frames per second and dropped frames on screen, so Eric can open it on his phone and read the numbers back. got-sim planned this and never got real phone numbers back. Make it easy: one tap, numbers in big text.
- Chrome DevTools' Performance panel, with "Rendering > Paint flashing" on, shows anything repainting during an attack. Nothing on the stage should flash green except new damage numbers.

## Phases

Each phase ends playable and deployable. Eric can stop after any of them.

**B0. Look and feasibility (checkpoint).** One mock battle at 375 by 667 and in landscape: a Thunderspire backdrop, the rider, an Adult fire dragon, the Storm Roc, plates, and the order panel. Two animated beats (a rider attack, a breath). Ship the bench route with it. Eric looks at it on his phone, answers the questions above, and reads back the frame numbers. Output: the style guide settled, the budgets confirmed, and decisions recorded in this file.

**B1. Stage and rigs.** The stage component, the rig component (parts, pivots, facing, baked colors), positions for 1 or 2 party dragons and 1 or 2 enemies, ride mode, plates, the target ring, the status strip, and the Simple battle setting. Placeholders are fine. All current battle e2e tests pass with the new layout; update their selectors where needed.

**B2. Choreography.** The event-to-move table above, the damage numbers, the breath cones, the particle pool, reduced motion, 2x speed, and the perf test.

**B3. Art pass, battle.** Dragon rigs for all four stages (hatchling, juvenile, adult, elder), the rider with three weapon types, the 7 bosses, then the regular enemy body plans, and the 7 zone backdrops. Contact sheet route (`#/dev/art`) showing every sprite so each one gets reviewed at phone size.

**B4. Scenes outside battle (optional).** Zone backdrops on the Map cards, a painted Roost scene with the dragons idling in it, and the hatching scene.

**B5. UI skin (optional).** Panels and buttons with a light fantasy skin, icons for gold, embers, items and statuses, and a display font for headings (self-hosted so it works offline). Body text stays the system font at 16 px or more.

## Risks

- **Art quality.** The biggest risk, as got-sim found. B0 exists so Eric sees real samples on his phone before anything is built on them, and the manifest lets better art replace agent art part by part.
- **Readability.** A pretty stage can bury the numbers. The status strip, intents and plates must stay as readable as today's cards; compare screenshots side by side.
- **Test churn.** The battle e2e tests use `data-testid` on order buttons, enemies (`enemy-e0`), the log and the second-dragon card. Keep those ids on the new elements so the tests survive.
- **Phone-only behavior.** iOS Safari and Android Chrome differ in memory and layer limits. Only the bench route on Eric's phone can confirm the budgets.

## Sources

- [web.dev: How to create high-performance CSS animations](https://web.dev/articles/animations-guide)
- [web.dev: Stick to compositor-only properties and manage layer count](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)
- [web.dev: Animations and performance](https://web.dev/articles/animations-and-performance)
- `ericgbanta/got-sim`, `docs/GRAPHICS_PLAN.md` and `tools/art/README.md`: the canvas-versus-WebGL reasoning, budgets, bench page idea, and lessons from shipping agent-drawn art.
- [Spine runtimes](https://github.com/EsotericSoftware/spine-runtimes) and similar skeletal-animation tools were considered and set aside: a runtime plus an editor (Spine's needs a license) is more than five fighters need, and CSS transforms on part images give the same cutout style with no dependency.
