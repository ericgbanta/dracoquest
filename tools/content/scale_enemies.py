"""Scale enemies' attack and hp (base and perLevel together) to tune an area's win rate.
Run from the repo root: python3 tools/content/scale_enemies.py <id,id,...> <attack factor> <hp factor>
In the sim, 4 percent moves an area's on-level win rate by roughly 6 points."""
import json, sys
ids = sys.argv[1].split(','); atk = float(sys.argv[2]); hp = float(sys.argv[3])
p = 'src/data/enemies.json'; en = json.load(open(p))
for e in en:
    if e['id'] in ids:
        for part in ('base', 'perLevel'):
            e[part]['attack'] = round(e[part]['attack'] * atk, 3); e[part]['hp'] = round(e[part]['hp'] * hp, 2)
open(p, 'w').write(json.dumps(en, indent=2, ensure_ascii=False) + "\n")
