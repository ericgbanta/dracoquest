from common import *

W, H = 200, 170
OW = 4.8   # a little heavier: the hatchling is drawn at 0.62 of the adult box
IN = 3.2
D = 'rigs/dragon-hatchling/'

BODY = 'M56 128 C52 104 72 88 98 88 C120 88 134 100 136 120 C138 142 122 158 98 158 C74 158 58 148 56 128 Z'
body = '\n'.join([
    fill(BODY, P),
    fill('M57 132 C60 148 76 158 98 158 C112 158 124 152 130 144 C114 152 84 152 70 144 C63 140 59 136 57 132 Z', PS),
    f'<path d="M128 102 C140 118 138 144 118 154 C108 158 96 158 88 156 C108 150 120 136 122 120 C123 112 125 106 128 102 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    line('M126 120 C122 121 120 123 119 125 M124 134 C120 135 117 138 116 140 M116 147 C112 148 108 150 106 151', SS, IN),
    out(BODY, OW),
    f'<path d="M72 98 L74 86 L84 93 Z M90 90 L95 79 L103 89 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    line('M72 124 C78 121 86 121 92 124', PS, IN),
])

HEAD = 'M108 74 C104 50 120 34 142 34 C162 34 176 44 179 60 C188 62 192 72 188 80 C184 88 172 90 160 90 L132 92 C118 92 110 86 108 74 Z'
head = '\n'.join([
    solid('M124 44 C118 34 122 24 130 25 C133 30 134 36 134 42 Z', BONE, OW),
    solid('M145 38 C145 28 152 21 158 26 C157 31 154 36 151 40 Z', BONE, OW),
    f'<path d="M154 83 L184 80 C183 86 178 89 172 90 L156 92 Z" fill="#7a2233" stroke="{OL}" stroke-width="2.5" stroke-linejoin="round"/>',
    fill(HEAD, P),
    fill('M109 78 C114 88 124 92 134 92 L160 90 C170 90 181 88 186 83 C172 84 150 82 136 82 C124 82 114 80 109 78 Z', PS),
    out(HEAD, OW),
    f'<path d="M113 58 L95 56 L108 74 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    f'<path d="M180 61 L184 53 L188 63 Z" fill="{BONE}" stroke="{OL}" stroke-width="2.2" stroke-linejoin="round"/>',
    eye(153, 60, 12, 13.5, 156, 62, 6.5, 9, 3, (159, 56, 3)),
    '<circle cx="152.5" cy="67" r="1.6" fill="#ffffff"/>',
    f'<ellipse cx="185" cy="70" rx="2.2" ry="1.6" fill="{OL}"/>',
    line('M174 78 C177 80 180 80 183 78', OL, 2.2),
])

JAW = 'M152 86 L178 85 C184 86 183 93 176 95 L162 97 C152 98 146 94 152 86 Z'
jaw = '\n'.join([
    fill(JAW, S),
    fill('M149 93 C156 96 166 96 176 95 C168 99 156 100 149 93 Z', SS),
    out(JAW, OW),
])

leg_back = '\n'.join([
    solid('M70 128 C56 130 52 150 62 158 L60 160 C56 166 60 167 66 167 L84 167 C90 167 90 160 84 159 L82 158 C88 148 86 128 70 128 Z', PS, OW),
    f'<path d="M84 160 L91 163 L84 166 Z M77 161 L83 164 L77 167 Z" fill="{BONES}" stroke="{OL}" stroke-width="1.8" stroke-linejoin="round"/>',
])

LEGF = 'M110 128 C124 128 130 144 124 154 L125 159 L134 160 C140 161 139 167 133 167 L109 167 C103 167 103 160 107 159 L107 154 C100 148 100 130 110 128 Z'
leg_front = '\n'.join([
    fill(LEGF, P),
    fill('M107 154 C112 157 120 157 124 154 L125 159 L134 160 C140 161 139 167 133 167 L109 167 C103 167 103 160 107 159 Z', PS),
    out(LEGF, OW),
    f'<path d="M133 160 L141 163 L133 166 Z M125 161 L132 164 L125 167 Z" fill="{BONE}" stroke="{OL}" stroke-width="1.8" stroke-linejoin="round"/>',
])

TAIL = 'M68 148 C52 150 36 148 26 140 C16 133 13 121 20 114 C27 110 32 116 30 122 C30 128 40 130 50 128 C58 126 64 122 70 118'
tail = '\n'.join([
    fill(TAIL + ' Z', P),
    fill('M68 148 C52 150 36 148 26 140 C20 136 16 130 15 124 C22 134 36 140 50 140 C58 140 64 138 70 136 Z', PS),
    out(TAIL, OW),
    f'<path d="M42 129 L40 120 L49 126 Z" fill="{S}" stroke="{OL}" stroke-width="2.6" stroke-linejoin="round"/>',
])

# Tiny nub wings: a stubby version of the adult wing (two short fingers).
WINGH = 'M104 102 L110 82 L98 62 C90 58 80 58 72 62 Q84 70 74 82 Q88 84 86 96 Q96 94 100 104 Z'
WINGH_B = 'M104 102 L110 82 L98 62 M98 62 L74 63 M98 62 L76 81'
wing_front = '\n'.join([
    fill(WINGH, S),
    fill('M98 62 L72 62 Q84 70 74 82 Z M98 62 L86 96 Q96 94 100 104 L104 102 Z', SS),
    out(WINGH, OW),
    bone_line(WINGH_B, P, 8, 3.8),
    f'<path d="M98 62 L95 52 L103 59 Z" fill="{BONE}" stroke="{OL}" stroke-width="2.2" stroke-linejoin="round"/>',
])
wing_back = '<g transform="translate(14 -5)">\n' + solid(WINGH, SS, OW) + '\n' + bone_line(WINGH_B, PS, 7.5, 3.2) + '\n</g>'

for name, b in [('body', body), ('head', head), ('jaw', jaw), ('leg-back', leg_back), ('leg-front', leg_front),
                ('tail', tail), ('wing-front', wing_front), ('wing-back', wing_back)]:
    print(name, write(D + name + '.svg', W, H, b))
