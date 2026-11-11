"""Element tail tips, drawn once in adult tail-tip coordinates (tail ends at 20,80, pointing up)
and placed on each rig's tail tip with a transform. Fixed colors, not tint tokens."""
from common import *


def tips(sw):
    t = sw * 0.7  # inner detail
    return {
        'fire': '\n'.join([
            solid('M21 84 C8 80 4 64 12 50 C13 59 18 62 21 56 C21 64 28 64 30 58 C34 66 34 78 28 83 C26 85 23 85 21 84 Z', '#ff7b2e', sw),
            fill('M22 79 C16 76 15 68 18 62 C20 67 23 68 25 65 C27 70 27 76 22 79 Z', '#ffd34d'),
        ]),
        'frost': '\n'.join([
            fill('M15 85 L3 72 L4 61 L14 68 Z M26 85 L38 70 L37 59 L28 66 Z', '#bfe8fb'),
            fill('M15 85 L3 72 L14 68 Z M26 85 L28 66 L33 64 L30 78 Z', '#7fc8f0'),
            out('M15 85 L3 72 L4 61 L14 68 Z M26 85 L38 70 L37 59 L28 66 Z', sw),
            fill('M16 86 L14 64 L21 45 L28 64 L26 86 Z', '#bfe8fb'),
            fill('M16 86 L14 64 L21 45 L20 86 Z', '#7fc8f0'),
            out('M16 86 L14 64 L21 45 L28 64 L26 86 Z', sw),
            line('M23 54 L25 66', '#ffffff', t),
        ]),
        'verdant': '\n'.join([
            solid('M23 84 C30 76 40 73 47 77 C41 86 32 89 23 86 Z', '#4fae4b', sw),
            fill('M20 86 C6 77 1 58 9 40 C22 48 33 66 26 84 Z', '#5fbf5a'),
            fill('M20 86 C6 77 1 58 9 40 C9 58 14 72 23 85 Z', '#3f8f45'),
            out('M20 86 C6 77 1 58 9 40 C22 48 33 66 26 84 Z', sw),
            line('M22 84 C18 70 14 56 10 44 M18 70 L25 64 M15 60 L21 54 M18 70 L11 66', '#2f7a36', t),
        ]),
        'stone': '\n'.join([
            fill('M8 80 C3 70 6 57 16 55 C22 48 33 52 35 61 C41 70 35 82 26 86 C18 90 10 86 8 80 Z', '#a58c6a'),
            fill('M8 80 C4 74 4 68 6 64 C10 74 18 80 30 82 C28 84 27 85 26 86 C18 90 10 86 8 80 Z', '#7d6a50'),
            out('M8 80 C3 70 6 57 16 55 C22 48 33 52 35 61 C41 70 35 82 26 86 C18 90 10 86 8 80 Z', sw),
            line('M17 57 L20 65 L17 71 M20 65 L26 68', '#5e4e3a', t),
            f'<path d="M22 54 L26 46 L30 55 Z M35 64 L42 62 L37 70 Z" fill="#c9b48f" stroke="{OL}" stroke-width="{fmt(t)}" stroke-linejoin="round"/>',
            '<circle cx="24" cy="60" r="2.2" fill="#c9b48f"/>',
        ]),
        'storm': '\n'.join([
            solid('M19 72 L5 58 L10 68 L2 69 L17 81 Z', '#c9a8ff', sw),
            solid('M18 88 L24 69 L16 69 L28 42 L26 60 L35 60 L22 88 Z', '#c9a8ff', sw),
            fill('M24 69 L16 69 L28 42 L22 63 Z', '#f3ecff'),
            out('M18 88 L24 69 L16 69 L28 42 L26 60 L35 60 L22 88 Z', sw),
        ]),
        'tide': '\n'.join([
            fill('M20 86 C11 78 4 64 3 49 C11 56 17 61 22 62 C26 57 31 51 38 47 C40 62 33 78 23 86 Z', '#3f8fd8'),
            fill('M20 86 C11 78 4 64 3 49 C8 62 15 72 24 78 C24 82 23 84 23 86 Z', '#2e6aa3'),
            out('M20 86 C11 78 4 64 3 49 C11 56 17 61 22 62 C26 57 31 51 38 47 C40 62 33 78 23 86 Z', sw),
            line('M21 80 L9 58 M22 78 L22 66 M23 80 L33 56', '#8fd0f5', t),
        ]),
        'light': '\n'.join([
            f'<path d="M20 44 L24 52 L16 52 Z M34 50 L32 58 L27 52 Z M40 64 L32 68 L32 60 Z M7 50 L13 53 L9 58 Z M2 64 L8 60 L8 68 Z M34 78 L27 76 L32 70 Z M7 78 L9 71 L13 76 Z" fill="#f2c94c" stroke="{OL}" stroke-width="{fmt(t)}" stroke-linejoin="round"/>',
            f'<circle cx="20" cy="66" r="13" fill="#f5e27a"/>',
            fill('M8 70 C10 78 16 80 22 79 C28 78 32 74 33 69 C28 74 18 76 8 70 Z', '#e0c043'),
            f'<circle cx="20" cy="66" r="13" fill="none" stroke="{OL}" stroke-width="{fmt(sw)}"/>',
            '<circle cx="15" cy="61" r="3.4" fill="#fff6c4"/>',
        ]),
        'shadow': '\n'.join([
            fill('M18.6 48.1 A16 16 0 1 0 35.6 67.5 A13 13 0 0 1 18.6 48.1 Z', '#7a5c9e'),
            line('M8.3 68.3 A12.5 12.5 0 0 0 23.2 76.1', '#5a4378', 5),
            out('M18.6 48.1 A16 16 0 1 0 35.6 67.5 A13 13 0 0 1 18.6 48.1 Z', sw),
            line('M10 56 A11.5 11.5 0 0 0 9.5 66', '#b9a2db', t),
            f'<path d="M31 44 L33 50 L39 52 L33 54 L31 60 L29 54 L23 52 L29 50 Z" fill="#d9c8f0" stroke="{OL}" stroke-width="{fmt(t)}" stroke-linejoin="round"/>',
        ]),
    }


# (rig dir, rig size, rig outline, transform from adult tip coords, scale)
RIGS = [
    ('dragon-adult', (260, 200), 4, '', 1),
    ('dragon-juvenile', (240, 190), 4.4, 'translate(22 78) scale(0.96) translate(-20 -80)', 0.96),
    ('dragon-elder', (300, 244), 4.2, 'translate(24 106) rotate(2) scale(1.16) translate(-20 -80)', 1.16),
]

for d, (w, h), ow, tr, s in RIGS:
    for el, body in tips(ow / s).items():
        if d == 'dragon-adult' and el == 'fire':
            continue  # existing approved file, left untouched
        b = f'<g transform="{tr}">\n{body}\n</g>' if tr else body
        print(d, el, write(f'rigs/{d}/tail-tip-{el}.svg', w, h, b))
