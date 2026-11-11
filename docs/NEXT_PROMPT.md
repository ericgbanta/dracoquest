# Prompt for the next agent

Paste this into a new session, and replace the last section with what you want done.

---

You're picking up DracoQuest (repo ericgbanta/dracoquest), a mobile-first, turn-based dragon-raising RPG in the AdventureQuest style. It's a static Vite + Preact + TypeScript site on GitHub Pages at https://ericgbanta.github.io/dracoquest/. All five design phases and all six graphics phases (B0 to B5) are built and live, plus tap-for-details on gold, embers and enemy HP, split attack targets, and a battle-log fix.

Start from `main` (it has everything, docs included) and develop on the session's feature branch. Read these in order before doing anything:
1. `CLAUDE.md`: the rules (pure `src/core`, seeded RNG, all numbers in JSON, mobile-first, save migrations, local testing, deploy only when I ask).
2. `docs/HANDOFF.md`: where things stand, what to work on next, decisions made since the design, code layout, commands, gotchas, and how I like to work.
3. `docs/DESIGN.md` for game rules, `docs/GRAPHICS_PLAN.md` for how the battle stage and art were built, `docs/ART_STYLE.md` before touching any art, and `tools/art/README.md` if you draw or hand off art.

How I like to work: one task at a time; commit after each; plain writing with no em dashes; ask before guessing when something is unclear, and list any calls you made so I can overrule them. I play on an iPhone 17 Pro in Safari and as a Home Screen app, so check everything at 375 x 667 first, then landscape. When I report a bug from my phone, reproduce it at 375 wide with a matching save, fix it, and add a test that would have caught it (and check that the test fails without the fix). Before calling anything done, run `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run e2e`, and show me the results and screenshots. Don't touch the game rules in `src/core` unless the task is about them, and keep the `data-testid` hooks the phone tests use. Only deploy when I ask.

Open threads, from `docs/HANDOFF.md`, if I haven't picked one below:
- My feedback on B5, the battle feel and split targets.
- More things that open details on tap (element badges, status chips).
- The stage DOM node budget (raised to 100 without my answer; the bench's 2 vs 2 scene on my phone settles it).
- Element balance: Tide starters win about 60 percent in Thunderspire and Verdant about 52 percent in Frostmere.
- Cosmetics (an ember sink), a late-game save code, first-load size, swapping in better art.

What I want this session:
[Write the task here.]
