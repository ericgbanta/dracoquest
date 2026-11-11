import json, os
O = '#1d1a2b'
BONE, BONES = '#efe4c8', '#cbbd99'
ART = '/home/user/dracoquest/src/art/'
FRAG = '/home/user/dracoquest/tools/art/out/frag-bosses.json'


def mix(a, b='#1d1a2b', t=0.25):
    p = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
    x, y = p(a), p(b)
    return '#' + ''.join('%02x' % round(v + (w - v) * t) for v, w in zip(x, y))


def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -40 260 270" width="520" height="540">\n'
            + body.strip() + '\n</svg>\n')


def line(d, c=O, sw=3, fill='none'):
    return f'<path d="{d}" fill="{fill}" stroke="{c}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>\n'


def fill(d, c):
    return f'<path d="{d}" fill="{c}"/>\n'


def solid(d, c, sw=4):
    return f'<path d="{d}" fill="{c}" stroke="{O}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>\n'


def shape(d, base, anchor, k=0.86, sw=4, shade=None, extra=''):
    """Flat shape with one shade layer on the lower back side: the shape in shade color, the lit
    shape scaled toward a top-front anchor, extra detail, then the outline."""
    shade = shade or mix(base)
    ax, ay = anchor
    return (fill(d, shade)
            + f'<path d="{d}" fill="{base}" transform="translate({ax} {ay}) scale({k}) translate({-ax} {-ay})"/>\n'
            + extra
            + f'<path d="{d}" fill="none" stroke="{O}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>\n')


def eye(cx, cy, r, iris='#f5e27a', brow=None, bc=None, bw=4):
    s = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{iris}" stroke="{O}" stroke-width="3"/>\n'
    s += f'<circle cx="{cx + r * 0.25:.1f}" cy="{cy + r * 0.1:.1f}" r="{r * 0.48:.1f}" fill="{O}"/>\n'
    s += f'<circle cx="{cx + r * 0.42:.1f}" cy="{cy - r * 0.18:.1f}" r="{max(1.2, r * 0.2):.1f}" fill="#ffffff"/>\n'
    if brow:
        s += f'<path d="{brow}" fill="{bc or O}" stroke="{O}" stroke-width="3" stroke-linejoin="round"/>\n'
    return s


def write(rig, files):
    d = ART + 'rigs/' + rig + '/'
    os.makedirs(d, exist_ok=True)
    for name, body in files.items():
        s = svg(body)
        open(d + name + '.svg', 'w').write(s)
        print(rig, name, len(s))


def manifest(key, entry):
    try:
        m = json.load(open(FRAG))
    except Exception:
        m = {'rigs': {}}
    m['rigs'][key] = entry
    json.dump(m, open(FRAG, 'w'), indent=2)


def pv(x, y):
    return [round(x / 260, 3), round((y + 40) / 270, 3)]
