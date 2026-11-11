import math, os
OUT = '/home/user/dracoquest/src/art/icons'
os.makedirs(OUT, exist_ok=True)
O = '#1d1a2b'
SW = 3

def mix(c, t=0.25, to=O):
    a = [int(c[i:i+2], 16) for i in (1, 3, 5)]
    b = [int(to[i:i+2], 16) for i in (1, 3, 5)]
    return '#' + ''.join('%02x' % round(x * (1 - t) + y * t) for x, y in zip(a, b))

def lt(c, t=0.5):
    return mix(c, t, '#ffffff')

def f(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s == '-0' else s

def P(pts):
    return 'M' + ' L'.join(f(x) + ' ' + f(y) for x, y in pts) + ' Z'

def path(d, fill, stroke=True, sw=SW, extra=''):
    s = f' stroke="{O}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"' if stroke else ''
    return f'<path d="{d}" fill="{fill}"{s}{extra}/>'

def fillshape(d, fill, shade_d=None, shade=None, inner=''):
    """base fill, shade, inner details, outline on top"""
    out = path(d, fill, False)
    if shade_d:
        out += path(shade_d, shade or mix(fill), False)
    out += inner
    out += path(d, 'none')
    return out

def tube(d, color, w, cap='round'):
    return (f'<path d="{d}" fill="none" stroke="{O}" stroke-width="{f(w + 6)}" stroke-linecap="{cap}" stroke-linejoin="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(w)}" stroke-linecap="{cap}" stroke-linejoin="round"/>')

def line(d, w=2, color=O):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(w)}" stroke-linecap="round" stroke-linejoin="round"/>'

def circ(cx, cy, r, fill, stroke=True, sw=SW, extra=''):
    s = f' stroke="{O}" stroke-width="{sw}"' if stroke else ''
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{s}{extra}/>'

def ell(cx, cy, rx, ry, fill, stroke=True, sw=SW, extra=''):
    s = f' stroke="{O}" stroke-width="{sw}"' if stroke else ''
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{s}{extra}/>'

def ang(c, p):
    return math.atan2(p[1] - c[1], p[0] - c[0])

def arc_to(c, r, p0, p1, via):
    """arc on circle c,r from p0 to p1 passing near via"""
    a0, a1, av = ang(c, p0), ang(c, p1), ang(c, via)
    tau = 2 * math.pi
    d1 = (a1 - a0) % tau
    dv = (av - a0) % tau
    if dv < d1:  # increasing angle (sweep 1)
        sweep, span = 1, d1
    else:
        sweep, span = 0, tau - d1
    large = 1 if span > math.pi else 0
    return f'A{f(r)} {f(r)} 0 {large} {sweep} {f(p1[0])} {f(p1[1])}'

def inter(c1, r1, c2, r2):
    dx, dy = c2[0] - c1[0], c2[1] - c1[1]
    d = math.hypot(dx, dy)
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
    h = math.sqrt(max(r1 * r1 - a * a, 0))
    mx, my = c1[0] + a * dx / d, c1[1] + a * dy / d
    return (mx - h * dy / d, my + h * dx / d), (mx + h * dy / d, my - h * dx / d)

def crescent(c, r, c2, r2):
    """region of circle (c,r) outside circle (c2,r2)"""
    p, q = inter(c, r, c2, r2)
    dx, dy = c[0] - c2[0], c[1] - c2[1]
    d = math.hypot(dx, dy)
    far = (c[0] + dx / d * r, c[1] + dy / d * r)
    near = (c2[0] + dx / d * r2, c2[1] + dy / d * r2)
    return f'M{f(p[0])} {f(p[1])} ' + arc_to(c, r, p, q, far) + ' ' + arc_to(c2, r2, q, p, near) + ' Z'

def ball(cx, cy, r, fill, inner='', hl=True, shade=None):
    """circle with a lower-right shade crescent and a highlight"""
    sh = crescent((cx, cy), r, (cx - r * 0.22, cy - r * 0.3), r * 1.02)
    o = circ(cx, cy, r, fill, False) + path(sh, shade or mix(fill), False)
    if hl:
        o += ell(cx - r * 0.38, cy - r * 0.42, r * 0.2, r * 0.14, '#ffffff', False, extra=' opacity="0.8"')
    return o + inner + circ(cx, cy, r, 'none')

def seg_below(cx, cy, r, y):
    dx = math.sqrt(r * r - (y - cy) ** 2)
    large = 1 if y < cy else 0
    return f'M{f(cx - dx)} {f(y)} A{f(r)} {f(r)} 0 {large} 0 {f(cx + dx)} {f(y)} Z'

def star_pts(cx, cy, R, r, n=5, rot=-90):
    pts = []
    for i in range(2 * n):
        a = math.radians(rot + i * 180 / n)
        rr = R if i % 2 == 0 else r
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts

def sparkle(cx, cy, s, fill='#fffbe8', sw=2):
    k = s * 0.28
    pts = [(cx, cy - s), (cx + k, cy - k), (cx + s, cy), (cx + k, cy + k), (cx, cy + s), (cx - k, cy + k), (cx - s, cy), (cx - k, cy - k)]
    return path(P(pts), fill, True, sw)

icons = {}

# ---------------- currencies / ui ----------------
GOLD, GOLDL = '#f7c844', '#ffe9a0'

def coin_stack():
    o = ''
    for t in (37, 30.5, 24):
        body = f'M5 {f(t)} V{f(t+5)} A13 4 0 0 0 31 {f(t+5)} V{f(t)} Z'
        o += path(body, mix(GOLD))
        o += ell(18, t, 13, 4, GOLD)
    # upright coin in front
    o += ball(34, 30, 11, GOLD, inner=circ(34, 30, 6, 'none', sw=2) + line('M34 27 V33', 2.5), hl=False)
    o += ell(13, 23, 5, 1.5, GOLDL, False)
    return o
icons['gold'] = coin_stack()

EMB = '#ff6a3c'
d = 'M24 3 C30 12 40 19 40 30 C40 39 33 45 24 45 C15 45 8 39 8 30 C8 19 18 12 24 3 Z'
icons['ember'] = fillshape(d, EMB,
    'M40 30 C40 39 33 45 24 45 C15 45 8 39 8 30 L24 38 Z', mix(EMB),
    path('M24 15 L32 29 L24 38 L16 29 Z', '#ffd35a', True, 2)
    + line('M24 3 V15 M8 30 L16 29 M40 30 L32 29 M24 38 V45', 2)
    + path('M24 15 L28 22 L24 25 L20 22 Z', '#fff6c8', False))

EGG = '#f2dca6'
d = 'M24 3 C35 3 42 20 42 30 C42 40 34 46 24 46 C14 46 6 40 6 30 C6 20 13 3 24 3 Z'
icons['egg'] = fillshape(d, EGG,
    'M42 31 C41 41 34 46 24 46 C17 46 10 43 8 36 C14 41 22 42 29 40 C36 38 40 34 42 31 Z', None,
    path('M6.5 26 L12 30 L18 25 L24 30 L30 25 L36 30 L41.5 26 L42 31 L36 35 L30 30 L24 35 L18 30 L12 35 L6 31 Z', '#e0874a', True, 2)
    + ell(19, 14, 3.5, 3, '#e0874a', False) + ell(29, 19, 2.2, 2, '#e0874a', False)
    + path('M30 8 C34 11 37 16 38 21 C35 17 32 13 29 11 Z', '#ffffff', False, extra=' opacity="0.7"'))

STEEL = '#c9c6dc'
icons['lock'] = (tube('M15 22 V15 A9 9 0 0 1 33 15 V22', STEEL, 5)
    + fillshape('M9 25 Q9 21 13 21 H35 Q39 21 39 25 V40 Q39 44 35 44 H13 Q9 44 9 40 Z', GOLD,
        'M39 34 V40 Q39 44 35 44 H13 Q9 44 9 40 V34 Z', None,
        path('M24 27 A4 4 0 0 1 26.5 34 L27.5 39 H20.5 L21.5 34 A4 4 0 0 1 24 27 Z', O, False)
        + ell(14, 25, 2.5, 1.2, GOLDL, False)))

WALL, ROOF = '#f2dca6', '#e0573c'
icons['town'] = (fillshape('M9 20 H39 V44 H9 Z', WALL, 'M30 20 H39 V44 H30 Z', None,
        path('M18 44 V34 A6 6 0 0 1 30 34 V44 Z', '#9a5f3a', True, 2.5) + circ(27, 39, 1.2, GOLD, False))
    + fillshape('M3 23 L24 5 L45 23 Q46 26 43 26 H5 Q2 26 3 23 Z', ROOF,
        'M3 23 Q2 26 5 26 H43 Q46 26 45 23 Z', None)
    + circ(24, 16, 3.2, '#ffe9a0', sw=2.5))

LAN = '#e8483c'
icons['event'] = (line('M24 1 V8', 3)
    + fillshape('M17 8 H31 V13 H17 Z', GOLD)
    + fillshape('M24 11 C36 11 42 18 42 26 C42 34 36 40 24 40 C12 40 6 34 6 26 C6 18 12 11 24 11 Z', LAN,
        'M42 26 C42 34 36 40 24 40 C12 40 6 34 6 26 C12 33 36 33 42 26 Z', None,
        ell(24, 26, 7, 10, '#ffb04a', False) + line('M24 11 V40 M15 13 C11 20 11 32 15 39 M33 13 C37 20 37 32 33 39', 2)
        + ell(14, 19, 2.5, 3.5, '#ffffff', False, extra=' opacity="0.6"'))
    + fillshape('M17 38 H31 V43 H17 Z', GOLD)
    + line('M24 43 V47', 3))

BONE, BONES = '#efe4c8', '#cbbd99'
MEAT = '#c8553a'
icons['feed'] = (circ(39, 44, 4.5, BONE) + circ(44, 39, 4.5, BONE)
    + tube('M26 26 L40 40', BONE, 6)
    + fillshape('M20 4 C30 4 36 12 34 22 C32 31 24 36 14 34 C6 32 3 24 5 16 C7 8 13 4 20 4 Z', MEAT,
        'M34 22 C32 31 24 36 14 34 C8 33 5 29 4 24 C12 30 26 29 34 20 Z', None,
        ell(15, 13, 4, 2.5, '#f08a6a', False, extra=' transform="rotate(-35 15 13)"')))

WOOD = '#b0743e'
icons['groom'] = ('<g transform="rotate(-28 24 28)">'
    + fillshape('M18 34 H40 V42 Q40 44 38 44 H20 Q18 44 18 42 Z', '#f2dca6', None, None, line('M23 35 V43 M28 35 V43 M33 35 V43', 2))
    + fillshape('M2 23 Q2 19 6 19 H16 V27 H6 Q2 27 2 23 Z', WOOD)
    + fillshape('M14 18 Q14 14 18 14 H40 Q44 14 44 18 V32 Q44 35 41 35 H17 Q14 35 14 32 Z', '#7a8cf0',
        'M44 28 V32 Q44 35 41 35 H17 Q14 35 14 32 V28 Z', None, ell(20, 18, 3, 1.5, '#ffffff', False, extra=' opacity="0.6"'))
    + '</g>'
    + sparkle(38, 8, 6.5) + sparkle(9, 9, 4.5))

MOON = '#f5e27a'
mo = crescent((20, 27), 17, (31, 18), 13)
icons['rest'] = (path(mo, MOON, False)
    + path(crescent((20, 27), 17, (17, 23), 16.5), mix(MOON), False)
    + path(mo, 'none')
    + tube('M30 5 H42 L30 18 H42', '#efe9ff', 4)
    + tube('M40 26 H45 L40 32 H45', '#efe9ff', 2.5))

STAR = '#ffd23c'
sp = star_pts(24, 26, 22, 10.5)
c = (24, 26)
icons['xp'] = (path(P(sp), STAR, False)
    + path(P([c] + sp[2:8]), mix(STAR), False)
    + path(P([c, sp[9], sp[0], sp[1]]), '#fff1a8', False)
    + path(P(sp), 'none'))

HEART = '#f2557e'
d = 'M24 44 C10 34 3 26 3 17 C3 10 8 5 14.5 5 C19 5 22 8 24 12 C26 8 29 5 33.5 5 C40 5 45 10 45 17 C45 26 38 34 24 44 Z'
icons['bond'] = fillshape(d, HEART, 'M45 17 C45 26 38 34 24 44 C10 34 3 26 3 17 C8 27 18 33 26 33 C35 32 42 26 45 17 Z', None,
    ell(12.5, 14, 4, 2.8, '#ffffff', False, extra=' opacity="0.8" transform="rotate(-30 12.5 14)"'))

# ---------------- items ----------------
GLASS = '#d4e6f2'
CORK = '#b0743e'

def flask(liq, star=False):
    o = fillshape('M17 3 H31 V9 H17 Z', CORK)
    o += fillshape('M19 8 H29 V20 H19 Z', GLASS)
    o += circ(24, 31, 14, GLASS, False)
    o += path(seg_below(24, 31, 14, 26), liq, False)
    o += path(crescent((24, 31), 14, (21, 27), 14.3), mix(liq), False)
    o += line('M10.5 26 H37.5', 2)
    o += ell(17, 31, 2.5, 4, '#ffffff', False, extra=' opacity="0.8"')
    o += circ(24, 31, 14, 'none')
    o += path('M20.5 15 H27.5 V19 H20.5 Z', GLASS, False)
    o += line('M19 12 V18.5 M29 12 V18.5', SW)
    return o
icons['item-potion'] = flask('#e8403c')

TON = '#4a7ef0'
d = 'M19 8 H29 V15 L35 19 Q38 21 38 25 V41 Q38 45 34 45 H14 Q10 45 10 41 V25 Q10 21 13 19 L19 15 Z'
icons['item-mana-tonic'] = (fillshape('M17 3 H31 V9 H17 Z', CORK)
    + fillshape(d, GLASS, None, None,
        path('M10 27 H38 V41 Q38 45 34 45 H14 Q10 45 10 41 Z', TON, False)
        + path('M31 27 H38 V41 Q38 45 34 45 H31 Z', mix(TON), False)
        + line('M10 27 H38', 2)
        + sparkle(22, 36, 5, '#bfe8ff', 1.5)
        + path('M14 24 V30', '#ffffff', False) + line('M14.5 23 V31', 2.5, '#ffffff')))

CAND = '#f08a3c'
icons['item-dragon-treat'] = (fillshape('M14 24 L3 14 Q2 24 3 34 Z', '#4fc1b0')
    + fillshape('M34 24 L45 14 Q46 24 45 34 Z', '#4fc1b0')
    + ball(24, 24, 13, CAND, inner=line('M15 15 C19 22 19 28 16 34 M24 11 C28 18 28 30 24 37 M33 15 C36 22 36 28 32 34', 3, '#ffd35a')))

# ---------------- foods ----------------
TR = '#6fa8d8'
d = 'M4 25 C10 13 26 11 36 21 L44 13 Q46 25 44 37 L36 29 C26 38 10 36 4 25 Z'
icons['food-river-trout'] = fillshape(d, TR, 'M4 25 C10 36 26 38 36 29 L44 37 Q45 31 45 27 L36 25 C26 32 12 32 4 25 Z', None,
    path('M10 24 C18 21 28 22 35 25 C28 28 18 28 10 24 Z', '#f08a9a', False)
    + circ(12, 21, 2.8, O, False) + circ(11.2, 20.2, 1, '#ffffff', False)
    + line('M20 15 C23 19 23 24 22 27', 2))

ROOT = '#f08a3c'
d = 'M13 15 C19 11 31 11 36 15 C37 25 30 37 21 45 C16 37 12 25 13 15 Z'
icons['food-sweetroot'] = (fillshape('M24 13 C18 10 12 5 13 2 C18 3 22 7 24 12 Z', '#5fbf5a')
    + fillshape('M24 13 C24 7 28 2 31 1 C32 6 28 11 24 13 Z', '#7fd25a')
    + fillshape('M24 13 C29 9 37 8 40 10 C37 14 30 15 24 13 Z', '#5fbf5a')
    + fillshape(d, ROOT, 'M36 15 C37 25 30 37 21 45 C25 36 30 26 30 13 Z', None,
        line('M17 21 H22 M27 27 H31 M19 33 H23', 2)))

PEP = '#e0342c'
d = 'M10 12 C20 9 32 12 38 21 C43 30 38 41 27 46 C32 37 31 30 26 25 C21 20 15 19 9 18 C6 17 6 13 10 12 Z'
icons['food-char-pepper'] = (fillshape(d, PEP, 'M38 21 C43 30 38 41 27 46 C32 37 31 30 26 25 C31 27 36 24 38 21 Z', None,
        ell(17, 14, 4, 1.6, '#ff9a8a', False, extra=' transform="rotate(8 17 14)"'))
    + tube('M8 15 C4 13 3 8 6 4', '#5fbf5a', 4)
    + path('M30 15 C32 10 36 7 40 7 C39 11 36 13 34 17 Z', '#ffb43c', True, 2.5))

MOSS = '#6fc25a'
CRUST = '#e0a858'
icons['food-mossberry-tart'] = (
    ''.join(ball(x, y, r, MOSS) for x, y, r in ((13, 25, 6.5), (35, 25, 6.5), (24, 19, 7.5)))
    + fillshape('M3 30 Q3 27 6 28 Q9 25 12 28 Q15 25 18 28 Q21 25 24 28 Q27 25 30 28 Q33 25 36 28 Q39 25 42 28 Q45 27 45 30 L41 40 Q40 43 37 43 H11 Q8 43 7 40 Z', CRUST,
        'M44 33 L41 40 Q40 43 37 43 H11 Q8 43 7 40 L5 35 C18 38 32 38 44 33 Z', None))

SUN = '#ffc93c'
icons['food-sunfruit'] = (tube('M24 12 C24 9 25 6 27 4', '#9a5f3a', 3)
    + ball(24, 28, 17, SUN, inner=line('M17 22 C19 18 22 17 24 17', 2.5, '#fff1a8'))
    + fillshape('M26 9 C29 3 37 2 42 4 C39 10 32 12 26 9 Z', '#5fbf5a'))

PIE, PIES = '#eab35a', '#c98a3a'
icons['food-harvest-pie'] = (fillshape('M4 24 H44 V33 Q44 42 24 42 Q4 42 4 33 Z', PIES,
        'M4 33 Q4 42 24 42 Q44 42 44 33 V37 Q40 44 24 44 Q8 44 4 37 Z', None)
    + path('M4 33 Q4 42 24 42 Q44 42 44 33', 'none')
    + ell(24, 24, 20, 10.5, PIE)
    + path('M8 22 C10 16 18 14 24 14 C14 15 10 19 8 22 Z', '#fff1c0', False)
    + line('M18 22 L22 26 M26 20 L30 24 M17 28.5 L20 30.5', 2.5)
    + line('M7 30 Q9 33 11 31 Q13 34 15 32 Q17 35 19 33 Q21 35 24 34 Q27 35 29 33 Q31 35 33 32 Q35 34 37 31 Q39 33 41 30', 2))

COCOA = '#8a5434'
icons['food-cocoa-cake'] = (fillshape('M7 22 H41 V40 Q41 44 37 44 H11 Q7 44 7 40 Z', COCOA,
        'M7 35 H41 V40 Q41 44 37 44 H11 Q7 44 7 40 Z', None, line('M7 33 H41', 2.5, '#f5e6d0'))
    + fillshape('M8 18 Q8 15 11 15 H37 Q40 15 40 18 V24 Q40 28 37 27 Q35 26 34 29 Q33 32 31 29 Q30 25 27 25 H21 Q19 25 18 28 Q17 31 15 28 Q14 25 12 26 Q8 28 8 24 Z', '#f5e6d0')
    + tube('M24 10 C24 7 26 5 28 4', '#5fbf5a', 2)
    + ball(24, 13, 5, '#e8304a', hl=True))

BUN = '#efc488'
d = 'M4 35 C4 19 13 11 24 11 C35 11 44 19 44 35 C44 41 38 44 24 44 C10 44 4 41 4 35 Z'
pet = '#f59ac0'
petals = ''.join(circ(24 + 6.5 * math.cos(math.radians(-90 + 72 * i)), 21 + 6.5 * math.sin(math.radians(-90 + 72 * i)), 4.6, pet, True, 2.5) for i in range(5))
icons['food-blossom-bun'] = fillshape(d, BUN, 'M44 33 C44 41 38 44 24 44 C10 44 4 41 4 33 C10 39 38 39 44 33 Z', None,
    petals + circ(24, 21, 3, '#ffd23c', True, 2))

# ---------------- statuses ----------------
FL = '#ff6a2c'
d = 'M23 2 C27 9 35 13 38 21 C41 29 40 37 36 41 C33 44 28 46 24 46 C17 46 10 42 9 34 C8 27 12 21 15 17 C16 21 17 24 20 25 C18 17 19 9 23 2 Z'
icons['status-burn'] = fillshape(d, FL, 'M38 21 C41 29 40 37 36 41 C33 44 28 46 24 46 C17 46 10 42 9 34 C14 40 22 42 29 40 C36 37 38 29 38 21 Z', None,
    path('M24 22 C28 28 33 31 33 37 C33 42 29 44 24 44 C19 44 15 42 15 37 C15 33 18 31 20 29 C21 31 22 32 24 33 C23 29 23 26 24 22 Z', '#ffd35a', True, 2))

arms = ''
for k in range(6):
    a = math.radians(90 + 60 * k)
    ex, ey = 24 + 19 * math.cos(a), 24 + 19 * math.sin(a)
    bx, by = 24 + 12 * math.cos(a), 24 + 12 * math.sin(a)
    l1 = (bx + 6 * math.cos(a + 0.9), by + 6 * math.sin(a + 0.9))
    l2 = (bx + 6 * math.cos(a - 0.9), by + 6 * math.sin(a - 0.9))
    arms += f'M24 24 L{f(ex)} {f(ey)} M{f(l1[0])} {f(l1[1])} L{f(bx)} {f(by)} L{f(l2[0])} {f(l2[1])} '
icons['status-chill'] = tube(arms.strip(), '#bfe8ff', 4) + circ(24, 24, 4, '#ffffff', True, 2.5)

VINE = '#5fbf5a'
leaf = lambda x, y, r: f'<path d="M0 0 C3 -5 9 -5 12 0 C9 5 3 5 0 0 Z" fill="#8ad65a" stroke="{O}" stroke-width="2.5" stroke-linejoin="round" transform="translate({x} {y}) rotate({r})"/>'
icons['status-root'] = (tube('M10 44 C6 32 36 30 33 18 C31 11 24 11 22 5', VINE, 6)
    + tube('M38 44 C42 32 12 30 15 18 C16 13 21 10 26 9', '#4aa448', 6)
    + leaf(31, 31, -25) + leaf(17, 31, 205))

ROCK = '#b39a76'
d = 'M7 39 C3 30 7 15 18 9 C26 5 37 8 42 17 C46 26 45 37 38 42 C30 46 13 46 7 39 Z'
icons['status-crack'] = fillshape(d, ROCK, 'M45 28 C45 35 43 39 38 42 C30 46 13 46 7 39 C5 36 4 32 4 28 C10 37 33 39 45 28 Z', None,
    line('M23 7 L20 17 L28 23 L20 31 L25 44', 3.5) + line('M28 23 L36 26', 2.5)
    + ell(14, 18, 3, 2, '#e0cca8', False))

BOLT = '#ffe14a'
d = 'M26 2 H39 L29 17 H40 L15 46 L21 26 H9 Z'
icons['status-shock'] = fillshape(d, BOLT, 'M40 17 L15 46 L21 26 H25 L33 17 Z', None,
    path('M27 5 H33 L25 18 H22 Z', '#fffbe0', False))

DROP = '#3f8fd8'
d = 'M24 3 C28 12 39 21 39 31 C39 40 32 46 24 46 C16 46 9 40 9 31 C9 21 20 12 24 3 Z'
icons['status-soak'] = fillshape(d, DROP, 'M39 31 C39 40 32 46 24 46 C16 46 9 40 9 31 C14 38 22 40 28 38 C34 36 38 33 39 31 Z', None,
    path('M15 28 C15 23 18 19 21 16 C20 21 19 25 19 30 C19 33 15 33 15 28 Z', '#cfe8ff', False))

d = 'M3 24 C11 12 37 12 45 24 C37 36 11 36 3 24 Z'
icons['status-blind'] = (fillshape(d, '#efe9ff', 'M3 24 C11 36 37 36 45 24 C37 31 11 31 3 24 Z', '#bfb6d8',
        circ(24, 24, 9, '#7a5c9e', True, 2.5) + circ(24, 24, 4.5, O, False) + circ(21, 21, 2, '#ffffff', False))
    + tube('M11 40 L37 8', '#c9a8ff', 4))

WARD = '#f5e27a'
d = 'M24 3 L42 9 C42 26 36 38 24 46 C12 38 6 26 6 9 Z'
icons['status-ward'] = fillshape(d, WARD, 'M24 3 L42 9 C42 26 36 38 24 46 Z', None,
    path('M24 11 L35 15 C35 26 31 33 24 38 C17 33 13 26 13 15 Z', 'none', True, 2.5)
    + sparkle(19, 18, 4.5, '#ffffff', 1.5))

FURY = '#ff4a5a'
icons['status-fury'] = tube('M6 17 Q17 17 17 6 M31 6 Q31 17 42 17 M42 31 Q31 31 31 42 M17 42 Q17 31 6 31', FURY, 5.5)

HARD = '#a9a6c4'
icons['status-harden'] = (path('M12 9 L33 5 L44 19 L40 40 L19 44 L4 28 Z', HARD)
    + path('M12 9 L33 5 L44 19 L26 23 L4 28 Z', '#d4d1ea', False)
    + path('M44 19 L40 40 L19 44 L26 23 Z', mix(HARD), False)
    + line('M44 19 L26 23 L4 28 M26 23 L19 44', 2.5)
    + path('M12 9 L33 5 L44 19 L40 40 L19 44 L4 28 Z', 'none')
    + sparkle(16, 15, 4.5, '#ffffff', 1.5))

GH = '#d9d2ff'
d = 'M10 24 C10 12 17 4 26 4 C35 4 40 12 40 22 V36 C37 33 35 40 31 37 C28 34 25 42 21 38 C17 34 15 41 11 44 C11 38 6 36 4 39 C6 33 10 30 10 24 Z'
icons['status-fade'] = fillshape(d, GH, 'M40 28 V36 C37 33 35 40 31 37 C28 34 25 42 21 38 C17 34 15 41 11 44 C11 40 10 37 8 36 C18 36 32 33 40 28 Z', '#a89ee0',
    ell(21, 19, 2.6, 3.6, O, False) + ell(31, 19, 2.6, 3.6, O, False) + ell(18, 11, 3, 2, '#ffffff', False, extra=' opacity="0.8"'))

MEG = '#ff9a3c'
icons['status-taunt'] = (fillshape('M10 27 L14 39 Q15 41 17 40 L20 39 Q22 38 21 36 L18 27 Z', '#b0743e')
    + fillshape('M5 19 Q5 17 7 17 H15 L30 8 V38 L15 29 H7 Q5 29 5 27 Z', MEG, 'M5 24 V27 Q5 29 7 29 H15 L30 38 V30 L15 25 Z', None)
    + ell(30, 23, 4.5, 15.5, '#ffd07a')
    + tube('M39 11 L44 7 M40 23 H46 M39 35 L44 39', '#fff3b0', 2.5))

# ---------------- intents ----------------
def blade(tip, base, hw):
    dx, dy = base[0] - tip[0], base[1] - tip[1]
    L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    p1 = (tip[0] + ux * 6 + nx * hw, tip[1] + uy * 6 + ny * hw)
    p2 = (tip[0] + ux * 6 - nx * hw, tip[1] + uy * 6 - ny * hw)
    b1 = (base[0] + nx * hw, base[1] + ny * hw); b2 = (base[0] - nx * hw, base[1] - ny * hw)
    return [tip, p1, b1, b2, p2], [tip, p1, b1, base]

def sword(m):
    X = (lambda x: 48 - x) if m else (lambda x: x)
    pts, half = blade((X(4), 4), (X(31), 31), 3.4)
    o = path(P(pts), '#e4e8f2', False) + path(P(half), '#a9b0c8', False) + path(P(pts), 'none')
    o += tube(f'M{X(34)} {35} L{X(40)} {41}', '#9a5f3a', 3.5)
    o += tube(f'M{X(26)} {37} L{X(37)} {26}', GOLD, 3.5)
    o += circ(X(42), 43, 3.2, GOLD, True, 2.5)
    return o
icons['intent-attack'] = sword(False) + sword(True)

sb = star_pts(24, 24, 23, 14, n=10)
icons['intent-big'] = (path(P(sb), '#ff5a3c') + path(P(star_pts(24, 24, 15, 10, n=10, rot=-72)), '#ffb43c', False)
    + path('M20.5 10 Q20.5 8 24 8 Q27.5 8 27.5 10 L26 27 Q25.8 29 24 29 Q22.2 29 22 27 Z', '#fff8d8', True, 2.5)
    + circ(24, 36, 3.8, '#fff8d8', True, 2.5))

UP = '#ffc83c'
d = 'M24 3 L44 23 H33 V44 H15 V23 H4 Z'
icons['intent-buff'] = fillshape(d, UP, 'M24 3 L44 23 H33 V44 H24 Z', None, path('M24 8 L10 21 H15 Z', '#fff1a8', False))

HEAL = '#5fd16a'
d = 'M17 5 H31 V17 H43 V31 H31 V43 H17 V31 H5 V17 H17 Z'
icons['intent-heal'] = fillshape(d, HEAL, 'M43 24 V31 H31 V43 H17 V31 H24 V24 Z', None,
    path('M19 8 H23 V19 H8 V20 H19 Z', '#c8f5b0', False))

def cyc_arrow(a0, a1, color):
    cx, cy, r = 24, 24, 15
    pt = lambda a: (cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
    p0, p1 = pt(a0), pt(a1)
    arc = f'M{f(p0[0])} {f(p0[1])} A{r} {r} 0 0 1 {f(p1[0])} {f(p1[1])}'
    t = math.radians(a1)
    tx, ty = -math.sin(t), math.cos(t); nx, ny = math.cos(t), math.sin(t)
    E = p1
    head = [(E[0] + tx * 10, E[1] + ty * 10), (E[0] + nx * 9, E[1] + ny * 9), (E[0] - nx * 9, E[1] - ny * 9)]
    return (f'<path d="{arc}" fill="none" stroke="{O}" stroke-width="11" stroke-linecap="round"/>'
            + path(P(head), color)
            + f'<path d="{arc}" fill="none" stroke="{color}" stroke-width="5" stroke-linecap="round"/>')
icons['intent-shift'] = cyc_arrow(190, 305, '#8fd6ff') + cyc_arrow(10, 125, '#c9a8ff')

# ---------------- buildings ----------------
STRAW, STRAWS = '#e8c25a', '#b88f3a'
icons['building-nest'] = (ell(17, 25, 7, 8.5, '#bfe0f0') + ell(31, 25, 7, 8.5, '#f2dca6')
    + fillshape('M3 26 Q3 24 6 25 C14 29 34 29 42 25 Q45 24 45 26 C45 38 36 44 24 44 C12 44 3 38 3 26 Z', STRAW,
        'M45 30 C43 39 35 44 24 44 C13 44 5 39 3 30 C10 39 38 39 45 30 Z', STRAWS,
        line('M8 31 C16 36 30 36 40 30 M10 38 C18 41 30 41 38 37 M14 29 L22 39 M32 30 L26 40', 2)))

BAS = '#c98a4a'
icons['building-pantry'] = (tube('M10 22 C10 6 38 6 38 22', BAS, 4)
    + ball(17, 19, 6.5, '#e8403c') + ball(30, 18, 6, '#ffc93c')
    + fillshape('M5 25 Q4 21 8 21 H40 Q44 21 43 25 L39 41 Q38 44 35 44 H13 Q10 44 9 41 Z', BAS,
        'M42 31 L39 41 Q38 44 35 44 H13 Q10 44 9 41 L7 33 C18 37 32 36 42 31 Z', None,
        line('M7 29 H41 M9 36 H39 M16 22 L18 43 M24 22 V44 M32 22 L30 43', 2)))

icons['building-hatchery'] = (path('M12 46 C6 44 6 38 10 34 C11 38 13 39 15 38 C14 34 16 31 18 29 C18 33 21 35 24 35 C27 35 30 33 30 29 C32 31 34 34 33 38 C35 39 37 38 38 34 C42 38 42 44 36 46 Z', FL)
    + path('M15 45 C13 42 16 39 18 37 C19 40 22 42 24 42 C26 42 29 40 30 37 C32 39 35 42 33 45 Z', '#ffd35a', False)
    + fillshape('M24 3 C33 3 39 15 39 23 C39 32 33 37 24 37 C15 37 9 32 9 23 C9 15 15 3 24 3 Z', '#9fd8c8',
        'M39 24 C38 32 32 37 24 37 C18 37 12 34 10 28 C16 32 24 33 30 31 C35 29 38 27 39 24 Z', None,
        ell(19, 14, 3, 2.5, '#5fa898', False) + ell(28, 22, 2, 1.8, '#5fa898', False)
        + path('M29 7 C32 9 35 13 36 17 C33 14 31 11 28 9 Z', '#ffffff', False, extra=' opacity="0.7"')))

SACK = '#d9b27a'
icons['building-training'] = (tube('M24 30 V45', '#9a5f3a', 6) + tube('M10 45 H38', '#9a5f3a', 4)
    + tube('M6 22 H42', '#9a5f3a', 4.5)
    + fillshape('M14 18 Q14 14 18 14 H30 Q34 14 34 18 V34 Q34 38 30 38 H18 Q14 38 14 34 Z', SACK,
        'M34 28 V34 Q34 38 30 38 H18 Q14 38 14 34 V28 Z', None, line('M14 26 H34', 2) + line('M20 19 L27 24 M27 19 L20 24', 3, '#e0342c'))
    + ball(24, 9, 6.5, SACK, hl=False))

PAPER = '#f2e2b8'
icons['building-expeditions'] = (fillshape('M8 8 H38 V40 H8 Z', PAPER, 'M8 34 H38 V40 H8 Z', None,
        line('M13 32 C16 26 22 30 24 24 C26 18 30 20 31 16', 3, '#e0573c')
        + line('M28 11 L34 17 M34 11 L28 17', 3, '#e0342c') + circ(13, 32, 2.5, '#5fbf5a', True, 2))
    + fillshape('M4 10 Q4 4 8 4 Q12 4 12 10 V40 Q12 44 8 44 Q4 44 4 40 Z', '#d9c08e', 'M8 4 Q12 4 12 10 V40 Q12 44 8 44 Z', None)
    + fillshape('M36 10 Q36 4 40 4 Q44 4 44 10 V40 Q44 44 40 44 Q36 44 36 40 Z', '#d9c08e', 'M40 4 Q44 4 44 10 V40 Q44 44 40 44 Z', None))

for name, body in icons.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96">\n{body}\n</svg>\n'
    open(os.path.join(OUT, name + '.svg'), 'w').write(svg)
print(len(icons))
