# Less scrolling: UI plan

Written 2026-11-12 at Eric's request, and built the same day (see "Result" at the end): "It feels like a lot of scrolling at times. A good example is the bag tab where everything is expanded. I think we need to come up with a better system. Using collapsible sections and or subtabs." He asked for a plan, the build, tests, docs and a deploy without a check-in.

## What was measured

Page height of each screen at 375 x 667, with a level 15 save and a level 45 save, before the change:

| Screen | Height | Screens tall | What makes it long |
| --- | --- | --- | --- |
| Town | 10,536 px | 15.8 | The Weapons tab lists every weapon in the game (now 60+) |
| Map | 5,900 to 6,400 px | 8.8 to 9.6 | 11 zone cards of about 500 px each, all open, in three regions |
| Bag | about 2,850 px | 4.3 | Gear, Stats, Spells (about 1,200 px), Items and Eggs all expanded |
| Roost | 2,400 to 2,600 px | 3.6 to 3.9 | Six building cards after the care section |
| Dragons | 2,300 to 2,500 px | 3.4 to 3.7 | Talents (about 1,000 px) under the dragon sheet, growth and stats |
| Settings | 2,155 px | 3.2 | Seven sections, all open |

## The system

Two shared pieces, used the same way on every screen:

- **Fold** (`src/ui/Fold.tsx`): a card whose header is a button. The header shows the title and a one-line summary (so a closed fold still tells you what's inside, like "Pantry · 3 of 6 food ready"), and a chevron. It remembers open or closed per device in `localStorage` (a viewer convenience; nothing in the save). A fold can start open when it needs attention.
- **SubTabs**: the tab pills the Town already uses, as a component that remembers the chosen tab, with an optional count badge on a tab ("Stats 3" when points are waiting).

Rules: the thing you came to the screen to do stays on top and open; anything you check now and then folds; anything that needs action (points to spend, food to collect, a choice to make) shows as a badge or opens itself. Tap targets stay at least 44 px.

## Screen by screen

| Screen | Change |
| --- | --- |
| Bag | The rider card (HP, MP, XP) stays on top. Below it, sub-tabs: **Gear** (slots and set progress), **Stats** (badge with points to spend), **Spells** (loadout, learned; "Still to learn" folds), **Items** (items, food, materials, eggs). |
| Town | Weapons get a type filter (All, Melee, Ranged, Magic); Armor gets Armor or Trinkets. A **Near my level** filter is on by default (about 8 levels below to 5 above the rider) with **Show all** to see everything. |
| Map | Each region is a fold; only the region at the rider's level starts open. Its header says how many areas it has and how many bosses are beaten. Inside a zone card, Story, Bounties and Treasures share one row of three buttons. |
| Roost | Each building is a fold with a status summary in its header. A building opens by itself when something is ready (food to collect, an egg to hatch, a dragon back from a trip). Training doesn't, since its XP builds all the time. |
| Dragons | Sub-tabs: **Overview** (the dragon, bars, partner role, growing up, egg laying, favorite food), **Stats** (badge), **Talents** (badge). |
| Settings | Folds: Saved games (open), Rider, Battle and sound, Add to Home Screen, Back up or move your save (export and import together), Danger zone. |

## Done when

Every screen above is at most about 2 screens tall at 375 x 667 in its default state (the Map's open region excepted, since its cards are the content), the phone tests are updated to open the fold or tab they need and pass, and a test checks the new controls. Results go in the handoff.

## Result (built 2026-11-12)

Built as planned, with two additions found while measuring:

- **Map zones fold too.** Regions alone left the open region long (3,900 px at level 45). Each zone is now a fold that's open only at the rider's level; a closed zone is one row with its levels, its status (the lock reason, "Boss ready" or "Boss beaten") and a quick **Hunt** button. A region holding only the teaser is always open.
- **The Town's weapon filter starts on the type the rider wields**, so the near-level list is one weapon type, not three.

| Screen | Before | After (level 15 save / level 45 save) |
| --- | --- | --- |
| Bag | 4.2 to 4.3 screens | 1.2 / 1.3 |
| Town | 15.8 | 2.1 / 1.7 |
| Map | 8.8 to 9.6 | 2.1 / 2.6 |
| Dragons | 3.4 to 3.7 | 1.5 / 1.8 |
| Settings | 3.2 | 1.4 |
| Roost | 3.6 to 3.9 | about 2 with nothing waiting; longer when buildings open themselves for food, eggs or returning dragons |

`e2e/ui.spec.ts` checks a height budget for each screen, that folds and tabs remember their state, the Town's default filters, and that a folded zone's Hunt button starts a run. The other phone tests open the fold or tab they need with `e2e/helpers.ts`.
