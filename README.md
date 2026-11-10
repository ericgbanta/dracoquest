# DracoQuest

A mobile-first, turn-based browser RPG about hatching and raising dragons. Static site, no backend, deployed to GitHub Pages at `/dracoquest/`.

The design lives in [docs/DESIGN.md](docs/DESIGN.md). Working rules for contributors and coding agents are in [CLAUDE.md](CLAUDE.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Vitest unit tests |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | ESLint (also blocks `Math.random` and browser globals in `src/core`) |
| `npm run e2e` | Playwright smoke test at a 375 x 667 phone viewport |
| `npm run sim` | Balance simulator (battles arrive in Phase 1) |
| `npm run deploy` | Test, build, and publish `dist` to the `gh-pages` branch |

## GitHub Pages setup (one time)

In the repo's Settings, under Pages, choose Deploy from a branch, branch `gh-pages`, folder root. The branch is created by the first `npm run deploy`.
