"""Variety plan V7: three more regular enemies for each of the first four zones. Each copies the base and perLevel stats
of an existing enemy in its zone (the like() approach), gets its own moves, and joins the encounter table (alone, and in
one mixed pair) and the zone's bounty pool. Run once from the repo root: python3 tools/content/v7_enemies.py"""
import json, copy
P = 'src/data/'
enemies = json.load(open(P + 'enemies.json')); byid = {e['id']: e for e in enemies}
zones = json.load(open(P + 'zones.json')); zbyid = {z['id']: z for z in zones}
bounties = json.load(open(P + 'bounties.json'))

def atk(id, name): return {"id": id, "name": name, "intent": "attack", "weight": 5, "power": 1, "physical": True}
def big(id, name, **kw): return {"id": id, "name": name, "intent": "big", "weight": 2, "power": 1, **kw}
def hit(id, name, status, chance): return {"id": id, "name": name, "intent": "attack", "weight": 2, "power": 0.7, "status": status, "statusChance": chance}
def buff(id, name, b): return {"id": id, "name": name, "intent": "buff", "weight": 1, "buff": b, "target": "self"}
def heal(id, name): return {"id": id, "name": name, "intent": "heal", "weight": 1, "heal": 0.25, "target": "self", "condition": "selfHurt"}

NEW = {
 'mossy-hollow': [
  ('acorn-knight', 'Acorn Knight', 'stone', 'barkback-boar', "Takes its twig lance and its acorn helmet very, very seriously.",
   [atk('twig-poke', 'Twig Poke'), big('lance-charge', 'Lance Charge'), buff('helmet-down', 'Helmet Down', 'harden')]),
  ('toadstool-tumbler', 'Toadstool Tumbler', 'verdant', 'spore-puffer', "Bounces off anything, including you.",
   [atk('bounce', 'Bounce'), hit('spore-burst', 'Spore Burst', 'blind', 0.6), big('cap-slam', 'Cap Slam')]),
  ('puddle-newt', 'Puddle Newt', 'tide', 'bog-hopper', "Wears a lily pad because it thinks it looks dashing. It does.",
   [atk('tail-flick', 'Tail Flick'), hit('puddle-splash', 'Puddle Splash', 'soak', 0.8), heal('lily-nap', 'Lily Nap')]),
 ],
 'saltmarsh-shore': [
  ('teacup-hermit', 'Teacup Hermit', 'stone', 'shell-knight', "Found the teacup on the beach and has not let go since.",
   [atk('pinch', 'Pinch'), big('cup-bash', 'Cup Bash'), buff('hide-in-cup', 'Hide in Cup', 'harden')]),
  ('spiny-puffer', 'Spiny Puffer', 'tide', 'pincher-crab', "Puffs up at the slightest insult. Everything is an insult.",
   [atk('spine-jab', 'Spine Jab'), hit('salt-spray', 'Salt Spray', 'soak', 0.8), big('puff-up-slam', 'Puff Slam')]),
  ('zap-jelly', 'Zap Jelly', 'storm', 'gull-bandit', "Drifts in on the tide and zaps whatever drifts too close.",
   [atk('sting', 'Sting'), hit('zap', 'Zap', 'shock', 0.5), buff('drift', 'Drift Away', 'fade')]),
 ],
 'whispering-fen': [
  ('fog-heron', 'Fog Heron', 'tide', 'reed-stalker', "Stands in the mist for hours, judging you.",
   [atk('beak-stab', 'Beak Stab'), hit('mist-wing', 'Mist Wing', 'chill', 0.6), buff('fog-cloak', 'Fog Cloak', 'fade')]),
  ('croak-shaman', 'Croak Shaman', 'verdant', 'murk-toad', "Its chants are mostly croaks, but the reeds listen anyway.",
   [atk('staff-bonk', 'Staff Bonk'), hit('reed-hex', 'Reed Hex', 'root', 0.6), heal('swamp-chant', 'Swamp Chant')]),
  ('peat-golem', 'Peat Golem', 'stone', 'bogling', "Dug out of the bog by accident. It has been cross about it ever since.",
   [atk('clod-punch', 'Clod Punch'), big('bog-stomp', 'Bog Stomp', status='crack', statusChance=0.4), buff('root-down', 'Root Down', 'harden')]),
 ],
 'cinder-pass': [
  ('magma-snail', 'Magma Snail', 'fire', 'lava-toad', "Slow, warm and absolutely not in a hurry to move out of your way.",
   [atk('shell-bump', 'Shell Bump'), hit('lava-ooze', 'Lava Ooze', 'burn', 0.7), buff('hide-in-shell', 'Hide in Shell', 'harden')]),
  ('soot-mole', 'Soot Mole', 'stone', 'cinder-beetle', "Sweeps the vents clean and blames you for the mess.",
   [atk('brush-swat', 'Brush Swat'), hit('soot-cloud', 'Soot Cloud', 'blind', 0.6), big('tunnel-burst', 'Tunnel Burst')]),
  ('storm-crow', 'Storm Crow', 'storm', 'smog-bat', "Rides the storms that roll off the volcano and steals anything shiny.",
   [atk('peck', 'Peck'), big('thunder-dive', 'Thunder Dive', status='shock', statusChance=0.3), buff('ruffle', 'Ruffle Up', 'fury')]),
 ],
}
PAIRS = {'mossy-hollow': (['acorn-knight', 'puddle-newt'], 3), 'saltmarsh-shore': (['spiny-puffer', 'zap-jelly'], 8),
         'whispering-fen': (['croak-shaman', 'fog-heron'], 12), 'cinder-pass': (['soot-mole', 'storm-crow'], 14)}
BOUNTY = {'acorn-knight': 'Disarm 3 Acorn Knights', 'toadstool-tumbler': 'Flatten 3 Toadstool Tumblers', 'puddle-newt': 'Dry out 3 Puddle Newts',
          'teacup-hermit': 'Return 3 teacups (Teacup Hermits)', 'spiny-puffer': 'Deflate 3 Spiny Puffers', 'zap-jelly': 'Unplug 3 Zap Jellies',
          'fog-heron': 'Chase off 3 Fog Herons', 'croak-shaman': 'Hush 3 Croak Shamans', 'peat-golem': 'Crumble 3 Peat Golems',
          'magma-snail': 'Cool off 3 Magma Snails', 'soot-mole': 'Sweep up 3 Soot Moles', 'storm-crow': 'Ground 3 Storm Crows'}

for zid, items in NEW.items():
    z = zbyid[zid]
    for eid, name, el, like, flavor, moves in items:
        assert eid not in byid, eid
        src = byid[like]
        e = {"id": eid, "name": name, "element": el, "flavor": flavor, "base": copy.deepcopy(src['base']), "perLevel": copy.deepcopy(src['perLevel']), "moves": moves}
        enemies.append(e); byid[eid] = e
        z['encounters'].append({"enemies": [eid], "weight": 2})
        pool = bounties['pools'].get(zid)
        if pool is not None:
            gold = max(b['reward'].get('gold', 0) for b in pool if b['kind'] == 'defeat')
            pool.insert(len([b for b in pool if b['kind'] == 'defeat']), {"id": f"{eid}-hunt", "kind": "defeat", "count": 3, "text": BOUNTY[eid], "reward": {"gold": gold, "embers": 1}, "enemy": eid})
    pair, lvl = PAIRS[zid]
    z['encounters'].append({"enemies": pair, "weight": 1, "minLevel": lvl})
json.dump(enemies, open(P + 'enemies.json', 'w'), indent=2, ensure_ascii=False); open(P + 'enemies.json', 'a').write('\n')
json.dump(zones, open(P + 'zones.json', 'w'), indent=2, ensure_ascii=False); open(P + 'zones.json', 'a').write('\n')
json.dump(bounties, open(P + 'bounties.json', 'w'), indent=2, ensure_ascii=False); open(P + 'bounties.json', 'a').write('\n')
print('added', sum(len(v) for v in NEW.values()))
