"""Tiny SVG kit for enemy body plans: flat fill, one shade crescent on the lower back side, outline on top."""
import re, math
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely import affinity

O = '#1d1a2b'
P, PS, S, SS, A, AS = '#9a9a9a', '#6e6e6e', '#d6d6d6', '#b0b0b0', '#505050', '#3c3c3c'
BONE, BONES, W = '#efe4c8', '#cbbd99', '#ffffff'
SHADE = {P: PS, S: SS, A: AS, BONE: BONES}
VB = (0, -40, 260, 270)


def svg(*els):
    x, y, w, h = VB
    body = '\n'.join(e for e in els if e)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" width="{w*2}" height="{h*2}">\n{body}\n</svg>\n'


def pv(x, y):
    return [round((x - VB[0]) / VB[2], 3), round((y - VB[1]) / VB[3], 3)]


def _tok(d):
    return re.findall(r'[MLCQZHVmlcqzhv]|-?\d*\.?\d+(?:e-?\d+)?', d)


def path_pts(d, n=14):
    """Absolute M/L/C/Q/H/V/Z only. Returns list of rings (list of points)."""
    t = _tok(d)
    rings, cur, i, cmd, pos, start = [], [], 0, None, (0, 0), (0, 0)
    def num():
        nonlocal i
        v = float(t[i]); i += 1; return v
    while i < len(t):
        if re.match(r'[A-Za-z]', t[i]):
            cmd = t[i]; i += 1
            if cmd in 'Zz':
                if cur: rings.append(cur)
                cur = []; pos = start; continue
        if cmd == 'M':
            if cur: rings.append(cur)
            pos = (num(), num()); start = pos; cur = [pos]; cmd = 'L'
        elif cmd == 'L':
            pos = (num(), num()); cur.append(pos)
        elif cmd == 'H':
            pos = (num(), pos[1]); cur.append(pos)
        elif cmd == 'V':
            pos = (pos[0], num()); cur.append(pos)
        elif cmd == 'C':
            p1 = (num(), num()); p2 = (num(), num()); p3 = (num(), num()); p0 = pos
            for k in range(1, n + 1):
                s = k / n; u = 1 - s
                cur.append((u**3*p0[0]+3*u*u*s*p1[0]+3*u*s*s*p2[0]+s**3*p3[0], u**3*p0[1]+3*u*u*s*p1[1]+3*u*s*s*p2[1]+s**3*p3[1]))
            pos = p3
        elif cmd == 'Q':
            p1 = (num(), num()); p2 = (num(), num()); p0 = pos
            for k in range(1, n + 1):
                s = k / n; u = 1 - s
                cur.append((u*u*p0[0]+2*u*s*p1[0]+s*s*p2[0], u*u*p0[1]+2*u*s*p1[1]+s*s*p2[1]))
            pos = p2
        else:
            raise ValueError('bad path ' + d)
    if cur: rings.append(cur)
    return rings


def poly(d):
    g = None
    for r in path_pts(d):
        if len(r) < 3: continue
        p = Polygon(r).buffer(0)
        g = p if g is None else g.union(p)
    return g


def ell_poly(cx, cy, rx, ry, rot=0):
    p = affinity.scale(Point(cx, cy).buffer(1, 48), rx, ry)
    return affinity.rotate(p, rot, origin=(cx, cy)) if rot else p


def poly_d(g, tol=0.6):
    if g is None or g.is_empty: return ''
    g = g.simplify(tol)
    geoms = list(g.geoms) if hasattr(g, 'geoms') else [g]
    out = []
    for p in geoms:
        if not isinstance(p, Polygon) or p.area < 6: continue
        for ring in [p.exterior] + list(p.interiors):
            c = list(ring.coords)[:-1]
            out.append('M' + ' L'.join(f'{x:.1f} {y:.1f}'.replace('.0 ', ' ').replace('.0', '') if False else f'{round(x,1):g} {round(y,1):g}' for x, y in c) + ' Z')
    return ' '.join(out)


def shade_of(g, v=(7, -9), clip=None):
    s = g.difference(affinity.translate(g, *v))
    if clip is not None: s = s.intersection(clip)
    return s


ST = 'stroke="{c}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'


def stroke(c=O, w=4):
    return ST.format(c=c, w=w)


def shape(d, fill, shade=None, v=(7, -9), sw=4, clip=None, extra_shade=None):
    """Path d filled, shade crescent, outline on top."""
    sh = SHADE.get(fill) if shade is None else shade
    els = [f'<path d="{d}" fill="{fill}"/>']
    if sh:
        g = poly(d)
        s = shade_of(g, v, clip)
        sd = poly_d(s)
        if sd: els.append(f'<path d="{sd}" fill="{sh}"/>')
    if extra_shade: els.append(extra_shade)
    if sw: els.append(f'<path d="{d}" fill="none" {stroke(O, sw)}/>')
    return '\n'.join(els)


def ell(cx, cy, rx, ry, fill, shade=None, v=(7, -9), sw=4, rot=0):
    sh = SHADE.get(fill) if shade is None else shade
    tr = f' transform="rotate({rot} {cx} {cy})"' if rot else ''
    els = [f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{tr} fill="{fill}"/>']
    if sh:
        sd = poly_d(shade_of(ell_poly(cx, cy, rx, ry, -rot if False else rot), v))
        if sd: els.append(f'<path d="{sd}" fill="{sh}"/>')
    if sw: els.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{tr} fill="none" {stroke(O, sw)}/>')
    return '\n'.join(els)


def flat(d, fill, sw=3):
    s = f' {stroke(O, sw)}' if sw else ''
    return f'<path d="{d}" fill="{fill}"{s}/>'


def line(d, c=O, w=3):
    return f'<path d="{d}" fill="none" {stroke(c, w)}/>'


def eye(cx, cy, r=8, look=1.5, brow=True, bc=O, tilt=14, lid=None, glow=None):
    """Enemy eye: white, pupil toward the front, highlight, heavy angry brow (lower toward the front)."""
    ry = r * 1.08
    white = glow or W
    els = [f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{ry:g}" fill="{white}" {stroke(O, 2.5)}/>']
    if not glow:
        px = cx + look
        els.append(f'<ellipse cx="{px:g}" cy="{cy + 0.5:g}" rx="{r*0.48:.1f}" ry="{r*0.66:.1f}" fill="{O}"/>')
        els.append(f'<circle cx="{px + r*0.2:.1f}" cy="{cy - r*0.28:.1f}" r="{max(1.4, r*0.2):.1f}" fill="{W}"/>')
    if brow:
        # heavy wedge brow: thick at the back, dipping at the front
        a = math.radians(tilt)
        x0, x1 = cx - r * 1.25, cx + r * 1.2
        y0 = cy - ry * 0.95 - r * 0.25
        y1 = y0 + (x1 - x0) * math.tan(a)
        th = r * 0.6
        d = (f'M{x0:.1f} {y0 - th*0.2:.1f} L{x1:.1f} {y1 - th*0.35:.1f} L{x1 - 1:.1f} {y1 + th*0.5:.1f} '
             f'L{x0 + 1:.1f} {y0 + th*0.75:.1f} Z')
        els.append(f'<path d="{d}" fill="{bc}" {stroke(O, 2.5)}/>')
    return '\n'.join(els)


def tr(d, dx=0, dy=0, sx=1, sy=1, ox=0, oy=0):
    """Transform an absolute path string: scale about (ox,oy), then translate."""
    t = _tok(d); out = []; cmd = None; idx = 0
    for tok in t:
        if re.match(r'[A-Za-z]', tok):
            cmd = tok; idx = 0; out.append(tok); continue
        v = float(tok)
        if cmd == 'H': v = (v - ox) * sx + ox + dx
        elif cmd == 'V': v = (v - oy) * sy + oy + dy
        elif idx % 2 == 0: v = (v - ox) * sx + ox + dx
        else: v = (v - oy) * sy + oy + dy
        idx += 1
        out.append(f'{round(v, 1):g}')
    s = ''
    for tok in out:
        if re.match(r'[A-Za-z]', tok): s += ('' if not s else ' ') + tok
        else: s += ('' if s.endswith(tuple('MLCQHVZ')) else ' ') + tok
    return s
