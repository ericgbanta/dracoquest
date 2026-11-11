from lib import *
SKIN, BARK, BARKL, MOSS, LEAF, VINE = '#6f9a48', '#7a5a3c', '#b08458', '#9ccf5a', '#5fbf5a', '#4b3a2a'
R = 'bramble-troll'

legs = (shape('M84 172 L124 172 L126 210 C138 212 142 226 130 226 L80 226 C70 226 74 212 84 210 Z', mix(SKIN, O, .2), (110, 176))
        + shape('M140 174 L180 174 L182 210 C196 212 198 226 186 226 L136 226 C126 226 130 212 140 210 Z', SKIN, (166, 178))
        + solid('M80 226 L84 218 L90 226 Z M136 226 L140 218 L146 226 Z M184 226 L188 218 L194 226 Z', BONE, 2.5))

bodyd = 'M58 186 C38 150 40 92 74 62 C102 38 152 38 180 62 C202 82 206 122 200 152 C196 186 172 202 128 204 C96 205 70 200 58 186 Z'
belly = 'M150 112 C176 108 196 124 196 152 C194 180 172 196 140 196 C120 196 112 180 118 160 C122 136 130 116 150 112 Z'
body = shape(bodyd, SKIN, (150, 60), 0.88, extra=(
    shape(belly, BARKL, (176, 120), 0.86, 3)
    + line('M150 124 C144 140 150 156 144 176 M166 120 C162 138 170 156 164 184 M182 132 C178 148 186 162 180 178', mix(BARKL), 3)
    # mossy hump
    + solid('M62 96 C66 70 86 50 112 46 C134 44 152 50 166 62 C150 60 140 70 128 64 C116 74 104 64 92 78 C84 74 72 86 62 96 Z', MOSS, 3)
    # bramble vine over the back with thorns
    + line('M52 150 C60 118 70 98 92 86 C110 76 124 82 134 72', VINE, 9)
    + line('M52 150 C60 118 70 98 92 86 C110 76 124 82 134 72', '#6b5236', 4)
    + solid('M60 128 L50 122 L62 118 Z M74 100 L66 90 L80 92 Z M102 82 L100 70 L110 78 Z M126 76 L130 64 L136 74 Z', BONE, 2.5)
    + solid('M90 86 C84 72 96 66 104 70 C104 80 98 86 90 86 Z', LEAF, 2.5)
    + line('M64 168 C74 176 88 182 102 184', mix(SKIN), 3)))

# arm raised with a thorny log club (rotates forward for the smash)
club = 'M150 66 L166 62 L150 6 C166 -2 170 -22 160 -32 C148 -42 118 -40 106 -30 C92 -16 98 4 112 12 C122 16 132 16 138 12 Z'
arm = (shape('M118 104 C110 80 126 50 142 42 L166 44 C170 62 168 90 160 108 C152 126 124 124 118 104 Z', SKIN, (154, 44), 0.86,
             extra=line('M134 92 C140 86 148 84 156 86', mix(SKIN), 2.5))
       + '<g transform="rotate(-16 154 52) translate(154 52) scale(1.12) translate(-154 -52)">\n'
       + solid('M156 -24 L168 -30 L160 -36 Z M108 -34 L98 -40 L102 -28 Z M98 -10 L86 -12 L94 -20 Z M104 10 L96 18 L110 16 Z M162 -6 L174 -4 L166 -14 Z M130 -36 L134 -46 L140 -36 Z', BONE, 2.5)
       + shape(club, BARK, (150, -34), 0.86, extra=(
           line('M108 -14 C118 -10 130 -10 142 -14 M110 2 C120 6 130 6 140 2 M146 26 L150 44', mix(BARK), 3)
           + '<ellipse cx="128" cy="-24" rx="6" ry="4.5" fill="none" stroke="#1d1a2b" stroke-width="2.5"/>\n'))
       + solid('M104 -30 C92 -42 78 -36 76 -28 C88 -24 96 -26 104 -30 Z M104 -30 C96 -18 82 -16 78 -22 C86 -30 96 -30 104 -30 Z', LEAF, 2.5) + '</g>\n'
       + shape('M136 46 C138 30 164 26 172 40 C180 54 170 70 154 70 C140 70 134 58 136 46 Z', SKIN, (160, 30), 0.84,
               extra=line('M144 48 C152 46 160 48 166 54 M142 58 C150 56 158 58 164 64', mix(SKIN), 2.5)))

head = (shape('M164 86 C160 58 180 40 206 42 C230 44 244 62 240 86 C238 106 222 120 200 120 C180 120 166 106 164 86 Z', SKIN, (210, 46), 0.86, extra=(
            # ear
            ''))
        # underbite jaw with tusks
        + solid('M216 112 L222 92 L228 108 Z M236 106 L240 88 L244 104 Z', BONE, 2.5)
        + shape('M184 108 C196 126 230 128 246 108 C250 104 248 98 242 100 C226 108 206 108 190 100 Z', mix(SKIN, O, .1), (220, 104), 0.9, 3)
        # big lumpy nose
        + shape('M230 64 C242 58 256 66 254 80 C252 92 238 94 230 86 Z', mix(SKIN, '#c8875a', .35), (244, 64), 0.84, 3)
        + eye(214, 70, 8.5)
        + solid('M196 58 C206 48 226 50 236 62 L232 70 C222 62 210 62 198 68 Z', '#3f5a2a', 3)
        # mossy hair with leaves and a twig
        + solid('M168 66 C164 46 180 32 202 34 C214 34 222 38 228 44 C214 42 206 48 196 46 C188 52 178 54 168 66 Z', MOSS, 3)
        + line('M188 36 L182 14 M184 22 L174 16', VINE, 4)
        + solid('M182 14 C176 4 186 -2 192 2 C192 10 188 14 182 14 Z', LEAF, 2.5)
        + solid('M172 40 C164 30 172 22 180 26 C180 34 178 38 172 40 Z', LEAF, 2.5))

write(R, {'legs': legs, 'body': body, 'arm': arm, 'head': head})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.bramble-troll', {
    'size': [260, 270], 'boxScale': 1.05,
    'points': {'hit': pv(130, 130), 'front': pv(220, 110)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(130, 210), 'anim': 'breathe', 'parts': [
            {'id': 'body', 'file': f('body')},
            {'id': 'head', 'file': f('head'), 'pivot': pv(180, 100)},
            {'id': 'arm', 'file': f('arm'), 'pivot': pv(140, 100)},
        ]},
    ]})
