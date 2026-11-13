"""Add a packed area's rigs and backdrop to src/art/assets.json, using the Steelspine Range's entries as templates
(regular boxScale 0.5, mini-boss 0.65, boss 1.0). Sizes and attack boxes come from v2/packed.json.
Run from the gen folder: python3 v2/wire_area.py <repo> <zone> <ambient kind> <ambient color> [boss boxScale]
Look at the fight and boss screenshots at 375 wide afterwards; tune boxScale and points by hand if needed."""
import json, copy, sys
repo, zone, kind, color = sys.argv[1:5]
boss_scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
zones = json.load(open('v2/zones.json')); packed = json.load(open('v2/packed.json'))
path = f'{repo}/src/art/assets.json'; a = json.load(open(path))
tpl = {'regular': a['rigs']['enemy.rivet-beetle'], 'mini': a['rigs']['enemy.lightning-lynx'], 'boss': a['rigs']['enemy.ferrovane']}
z = zones[zone]
ids = [(e, 'regular') for e in z['regular'][:5]] + [(z['regular'][5], 'mini'), (z['boss'], 'boss')]
for eid, role in ids:
    rig = copy.deepcopy(tpl[role])
    if eid not in packed: print('not packed:', eid); continue
    rig['size'] = packed[eid]
    if role == 'boss': rig['boxScale'] = boss_scale
    body, pose = rig['parts'][0]['parts']
    body['file'] = f'painted/enemies/{eid}.webp'
    if f'enemies/{eid}-attack-box' in packed:
        pose['file'] = f'painted/enemies/{eid}-attack.webp'; pose['box'] = packed[f'enemies/{eid}-attack-box']
    else:
        rig['parts'][0]['parts'] = [body]
    a['rigs'][f'enemy.{eid}'] = rig
a['backdrops'][zone] = {"layers": [{"file": f"painted/backdrops/{zone}.webp"}], "ambient": {"kind": kind, "color": color}}
open(path, 'w').write(json.dumps(a, indent=2, ensure_ascii=False) + "\n")
print('wired', zone)
