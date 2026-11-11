from common import *

W, H = 300, 244
DY = 14  # headroom so the big wings can flap without leaving the canvas
OW = 4.2
IN = 3
D = 'rigs/dragon-elder/'

BODY = 'M72 160 C62 126 100 106 142 110 C162 112 174 106 184 92 L198 70 C206 60 222 62 224 74 L220 100 C216 124 218 150 206 172 C192 194 142 202 108 192 C88 186 76 176 72 160 Z'
body = '\n'.join([
    fill(BODY, P),
    fill('M73 164 C80 182 100 196 128 198 C160 200 192 192 206 172 C176 186 130 188 100 176 C88 172 78 168 73 164 Z', PS),
    # flank plates (darker scales) along the back
    fill('M100 132 C106 124 118 124 122 130 C116 136 106 138 100 132 Z M124 124 C130 116 142 116 146 122 C140 128 130 130 124 124 Z M148 120 C154 112 166 112 170 118 C164 124 154 126 148 120 Z', PS),
    f'<path d="M220 100 C226 130 216 162 198 180 C176 196 144 200 122 196 C156 188 188 170 200 140 C206 126 210 110 220 100 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    line('M214 116 C208 118 204 121 202 125 M210 134 C203 136 199 140 197 144 M202 152 C195 155 190 159 187 163 M190 170 C182 174 176 177 171 180 M174 184 C166 187 158 189 152 190', SS, IN),
    out(BODY, OW),
    f'<path d="M94 118 L100 97 L112 113 Z M116 112 L127 89 L136 109 Z M142 109 L156 85 L161 103 Z M166 99 L182 75 L184 91 Z M188 81 L204 57 L205 72 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    # old battle scars on the shoulder and flank
    line('M172 138 L188 122 M180 142 L196 126 M188 146 L200 134', OL, 5),
    line('M172 138 L188 122 M180 142 L196 126 M188 146 L200 134', S, 2),
    line('M92 150 C102 144 114 144 124 150', PS, IN),
])

HEAD = 'M200 84 C192 60 210 42 236 44 C256 46 272 54 286 64 C295 71 293 82 284 85 L242 90 C224 94 204 98 200 84 Z'
head = '\n'.join([
    solid('M214 58 C196 40 176 32 154 34 C170 42 184 54 198 72 Z', BONE, OW),
    solid('M228 50 C224 30 214 18 196 10 C204 24 208 38 212 56 Z', BONE, OW),
    line('M160 36 C172 42 182 50 190 60 M202 16 C208 26 212 36 214 46', BONES, 2.6),
    # second, smaller pair sweeping back from the cheek
    solid('M208 80 C194 82 180 88 170 98 C184 96 196 96 210 92 Z', BONE, OW),
    f'<path d="M236 86 L287 81 C288 88 282 93 273 94 L240 97 Z" fill="#7a2233" stroke="{OL}" stroke-width="2.6" stroke-linejoin="round"/>',
    f'<path d="M252 85 L255 92 L258 84 Z M266 84 L269 91 L272 83 Z M278 83 L280 89 L283 82 Z" fill="#ffffff" stroke="{OL}" stroke-width="1.5" stroke-linejoin="round"/>',
    fill(HEAD, P),
    fill('M201 85 C208 96 224 94 242 90 L284 85 C276 80 260 79 244 79 C228 79 212 84 201 85 Z', PS),
    out(HEAD, OW),
    # frill behind the eye
    f'<path d="M206 62 L186 58 L196 68 L182 74 L204 78 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    f'<path d="M238 52 C247 44 262 45 270 53 L264 57 C256 52 247 52 240 57 Z" fill="{PS}" stroke="{OL}" stroke-width="2.6" stroke-linejoin="round"/>',
    eye(254, 63, 7, 6.5, 256, 63.5, 3.2, 4.6, 2.5, (257.6, 61.4, 1.6)),
    f'<ellipse cx="285" cy="69" rx="2.8" ry="1.8" fill="{OL}"/>',
    line('M266 70 C270 66 276 66 280 70', OL, 2.2),
    line('M226 52 L232 64', OL, 4.2),
    line('M226 52 L232 64', S, 1.8),
])

JAW = 'M230 86 L284 84 C293 86 291 96 280 98 L244 104 C230 106 216 100 218 92 Z'
jaw = '\n'.join([
    f'<path d="M230 102 L224 117 L238 104 Z M246 103 L244 118 L254 102 Z M260 101 L262 113 L268 100 Z" fill="{S}" stroke="{OL}" stroke-width="{IN}" stroke-linejoin="round"/>',
    fill(JAW, S),
    fill('M220 98 C234 104 260 102 280 98 C268 106 238 110 220 98 Z', SS),
    out(JAW, OW),
    f'<path d="M262 85 L265 78 L268 85 Z" fill="#ffffff" stroke="{OL}" stroke-width="1.5" stroke-linejoin="round"/>',
])

leg_back = '\n'.join([
    solid('M98 158 C74 164 68 196 86 208 L82 216 C77 224 82 227 90 227 L120 227 C129 227 129 218 120 216 L110 214 L116 192 C122 174 118 158 98 158 Z', PS, OW),
    f'<path d="M120 217 L130 221.5 L120 226 Z M110 218 L119 222.5 L110 227 Z" fill="{BONES}" stroke="{OL}" stroke-width="2" stroke-linejoin="round"/>',
])

LEGF = 'M184 156 C208 156 218 184 206 202 L208 214 L224 216 C232 218 230 227 222 227 L186 227 C178 227 178 216 184 214 L186 198 C170 188 168 158 184 156 Z'
leg_front = '\n'.join([
    fill(LEGF, P),
    fill('M186 198 C194 204 202 204 206 202 L208 214 L224 216 C232 218 230 227 222 227 L186 227 C178 227 178 216 184 214 Z', PS),
    out(LEGF, OW),
    line('M188 176 L198 170', OL, 4.5),
    line('M188 176 L198 170', S, 2),
    f'<path d="M223 217 L233 221.5 L223 226 Z M213 218 L222 222.5 L213 227 Z M203 218 L211 222.5 L203 227 Z" fill="{BONE}" stroke="{OL}" stroke-width="2" stroke-linejoin="round"/>',
])

TAIL = 'M114 184 C88 182 60 174 42 156 C26 140 18 118 24 92 C32 114 46 126 64 134 C82 140 98 140 116 138'
tail = '\n'.join([
    fill(TAIL + ' Z', P),
    fill('M114 184 C88 182 60 174 42 156 C30 145 22 131 20 114 C32 134 50 148 74 154 C90 158 104 158 116 158 Z', PS),
    out(TAIL, OW),
    f'<path d="M31 114 L25 100 L39 109 Z M51 128 L47 113 L60 122 Z M76 138 L75 123 L87 133 Z" fill="{S}" stroke="{OL}" stroke-width="2.8" stroke-linejoin="round"/>',
])

s = 1.22
wing_front = wing_front(f'translate(6 0) scale({s})', s, OW)
wing_back = wing_back(f'translate({6 + 20*s:.1f} {-6*s:.1f}) scale({s})', s, OW)

for name, b in [('body', body), ('head', head), ('jaw', jaw), ('leg-back', leg_back), ('leg-front', leg_front),
                ('tail', tail), ('wing-front', wing_front), ('wing-back', wing_back)]:
    print(name, write(D + name + '.svg', W, H, f'<g transform="translate(0 {DY})">\n{b}\n</g>'))
