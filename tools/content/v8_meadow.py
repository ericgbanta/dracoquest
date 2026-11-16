"""Variety plan V8: Sunpetal Meadow, a low-level side area in The Wilds (levels 3 to 12, Storm and Verdant) that opens
at rider level 3 once Mossy Hollow's mini-boss is beaten, so levels 3 to 5 have two places to hunt.
Writes the enemies (stats copied from Mossy Hollow and Saltmarsh Shore, tuned afterwards with the sim), the zone
(placed right after Mossy Hollow), its gear set, a five-quest story, a bounty board, and its map pin and landmark.
Run once from the repo root: python3 tools/content/v8_meadow.py. Rerunning resets tuned stats to the analogs'."""
import json, copy
D = 'src/data/'
def load(n): return json.load(open(D + n))
def save(n, d): open(D + n, 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")

Z = 'sunpetal-meadow'
P = lambda i, n: {"id": i, "name": n, "intent": "attack", "weight": 5, "power": 1, "physical": True}
A = lambda i, n, st, ch, w=2, pw=0.7: {"id": i, "name": n, "intent": "attack", "weight": w, "power": pw, "status": st, "statusChance": ch}
BIG = lambda i, n, **kw: {"id": i, "name": n, "intent": "big", "weight": 2, "power": 1, **kw}
BUFF = lambda i, n, b, **kw: {"id": i, "name": n, "intent": "buff", "weight": 1, "buff": b, "target": "self", **kw}
HEAL = lambda i, n, h=0.25, w=1: {"id": i, "name": n, "intent": "heal", "weight": w, "heal": h, "target": "self", "condition": "selfHurt"}

# (id, name, element, flavor, moves, analog whose base and perLevel stats are copied)
ENEMIES = [
 ('buzzbee', 'Buzzbee', 'storm', "Its stripes crackle. So does its temper.",
  [P('sting', 'Sting'), A('zap-buzz', 'Zap Buzz', 'shock', 0.4), BUFF('swarm-up', 'Swarm Up', 'fury')], 'thornling'),
 ('dandelion-hare', 'Dandelion Hare', 'verdant', "Every hop sends seeds everywhere. It is very proud of this.",
  [P('kick', 'Hind Kick'), A('seed-puff', 'Seed Puff', 'blind', 0.6), BUFF('bolt', 'Bolt Away', 'fade')], 'bog-hopper'),
 ('clover-sprite', 'Clover Sprite', 'verdant', "Lucky for some. Not for you.",
  [P('twig-tap', 'Twig Tap'), A('clover-snare', 'Clover Snare', 'root', 0.6), HEAL('lucky-leaf', 'Lucky Leaf')], 'spore-puffer'),
 ('static-lamb', 'Static Lamb', 'storm', "Don't pet it. Everyone pets it anyway.",
  [P('headbutt', 'Headbutt'), BIG('wool-zap', 'Wool Zap', status='shock', statusChance=0.3), BUFF('fluff-up', 'Fluff Up', 'harden')], 'barkback-boar'),
 ('hay-golem', 'Hay Golem', 'verdant', "Built to scare crows. Now it scares everyone.",
  [P('straw-swat', 'Straw Swat'), BIG('haystack-slam', 'Haystack Slam'), HEAL('restuff', 'Restuff')], 'brine-slime'),
 ('queen-buzzbee', 'Queen Buzzbee', 'storm', "The hive's queen, and she has heard about you.",
  [{**P('royal-sting', 'Royal Sting'), "weight": 4}, BIG('thunder-swarm', 'Thunder Swarm'), A('static-hum', 'Static Hum', 'shock', 0.6), HEAL('honey-mend', 'Honey Mend', 0.2)], 'big-pincher'),
 ('thunderhoof', 'Thunderhoof', 'storm', "The meadow's old storm ram. Where he walks, it thunders.",
  [P('horn-butt', 'Horn Butt'), BIG('thunder-charge', 'Thunder Charge', status='shock', statusChance=0.5),
   BUFF('storm-bellow', 'Storm Bellow', 'fury', condition='selfHurt'), HEAL('graze', 'Graze', 0.12, 2),
   {"id": "meadow-coat", "name": "Meadow Coat", "intent": "shift", "weight": 1, "shiftTo": "verdant", "target": "self", "condition": "notShifted"}], 'crab-king'),
]
ORDER = ['id', 'name', 'element', 'flavor', 'base', 'perLevel', 'moves', 'miniBoss', 'xpMultiplier', 'boss', 'goldMultiplier']

en = load('enemies.json'); by = {e['id']: e for e in en}
ids = [e[0] for e in ENEMIES]
en = [e for e in en if e['id'] not in ids]
for eid, name, el, flavor, moves, src in ENEMIES:
    d = copy.deepcopy(by[src]); d.update(id=eid, name=name, element=el, flavor=flavor, moves=moves)
    d.pop('resist', None); d.pop('element2', None)
    en.append({k: d[k] for k in ORDER if k in d})
save('enemies.json', en)

zs = [z for z in load('zones.json') if z['id'] != Z]
reg = ids[:5]
zone = {"id": Z, "name": "Sunpetal Meadow", "element": "storm", "elements": ["storm", "verdant"], "minLevel": 3, "maxLevel": 12, "gate": None,
        "unlock": {"level": 3, "afterMini": "mossy-hollow"},
        "blurb": "Wildflowers, honey, hay bales and a thundercloud that never quite leaves.", "fights": {"min": 3, "max": 5},
        "encounters": [{"enemies": [reg[0]], "weight": 2}, {"enemies": [reg[1]], "weight": 3}, {"enemies": [reg[2]], "weight": 3},
                       {"enemies": [reg[3]], "weight": 2}, {"enemies": [reg[4]], "weight": 3},
                       {"enemies": [reg[0], reg[4]], "weight": 1, "minLevel": 5}, {"enemies": [reg[1], reg[2]], "weight": 1, "minLevel": 7}],
        "levelSpread": 1, "multiEnemyLevelOffset": -1,
        "boss": {"enemy": ids[6], "level": 12, "unlockRiderLevel": 11, "trophy": {"gear": "sunpetal-armor", "chance": 0.25}},
        "miniBoss": {"enemy": ids[5], "levelOffset": 0, "trophy": {"gear": "sunpetal-trinket", "chance": 0.25}},
        "dropChances": {"potion": 0.25, "dragon-treat": 0.15, "mana-tonic": 0.1},
        "eggDrop": {"element": "storm", "chance": 0.1},
        "gearDrops": {"chance": 0.06, "gear": ["sunpetal-melee", "sunpetal-ranged", "sunpetal-magic"]}}
at = next(i for i, z in enumerate(zs) if z['id'] == 'mossy-hollow') + 1
zs.insert(at, zone)
save('zones.json', zs)

SET_DESC = "Found in Sunpetal Meadow. Part of the Sunpetal set."
gear = [g for g in load('gear.json') if not g['id'].startswith('sunpetal-')]
gear += [
 {"id": "sunpetal-melee", "name": "Sunpetal Stinger Blade", "slot": "weapon", "weaponType": "melee", "element": None, "level": 5, "damage": 14, "price": 180, "bonus": {"strength": 1, "agility": 1}, "description": "Light and quick, with a little buzz to it."},
 {"id": "sunpetal-ranged", "name": "Sunpetal Willow Bow", "slot": "weapon", "weaponType": "ranged", "element": None, "level": 5, "damage": 13, "price": 180, "bonus": {"agility": 2}, "description": "Strung with spider silk from the hay bales."},
 {"id": "sunpetal-magic", "name": "Sunpetal Honey Wand", "slot": "weapon", "weaponType": "magic", "element": None, "level": 5, "damage": 13, "price": 180, "bonus": {"arcana": 2}, "description": "Slightly sticky. Very magical."},
 {"id": "sunpetal-armor", "name": "Sunpetal Stormwool Coat", "slot": "armor", "level": 11, "price": 480, "bonus": {"riderDefense": 3, "riderHp": 30}, "description": "Woven from Thunderhoof's wool. It still crackles on dry days."},
 {"id": "sunpetal-trinket", "name": "Sunpetal Royal Honeycomb", "slot": "trinket", "level": 7, "price": 240, "bonus": {"agility": 2, "riderHp": 8}, "description": "The Queen Buzzbee's best honeycomb. She wants it back."},
]
save('gear.json', gear)
sets = [s for s in load('sets.json') if s['id'] != 'sunpetal']
sets.insert(next(i for i, s in enumerate(sets) if s['zone'] == 'mossy-hollow') + 1,
            {"id": "sunpetal", "name": "Sunpetal", "zone": Z, "description": "Quick, lucky meadow gear. Full set strikes true more often.",
             "pieces": [f"sunpetal-{p}" for p in ('melee', 'ranged', 'magic', 'armor', 'trinket')],
             "bonuses": [{"pieces": 2, "bonus": {"riderHp": 12}}, {"pieces": 3, "bonus": {"agility": 2, "riderCrit": 0.03}}]})
save('sets.json', sets)

N = lambda text, name='Beekeeper Tilly': {"speaker": "npc", "name": name, "text": text}
R = lambda text: {"speaker": "rider", "text": text}
DR = lambda text: {"speaker": "dragon", "text": text}
T = lambda text: {"speaker": "narrator", "text": text}
STORY = [
 {"id": "the-busy-hive", "name": "The Busy Hive", "minLevel": 3, "description": "Beekeeper Tilly's bees have gone buzzing mad. Something has them all stirred up.",
  "steps": [{"intro": [N("Oh, thank goodness, a keeper! My bees are cross with everyone today, even me."), R("What happened?"), N("I don't know! That's the problem!")], "enemies": ["buzzbee"], "level": 3},
            {"intro": [T("A hare bounds past, dandelion seeds flying. The bees chase it, and then they chase you."), DR("*sneezes at the seeds*")], "enemies": ["dandelion-hare"], "level": 4}],
  "outro": [N("They're calming down. Something must have spooked them. Here, honey for your trouble."), T("Tilly's veil is covered in tiny angry footprints.")],
  "reward": {"xp": 45, "gold": 60, "items": {"potion": 2}}},
 {"id": "lucky-clovers", "name": "Lucky Clovers", "minLevel": 5, "requires": "the-busy-hive", "description": "The Clover Sprites have been 'borrowing' the meadow's luck. Mostly from Tilly.",
  "steps": [{"intro": [N("I tripped four times this morning. Four! On flat grass!"), R("Clover Sprites?"), N("Clover Sprites.")], "enemies": ["clover-sprite"], "level": 5},
            {"intro": [T("The sprites hide behind a hare that has eaten far too much clover.")], "enemies": ["clover-sprite", "dandelion-hare"], "level": 6}],
  "outro": [T("You find a little pouch stuffed with four-leaf clovers."), N("All the meadow's luck, in one bag! What should we do with it?")],
  "choice": {"prompt": "What do you do with the pouch of lucky clovers?", "options": [
    {"id": "scatter", "label": "Scatter them back over the meadow", "lines": [N("The flowers look brighter already. Here, the hive wants you to have these.")], "reward": {"embers": 2}, "temper": "gentle"},
    {"id": "keep", "label": "Keep a few for yourself", "lines": [T("You feel very lucky. A coin purse turns up in the grass on the way back.")], "reward": {"gold": 130}, "temper": "clever"}]},
  "reward": {"xp": 60, "gold": 50}},
 {"id": "static-in-the-flock", "name": "Static in the Flock", "minLevel": 7, "requires": "lucky-clovers", "description": "Farmer Bram's lambs are full of static. Every time they bump the fence, it sparks.",
  "steps": [{"intro": [N("My fence keeps setting itself on fire. Just a little. But still.", "Farmer Bram"), DR("*touches a lamb, fur stands straight up*")], "enemies": ["static-lamb"], "level": 7},
            {"intro": [T("The hay golem guarding the field decides you are a crow.")], "enemies": ["hay-golem"], "level": 8}],
  "outro": [N("Thunder's been rolling in from the hill every night. The lambs are just soaking it up.", "Farmer Bram"), N("That's Thunderhoof's hill. Oh dear.")],
  "reward": {"xp": 80, "gold": 100, "materials": {"ore": 2}}},
 {"id": "the-queen-buzzbee", "name": "The Queen Buzzbee", "minLevel": 8, "requires": "static-in-the-flock", "description": "The Queen Buzzbee has moved the whole hive to the top of the hill, right under the thundercloud.",
  "steps": [{"intro": [N("She's taken the hive up to the storm. Bees and lightning, keeper. Bees AND lightning."), R("We'll talk to her.")], "enemies": ["buzzbee", "buzzbee"], "level": 8},
            {"intro": [N("Bzzz. Leave. My. Hill.", "Queen Buzzbee"), DR("*buzzes back, badly*")], "enemies": ["queen-buzzbee"], "level": 9, "mini": True}],
  "outro": [T("The Queen sulks into her honeycomb throne. She drops a piece of royal honeycomb as she goes."), N("That's royal honeycomb. It's worth a lot, or it's worth a lot to her.")],
  "choice": {"prompt": "What do you do with the royal honeycomb?", "options": [
    {"id": "return", "label": "Give it back to the Queen", "lines": [N("Hmph. Fine. Take this. Don't tell the hive I was nice.", "Queen Buzzbee")], "reward": {"embers": 3}, "temper": "gentle"},
    {"id": "sell", "label": "Sell it in town", "lines": [T("The town baker pays a lot of gold for royal honey. The Queen buzzes at you from afar.")], "reward": {"gold": 180}, "temper": "proud"}]},
  "reward": {"xp": 100, "gold": 130, "embers": 2}},
 {"id": "thunderhoof", "name": "Thunderhoof", "minLevel": 11, "requires": "the-queen-buzzbee", "description": "Every night the storm ram Thunderhoof stamps on his hill, and the whole meadow shakes.",
  "steps": [{"intro": [N("This is it. The storm comes from him. The bees, the lambs, all of it."), T("Thunder rolls across the grass.")], "enemies": ["static-lamb", "buzzbee"], "level": 11},
            {"intro": [T("Thunderhoof lowers his great curled horns. His wool is a thundercloud."), N("MY. HILL.", "Thunderhoof"), DR("*plants its feet and roars right back*")], "enemies": ["thunderhoof"], "level": 12, "boss": True}],
  "outro": [T("Thunderhoof snorts, shakes out a shower of sparks, and lies down in the clover to sulk."), N("The sky's clear! First clear night all summer."), N("You'll always have honey here, keeper. Always.")],
  "reward": {"xp": 170, "gold": 300, "embers": 5}},
]
stories = [q for q in load('stories.json') if q.get('zone') != Z]
for q in STORY: q['zone'] = Z
stories += [{k: q[k] for k in ['id', 'zone', 'name', 'minLevel', 'requires', 'description', 'steps', 'outro', 'choice', 'reward'] if k in q} for q in STORY]
save('stories.json', stories)

b = load('bounties.json')
b['pools'][Z] = [
 {"id": "bee-wrangle", "kind": "defeat", "count": 5, "text": "Calm 5 Buzzbees", "reward": {"gold": 70, "materials": {"ore": 1}}, "enemy": "buzzbee"},
 {"id": "hare-chase", "kind": "defeat", "count": 3, "text": "Catch 3 Dandelion Hares", "reward": {"gold": 60, "embers": 1}, "enemy": "dandelion-hare"},
 {"id": "clover-pick", "kind": "defeat", "count": 3, "text": "Out-luck 3 Clover Sprites", "reward": {"gold": 60, "embers": 1}, "enemy": "clover-sprite"},
 {"id": "lamb-ground", "kind": "defeat", "count": 3, "text": "Ground 3 Static Lambs", "reward": {"gold": 70, "materials": {"ore": 1}}, "enemy": "static-lamb"},
 {"id": "golem-bale", "kind": "defeat", "count": 3, "text": "Bale up 3 Hay Golems", "reward": {"gold": 70, "embers": 1}, "enemy": "hay-golem"},
 {"id": "meadow-wins", "kind": "wins", "count": 6, "text": "Win 6 fights in the Meadow", "reward": {"gold": 100, "materials": {"ore": 2}}},
 {"id": "meadow-clear", "kind": "clear", "count": 2, "text": "Finish 2 runs in the Meadow", "reward": {"gold": 120, "embers": 2}},
 {"id": "queen-visit", "kind": "defeat", "count": 1, "text": "Defeat the Queen Buzzbee", "reward": {"gold": 100, "materials": {"crystal": 1}}, "enemy": "queen-buzzbee"},
]
save('bounties.json', b)

r = load('regions.json')
wilds = next(x for x in r['regions'] if x['id'] == 'wilds')
if Z not in wilds['zones']: wilds['zones'].insert(wilds['zones'].index('mossy-hollow') + 1, Z)
wilds['map']['pins'][Z] = [0.4, 0.66]
wilds['map']['stickers'] = [{"zone": Z, "art": f"landmark-{Z}", "x": 0.4, "y": 0.62, "w": 0.2}]
save('regions.json', r)

champ = load('champions.json')
champ['rares'] = [x for x in champ['rares'] if x['zone'] != Z]
champ['rares'].insert(1, {"id": "old-strawhat", "zone": Z, "name": "Old Strawhat", "enemy": "hay-golem", "traits": ["hulking", "thorned"],
                          "tint": "sepia(0.45) saturate(1.7) hue-rotate(-12deg) brightness(1.08)",
                          "flavor": "The first scarecrow ever stuffed in the meadow. It has been standing guard for a hundred summers and has opinions about it."})
save('champions.json', champ)
print('Sunpetal Meadow written')
