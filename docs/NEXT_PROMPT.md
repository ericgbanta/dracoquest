# Prompt for the next agent

Paste this into a new session, and replace the last section with what you want done.

---

You're picking up DracoQuest (repo ericgbanta/dracoquest), a mobile-first, turn-based dragon-raising RPG in the AdventureQuest style. It's a static Vite + Preact + TypeScript site on GitHub Pages at https://ericgbanta.github.io/dracoquest/. All five design phases and the battle stage are built and live. The art was then redone as painted, cel-shaded images (dragons, rider, all 49 enemies, backdrops, effects, egg, icons), with attack poses and a matching UI skin, and that is live too.

Start from `main` (it has everything, docs included) and develop on the session's feature branch. Read these in order before doing anything:
1. `CLAUDE.md`: the rules (pure `src/core`, seeded RNG, all numbers in JSON, mobile-first, save migrations, local testing, deploy only when I ask).
2. `docs/HANDOFF.md`: where things stand, what to work on next, decisions made since the design, code layout, commands, gotchas, and how I like to work.
3. `docs/DESIGN.md` for game rules, `docs/GRAPHICS_PLAN.md` for how the battle stage was built, `docs/GRAPHICS_PLAN_2.md` for the art redesign, `docs/ART_STYLE.md` before touching any art, and `tools/art/README.md` to generate more.

How I like to work: one task at a time; commit after each; plain writing with no em dashes; ask before guessing when something is unclear, and list any calls you made so I can overrule them. I play on an iPhone 17 Pro in Safari and as a Home Screen app, so check everything at 375 x 667 first, then landscape. When I report a bug from my phone, reproduce it at 375 wide with a matching save, fix it, and add a test that would have caught it (and check that the test fails without the fix). Before calling anything done, run `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run e2e`, and show me the results and screenshots. Don't touch the game rules in `src/core` unless the task is about them, and keep the `data-testid` hooks the phone tests use. Only deploy when I ask.

New art is generated with the Codex CLI on my ChatGPT subscription, which uses my Codex limits. If a task needs new images, tell me how many first; I'll need to enter a device login code (steps are in `docs/HANDOFF.md`, "How the art was made"). Start the session on the "dracoquest" environment for that.

Open threads, from `docs/HANDOFF.md`, if I haven't picked one below:
- Whether enemies visibly snap to their attack pose on my phone.
- Element balance: Tide starters win about 60 percent in Thunderspire and Verdant about 52 percent in Frostmere.
- Cosmetics (an ember sink), a late-game save code, the 4.7 MB offline download.
- More art: hurt or defeat poses, painted egg cracks. Camera moves and screen transitions from the C phases in `docs/GRAPHICS_PLAN_2.md`.

What I want this session:
[Write the task here.]
