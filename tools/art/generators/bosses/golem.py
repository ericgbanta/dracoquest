from lib import *
IRON, IRONL, PLATE, RIVET, STONE, GLOW, CORE = '#6f7c8c', '#9aa7b6', '#4c5664', '#d4dbe3', '#a58c6a', '#ff8a3c', '#ffd36a'
R = 'iron-golem'


def rivets(*pts, r=2.6):
    d = ''.join(f'M{x - r} {y}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0' for x, y in pts)
    return f'<path d="{d}" fill="{RIVET}" stroke="{O}" stroke-width="1.5"/>\n'


legs = (shape('M70 172 L112 172 L114 212 C128 214 130 226 116 226 L66 226 C54 226 56 214 68 212 Z', mix(IRON, O, .2), (100, 176))
        + shape('M134 172 L176 172 L178 212 C192 214 194 226 180 226 L130 226 C118 226 120 214 132 212 Z', IRON, (164, 176))
        + line('M70 196 L112 196 M134 196 L176 196', PLATE, 3)
        + solid('M138 204 C136 194 150 188 160 190 C172 192 176 202 170 210 C160 216 140 214 138 204 Z', STONE, 3) + rivets((80, 186), (102, 186), (144, 186), (166, 186)))

bodyd = 'M46 146 C38 106 42 58 70 38 C96 20 162 20 184 38 C206 58 208 108 198 146 C192 172 162 184 122 184 C84 184 52 174 46 146 Z'
body = (
    # smokestack on the back
    shape('M60 46 L58 2 L82 2 L84 40 Z', PLATE, (78, 4), 0.86, 3.5) + solid('M54 2 L86 2 L86 -8 L54 -8 Z', IRON, 3.5)
    + '<circle cx="64" cy="-20" r="7" fill="#c9c3d6" stroke="#1d1a2b" stroke-width="2.5"/><circle cx="78" cy="-32" r="5" fill="#c9c3d6" stroke="#1d1a2b" stroke-width="2.5"/>\n'
    # back arm, hanging
    + shape('M58 66 C40 70 28 96 30 130 L34 156 L64 154 L70 96 Z', mix(IRON, O, .25), (56, 70), 0.86)
    + shape('M20 168 C16 146 34 136 50 138 C68 140 76 156 70 172 C64 188 26 190 20 168 Z', mix(IRON, O, .3), (52, 138), 0.86)
    + shape(bodyd, IRON, (150, 26), 0.9, extra=(
        fill('M48 150 C60 170 90 180 122 180 C160 180 186 170 196 150 L198 164 C190 178 160 186 122 186 C84 186 56 178 48 164 Z', PLATE)
        + line('M46 150 C70 162 170 164 198 150', O, 3)
        + line('M70 44 C96 34 150 34 176 44', IRONL, 4)
        + rivets((62, 76), (60, 112), (188, 112), (88, 162), (122, 166), (156, 162))
        # furnace door
        + solid('M90 94 C90 78 104 70 122 70 C140 70 154 78 154 94 L154 136 L90 136 Z', PLATE, 3.5)
        + fill('M98 96 C98 84 108 78 122 78 C136 78 146 84 146 96 L146 130 L98 130 Z', GLOW)
        + fill('M106 110 C106 100 114 94 122 94 C130 94 138 100 138 110 L138 130 L106 130 Z', CORE)
        + line('M110 80 L110 130 M122 78 L122 130 M134 80 L134 130', O, 4)
        + line('M98 130 L146 130', O, 3)
        + solid('M58 112 L72 106 L76 118 L64 124 Z', STONE, 2.5)))
    + shape('M42 70 C36 48 56 32 80 34 C98 36 106 52 100 66 C92 80 50 84 42 70 Z', STONE, (78, 34), 0.86,
            extra=line('M56 50 L66 56 L64 66 M82 44 L86 54', mix(STONE), 3)))

head = (shape('M128 44 C124 18 142 0 166 0 C188 0 202 16 200 40 C198 56 186 64 164 64 C142 64 130 58 128 44 Z', IRON, (172, 2), 0.86, extra=(
            line('M140 54 C156 58 180 58 196 50', PLATE, 3)
            + line('M184 44 L194 44', O, 3)))
        + eye(176, 32, 9, CORE)
        + solid('M146 24 C156 10 186 10 204 22 L202 30 C188 24 160 22 148 32 Z', PLATE, 3.5)
        + rivets((156, 20), (172, 16), (190, 18), r=2.2))

FIST = '#8a98aa'
arm = (shape('M150 74 C156 56 186 52 200 68 L220 80 C230 88 224 104 212 102 L176 98 C156 96 144 88 150 74 Z', IRON, (186, 56), 0.86,
             extra=rivets((166, 84), (186, 82)))
       + shape('M192 72 C192 50 208 40 226 40 C246 40 258 54 258 72 L258 90 C258 104 246 114 228 114 C208 114 192 104 192 90 Z', FIST, (232, 42), 0.88,
               extra=(line('M226 46 C240 46 252 50 256 58 M226 66 C240 64 252 68 257 74 M226 86 C240 84 252 88 256 94', O, 3)
                      + line('M226 46 L226 106', O, 3)
                      + line('M198 60 C204 52 214 50 222 54', IRONL, 3)))
       + rivets((206, 92), (210, 76)))

write(R, {'legs': legs, 'body': body, 'head': head, 'arm': arm})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.iron-golem', {
    'size': [260, 270], 'boxScale': 1.1,
    'points': {'hit': pv(122, 110), 'front': pv(212, 100)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(122, 200), 'anim': 'breathe', 'parts': [
            {'id': 'body', 'file': f('body')},
            {'id': 'arm', 'file': f('arm'), 'pivot': pv(174, 76)},
            {'id': 'head', 'file': f('head'), 'pivot': pv(160, 56)},
        ]},
    ]})
