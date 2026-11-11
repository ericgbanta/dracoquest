from common import *

W, H = 120, 170
SLEEVE = ('<path d="M66 68 C74 72 80 80 84 86 L78 92 C72 86 66 80 62 76 Z" fill="#2f8f6f" stroke="#1d1a2b" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>\n'
          '<circle cx="84" cy="86" r="6" fill="#f1c7a0" stroke="#1d1a2b" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>')

# Bow: short recurve held upright in front of the hand, string toward the rider.
LIMB = 'M79 52 C70 50 72 44 78 46 C92 54 96 74 88 86 C96 98 92 118 78 126 C72 128 70 122 79 120'
bow = '\n'.join([
    '<g transform="rotate(18 87 86)">',
    line('M79 50 L79 122', OL, 3.5),
    line('M79 50 L79 122', '#e9e4da', 1.5),
    line(LIMB, OL, 9),
    line(LIMB, '#8a5a36', 5),
    line('M84 58 C90 66 92 74 90 80 M90 92 C92 100 90 108 84 116', '#b07a4c', 1.8),
    line('M86 80 L91 92', OL, 10),
    line('M86 80 L91 92', '#6b4a2e', 6),
    '</g>',
    SLEEVE,
])
print('bow', write('rigs/rider/arm-bow.svg', W, H, bow))

# Staff: wooden staff with a glowing gem in a gold claw on top.
staff = '\n'.join([
    line('M91 30 L78 152', OL, 9),
    line('M91 30 L78 152', '#8a5a36', 5),
    line('M89 50 L81 126', '#6b4a2e', 1.8),
    '<circle cx="92" cy="20" r="15" fill="#bff3ff" fill-opacity="0.45"/>',
    line('M91 34 C82 30 82 18 88 12 M91 34 C100 30 101 18 96 12', OL, 7),
    line('M91 34 C82 30 82 18 88 12 M91 34 C100 30 101 18 96 12', '#f2c14e', 3),
    solid('M92 8 L100 20 L92 31 L84 20 Z', '#6fe3ff', 3),
    fill('M92 31 L84 20 L92 20 L100 20 Z', '#36a9d6'),
    out('M92 8 L100 20 L92 31 L84 20 Z', 3),
    '<path d="M89 13 L86 19 L90 19 Z" fill="#ffffff"/>',
    line('M85 33 L97 35', OL, 8),
    line('M85 33 L97 35', '#f2c14e', 4),
    SLEEVE,
])
print('staff', write('rigs/rider/arm-staff.svg', W, H, staff))
