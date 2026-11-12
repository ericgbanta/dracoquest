# Prompt for the next agent

Paste this into a new session, and replace the last section with what you want done.

---

You're picking up DracoQuest (repo ericgbanta/dracoquest), a mobile-first, turn-based dragon-raising RPG in the AdventureQuest style. It's a static Vite + Preact + TypeScript site on GitHub Pages at https://ericgbanta.github.io/dracoquest/. Everything in the original design is built and live, with painted cel-shaded art. Since then we added: three save slots per device; rider spells learned by level with a loadout of four; more gear (shop choices, zone gear sets, boss trophies, zone loot) and the Forge for upgrading and crafting gear; and the first phases of a world expansion: Map regions, story quests with small choices, daily bounties, and four side areas (Whispering Fen, Rustcliff Ruins, Moonwell Woods, Gilded Wastes) with their own enemies, stories and art. A UI pass then cut scrolling with collapsible sections and sub-tabs (`docs/UI_PLAN.md`). The level cap is still 50.

Start from `main` (it has everything, docs included) and develop on the session's feature branch. Read these in order before doing anything:
1. `CLAUDE.md`: the rules (pure `src/core`, seeded RNG, all numbers in JSON, mobile-first, save migrations, local testing, deploy only when I ask).
2. `docs/HANDOFF.md`: the history, where things stand, what to work on next (W5), a step-by-step recipe for adding an area, decisions, code layout, commands, gotchas, and how I like to work.
3. `docs/WORLD_PLAN.md`: the world expansion plan and my answers to its questions.
4. `docs/ART_GENERATION.md` before making any art and `docs/ART_STYLE.md` for the rules it must meet. `docs/DESIGN.md` for the original game rules.

How I like to work: one task at a time; commit after each; plain writing with no em dashes; for design choices give me a few options with a recommendation, and list any calls you made so I can overrule them. I play on an iPhone 17 Pro in Safari and as a Home Screen app, so check everything at 375 x 667 first. When I report a bug from my phone, reproduce it at 375 wide with a matching save, fix it, and add a test that would have caught it. Before calling anything done, run `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run e2e` and the balance sim, and show me the results and screenshots. Keep the `data-testid` hooks the phone tests use. Only deploy when I ask.

New art always goes through `docs/ART_GENERATION.md`: the Codex CLI on my ChatGPT subscription, in the cel-shaded style we chose, using the style text and reference image in `tools/art/painted`. It uses my Codex limits, so tell me how many generations a task needs first (each new area has taken 5). I'll enter a device login code; the session must be on the "dracoquest" environment.

Next up, unless I pick something else below: W5, Sunken Spires (levels 50 to 60, Tide and Storm), which also raises the level cap from 50 to 60. Dragons stay capped at 50. The handoff lists what raising the cap touches. After that, W6 to W9 take the cap to 100. Things that need no art and can be done any time: story chains and bounty pools for Cinder Pass, Thunderspire, Frostmere, Deepstone Mines and Eclipse Peak. Open questions for me are listed in the handoff.

What I want this session:
[Write the task here.]
