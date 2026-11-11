# Art brief for DracoQuest art agents

You are drawing SVG art for DracoQuest, a mobile, turn-based dragon-raising RPG with a side-view battle stage in the spirit of a Flash-era RPG (big characters on a painted stage). The repo is /home/user/dracoquest.

## Read first
1. /home/user/dracoquest/docs/ART_STYLE.md: the approved style guide. Follow it exactly (flat fills, one shade layer on the lower back side, outline #1d1a2b, outline 4 units on a ~200-unit canvas, chunky rounded friendly shapes, big eyes with a highlight, enemies get a heavy brow).
2. The approved samples, which the owner said "look great". Match their look and quality:
   - /home/user/dracoquest/src/art/rigs/dragon-adult/*.svg (dragon parts in gray tokens)
   - /home/user/dracoquest/src/art/rigs/rider/*.svg
   - /home/user/dracoquest/src/art/rigs/storm-roc/*.svg (a boss with fixed colors)
   - /home/user/dracoquest/src/art/backdrops/thunderspire/*.svg
   - /home/user/dracoquest/src/art/assets.json (the "rigs" and "backdrops" entries show the manifest format: size, tint, points, parts with id/file/pivot/anim/parts)
3. Element colors: /home/user/dracoquest/src/data/elements.json ("info"). Enemy and zone data: src/data/enemies.json, src/data/zones.json (names, elements, flavor lines).

## Hard rules
- Original designs only. Nothing copied or traced from AdventureQuest or any Artix Entertainment game, or from any other game.
- Plain SVG: paths, ellipses, circles, rects, groups with transform. No text, no filters, no masks, no clipPath, no embedded images, no CSS, no scripts. Gradients are allowed only in backdrop sky layers. Keep each file small (under about 3 kB for a part, 6 kB for a backdrop layer).
- Every part of one rig uses the same viewBox (the rig's full canvas) and is drawn in place, facing right, so stacking the parts rebuilds the character. The root svg has viewBox plus width and height at 2x the viewBox.
- Moving parts rotate around a pivot (fractions of the canvas, listed in the manifest). Draw the base of a moving part so it tucks under the part in front of it; the seam must stay closed when the part swings about 25 degrees either way (check with --pose).
- Tinted art (dragons, enemy body plans) uses only these gray tokens for its tinted colors, and must not use them for anything else: #9a9a9a primary, #6e6e6e primary shade, #d6d6d6 secondary, #b0b0b0 secondary shade, #505050 accent, #3c3c3c accent shade. Everything else (outline, eyes, teeth, bone #efe4c8 / #cbbd99) is a fixed color.
- Do NOT edit any code, src/art/assets.json, palette.json, docs, or any file outside the directories you are given. Do NOT run git commands. Do not touch other agents' directories.
- Write your manifest entries to the fragment JSON file named in your task (same schema as assets.json: an object with the top-level keys you are told to fill). File paths in it are relative to /home/user/dracoquest/src/art/.

## Animation names you can use on parts ("anim")
breathe (torso group bob), bob (whole small creature bob), flap / flap-back (small wing sway), flap-big / flap-back-big (big wing sway), swish (tail sway), cape (cloth sway). Battle beats also rotate parts named head, jaw, arm, leg-front, wing-front, wing-back, so use those ids where they fit.

## Points (fractions of the canvas, before mirroring; everything faces right)
- hit: the middle of the body, where sparks land.
- front: the front edge the attacker stops at (chest or face height).
- mouth: dragons only, the tip of the snout (breath starts here).
- saddle: Adult and Elder dragons only, the middle of the back where a rider sits.

## Checking your work (do this for every rig and backdrop)
Render with the preview tool and LOOK at the PNG (use the Read tool on it):
  node tools/art/rigpreview.mjs --manifest <your fragment.json> --rig <key> --out <png> [--colors "#hex,#hex,#hex"] [--vars element=fire,weapon=bow] [--pose head=-18,jaw=26] [--flip] [--grid]
  node tools/art/rigpreview.mjs --manifest <fragment.json> --backdrop <key> --out <png> --width 800
Write PNGs to your own folder under tools/art/out/ (named in your task). Check: reads clearly at small size (a fighter is 100 to 160 px wide on a phone), outline weight matches the samples, joints stay closed in a pose, tinted art looks good in at least 3 different color sets. Iterate until it is as good as the samples. Quality matters more than speed, but don't gold-plate.

## When you finish
Reply with: the list of files written, the fragment path, anything you could not finish, and any choices the owner should know about. Keep it short.
