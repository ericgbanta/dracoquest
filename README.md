# DracoQuest

A mobile-first, turn-based browser RPG about hatching and raising dragons. Static site, no backend, deployed to GitHub Pages at `/dracoquest/`.

The design lives in [docs/DESIGN.md](docs/DESIGN.md). All five build phases are in: seven zones up to level 50, dragons from egg to Elder, talents, gear, Ride mode, the Roost with real-time timers, two battle partners, seasonal events, and offline play. Working rules for contributors and coding agents are in [CLAUDE.md](CLAUDE.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run test` | Vitest unit tests |
| `npx tsc --noEmit` | Type check |
| `npm run lint` | ESLint (also blocks `Math.random` and browser globals in `src/core`) |
| `npm run e2e` | Playwright smoke test at a 375 x 667 phone viewport |
| `npm run sim` | Balance simulator (battles arrive in Phase 1) |
| `npm run deploy` | Test, lint and build locally, then push to `main`, which publishes to Pages |

## Deployment

Pages deploys from GitHub Actions (Settings, then Pages, then Source: GitHub Actions). `.github/workflows/deploy.yml` builds and publishes the site whenever `main` changes. You can also run it by hand from the Actions tab.
