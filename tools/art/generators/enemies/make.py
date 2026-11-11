import json, os, sys, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import build_plans, ART, SCR, OUT
from extras import ENEMIES
from view import render
from PIL import Image

rigs = build_plans()
os.makedirs(ART + 'rigs/extras', exist_ok=True)
enemies = {}
for eid, e in ENEMIES.items():
    xs = []
    for x in e['extras']:
        fn = f'rigs/extras/{eid}-{x["id"]}.svg'
        open(ART + fn, 'w').write(x['svg'])
        xs.append({'parent': x['parent'], 'id': x['id'], 'file': fn, 'pivot': x['pivot']})
    enemies[eid] = {'rig': e['rig'], 'colors': e['colors'], 'scale': e['scale'], 'extras': xs}
order = json.load(open('/home/user/dracoquest/src/data/zones.json'))
frag = {'rigs': rigs, 'enemies': enemies}
json.dump(frag, open(SCR + 'frag-enemies.json', 'w'), indent=2)


def merged(eid):
    e = enemies[eid]; r = copy.deepcopy(rigs[e['rig']])
    def find(parts, pid):
        for p in parts:
            if p['id'] == pid: return p
            q = find(p.get('parts', []), pid)
            if q: return q
    for x in e['extras']:
        child = {'id': x['id'], 'file': x['file'], 'pivot': x['pivot']}
        if x['parent'] == 'root': r['parts'].append(child)
        else:
            p = find(r['parts'], x['parent']); assert p, (eid, x['parent'])
            p.setdefault('parts', []).append(child)
    return r


def zone_ids(z):
    ids = []
    for enc in z['encounters']:
        for i in enc['enemies']:
            if i not in ids: ids.append(i)
    ids.append(z['miniBoss']['enemy'])
    return ids


if __name__ == '__main__':
    want = sys.argv[1:] or [z['id'] for z in order]
    pose = {'head': -16, 'jaw': 14, 'arm': -24, 'leg-front': 20, 'wing-front': -18, 'tail': 16}
    scratch = {'rigs': {}}
    for z in order:
        if z['id'] not in want: continue
        ids = zone_ids(z); jobs = []
        for eid in ids:
            r = merged(eid); scratch['rigs']['enemy.' + eid] = r
            c = ','.join(enemies[eid]['colors'])
            jobs.append({'rig': r, 'colors': c, 'out': f'{SCR}enemygen/tmp/{eid}.png', 'width': 260})
            jobs.append({'rig': r, 'colors': c, 'out': f'{SCR}enemygen/tmp/{eid}-flip.png', 'width': 260, 'flip': True, 'pose': pose})
        render(jobs, z['id'])
        for eid in ids:
            im = Image.open(f'{SCR}enemygen/tmp/{eid}.png').convert('RGB')
            bgim = Image.new('RGB', im.size, (138, 116, 184))
            from PIL import ImageChops
            bb = ImageChops.difference(im, bgim).convert('L').point(lambda v: 255 if v > 30 else 0).getbbox()
            fill = max((bb[2] - bb[0]) / 250, (bb[3] - bb[1]) / 256)
            enemies[eid]['scale'] = round(min(1.05, ENEMIES[eid]['scale'] / fill), 2)
        W, H = 260, 270
        sheet = Image.new('RGB', (W * len(ids), H * 2 + 20), (138, 116, 184))
        for k, eid in enumerate(ids):
            s = enemies[eid]['scale']
            for row, suf in enumerate(['', '-flip']):
                im = Image.open(f'{SCR}enemygen/tmp/{eid}{suf}.png').convert('RGBA')
                if row == 0:
                    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
                    x = k * W + (W - im.width) // 2; y = H - im.height
                else:
                    x = k * W; y = H + 20
                bg = Image.new('RGBA', im.size, (138, 116, 184, 255)); 
                sheet.paste(im, (x, y))
        sheet.save(f'{OUT}zone-{z["id"]}.png')
        print('sheet', z['id'])
    json.dump(scratch, open(SCR + 'enemygen/scratch-manifest.json', 'w'), indent=1)
    if len(want) == len(order):
        json.dump(frag, open(SCR + 'frag-enemies.json', 'w'), indent=2)
        print({k: v['scale'] for k, v in enemies.items()})
