# Prompt for the next agent

Paste this into a new session, and replace the last section with what you want done.

---

You're picking up DracoQuest (repo ericgbanta/dracoquest), a mobile-first, turn-based dragon-raising RPG in the AdventureQuest style. It's a static Vite + Preact + TypeScript site on GitHub Pages at https://ericgbanta.github.io/dracoquest/, with painted cel-shaded art made with the Codex CLI.

Where it stands: the level cap is 90 (dragons stop at 50). There are 21 areas on five painted map regions, 12 elements (a ring of eight plus the Light/Shadow and Aether/Void pairs), hybrid dragons and hybrid enemies, three breeds (Dragon, Wyvern, Wyrm), breeding at the Nesting Grounds, rare finishes, a Nest of 10, up to three dragons in battle, story quests, daily bounties, gear sets and the Forge. The work follows `docs/DRAGONS_PLAN.md`, built in chunks; chunks 1 to 8 are done and live. Chunk 9 remains and takes the cap to 100.

Start from `main` and develop on the session's feature branch. Read these in order before doing anything:
1. `CLAUDE.md`: the rules (pure `src/core`, seeded RNG, all numbers in JSON, mobile-first, save migrations, local testing, deploy only when I ask).
2. `docs/HANDOFF.md`: history, where things stand, what's next with a step-by-step recipe for chunk 9, the lessons from building areas above level 50, decisions, code layout, commands, gotchas, and how I like to work.
3. `docs/DRAGONS_PLAN.md`: the plan, the chunks, my answers and every name I chose. `docs/WORLD_PLAN.md` for the frontier areas.
4. `docs/ART_GENERATION.md` before making any art, and `docs/ART_STYLE.md` for the rules it must meet.

How I like to work: plain writing with no em dashes; commit after each step; for design choices give me a few options with a recommendation, and list any calls you made so I can overrule them. I play on an iPhone 17 Pro, so check everything at 375 x 667 first. Before calling anything done, run `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run e2e` and the balance sim (70 to 85 percent on level for each starter, campaigns reaching the cap), and show me the results and screenshots. Keep the `data-testid` hooks the phone tests use. Only deploy when I ask.

Art: always through `docs/ART_GENERATION.md` (the Codex CLI on my ChatGPT subscription). It uses my Codex limits, so tell me how many generations a task needs first. Start the device login early as a tracked background task and give me the code at the end of a message; the session must be on the "dracoquest" environment. Sign Codex out when the art is done.

Next up: chunk 9 (Starfall Summit with the final boss and a closing story, Dragonsrest and the Behemoth breed, cap 100, about 12 Codex generations), following the recipe in the handoff.

What I want this session:
[Write the task here.]
