from lib import *
SHELL, LIGHT, SAND, GOLD, CAP, FOAM = '#3a7fc8', '#7cc0f0', '#ecdcae', '#f2c14e', '#d8483a', '#d8f0ff'
R = 'crab-king'


def leg(d, c, w=12):
    return line(d, O, w + 6) + line(d, c, w)


back = mix(SHELL, O, .3)
legs = (leg('M84 160 L46 120 L30 222 M102 166 L76 136 L66 224 M148 166 L180 136 L196 224', back)
        + leg('M74 166 L30 134 L14 224 M116 170 L100 144 L92 226 M142 172 L162 140 L174 226', SHELL)
        + line('M30 134 L26 160 M100 144 L98 172 M162 140 L166 168', mix(SHELL), 2.5)
        + solid('M8 222 L14 230 L20 222 Z M86 222 L92 230 L98 222 Z M168 222 L174 230 L180 222 Z', BONE, 2))

shell = 'M44 150 C38 108 80 82 130 82 C178 82 208 104 206 140 C204 166 172 180 126 180 C80 180 48 172 44 150 Z'
body = (
    # small claw, low at the front
    shape('M180 158 C196 150 214 152 224 162 C236 156 246 164 244 172 C238 176 230 174 226 172 C220 182 196 186 186 176 Z', SHELL, (210, 152), 0.84)
    + shape(shell, SHELL, (150, 86), 0.88, extra=(
        fill('M50 160 C82 176 170 178 202 154 C196 172 168 182 126 182 C86 182 56 176 50 160 Z', SAND)
        + line('M50 160 C82 176 170 178 202 154', O, 3)
        + line('M70 116 C80 108 90 124 100 116 C110 108 120 124 130 116 C140 108 150 124 160 116 C170 108 180 124 188 116', LIGHT, 4)
        + line('M64 138 C74 130 84 146 94 138 C104 130 114 146 124 138 C134 130 144 146 152 138', mix(SHELL), 3)
        + solid('M60 104 C60 96 72 94 74 102 Z M80 92 C80 84 92 82 94 90 Z', BONE, 2.5)
        + '<circle cx="66" cy="108" r="3" fill="#ffffff"/><circle cx="196" cy="124" r="2.5" fill="#ffffff"/>\n'))
    # spiky shell rim
    + solid('M196 108 L212 104 L204 118 Z M204 128 L220 128 L208 140 Z', SHELL, 3)
    # grumpy mouth
    + line('M188 148 C194 142 202 144 206 150', O, 3)
    + '<circle cx="216" cy="138" r="3.5" fill="' + FOAM + '" stroke="#1d1a2b" stroke-width="2"/><circle cx="224" cy="128" r="2.5" fill="' + FOAM + '" stroke="#1d1a2b" stroke-width="2"/>\n')

stalk = lambda d: line(d, O, 11) + line(d, SHELL, 5)
lid = '#22345a'
head = (stalk('M128 90 L122 54') + stalk('M152 92 L158 56')
        + eye(122, 48, 12, '#f5e27a', 'M106 42 C110 30 128 28 138 40 L134 48 C126 40 116 40 108 48 Z', lid)
        + eye(160, 50, 12, '#f5e27a', 'M144 44 C148 32 166 30 176 42 L172 50 C164 42 154 42 146 50 Z', lid)
        # bottle-cap crown, tipped back on the shell
        + '<g transform="rotate(-16 84 76)">\n'
        + shape('M62 80 L66 58 L72 64 L78 54 L84 62 L90 52 L96 62 L102 54 L106 64 L112 58 L114 80 C106 86 70 86 62 80 Z', GOLD, (96, 56), 0.86, 3.5)
        + line('M66 74 C78 78 98 78 112 74', '#c48a1e', 3)
        + '<circle cx="88" cy="68" r="5" fill="' + CAP + '" stroke="#1d1a2b" stroke-width="2.5"/>\n</g>\n')

# the huge claw, raised
upper = 'M206 66 C222 44 250 44 258 66 C258 76 252 82 244 80 C238 70 226 68 214 76 Z'
palm = 'M168 104 C164 74 186 56 210 58 C228 60 238 70 240 80 C236 86 234 92 238 96 C248 96 256 102 258 112 C244 128 216 136 194 134 C178 132 170 120 168 104 Z'
CLAW = '#4a93de'
arm = ('<g transform="translate(168 140) scale(1.1) translate(-176 -140)">\n' + shape('M160 150 C158 130 176 118 190 124 C202 130 200 148 190 158 C180 166 162 164 160 150 Z', CLAW, (190, 120), 0.84)
       + shape(upper, CLAW, (236, 46), 0.86)
       + solid('M244 80 L238 72 L234 82 Z M230 72 L224 70 L222 78 Z', BONE, 2)
       + shape(palm, CLAW, (214, 60), 0.88, extra=(
           line('M184 82 C192 70 204 66 216 66', LIGHT, 4)
           + line('M180 104 C188 98 196 108 204 102 C212 96 220 106 228 100', mix(CLAW), 3)
           + solid('M240 98 L246 92 L248 102 Z M250 102 L256 98 L256 108 Z', BONE, 2)
           + '<circle cx="190" cy="118" r="3" fill="#ffffff"/><circle cx="198" cy="76" r="2.5" fill="#ffffff"/>\n'))
       + solid('M194 88 C194 82 204 80 206 88 Z', BONE, 2.5) + '</g>\n')

write(R, {'legs': legs, 'body': body, 'head': head, 'arm': arm})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.crab-king', {
    'size': [260, 270], 'boxScale': 1,
    'points': {'hit': pv(126, 136), 'front': pv(214, 130)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(126, 200), 'anim': 'breathe', 'parts': [
            {'id': 'body', 'file': f('body')},
            {'id': 'head', 'file': f('head'), 'pivot': pv(140, 96)},
            {'id': 'arm', 'file': f('arm'), 'pivot': pv(178, 142)},
        ]},
    ]})
