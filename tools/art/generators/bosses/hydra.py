from lib import *
import math
SKIN, BELLY, ICE, ICED, BROW = '#7fc8f0', '#e6f6ff', '#ffffff', '#bfe6fa', '#24406a'
R = 'glacier-hydra'


def crystal(x, y, h, ang=0, w=None):
    w = w or h * 0.45
    d = f'M{-w/2:.1f} 0 L{-w/3:.1f} {-h*0.7:.1f} L0 {-h:.1f} L{w/3:.1f} {-h*0.7:.1f} L{w/2:.1f} 0 Z'
    return (f'<g transform="translate({x} {y}) rotate({ang})">'
            + f'<path d="{d}" fill="{ICED}" stroke="{O}" stroke-width="3" stroke-linejoin="round"/>'
            + f'<path d="M1 {-h*0.82:.0f} L{w/4:.1f} {-h*0.62:.0f} L{w/3:.1f} -2 L1 -2 Z" fill="{ICE}"/></g>\n')


def neck(d, w, base, skin, deep):
    """A neck as a thick stroke: outline, shade, lit core, then a patch hiding the base seam."""
    sh = mix(skin)
    s = line(d, O, w + 8) + line(d, sh, w)
    s += f'<g transform="translate(2 -3)">' + line(d, skin, w - 10) + '</g>\n'
    bx, by = deep
    s += f'<circle cx="{bx}" cy="{by}" r="{w/2 + 2}" fill="{skin}"/>\n'
    return s


def head(x, y, rot, skin, mood, sc=1.0):
    sh = mix(skin)
    g = f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})">\n'
    g += crystal(-20, -12, 18, -50) + crystal(-8, -18, 14, -25)
    skull = 'M-26 4 C-28 -14 -12 -26 8 -24 C24 -22 36 -16 44 -6 C50 2 46 12 36 14 L4 16 C-10 18 -24 16 -26 4 Z'
    if mood == 'snarl':
        g += fill('M4 10 L40 8 L36 26 L8 26 Z', '#2a4a7a')
        g += solid('M2 14 C14 18 30 18 40 14 C42 24 34 32 20 32 C8 32 0 26 2 14 Z', skin, 3.5)
        g += solid('M12 18 L15 24 L18 18 Z M26 18 L29 24 L32 18 Z', BONE, 2)
    g += shape(skull, skin, (10, -22), 0.86, shade=sh)
    g += fill('M-18 10 C-6 14 20 14 38 10 C30 14 10 16 -12 14 Z', sh)
    if mood != 'snarl':
        g += line('M8 10 C18 12 30 12 40 8', O, 3)
        g += solid('M16 11 L19 17 L22 11 Z M30 10 L33 16 L36 10 Z', BONE, 2)
    g += f'<ellipse cx="40" cy="-2" rx="2.6" ry="1.8" fill="{O}"/>\n'
    if mood == 'squint':
        g += eye(10, -6, 6.5, '#f5e27a', 'M-4 -12 C4 -20 18 -18 24 -10 L22 -4 C14 -10 4 -10 -2 -6 Z', BROW)
    else:
        g += eye(10, -7, 7.5, '#f5e27a', 'M-4 -14 C4 -24 20 -22 26 -12 L22 -6 C14 -12 4 -12 -2 -8 Z', BROW)
    return g + '</g>\n'


def part_head(neckd, w, deep, hx, hy, hr, skin, mood, crystals, sc=1.0):
    s = ''.join(crystal(*c) for c in crystals)
    return s + neck(neckd, w, None, skin, deep) + head(hx, hy, hr, skin, mood, sc)


back = mix(SKIN, O, .18)
legs = (shape('M60 186 L92 186 L94 214 C106 216 108 226 96 226 L56 226 C46 226 50 214 58 214 Z', mix(SKIN, O, .3), (80, 190))
        + shape('M130 188 L162 188 L164 214 C176 216 178 226 166 226 L126 226 C116 226 120 214 128 214 Z', mix(SKIN, O, .3), (150, 192))
        + shape('M82 192 L116 192 L118 214 C130 216 132 226 120 226 L80 226 C70 226 74 214 82 214 Z', SKIN, (104, 196))
        + shape('M150 192 L184 192 L186 214 C198 216 200 226 188 226 L148 226 C138 226 142 214 150 214 Z', SKIN, (172, 196))
        + solid('M80 226 L84 218 L90 226 Z M148 226 L152 218 L158 226 Z M186 226 L190 218 L196 226 Z', BONE, 2.5))

bodyd = 'M40 190 C26 158 52 122 98 118 C134 116 164 124 184 142 C204 160 200 190 182 202 C160 214 80 214 56 206 C46 202 42 198 40 190 Z'
body = (crystal(16, 196, 20, -70) + crystal(30, 188, 16, -40)
        + shape('M54 176 C34 182 18 192 4 206 C22 206 40 202 58 196 Z', SKIN, (40, 180), 0.84)
        + crystal(66, 126, 22, -30) + crystal(88, 118, 28, -10) + crystal(112, 116, 20, 10)
        + shape(bodyd, SKIN, (140, 120), 0.88, extra=(
            shape('M184 150 C198 172 190 196 168 204 C144 210 112 210 96 204 C130 200 164 186 176 160 Z', BELLY, (186, 156), 0.9, 3)
            + line('M176 172 L166 176 M168 188 L156 190 M150 198 L140 198', ICED, 3)
            + line('M60 150 C70 144 80 146 86 152 M74 172 C84 166 94 168 100 174', mix(SKIN), 3))))

h2 = part_head('M134 140 C126 110 116 60 120 16', 28, (136, 138), 128, 4, -8, back, 'squint', [(112, 70, 16, -70), (114, 40, 14, -75)])
h3 = part_head('M164 168 C184 166 198 152 206 132', 28, (160, 170), 212, 120, 6, SKIN, 'snarl', [(210, 142, 14, 40)])
h1 = part_head('M160 150 C176 120 180 84 196 54', 30, (158, 152), 204, 42, -4, SKIN, 'angry', [(168, 108, 18, -55), (176, 80, 15, -50)], 1.1)

write(R, {'legs': legs, 'head-2': h2, 'body': body, 'head-3': h3, 'head': h1})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.glacier-hydra', {
    'size': [260, 270], 'boxScale': 1.1,
    'points': {'hit': pv(120, 160), 'front': pv(200, 130)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(120, 210), 'anim': 'breathe', 'parts': [
            {'id': 'head-2', 'file': f('head-2'), 'pivot': pv(134, 140)},
            {'id': 'body', 'file': f('body')},
            {'id': 'head-3', 'file': f('head-3'), 'pivot': pv(162, 168)},
            {'id': 'head', 'file': f('head'), 'pivot': pv(160, 150)},
        ]},
    ]})
