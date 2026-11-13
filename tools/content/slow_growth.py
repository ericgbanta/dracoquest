"""Keep enemies' stats the same at level `at` but grow them `k` times as fast after it. Dragons stop at 50, so
areas above 50 need enemies that grow slowly (Sunken Spires used k=0.25 for every stat).
Run from the repo root: python3 tools/content/slow_growth.py <id,id,...> <k> <at> [stat,stat,...]
(default stats: hp,attack; Sunken Spires also did power,defense,swift,dodge)."""
import json, sys
STATS = sys.argv[4].split(',') if len(sys.argv) > 4 else ['hp', 'attack']
ids = sys.argv[1].split(','); k = float(sys.argv[2]); at = int(sys.argv[3])
p = 'src/data/enemies.json'; en = json.load(open(p))
for e in en:
    if e['id'] in ids:
        for stat in STATS:
            pl = e['perLevel'][stat]
            e['base'][stat] = round(e['base'][stat] + (1 - k) * pl * (at - 1), 3)
            e['perLevel'][stat] = round(pl * k, 4)
open(p, 'w').write(json.dumps(en, indent=2, ensure_ascii=False) + "\n")
