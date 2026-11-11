from common import *

W, H = 240, 190
OW = 4.4
IN = 3
D = 'rigs/dragon-juvenile/'

# Lanky teen: slim barrel body, tall neck, long legs, small horns.
BODY = 'M68 124 C64 106 84 96 108 98 C124 100 134 96 142 86 L160 58 C166 50 180 52 180 62 L174 88 C170 106 170 124 162 136 C152 150 118 154 96 149 C80 145 70 137 68 124 Z'
body = '\n'.join([
    fill(BODY, P),
    fill('M69 128 C74 142 90 151 108 152 C132 153 152 147 162 136 C140 145 106 146 86 138 C79 135 73 131 69 128 Z', PS),
    f'<path d="M174 88 C178 110 170 130 158 140 C144 150 122 152 106 150 C130 144 150 132 158 114 C163 104 166 94 174 88 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    line('M168 104 C164 105 161 107 159 110 M164 120 C159 121 156 124 154 127 M156 133 C151 135 147 138 145 140', SS, IN),
    out(BODY, OW),
    f'<path d="M96 100 L102 87 L110 98 Z M118 99 L126 85 L131 97 Z M139 91 L150 75 L152 87 Z M155 70 L166 54 L168 66 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    line('M88 120 C96 116 106 116 114 120', PS, IN),
])

HEAD = 'M166 62 C162 44 176 32 194 34 C208 36 220 42 230 50 C237 56 236 64 229 66 L198 70 C184 74 170 74 166 62 Z'
head = '\n'.join([
    solid('M178 42 C172 32 164 27 155 27 C161 33 165 40 169 48 Z', BONE, OW),
    solid('M190 36 C189 26 184 18 176 13 C179 21 181 29 182 39 Z', BONE, OW),
    line('M160 30 C164 34 167 38 170 44', BONES, 2.5),
    f'<path d="M192 67 L231 64 C232 70 227 74 220 75 L196 77 Z" fill="#7a2233" stroke="{OL}" stroke-width="2.6" stroke-linejoin="round"/>',
    f'<path d="M206 67 L209 73 L212 67 Z M219 66 L222 72 L225 66 Z" fill="#ffffff" stroke="{OL}" stroke-width="1.5" stroke-linejoin="round"/>',
    fill(HEAD, P),
    fill('M167 63 C172 72 184 72 198 70 L229 66 C224 62 212 61 200 61 C188 61 176 64 167 63 Z', PS),
    out(HEAD, OW),
    f'<path d="M170 54 L155 59 L170 67 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    f'<path d="M192 41 C199 36 211 37 216 43 L211 45 C206 42 199 42 193 45 Z" fill="{PS}" stroke="{OL}" stroke-width="2.2" stroke-linejoin="round"/>',
    eye(203, 52, 8.5, 8.5, 205.5, 53, 4, 5.8, 2.5, (207.6, 50, 1.9)),
    f'<ellipse cx="228" cy="55" rx="2.3" ry="1.6" fill="{OL}"/>',
])

JAW = 'M188 66 L227 66 C234 68 232 76 224 77 L198 81 C187 83 177 78 179 72 Z'
jaw = '\n'.join([
    fill(JAW, S),
    fill('M181 77 C192 82 210 80 224 77 C214 83 194 85 181 77 Z', SS),
    out(JAW, OW),
    f'<path d="M213 67 L216 61 L219 67 Z" fill="#ffffff" stroke="{OL}" stroke-width="1.5" stroke-linejoin="round"/>',
])

leg_back = '\n'.join([
    solid('M88 118 C72 122 68 142 78 154 L76 176 C72 182 76 186 84 186 L104 186 C111 186 111 178 104 177 L96 176 L100 152 C106 138 104 118 88 118 Z', PS, OW),
    f'<path d="M104 178 L112 181.5 L104 185 Z M96 179 L103 182.5 L96 186 Z" fill="{BONES}" stroke="{OL}" stroke-width="2" stroke-linejoin="round"/>',
])

LEGF = 'M144 120 C160 120 166 138 158 152 L160 174 L172 176 C179 178 177 186 170 186 L144 186 C137 186 137 178 142 176 L142 152 C132 144 132 122 144 120 Z'
leg_front = '\n'.join([
    fill(LEGF, P),
    fill('M142 152 C148 156 154 156 158 152 L160 174 L172 176 C179 178 177 186 170 186 L144 186 C137 186 137 178 142 176 Z', PS),
    out(LEGF, OW),
    f'<path d="M171 177 L179 181 L171 185 Z M163 178 L170 182 L163 186 Z" fill="{BONE}" stroke="{OL}" stroke-width="2" stroke-linejoin="round"/>',
])

TAIL = 'M94 136 C74 134 52 128 38 116 C26 106 20 92 22 78 C30 92 42 100 56 104 C70 108 84 106 96 104'
tail = '\n'.join([
    fill(TAIL + ' Z', P),
    fill('M94 136 C74 134 52 128 38 116 C30 109 25 101 23 92 C32 104 46 113 62 117 C76 120 86 120 96 120 Z', PS),
    out(TAIL, OW),
    f'<path d="M44 102 L40 91 L51 98 Z M64 108 L62 97 L72 104 Z" fill="{S}" stroke="{OL}" stroke-width="2.5" stroke-linejoin="round"/>',
])

# Wings: the adult wing at 0.68 scale, root on the juvenile's shoulder.
s = 0.68
wing_front = wing_front(f'translate(40 30) scale({s})', s, OW)
wing_back = wing_back(f'translate({40 + 20*s:.1f} {30 - 6*s:.1f}) scale({s})', s, OW)

for name, b in [('body', body), ('head', head), ('jaw', jaw), ('leg-back', leg_back), ('leg-front', leg_front),
                ('tail', tail), ('wing-front', wing_front), ('wing-back', wing_back)]:
    print(name, write(D + name + '.svg', W, H, b))
