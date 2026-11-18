"""Looks plan L2: give every gear piece an `icon`, one of the shapes in src/data/gearLooks.json.
The shape comes from the words in the piece's name, the last word first, so "Rootsplitter Axe" is an axe
and "Lantern of Ages" a lantern. Pieces that already have an icon keep it (hand edits survive);
pass --all to assign every piece again. Usage: python3 tools/content/gear_icons.py <repo> [--all]"""
import json, re, sys

REPO = sys.argv[1].rstrip('/')
REDO = '--all' in sys.argv
SHAPES = json.load(open(f'{REPO}/src/data/gearLooks.json'))['shapes']

# (shape, words). A word matches a whole word or the end of one ("Thornblade", "Boulderbreaker").
RULES = {
 'melee': [
  ('stick', ['training']), ('greatsword', ['greatsword', 'reaver', 'warblade']), ('pickaxe', ['pickaxe']),
  ('axe', ['axe', 'hatchet']), ('cleaver', ['cleaver', 'machete']), ('hammer', ['hammer', 'maul', 'breaker']),
  ('club', ['club', 'cudgel']), ('trident', ['trident']), ('polearm', ['glaive', 'lance']), ('sickle', ['sickle', 'khopesh']),
  ('saber', ['saber', 'sabre', 'cutlass', 'moonblade', 'fang']), ('sword', ['', 'blade', 'sword', 'brand']),
 ],
 'ranged': [
  ('longbow', ['longbow']), ('crossbow', ['crossbow', 'thrower']), ('repeater', ['repeater']), ('sling', ['sling', 'slingshot']),
  ('blowgun', ['blowgun']), ('hornbow', ['recurve', 'hornbow', 'starbow']), ('bow', ['']),
 ],
 'magic': [
  ('staff', ['', 'staff']), ('lantern', ['lantern']), ('wand', ['wand']), ('scepter', ['rod', 'scepter', 'coil']), ('orb', ['orb']),
  ('tome', ['tome', 'codex', 'grimoire']),
 ],
 'armor': [
  ('plate', ['plate']), ('mail', ['mail', 'scale']), ('robe', ['robe']), ('cloak', ['cloak', 'mantle', 'shroud']),
  ('apron', ['apron']), ('wraps', ['wraps', 'garb']), ('leathers', ['leathers', 'jerkin', 'vest', 'hide', 'waders']), ('coat', ['']),
 ],
 'trinket': [
  ('crown', ['circlet', 'echoes']), ('ring', ['ring', 'band']), ('crown', ['crown']),
  ('pendant', ['locket', 'pendant', 'amulet', 'talisman', 'clasp']), ('lantern', ['lantern', 'candle', 'jar', 'vial']),
  ('gem', ['stone', 'gem', 'pearl', 'pebble', 'shard', 'eye']), ('sigil', ['sigil', 'badge', 'crest', 'pin']), ('heart', ['heart']),
  ('feather', ['feather', 'quill']), ('fang', ['fang', 'claw', 'fin', 'scale']), ('flower', ['orchid', 'acorn', 'honeycomb']),
  ('charm', ['charm']), ('keepsake', ['']),
 ],
 'saddle': [('saddle', [''])], 'horn': [('horncap', [''])], 'charm': [('dragoncharm', [''])],
}

def shape(g):
    rules = RULES[g.get('weaponType') or g['slot']]
    if 'Training' in g['name']: return 'stick'
    # The last word says most ("Deepcrown Chancellor's Quill" is a quill), so try the words from the end.
    for w in reversed(re.findall(r'[a-z]+', g['name'].lower())):
        for s, keys in rules:
            if any(k and (w == k or (len(k) >= 4 and w.endswith(k))) for k in keys): return s
    return next(s for s, keys in rules if '' in keys)  # the rule with '' is the slot's default shape

path = f'{REPO}/src/data/gear.json'
gear = json.load(open(path))
counts = {}
for g in gear:
    if REDO or g.get('icon') not in SHAPES: g['icon'] = shape(g)
    counts[g['icon']] = counts.get(g['icon'], 0) + 1
open(path, 'w').write(json.dumps(gear, indent=2, ensure_ascii=False) + '\n')
print({s: counts.get(s, 0) for s in SHAPES})
