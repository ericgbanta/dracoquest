import json

SP = '/home/user/dracoquest/tools/art/out/'


def r(x):
    return round(x, 3)


def rig(d, size, box, points, piv, tip=True):
    w, h = size
    f = lambda p: [r(p[0] / w), r(p[1] / h)]
    tail = {'id': 'tail', 'file': f'rigs/{d}/tail.svg', 'pivot': f(piv['tail']), 'anim': 'swish'}
    if tip:
        tail['parts'] = [{'id': 'tail-tip', 'file': f'rigs/{d}/tail-tip-{{element}}.svg'}]
    return {
        'size': list(size), 'tint': 'dragon', 'boxScale': box,
        'points': {k: f(v) for k, v in points.items()},
        'parts': [
            {'id': 'leg-back', 'file': f'rigs/{d}/leg-back.svg'},
            {'id': 'torso', 'pivot': [0.5, 0.85], 'anim': 'breathe', 'parts': [
                {'id': 'wing-back', 'file': f'rigs/{d}/wing-back.svg', 'pivot': f(piv['wing-back']), 'anim': 'flap-back'},
                tail,
                {'id': 'body', 'file': f'rigs/{d}/body.svg'},
                {'id': 'head', 'file': f'rigs/{d}/head.svg', 'pivot': f(piv['head']), 'parts': [
                    {'id': 'jaw', 'file': f'rigs/{d}/jaw.svg', 'pivot': f(piv['jaw'])}]},
                {'id': 'wing-front', 'file': f'rigs/{d}/wing-front.svg', 'pivot': f(piv['wing-front']), 'anim': 'flap'},
            ]},
            {'id': 'leg-front', 'file': f'rigs/{d}/leg-front.svg', 'pivot': f(piv['leg-front'])},
        ],
    }


rigs = {
    'dragon.hatchling': rig('dragon-hatchling', (200, 170), 0.62,
                            {'mouth': (189, 86), 'hit': (96, 118), 'front': (170, 104)},
                            {'tail': (64, 132), 'wing-back': (118, 98), 'wing-front': (104, 102),
                             'head': (128, 92), 'jaw': (154, 90), 'leg-front': (112, 134)}, tip=False),
}
try:
    import juvenile_pts
    rigs['dragon.juvenile'] = juvenile_pts.RIG(rig)
except ImportError:
    pass
try:
    import elder_pts
    rigs['dragon.elder'] = elder_pts.RIG(rig)
except ImportError:
    pass

json.dump({'rigs': rigs}, open(SP + 'frag-dragons.json', 'w'), indent=2)
ref = json.load(open(SP + 'art-dragons/ref.json'))
ref['rigs'].update(rigs)
json.dump(ref, open(SP + 'art-dragons/preview.json', 'w'), indent=1)
print('ok', list(rigs))
