from lib import *
HIDE, BELLY, MEMB, SUN, SUNC, GLOW = '#3b2d55', '#7a5c9e', '#5a3f80', '#ffb43a', '#fff3b0', '#c9a8ff'
R = 'eclipse-dragon'
back = mix(HIDE, O, .25)

legs = (shape('M86 146 C78 126 104 116 118 128 C128 138 124 160 112 176 L106 210 L118 214 C128 218 126 226 116 226 L84 226 C76 226 78 216 88 214 L90 180 C86 168 84 156 86 146 Z', back, (110, 120))
        + shape('M120 150 C112 128 144 116 158 132 C168 144 162 166 150 180 L146 210 L160 214 C170 218 168 226 158 226 L124 226 C116 226 118 216 128 214 L130 184 C124 172 120 160 120 150 Z', HIDE, (150, 124))
        + solid('M84 226 L80 218 L90 222 Z M116 226 L122 218 L124 226 Z M124 226 L120 218 L130 222 Z M158 226 L166 218 L166 226 Z', BONE, 2.5))


def wing(c, vein):
    d = 'M150 92 C130 60 104 30 64 6 C66 0 72 -4 80 -4 C70 -14 66 -24 70 -34 C96 -26 120 -10 132 6 C132 -10 140 -24 150 -32 C164 -16 170 4 168 24 C178 14 192 10 206 12 C200 36 188 62 174 84 Z'
    s = fill(d, mix(c)) + f'<path d="{d}" fill="{c}" transform="translate(150 -30) scale(0.92) translate(-150 30)"/>\n'
    s += line('M152 88 L80 -2 M156 84 L144 -26 M162 80 L198 18', vein, 3)
    s += f'<path d="{d}" fill="none" stroke="{O}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>\n'
    s += line('M152 88 L72 -32', O, 7) + line('M152 88 L72 -32', c, 3)
    s += solid('M72 -32 L62 -40 L76 -38 Z M150 -32 L150 -40 L156 -32 Z', BONE, 2.5)
    return s


wing_back = '<g transform="translate(-26 8) rotate(-12 150 90)">\n' + wing(mix(MEMB, O, .3), mix(MEMB, O, .5)) + '</g>\n'
wing_front = '<g transform="translate(6 4)">\n' + wing(MEMB, HIDE) + '</g>\n'

tail = (shape('M92 160 C64 168 40 182 24 202 C18 210 12 214 4 212 C10 200 18 196 22 190 C36 172 58 156 86 146 Z', HIDE, (70, 152), 0.86)
        + solid('M4 212 C0 196 6 182 18 176 C14 186 16 194 22 198 C16 204 10 208 4 212 Z', SUN, 3)
        + solid('M58 162 L52 150 L64 156 Z M76 152 L72 140 L82 148 Z', BONE, 2.5))

bodyd = 'M80 158 C72 120 100 88 138 80 C156 76 170 66 178 50 L204 62 C202 92 196 122 180 148 C164 172 128 186 104 182 C90 180 82 172 80 158 Z'
body = (solid('M110 86 L108 70 L120 80 Z M132 80 L134 64 L142 76 Z M154 72 L160 56 L164 70 Z M172 60 L180 44 L182 58 Z', SUN, 3)
        + shape(bodyd, HIDE, (160, 72), 0.88, extra=(
            shape('M196 76 C200 104 192 132 176 152 C162 168 140 178 122 178 C150 160 176 130 186 96 Z', BELLY, (198, 84), 0.9, 3,
                  extra=line('M190 100 L180 102 M186 118 L174 118 M178 136 L166 134 M166 152 L154 150', mix(BELLY), 3))
            + line('M96 140 C104 132 116 130 126 132', back, 3))))

import math


def flames(cx=186, cy=20):
    d = ''
    for i in range(14):
        a = i * 2 * math.pi / 14
        r = 58 if i % 2 == 0 else 52
        p = lambda rr, da: (cx + rr * math.sin(a + da), cy - rr * math.cos(a + da))
        pts = [p(38, -0.2), p(r, 0.06), p(38, 0.2)]
        d += 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts) + ' Z '
    return f'<path d="{d.strip()}" fill="{SUN}" stroke="{O}" stroke-width="2.5" stroke-linejoin="round"/>\n'


head = (
    # burning eclipse ring behind the head
    flames()
    + f'<circle cx="186" cy="20" r="38" fill="{O}" stroke="{SUN}" stroke-width="9"/>\n'
    + f'<circle cx="186" cy="20" r="38" fill="none" stroke="{SUNC}" stroke-width="3"/>\n'
    + f'<circle cx="186" cy="20" r="43.5" fill="none" stroke="{O}" stroke-width="2.5"/>\n'
    # horns swept back
    + solid('M196 34 C178 22 160 18 136 20 C156 10 178 10 200 24 Z', BONE, 3.5)
    + solid('M204 28 C196 10 184 -2 166 -10 C188 -8 204 4 212 24 Z', BONE, 3.5)
    + '<g transform="translate(184 50) scale(1.1) translate(-190 -50)">\n'
    + fill('M200 60 L250 56 L244 80 L206 82 Z', GLOW) + fill('M210 64 L240 62 L236 74 L214 76 Z', '#efe6ff')
    + '<g transform="rotate(10 196 62)">' + shape('M198 64 C210 70 236 70 252 60 C254 70 242 82 226 82 C210 82 198 76 198 64 Z', HIDE, (230, 62), 0.86, 3.5)
    + solid('M216 66 L219 74 L222 66 Z M234 64 L237 72 L240 64 Z', BONE, 2) + '</g>\n'
    + shape('M184 56 C180 36 194 24 214 24 C230 24 244 32 256 42 C262 48 258 56 250 58 L222 62 C208 68 188 70 184 56 Z', HIDE, (222, 26), 0.86,
            extra=fill('M222 62 L250 58 C244 54 232 52 222 54 Z', back))
    + solid('M226 58 L229 66 L232 58 Z M242 56 L245 63 L248 56 Z', BONE, 2)
    + '<path d="M204 42 C210 34 224 34 230 42 C224 50 210 50 204 42 Z" fill="#f5e27a" stroke="#1d1a2b" stroke-width="2.5" stroke-linejoin="round"/>\n'
    + '<ellipse cx="218" cy="42" rx="2.4" ry="6" fill="#1d1a2b"/><circle cx="222" cy="40" r="1.5" fill="#ffffff"/>\n'
    + solid('M198 36 C210 26 228 28 238 36 L234 42 C224 36 212 34 202 42 Z', '#241a36', 3)
    + f'<ellipse cx="252" cy="46" rx="2.4" ry="1.6" fill="{O}"/>\n</g>\n')

write(R, {'legs': legs, 'wing-back': wing_back, 'tail': tail, 'body': body, 'wing-front': wing_front, 'head': head})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.eclipse-dragon', {
    'size': [260, 270], 'boxScale': 1.1,
    'points': {'hit': pv(140, 130), 'front': pv(206, 100)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(130, 200), 'anim': 'breathe', 'parts': [
            {'id': 'wing-back', 'file': f('wing-back'), 'pivot': pv(130, 92), 'anim': 'flap-back-big'},
            {'id': 'tail', 'file': f('tail'), 'pivot': pv(88, 156), 'anim': 'swish'},
            {'id': 'body', 'file': f('body')},
            {'id': 'wing-front', 'file': f('wing-front'), 'pivot': pv(156, 94), 'anim': 'flap-big'},
            {'id': 'head', 'file': f('head'), 'pivot': pv(192, 60)},
        ]},
    ]})
