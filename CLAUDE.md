# DracoQuest

DracoQuest is a mobile-first, turn-based browser RPG in the style of AdventureQuest, built around hatching and raising dragons. It is a static site with no backend, deployed to GitHub Pages at `/dracoquest/`.

The full design lives in `docs/DESIGN.md`. Read it before starting any phase, and treat its "Decisions" table as settled.

Start with `docs/HANDOFF.md`: where the project stands, what to work on next, and decisions made since the design. The graphics and battle overhaul in `docs/GRAPHICS_PLAN.md` is finished; the art redesign that followed is recorded in `docs/GRAPHICS_PLAN_2.md`; art rules are in `docs/ART_STYLE.md`, and the process for making new art is in `docs/ART_GENERATION.md`.

## How to work

- Build one phase at a time, following "Build phases for the coding agent" in `docs/DESIGN.md`. When a phase meets its done criteria, stop and report what was built and how it was tested.
- Commit after each completed task with a clear message.
- If the design is unclear or two sections conflict, ask before guessing.

## Architecture rules

- `/src/core` is pure TypeScript. It must not touch the DOM, `window`, or `localStorage`, so it runs under Vitest.
- All randomness goes through the seeded RNG in `/src/core/rng.ts`. Never call `Math.random()` in game logic.
- Every balance number (damage constants, XP curve, element multipliers, prices, timers) lives in JSON under `/src/data`. Code reads it from there.
- UI is Preact with TypeScript in strict mode. Animations use CSS and the Web Animations API.
- Use original names and art only. Nothing may be copied from Artix Entertainment games.

## Art

- Characters, backdrops, effects, eggs and icons are painted WebP images, in one cel-shaded cartoon style Eric chose. Every file is listed in `/src/art/assets.json`. Eric may swap in his own art through the manifest.
- New art is always made the same way: follow `docs/ART_GENERATION.md` (the Codex CLI on Eric's ChatGPT subscription, signed in by device code, with the style text and reference image in `tools/art/painted`). Do not draw art by hand as SVG or change the style without asking Eric. Tell him how many images a task needs before generating, because it uses his Codex limits.
- `docs/ART_STYLE.md` has the rules a finished image must meet.
- Dragons are painted in key colors (red body, gold belly) and recolored once at load per player color, with an element tail tip drawn on.
- Load every sprite through the manifest. If a sprite is missing, render a simple placeholder shape. Never block a feature on art.

## Mobile first

- Design at 375 x 667 portrait first, then check 430 wide and landscape.
- Tap targets are at least 44 x 44 px. No hover-only controls.
- Respect safe-area insets and `prefers-reduced-motion`.

## Saves

- The save is one JSON object in `localStorage` with a `version` field.
- Any change to the save shape bumps the version and adds a migration plus a test that loads a fixture from the previous version.
- Settings must keep working Export and Import of a base64 save code.

## Testing

- Run everything locally. The only GitHub Actions workflow is `.github/workflows/deploy.yml`, which publishes to Pages. Do not add others (no CI, no test matrix).
- Before calling a task done, run `npm run test`, `npx tsc --noEmit`, and `npm run lint`.
- Combat, elements, leveling, and save migrations need unit tests with fixed seeds.
- `npm run sim` runs the balance simulator (1,000 auto-battles per zone) and prints win rates and fights per level.
- `npm run e2e` runs a Playwright smoke test at a phone viewport.

## Deployment

- `vite.config.ts` sets `base: '/dracoquest/'`. Routing uses the URL hash (`#/roost`).
- `/public/.nojekyll` must exist.
- Pages is set to deploy from GitHub Actions. `.github/workflows/deploy.yml` runs tests, builds, and publishes `dist` whenever `main` changes, or by hand from the Actions tab.
- `main` is what's live. Work happens on feature branches. `npm run deploy` runs tests, lint, and the build locally, then pushes the current branch to `main`, which triggers the workflow.
- Only deploy when Eric asks, normally at the end of a phase.
