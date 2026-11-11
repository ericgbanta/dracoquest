import json, os, sys, copy, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from plans import PLANS
ART = '/home/user/dracoquest/src/art/'
SCR = '/home/user/dracoquest/tools/art/out/'
OUT = SCR + 'art-enemies/'

def fix(parts, name):
    for p in parts:
        if 'file' in p: p['file'] = f'rigs/plans/{name}/{p["file"]}.svg'
        if 'parts' in p: fix(p['parts'], name)

def build_plans(only=None):
    rigs = {}
    for name, fn in PLANS.items():
        files, rig = fn()
        d = ART + f'rigs/plans/{name}/'
        os.makedirs(d, exist_ok=True)
        for k, s in files.items():
            open(d + k + '.svg', 'w').write(s)
        fix(rig['parts'], name)
        rigs['plan.' + name] = rig
    return rigs

if __name__ == '__main__':
    rigs = build_plans()
    for k, r in rigs.items():
        for p in r['parts']: pass
    json.dump({'rigs': rigs}, open(SCR + 'enemygen/plans.json', 'w'), indent=1)
    print('plans', list(rigs))
