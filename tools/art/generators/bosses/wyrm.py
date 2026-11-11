from lib import *
ROCK, BELLY, LAVA, CORE, EMBER = '#4d3c4a', '#e8603c', '#ff8a3c', '#ffd36a', '#c23b22'
R = 'magma-wyrm'


def crack(d):
    return line(d, LAVA, 4.5) + line(d, CORE, 1.8)


legs = (shape('M66 184 C66 170 94 168 98 180 L100 212 C116 214 118 226 106 226 L66 226 C56 226 58 214 70 212 Z', mix(ROCK, O, .2), (88, 170))
        + shape('M146 178 C148 162 176 162 180 176 L182 212 C194 214 196 226 184 226 L142 226 C132 226 134 214 146 212 Z', ROCK, (170, 164))
        + solid('M64 226 L68 218 L74 226 Z M140 226 L144 218 L150 226 Z M182 226 L186 218 L192 226 Z', BONE, 2.5)
        + crack('M158 194 L166 202 L160 212 M84 192 L78 204'))

tail = (solid('M14 112 L0 100 L18 102 Z M26 98 L22 82 L36 96 Z M46 100 L52 86 L56 104 Z', ROCK, 3.5)
        + solid('M6 102 L14 106 L12 110 Z M24 88 L30 96 L26 98 Z M50 92 L52 100 L48 100 Z', LAVA, 2)
        + shape('M70 176 C40 184 12 174 6 148 C0 120 18 96 42 98 C60 100 68 118 60 130 C54 138 40 136 40 128 C32 138 38 152 54 156 C64 158 74 158 84 156 Z', ROCK, (42, 100), 0.86,
              extra=crack('M66 168 L52 164 L42 170 M14 128 L22 134 L18 144'))
        + line('M20 160 C30 170 46 176 62 176', mix(ROCK), 3))

bodyd = 'M38 192 C28 170 48 150 80 150 C108 150 124 136 150 128 C168 122 180 108 186 86 L222 94 C222 122 212 148 198 168 C182 192 146 202 110 202 C76 202 46 208 38 192 Z'
body = (solid('M64 154 L70 132 L82 150 Z M94 150 L102 126 L112 146 Z M122 140 L134 116 L140 134 Z M150 126 L164 102 L166 120 Z M170 110 L186 88 L186 104 Z', ROCK, 3.5)
        + solid('M70 132 L74 142 L66 142 Z M102 126 L104 138 L96 136 Z M134 116 L134 128 L126 126 Z M164 102 L162 114 L156 112 Z M186 88 L182 100 L178 96 Z', LAVA, 2)
        + shape(bodyd, ROCK, (150, 130), 0.88, extra=(
            shape('M202 116 C208 140 198 164 178 180 C162 192 138 198 116 196 C150 184 178 160 190 128 Z', BELLY, (204, 126), 0.9, 3,
                  extra=line('M194 136 L184 140 M188 154 L176 156 M178 170 L166 170 M164 182 L152 180', '#ffb43a', 3))
            + crack('M58 176 L72 166 L68 156 M90 172 L104 162 L116 168 L124 156 M108 188 L122 182 M144 142 L154 152 L166 138 L174 144')))
        + line('M52 190 C68 196 90 198 110 198', mix(ROCK), 3))

head = ('<g transform="translate(194 84) scale(1.14) translate(-204 -84)">\n' + fill('M202 80 L242 76 L238 94 L206 94 Z', EMBER) + fill('M210 82 L234 80 L230 90 L212 90 Z', '#ffb43a')
        + solid('M196 50 L170 30 L188 28 L176 10 L204 30 Z', '#3a2c38', 4)
        + solid('M188 28 L182 18 L196 26 Z', LAVA, 2)
        + shape('M182 70 C178 46 198 30 222 32 C240 34 252 44 256 58 C258 66 254 72 246 74 L212 80 C200 84 186 84 182 70 Z', ROCK, (222, 34), 0.86,
                extra=crack('M196 46 L206 52 L200 60') + '<circle cx="246" cy="54" r="2.5" fill="' + LAVA + '"/>\n')
        + eye(222, 52, 8, '#ffd36a', 'M204 44 C214 34 232 36 242 46 L238 52 C228 46 216 44 206 50 Z', '#2a1f2a') + '</g>\n')

jaw = ('<g transform="translate(194 84) scale(1.14) translate(-204 -84)">\n' + shape('M188 80 C200 80 230 78 252 72 C254 82 246 96 228 98 C210 100 194 96 188 86 Z', ROCK, (230, 78), 0.86, 3.5)
       + solid('M214 80 L218 72 L222 80 Z M232 78 L236 70 L240 78 Z', BONE, 2) + '</g>\n')

write(R, {'legs': legs, 'tail': tail, 'body': body, 'head': head, 'jaw': jaw})
f = lambda n: f'rigs/{R}/{n}.svg'
manifest('enemy.magma-wyrm', {
    'size': [260, 270], 'boxScale': 1,
    'points': {'hit': pv(130, 160), 'front': pv(220, 120)},
    'parts': [
        {'id': 'legs', 'file': f('legs')},
        {'id': 'torso', 'pivot': pv(130, 210), 'anim': 'breathe', 'parts': [
            {'id': 'tail', 'file': f('tail'), 'pivot': pv(72, 164), 'anim': 'swish'},
            {'id': 'body', 'file': f('body')},
            {'id': 'head', 'file': f('head'), 'pivot': pv(194, 96), 'parts': [
                {'id': 'jaw', 'file': f('jaw'), 'pivot': pv(192, 86)},
            ]},
        ]},
    ]})
