from kit import *

PLANS = {}  # name -> dict(files={id: svg}, rig=manifest)


def plan(name):
    def deco(fn):
        PLANS[name] = fn
        return fn
    return deco


def hoof_leg(x, top, bot=226, w=13, fill=P, hoof=A, shade=None):
    d = f'M{x-w} {top} C{x-w-1} {top+30} {x-w+3} {bot-26} {x-w+4} {bot-16} L{x+w-4} {bot-16} C{x+w-3} {bot-26} {x+w+1} {top+30} {x+w} {top} Z'
    h = f'M{x-w+2} {bot-18} L{x+w-2} {bot-18} C{x+w+2} {bot-12} {x+w+2} {bot-4} {x+w} {bot} L{x-w} {bot} C{x-w-2} {bot-4} {x-w-2} {bot-12} {x-w+2} {bot-18} Z'
    return shape(d, fill, shade) + '\n' + shape(h, hoof, None if fill != PS else AS)


@plan('beast')
def beast():
    f = {}
    f['legs'] = svg(
        hoof_leg(112, 150, fill=PS, hoof=AS, shade=False),
        hoof_leg(148, 150, fill=PS, hoof=AS, shade=False),
        hoof_leg(86, 150),
    )
    f['tail'] = svg(
        shape('M86 128 C70 122 58 112 50 98 C46 90 50 82 58 86 C66 98 78 108 90 112 Z', P),
        shape('M58 86 C50 80 40 82 38 90 C36 98 44 104 50 98 C46 92 50 86 58 86 Z', A),
    )
    body = 'M62 138 C56 110 84 96 114 98 C138 100 158 92 176 98 C198 106 202 140 190 162 C178 182 132 188 100 183 C76 180 64 162 62 138 Z'
    f['body'] = svg(
        shape(body, P, v=(6, -10)),
        shape('M192 132 C194 156 182 174 156 180 C140 183 124 183 112 181 C136 176 160 166 174 150 C182 142 188 136 192 132 Z', S, sw=3),
        flat('M92 104 L100 88 L108 102 L118 86 L126 101 L138 86 L144 100 L156 86 L160 100 L172 90 C170 102 160 108 146 108 C126 110 106 110 92 104 Z', A, 3),
        line('M80 150 C76 138 80 126 90 120', PS, 3),
    )
    head = 'M168 122 C162 104 166 82 184 72 C200 64 222 68 232 84 C246 88 254 104 248 116 C242 128 226 130 214 128 C200 134 180 134 168 122 Z'
    f['head'] = svg(
        shape(head, P, v=(5, -8)),
        shape('M212 112 C226 116 240 114 249 110 C250 122 240 130 226 130 C218 130 212 126 208 120 Z', S, sw=3),
        flat('M240 96 C246 94 252 98 251 104 C250 108 244 108 240 105 C237 102 237 98 240 96 Z', O, 0),
        line('M236 122 C230 124 222 124 216 121', O, 2.5),
        eye(206, 92, 8.5, look=1.8),
    )
    f['leg-front'] = svg(
        shape('M158 138 C172 126 194 134 192 156 C190 174 186 192 184 210 L162 210 C160 194 156 178 152 162 C148 150 150 142 158 138 Z', P),
        shape('M160 208 L186 208 C190 214 190 222 188 226 L158 226 C156 222 156 214 160 208 Z', A),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(130, 140), 'front': pv(200, 130)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'torso', 'pivot': pv(130, 200), 'anim': 'breathe', 'parts': [
                {'id': 'tail', 'file': 'tail', 'pivot': pv(80, 122), 'anim': 'swish'},
                {'id': 'body', 'file': 'body'},
                {'id': 'head', 'file': 'head', 'pivot': pv(182, 116)},
            ]},
            {'id': 'leg-front', 'file': 'leg-front', 'pivot': pv(172, 146)},
        ]}
    return f, rig


def claw_toes(xs, y=226, c=BONE):
    return '\n'.join(flat(f'M{x} {y-7} L{x+9} {y-3} L{x} {y+1} Z', c, 2) for x in xs)


def lizard_leg(x, top=176, fill=P, sh=None):
    d = (f'M{x-12} {top} C{x-15} {top+18} {x-12} {top+30} {x-8} {top+36} L{x-12} 226 L{x+20} 226 '
         f'C{x+20} 220 {x+14} 216 {x+8} 214 C{x+12} {top+22} {x+16} {top+10} {x+14} {top} Z')
    return shape(d, fill, sh) + '\n' + claw_toes([x + 18, x + 8] if fill != PS else [])


@plan('lizard')
def lizard():
    f = {}
    f['legs'] = svg(lizard_leg(112, fill=PS, sh=False), lizard_leg(158, fill=PS, sh=False), lizard_leg(92))
    f['tail'] = svg(
        shape('M96 154 C70 150 46 162 26 158 C12 155 6 142 12 132 C18 140 28 144 40 142 C60 138 78 134 98 138 Z', P, v=(4, -8)),
        flat('M38 143 L44 132 L50 141 Z M58 139 L64 128 L70 137 Z', A, 2.5),
    )
    body = 'M70 172 C64 146 94 132 130 132 C162 132 186 138 198 154 C208 170 198 192 174 198 C146 204 104 204 86 198 C76 192 70 184 70 172 Z'
    f['body'] = svg(
        shape(body, P, v=(5, -9)),
        shape('M196 168 C196 186 182 196 160 200 C134 204 108 203 94 199 C120 196 160 192 180 180 C188 176 192 172 196 168 Z', S, sw=3),
        flat('M92 140 L100 124 L108 138 Z M114 136 L123 119 L130 134 Z M138 134 L147 118 L153 134 Z M160 137 L170 122 L174 139 Z', A, 3),
        line('M84 178 C80 168 84 158 92 154', PS, 3),
    )
    head = 'M180 166 C174 144 186 124 208 122 C228 120 244 130 252 144 C256 154 250 162 240 162 L208 168 C196 170 182 172 180 166 Z'
    f['head'] = svg(
        shape(head, P, v=(4, -7)),
        shape('M206 156 L248 154 C252 160 246 164 238 164 L208 168 C200 168 200 158 206 156 Z', S, sw=3),
        line('M212 156 C226 156 238 155 248 153', O, 2.5),
        flat('M242 138 C245 137 248 139 247 142 C246 144 243 144 241 142 Z', O, 0),
        eye(212, 134, 8, look=1.8, tilt=12),
    )
    f['leg-front'] = svg(lizard_leg(184, top=170))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(134, 168), 'front': pv(206, 160)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'torso', 'pivot': pv(130, 210), 'anim': 'breathe', 'parts': [
                {'id': 'tail', 'file': 'tail', 'pivot': pv(92, 148), 'anim': 'swish'},
                {'id': 'body', 'file': 'body'},
                {'id': 'head', 'file': 'head', 'pivot': pv(190, 156)},
            ]},
            {'id': 'leg-front', 'file': 'leg-front', 'pivot': pv(184, 176)},
        ]}
    return f, rig


@plan('biped')
def biped():
    f = {}
    def bleg(x, fill, sh=None):
        d = f'M{x-13} 180 L{x-12} 212 L{x+13} 212 L{x+13} 180 Z'
        foot = f'M{x-15} 208 L{x+12} 208 C{x+24} 208 {x+28} 216 {x+28} 222 C{x+28} 226 {x+24} 227 {x+20} 227 L{x-14} 227 C{x-18} 227 {x-19} 220 {x-15} 208 Z'
        return shape(d, fill, sh) + '\n' + shape(foot, A if fill == P else AS, None if fill == P else False)
    f['legs'] = svg(bleg(140, PS, False), bleg(112, P))
    body = 'M86 178 C80 142 100 118 128 116 C158 114 176 138 172 174 C170 198 150 206 128 206 C104 206 88 196 86 178 Z'
    f['body'] = svg(
        shape('M92 132 C80 140 76 160 78 180 C80 190 92 192 96 182 C96 168 98 152 106 140 Z', PS, False),
        ell(86, 186, 11, 11, PS, False, sw=4),
        shape(body, P, v=(6, -9)),
        shape('M126 140 C150 138 164 156 162 176 C160 192 146 198 130 198 C114 198 104 188 106 170 C108 152 114 142 126 140 Z', S, sw=3),
    )
    head = 'M98 94 C96 64 118 46 144 46 C172 46 190 66 188 92 C192 96 194 104 188 110 C180 126 160 134 140 132 C116 132 100 118 98 94 Z'
    f['head'] = svg(
        shape(head, P, v=(6, -9)),
        ell(184, 102, 9, 8, P, sw=3),
        eye(152, 86, 8.5, look=2, tilt=16),
        eye(174, 86, 7, look=2, tilt=-4),
        line('M156 112 C162 116 170 116 176 112', O, 3),
        flat('M162 114 L165 120 L168 115 Z', W, 1.5),
    )
    f['arm'] = svg(
        shape('M128 134 C140 128 150 134 154 146 C158 158 164 168 168 176 L152 184 C146 174 138 162 132 152 C126 144 124 138 128 134 Z', P, v=(4, -6)),
        ell(162, 186, 13, 12, S, sw=4),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(130, 156), 'front': pv(178, 140)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'body', 'file': 'body', 'pivot': pv(130, 210), 'anim': 'breathe', 'parts': [
                {'id': 'head', 'file': 'head', 'pivot': pv(136, 124)},
                {'id': 'arm', 'file': 'arm', 'pivot': pv(138, 140)},
            ]},
        ]}
    return f, rig


@plan('blob')
def blob():
    f = {}
    dome = 'M40 222 C30 168 70 104 132 104 C192 104 232 160 224 222 C200 230 66 230 40 222 Z'
    f['body'] = svg(
        shape(dome, P, v=(8, -12)),
        shape('M222 196 C220 214 214 222 196 225 C168 228 140 227 118 224 C148 216 190 210 222 196 Z', S, sw=3),
        flat('M146 178 C172 186 204 186 224 176 C226 186 224 192 222 196 C198 204 168 204 148 196 Z', '#7a2233', 3),
        ell(72, 150, 9, 7, A, sw=3), ell(96, 128, 6, 5, A, sw=3), ell(64, 182, 6, 5, A, sw=3),
    )
    f['jaw'] = svg(
        shape('M144 180 C172 190 204 188 224 178 C226 188 224 196 222 200 C200 208 170 208 148 200 C142 194 140 186 144 180 Z', P, v=(3, -5)),
        flat('M176 186 L180 194 L184 187 Z M198 185 L202 193 L206 185 Z', W, 1.5),
    )
    f['head'] = svg(
        ell(160, 126, 20, 19, P, v=(5, -7)),
        ell(196, 138, 16, 15, P, v=(4, -6)),
        eye(160, 126, 11, look=2.5, tilt=16),
        eye(196, 139, 9, look=2, tilt=6),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(130, 170), 'front': pv(222, 170)},
        'parts': [
            {'id': 'body', 'file': 'body', 'pivot': pv(130, 226), 'anim': 'breathe', 'parts': [
                {'id': 'jaw', 'file': 'jaw', 'pivot': pv(146, 184)},
                {'id': 'head', 'file': 'head', 'pivot': pv(176, 150)},
            ]},
        ]}
    return f, rig


BAT_WING = 'M124 98 C104 70 76 40 40 20 C34 34 34 48 40 58 C30 58 22 64 18 74 C30 76 40 82 46 92 C38 98 34 106 34 116 C52 110 70 112 86 120 C96 114 110 108 124 104 Z'


@plan('bat')
def bat():
    f = {}
    def wing(fill, mem):
        return '\n'.join([
            shape(BAT_WING, mem, v=(5, 7)),
            line('M122 100 L42 22 M100 96 L22 72 M96 106 L38 112', fill, 3.5),
        ])
    f['wing-back'] = svg(f'<g transform="translate(14 -14) rotate(14 124 100)">', wing(PS, SS), '</g>')
    f['body'] = svg(
        shape('M110 70 L104 32 L132 62 Z', P, v=(3, -4)),
        shape('M150 66 L170 30 L174 70 Z', P, v=(3, -4)),
        flat('M114 62 L110 44 L126 60 Z M156 62 L167 42 L168 64 Z', S, 0),
        ell(140, 104, 42, 40, P, v=(7, -10)),
        shape('M148 112 C166 112 176 124 172 138 C166 146 150 146 142 138 C134 128 136 114 148 112 Z', S, sw=3),
        flat('M124 146 L120 158 L128 154 L132 162 L136 148 Z M150 148 L150 160 L156 154 L162 160 L160 146 Z', A, 2.5),
        eye(156, 90, 8.5, look=2, tilt=18),
        eye(176, 92, 7, look=2, tilt=0),
        ell(186, 104, 5, 4, P, False, sw=2.5),
        line('M160 116 C166 120 174 120 178 116', O, 3),
        flat('M163 118 L165 125 L168 119 Z M172 118 L174 125 L176 118 Z', W, 1.5),
    )
    f['wing-front'] = svg(wing(P, S))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(140, 106), 'front': pv(184, 106)},
        'parts': [
            {'id': 'all', 'pivot': pv(130, 160), 'anim': 'bob', 'parts': [
                {'id': 'wing-back', 'file': 'wing-back', 'pivot': pv(132, 86), 'anim': 'flap-back-big'},
                {'id': 'body', 'file': 'body'},
                {'id': 'wing-front', 'file': 'wing-front', 'pivot': pv(122, 100), 'anim': 'flap-big'},
            ]},
        ]}
    return f, rig


BIRD_WING = 'M124 100 C102 84 80 60 66 26 C76 30 84 30 90 28 C88 18 88 8 92 0 C100 10 106 14 112 16 C114 6 118 -2 124 -8 C128 6 134 14 142 20 C150 34 154 62 150 92 Z'


@plan('bird')
def bird():
    f = {}
    def wing(fill, line_c):
        return shape(BIRD_WING, fill, v=(5, 6)) + '\n' + line('M130 84 L92 30 M140 80 L114 22 M146 78 L134 16', line_c, 3)
    f['wing-back'] = svg('<g transform="translate(-22 4) rotate(-14 136 92)">', wing(PS, AS if False else '#2f2a40'), '</g>')
    body = 'M78 130 C70 104 92 80 122 78 C150 76 176 88 180 112 C184 140 160 158 128 160 C104 162 84 150 78 130 Z'
    f['body'] = svg(
        shape('M86 124 C64 128 40 136 22 150 C34 152 44 150 52 146 C44 156 40 164 38 172 C54 166 68 156 80 146 C82 156 82 164 80 172 C94 162 102 150 104 138 Z', P, v=(4, -6)),
        shape('M110 154 L104 172 M110 172 L104 172 L98 176 M134 156 L134 174 M134 174 L126 178 M134 174 L140 180', A, False, sw=0) if False else '',
        line('M112 152 L108 170 L98 174 M108 170 L112 178 M134 154 L134 172 L124 176 M134 172 L140 178', O, 8),
        line('M112 152 L108 170 L98 174 M108 170 L112 178 M134 154 L134 172 L124 176 M134 172 L140 178', A, 4),
        shape(body, P, v=(6, -9)),
        shape('M176 106 C186 130 170 152 142 158 C130 160 118 160 108 156 C140 150 162 136 168 116 C170 110 172 106 176 106 Z', S, sw=3),
    )
    f['head'] = svg(
        shape('M196 64 C214 60 232 66 236 78 C236 84 230 88 224 88 C222 84 218 82 212 82 L196 84 Z', A, v=(3, -4)),
        line('M198 76 L226 78 C230 80 228 86 224 88', AS, 2.5),
        ell(178, 72, 28, 27, P, v=(5, -8)),
        eye(188, 66, 8.5, look=2, tilt=16),
    )
    f['wing-front'] = svg(wing(P, PS))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(128, 120), 'front': pv(196, 96)},
        'parts': [
            {'id': 'all', 'pivot': pv(130, 170), 'anim': 'bob', 'parts': [
                {'id': 'wing-back', 'file': 'wing-back', 'pivot': pv(132, 94), 'anim': 'flap-back-big'},
                {'id': 'body', 'file': 'body'},
                {'id': 'head', 'file': 'head', 'pivot': pv(166, 92)},
                {'id': 'wing-front', 'file': 'wing-front', 'pivot': pv(132, 96), 'anim': 'flap-big'},
            ]},
        ]}
    return f, rig


@plan('sprite')
def sprite():
    f = {}
    f['tail'] = svg(shape('M110 120 C96 146 70 160 46 162 C60 176 80 182 98 176 C86 192 70 200 54 204 C80 212 108 204 126 186 C140 170 144 150 140 132 Z', S, v=(5, -7)))
    f['body'] = svg(
        ell(140, 100, 42, 40, P, v=(7, -10)),
        shape('M150 76 C162 72 172 78 174 88 C166 84 158 82 150 84 Z', W, False, sw=0).replace('fill="#ffffff"', 'fill="#ffffff" opacity="0.55"'),
        eye(146, 98, 10, look=2.5, tilt=16),
        eye(170, 100, 8, look=2.2, tilt=0),
        line('M150 122 C158 126 166 126 172 122', O, 3),
    )
    f['wing-front'] = svg(shape('M184 132 C192 124 206 126 208 138 C210 148 200 156 190 152 C184 150 180 144 178 150 C174 146 176 136 184 132 Z', S, v=(3, -5)))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(140, 104), 'front': pv(182, 104)},
        'parts': [
            {'id': 'all', 'pivot': pv(130, 150), 'anim': 'bob', 'parts': [
                {'id': 'tail', 'file': 'tail', 'pivot': pv(132, 132), 'anim': 'swish'},
                {'id': 'body', 'file': 'body'},
                {'id': 'wing-front', 'file': 'wing-front', 'pivot': pv(172, 132), 'anim': 'flap'},
            ]},
        ]}
    return f, rig


def crab_leg(x0, y0, dx, fill):
    kx, ky = x0 + dx * 1.0, y0 - 16
    tx = x0 + dx * 1.55
    d = f'M{x0} {y0} L{kx:.0f} {ky} L{tx:.0f} 224'
    return '\n'.join([line(d, O, 15), line(d, fill, 8)])


@plan('crab')
def crab():
    f = {}
    f['legs'] = svg(
        crab_leg(98, 178, -24, PS), crab_leg(116, 184, -14, PS),
        crab_leg(146, 184, 18, PS),
        shape('M168 156 C184 140 200 130 210 136 C214 146 198 156 182 166 Z', PS, False),
        crab_leg(84, 174, -30, P), crab_leg(102, 184, -22, P), crab_leg(160, 180, 24, P), crab_leg(140, 188, 12, P),
    )
    f['body'] = svg(
        ell(128, 160, 66, 40, P, v=(7, -10)),
        shape('M86 168 C104 186 152 190 178 170 C180 184 160 198 128 200 C100 200 82 188 86 168 Z', S, False, sw=3),
        line('M86 142 C100 134 112 132 122 134 M140 132 C150 130 162 132 172 140', PS, 3),
        line('M176 176 C182 180 188 180 192 176', O, 3),
        ell(98, 150, 7, 5, A, sw=2.5), ell(118, 140, 5, 4, A, sw=2.5), ell(160, 146, 6, 4.5, A, sw=2.5),
    )
    def stalk(x, y, h, r):
        return '\n'.join([
            line(f'M{x} {y} L{x+2} {y-h}', O, 9), line(f'M{x} {y} L{x+2} {y-h}', P, 4.5),
            eye(x + 2, y - h - r + 2, r, look=2, tilt=16),
        ])
    f['head'] = svg(stalk(144, 128, 18, 12), stalk(172, 132, 14, 10.5))
    f['arm'] = svg(
        shape('M164 172 C176 164 190 160 198 162 L202 176 C192 178 182 182 172 186 Z', P, v=(3, -5)),
        shape('M194 160 C204 140 226 132 242 138 C252 142 254 150 248 154 C238 150 226 152 220 160 C232 160 244 164 246 172 C236 180 214 182 202 176 Z', P, v=(4, -6)),
        line('M220 160 C214 162 210 166 208 170', PS, 3),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(128, 160), 'front': pv(196, 150)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'body', 'file': 'body', 'pivot': pv(128, 210), 'anim': 'breathe', 'parts': [
                {'id': 'head', 'file': 'head', 'pivot': pv(158, 130)},
                {'id': 'arm', 'file': 'arm', 'pivot': pv(170, 178)},
            ]},
        ]}
    return f, rig


def bug_leg(x, y, dx, fill, foot=226):
    kx = x + dx; ky = y - 12
    return '\n'.join([line(f'M{x} {y} L{kx} {ky} L{kx + dx*0.5:.0f} {foot}', O, 11), line(f'M{x} {y} L{kx} {ky} L{kx + dx*0.5:.0f} {foot}', fill, 5.5)])


@plan('bug')
def bug():
    f = {}
    f['legs'] = svg(bug_leg(100, 182, -24, AS), bug_leg(124, 186, -6, AS), bug_leg(150, 186, 16, AS), bug_leg(88, 186, -30, A), bug_leg(116, 192, -14, A))
    f['body'] = svg(
        shape('M168 168 C176 150 192 146 206 152 C216 160 214 180 202 188 C188 196 172 190 168 168 Z', A, v=(3, -6)),
        shape('M58 176 C54 140 86 116 124 116 C160 116 186 136 184 172 C182 196 150 206 120 206 C84 206 60 196 58 176 Z', P, v=(7, -10)),
        line('M124 118 C130 140 132 170 128 204', O, 3),
        shape('M70 166 C70 146 86 132 104 128 C94 140 88 154 88 170 Z', S, False, sw=0).replace('fill="#d6d6d6"', 'fill="#d6d6d6"'),
    )
    f['head'] = svg(
        shape('M206 172 C218 170 230 174 234 184 C228 184 224 186 222 190 C218 184 212 182 206 182 Z', BONE),
        shape('M200 188 C212 190 222 196 224 206 C218 204 212 204 210 208 C208 200 204 196 198 194 Z', BONE),
        ell(196, 172, 24, 22, A, v=(4, -7)),
        line('M186 152 C188 136 196 124 208 120 M200 154 C206 142 216 136 226 136', O, 3),
        eye(204, 166, 8, look=2, tilt=16),
    )
    f['leg-front'] = svg(bug_leg(164, 184, 18, A))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(124, 164), 'front': pv(206, 166)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'body', 'file': 'body', 'pivot': pv(124, 210), 'anim': 'breathe', 'parts': [
                {'id': 'head', 'file': 'head', 'pivot': pv(180, 176)},
            ]},
            {'id': 'leg-front', 'file': 'leg-front', 'pivot': pv(164, 184)},
        ]}
    return f, rig


@plan('plant')
def plant():
    f = {}
    def root(x, fill):
        return shape(f'M{x-10} 176 C{x-10} 196 {x-12} 210 {x-22} 220 C{x-26} 224 {x-22} 228 {x-16} 227 L{x+22} 227 C{x+28} 227 {x+28} 220 {x+22} 218 C{x+14} 212 {x+10} 196 {x+10} 176 Z', fill, False if fill != A else None)
    f['legs'] = svg(root(144, AS), root(110, A))
    shrub = ('M76 150 C60 140 62 116 80 110 C76 90 94 74 112 80 C118 62 144 58 156 72 C172 64 192 76 190 94 '
             'C206 100 208 124 194 134 C202 150 190 170 172 170 C164 186 140 190 128 180 C112 190 88 184 86 168 C72 168 66 156 76 150 Z')
    f['body'] = svg(
        shape('M96 140 C82 150 74 160 64 166 L56 160 M64 166 L58 176', A, False, sw=0) if False else '',
        line('M96 146 C84 154 74 162 62 166', O, 11), line('M96 146 C84 154 74 162 62 166', AS, 5.5),
        flat('M72 162 L66 150 L78 158 Z', BONE, 2),
        shape(shrub, P, v=(8, -11)),
        line('M96 110 C104 104 112 102 120 104 M130 86 C138 82 146 82 152 86 M172 98 C178 100 182 104 184 110', S, 3.5),
        line('M92 136 C96 142 102 144 108 142', PS, 3),
        eye(156, 120, 10, look=2.5, tilt=18),
        eye(180, 122, 8, look=2.2, tilt=0),
        line('M158 146 C164 142 172 142 178 146', O, 3),
    )
    f['arm'] = svg(
        line('M150 156 L182 170 L212 138', O, 13), line('M150 156 L182 170 L212 138', A, 7),
        flat('M180 166 L184 182 L190 168 Z', BONE, 2.5),
        flat('M196 152 L190 144 L202 146 Z M206 140 L212 126 L216 140 Z M212 138 L224 136 L214 146 Z', BONE, 2.5),
        flat('M164 160 L162 150 L170 158 Z', BONE, 2),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(132, 128), 'front': pv(194, 128)},
        'parts': [
            {'id': 'legs', 'file': 'legs'},
            {'id': 'body', 'file': 'body', 'pivot': pv(130, 210), 'anim': 'breathe', 'parts': [
                {'id': 'arm', 'file': 'arm', 'pivot': pv(152, 158)},
            ]},
        ]}
    return f, rig


@plan('cloud')
def cloud():
    f = {}
    c = ('M40 120 C24 112 26 86 46 82 C44 58 70 44 90 54 C98 30 134 22 152 40 C168 24 200 32 204 56 '
         'C226 56 240 78 230 98 C246 108 242 134 222 138 C214 156 186 160 172 148 C156 162 126 162 112 150 C96 160 66 158 58 144 C42 144 32 132 40 120 Z')
    f['body'] = svg(
        shape(c, P, v=(9, -12)),
        line('M70 70 C76 64 84 62 92 64 M134 42 C142 38 150 40 156 46', S, 4),
        eye(156, 94, 11, look=2.5, tilt=22),
        eye(186, 96, 9, look=2.2, tilt=-2),
        shape('M152 124 C164 116 182 116 194 124 C186 130 162 130 152 124 Z', '#2b2440', False, sw=3),
    )
    f['arm'] = svg(
        shape('M182 140 C196 128 218 134 220 150 C232 154 232 172 218 176 C206 186 184 180 182 166 C172 160 174 144 182 140 Z', P, v=(4, -7)),
        line('M204 156 C208 160 210 166 208 170', PS, 3),
    )
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(134, 100), 'front': pv(214, 104)},
        'parts': [
            {'id': 'all', 'pivot': pv(130, 160), 'anim': 'bob', 'parts': [
                {'id': 'body', 'file': 'body'},
                {'id': 'arm', 'file': 'arm', 'pivot': pv(186, 150)},
            ]},
        ]}
    return f, rig


MOTH_FORE = 'M128 102 C102 88 72 60 58 28 C52 12 62 2 78 4 C108 8 136 32 148 62 C154 78 150 94 140 104 Z'
MOTH_HIND = 'M124 110 C100 104 72 114 60 136 C52 154 64 170 86 166 C108 162 124 142 132 118 Z'


@plan('moth')
def moth():
    f = {}
    def wings(a, b):
        return '\n'.join([shape(MOTH_HIND, b, v=(4, -7)), shape(MOTH_FORE, a, v=(5, -7)),
                          ell(96, 40, 13, 12, A, sw=3), ell(98, 38, 5, 5, W, False, sw=0),
                          ell(86, 142, 9, 9, A, sw=3)])
    f['wing-back'] = svg('<g transform="translate(18 -10) rotate(16 128 104)">', wings(PS, SS), '</g>')
    f['body'] = svg(
        line('M174 74 C176 56 186 44 200 40 M186 80 C196 66 210 60 222 62', O, 3),
        flat('M196 32 C204 34 206 44 198 46 C192 44 190 36 196 32 Z M218 54 C226 54 228 64 220 66 C214 64 212 58 218 54 Z', S, 2.5),
        shape('M100 140 C88 120 104 100 128 98 C148 96 164 106 160 122 C156 140 128 156 100 140 Z', P, v=(5, -8)),
        line('M112 110 L116 140 M128 104 L132 136 M144 104 L146 128', PS, 3),
        ell(176, 96, 26, 25, P, v=(5, -8)),
        flat('M124 100 C134 92 148 92 156 98 C150 106 136 108 124 100 Z', S, 2.5),
        eye(184, 92, 9, look=2, tilt=16),
        line('M186 112 C192 114 196 112 200 108', O, 3),
    )
    f['wing-front'] = svg(wings(P, S))
    rig = {
        'size': [260, 270], 'tint': 'enemy',
        'points': {'hit': pv(140, 106), 'front': pv(196, 100)},
        'parts': [
            {'id': 'all', 'pivot': pv(130, 160), 'anim': 'bob', 'parts': [
                {'id': 'wing-back', 'file': 'wing-back', 'pivot': pv(132, 102), 'anim': 'flap-back'},
                {'id': 'body', 'file': 'body'},
                {'id': 'wing-front', 'file': 'wing-front', 'pivot': pv(126, 104), 'anim': 'flap'},
            ]},
        ]}
    return f, rig
