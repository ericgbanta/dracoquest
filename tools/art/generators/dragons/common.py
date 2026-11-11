import os

ART = '/home/user/dracoquest/src/art/'
OL = '#1d1a2b'
P, PS, S, SS = '#9a9a9a', '#6e6e6e', '#d6d6d6', '#b0b0b0'
BONE, BONES = '#efe4c8', '#cbbd99'


def svg(w, h, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*2}" height="{h*2}">\n'
            + body.strip() + '\n</svg>\n')


def fmt(x):
    return ('%.2f' % x).rstrip('0').rstrip('.')


def out(d, sw):
    return f'<path d="{d}" fill="none" stroke="{OL}" stroke-width="{fmt(sw)}" stroke-linejoin="round" stroke-linecap="round"/>'


def fill(d, c):
    return f'<path d="{d}" fill="{c}"/>'


def solid(d, c, sw):
    return f'<path d="{d}" fill="{c}" stroke="{OL}" stroke-width="{fmt(sw)}" stroke-linejoin="round" stroke-linecap="round"/>'


def shaded(d, c, shade_d, sc, sw):
    return fill(d, c) + '\n' + fill(shade_d, sc) + '\n' + out(d, sw)


def line(d, c, sw):
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{fmt(sw)}" stroke-linecap="round" stroke-linejoin="round"/>'


def bone_line(d, inner, sw_out, sw_in):
    return line(d, OL, sw_out) + '\n' + line(d, inner, sw_in)


def eye(cx, cy, rx, ry, px, py, prx, pry, sw, hl=None):
    hl = hl or (px + prx * 0.5, py - pry * 0.45, max(1.5, prx * 0.45))
    return (f'<ellipse cx="{fmt(cx)}" cy="{fmt(cy)}" rx="{fmt(rx)}" ry="{fmt(ry)}" fill="#ffffff" stroke="{OL}" stroke-width="{fmt(sw)}"/>\n'
            f'<ellipse cx="{fmt(px)}" cy="{fmt(py)}" rx="{fmt(prx)}" ry="{fmt(pry)}" fill="{OL}"/>\n'
            f'<circle cx="{fmt(hl[0])}" cy="{fmt(hl[1])}" r="{fmt(hl[2])}" fill="#ffffff"/>')


def write(path, w, h, body):
    full = ART + path
    os.makedirs(os.path.dirname(full), exist_ok=True)
    s = svg(w, h, body)
    open(full, 'w').write(s)
    return len(s)


# Adult wing geometry (adult canvas), reused scaled for juvenile and elder so the four stages share one wing.
WING = 'M126 104 L140 64 L112 22 C96 15 72 11 48 15 Q76 34 38 54 Q78 62 60 90 Q96 82 114 106 Z'
WING_SHADE = 'M112 22 L48 15 Q76 34 38 54 Z M112 22 L60 90 Q96 82 114 106 L126 104 Z'
WING_BONES = 'M126 104 L140 64 L112 22 M112 22 L50 16 M112 22 L40 53 M112 22 L62 88'


def wing_front(tr, s, ow, claw=True, extra=''):
    k = 1 / s
    b = (solid(WING, S, ow * k) + '\n' + fill(WING_SHADE, SS) + '\n' + out(WING, ow * k) + '\n'
         + bone_line(WING_BONES, P, 7.5 * k * ow / 4, 3.5 * k * ow / 4))
    if claw:
        b += '\n' + f'<path d="M112 22 L106 8 L118 18 Z" fill="{BONE}" stroke="{OL}" stroke-width="{fmt(2.5*k)}" stroke-linejoin="round"/>'
    return f'<g transform="{tr}">\n{b}\n{extra}</g>'


def wing_back(tr, s, ow):
    k = 1 / s
    b = solid(WING, SS, ow * k) + '\n' + bone_line(WING_BONES, PS, 7 * k * ow / 4, 3 * k * ow / 4)
    return f'<g transform="{tr}">\n{b}\n</g>'
