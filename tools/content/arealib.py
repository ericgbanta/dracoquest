"""Shared writer for frontier areas (chunks 7 to 9). The 50s and 60s were written by area_gen.py; this is the same
writer made reusable. An area file (area_gen_70s.py, area_gen_80s.py) lists AREAS and calls write().

Each area dict needs: id, name, region, elements, lo, hi, after, blurb, npc, set, enemies, gear, tier, story, bounty,
place, analog (7 enemy ids whose base and perLevel stats are copied), and optionally shopEl (the shop line's element,
default the first element). An enemy element written 'fire+tide' makes a hybrid enemy (element and element2).
Run from the repo root. Rerunning replaces the same ids, which resets tuned stats to the analog's."""
import json, copy
D = 'src/data/'
def load(n): return json.load(open(D + n))
def save(n, d): open(D + n, 'w').write(json.dumps(d, indent=2, ensure_ascii=False) + "\n")

P = lambda i, n: {"id": i, "name": n, "intent": "attack", "weight": 5, "power": 1, "physical": True}
A = lambda i, n, w, pw, st=None, ch=None: {**{"id": i, "name": n, "intent": "attack", "weight": w, "power": pw}, **({"status": st, "statusChance": ch} if st else {})}
BIG = lambda i, n, st=None, ch=None: {**{"id": i, "name": n, "intent": "big", "weight": 2, "power": 1}, **({"status": st, "statusChance": ch} if st else {})}
BUFF = lambda i, n, b: {"id": i, "name": n, "intent": "buff", "weight": 1, "buff": b, "target": "self"}
HEAL = lambda i, n, h: {"id": i, "name": n, "intent": "heal", "weight": 1, "heal": h, "target": "self", "condition": "selfHurt"}
def SHIFT(i, n, to):
    a, _, b = to.partition('+')
    return {"id": i, "name": n, "intent": "shift", "weight": 1, "shiftTo": a, **({"shiftTo2": b} if b else {}), "target": "self", "condition": "notShifted"}

ORDER = ['id', 'name', 'element', 'element2', 'flavor', 'base', 'perLevel', 'moves', 'miniBoss', 'xpMultiplier', 'boss', 'goldMultiplier']


def write(AREAS, zone_tail, regions_fn, cap, spells):
    """zone_tail: zone ids moved to the end of zones.json in this order (the cap zone last).
    regions_fn(regions): edits regions.json (zones, pins, teasers). spells: spell dicts to add if missing."""
    en = load('enemies.json'); by = {x['id']: x for x in en}
    zs = load('zones.json'); gear = load('gear.json'); sets = load('sets.json'); shop = load('shop.json'); forge = load('forge.json')
    stories = load('stories.json'); bounties = load('bounties.json'); regions = load('regions.json')
    for A_ in AREAS:
        ids = [e[0] for e in A_['enemies']]
        en = [x for x in en if x['id'] not in ids]
        for (eid, name, el, flavor, moves), src in zip(A_['enemies'], A_['analog']):
            d = copy.deepcopy(by[src]); d.pop('moves', None); d.pop('element2', None)
            e1, _, e2 = el.partition('+')
            d.update(id=eid, name=name, element=e1, flavor=flavor, moves=moves)
            if e2: d['element2'] = e2
            en.append({k: d[k] for k in ORDER if k in d})
        z = A_['id']; lo, hi = A_['lo'], A_['hi']; reg = ids[:5]
        sid = A_['set'][0]
        egg_els = A_.get('eggElements', A_['elements'])
        zs = [x for x in zs if x['id'] != z]
        zs.append({"id": z, "name": A_['name'], "element": A_['elements'][0], "elements": A_['elements'], "minLevel": lo, "maxLevel": hi, "gate": None,
          "unlock": {"level": lo, "afterBoss": A_['after']}, "blurb": A_['blurb'], "fights": {"min": 3, "max": 5},
          "encounters": [{"enemies": [reg[0]], "weight": 3}, {"enemies": [reg[1]], "weight": 3}, {"enemies": [reg[2]], "weight": 2}, {"enemies": [reg[3]], "weight": 2}, {"enemies": [reg[4]], "weight": 2},
                         {"enemies": [reg[1], reg[1]], "weight": 1, "minLevel": lo + 2}, {"enemies": [reg[0], reg[3]], "weight": 1, "minLevel": lo + 4}],
          "levelSpread": 1, "multiEnemyLevelOffset": -3,
          "boss": {"enemy": ids[6], "level": hi, "unlockRiderLevel": hi - 1, "trophy": {"gear": f"{sid}-armor", "chance": 0.25}},
          "miniBoss": {"enemy": ids[5], "levelOffset": 0, "trophy": {"gear": f"{sid}-trinket", "chance": 0.25}},
          "dropChances": {"potion": 0.25, "dragon-treat": 0.15, "mana-tonic": 0.1},
          "eggDrop": {"element": egg_els[0], "chance": 0.1, "elements": egg_els},
          "gearDrops": {"chance": 0.06, "gear": [f"{sid}-melee", f"{sid}-ranged", f"{sid}-magic"]}})
        # gear: set weapons at tier-1, shop tier at `tier`, every number grows by tier band (k = 0 for 53, 1 for 63, ...)
        t = A_['tier']; G = A_['gear']; el = A_.get('shopEl', A_['elements'][0])
        k = (t - 53) // 10
        wd = 51 + 10 * k; price = 9000 + 4000 * k; main = 10 + 2 * k
        new = [
         {"id": f"{sid}-melee", "name": G['setw'][0], "slot": "weapon", "weaponType": "melee", "element": None, "level": t - 1, "damage": wd, "price": price, "bonus": {"strength": main}, "description": f"Found in {A_['name']}. Part of the {A_['set'][1]} set."},
         {"id": f"{sid}-ranged", "name": G['setw'][1], "slot": "weapon", "weaponType": "ranged", "element": None, "level": t - 1, "damage": wd - 1, "price": price, "bonus": {"agility": main + 1}, "description": f"Found in {A_['name']}. Part of the {A_['set'][1]} set."},
         {"id": f"{sid}-magic", "name": G['setw'][2], "slot": "weapon", "weaponType": "magic", "element": None, "level": t - 1, "damage": wd - 1, "price": price, "bonus": {"arcana": main + 1}, "description": f"Found in {A_['name']}. Part of the {A_['set'][1]} set."},
         {"id": f"{sid}-armor", "name": G['armor'], "slot": "armor", "level": hi - 1, "price": 12500 + 5000 * k, "bonus": {"riderDefense": 18 + 3 * k, "riderHp": 215 + 40 * k}, "description": f"The {A_['name']} boss's trophy. Part of the {A_['set'][1]} set."},
         {"id": f"{sid}-trinket", "name": G['trinket'], "slot": "trinket", "level": t + 1, "price": 10000 + 4000 * k, "bonus": {"strength": 6 + k, "agility": 6 + k, "vigor": 5 + k}, "description": f"The {A_['name']} mini-boss's trophy. Part of the {A_['set'][1]} set."},
        ]
        for gid, name, wt, desc in G['shop']:
            bonus = {"strength": main, "vigor": 1} if wt == 'melee' else {"agility": main + 1} if wt == 'ranged' else {"arcana": main + 1}
            new.append({"id": gid, "name": name, "slot": "weapon", "weaponType": wt, "element": el, "level": t, "damage": wd + 1 - (0 if wt == 'melee' else 1), "price": price + 1200, "bonus": bonus, "description": desc})
        new.append({"id": G['armor2'][0], "name": G['armor2'][1], "slot": "armor", "level": t, "price": 9600 + 4000 * k, "bonus": {"riderDefense": 16 + 3 * k, "riderHp": 185 + 40 * k}, "description": G['armor2'][2]})
        new.append({"id": G['trinket2'][0], "name": G['trinket2'][1], "slot": "trinket", "level": t, "price": 9300 + 4000 * k, "bonus": {"vigor": 5 + k, "arcana": 5 + k, "riderMp": 15, "healPct": 0.05}, "description": G['trinket2'][2]})
        new.append({"id": G['forge'][0], "name": G['forge'][1], "slot": "trinket", "level": t + 3, "price": 11500 + 4000 * k, "bonus": {"strength": 6 + k, "agility": 6 + k, "arcana": 6 + k, "vigor": 6 + k}, "description": G['forge'][2]})
        nid = {x['id'] for x in new}
        gear = [x for x in gear if x['id'] not in nid] + new
        for gid in [s_[0] for s_ in G['shop']] + [G['armor2'][0], G['trinket2'][0]]:
            if gid not in shop['stock']: shop['stock'].append(gid)
        forge['recipes'] = [r for r in forge['recipes'] if r['gear'] != G['forge'][0]] + [{"gear": G['forge'][0], "forgeLevel": 3, "gold": 6000 + 2000 * k, "embers": 20 + 4 * k, "materials": {"ore": 18 + 2 * k, "crystal": 8 + k, "scale": 4 + k}}]
        sets[:] = [x for x in sets if x['id'] != sid]
        sets.append({"id": sid, "name": A_['set'][1], "zone": z, "description": A_['set'][2], "pieces": [f"{sid}-melee", f"{sid}-ranged", f"{sid}-magic", f"{sid}-armor", f"{sid}-trinket"],
                     "bonuses": [{"pieces": 2, "bonus": A_['set'][3]}, {"pieces": 3, "bonus": A_['set'][4]}]})
        # stories: five quests chained by `requires`
        npc = A_['npc']
        stories = [q for q in stories if q.get('zone') != z]
        prev = None
        step_levels = [(lo, lo + 1), (lo + 2, lo + 3), (lo + 4, lo + 5), (lo + 6, lo + 7), (hi - 1, hi)]
        for qi, q in enumerate(A_['story']):
            qid, qname, desc, steps, outro, reward, choice = q[:7]
            mini = len(q) > 7 and q[7]
            out_steps = []
            for si, (lines, who, enemies, narr) in enumerate(steps):
                intro = [{"speaker": "npc", "text": t_, "name": who or npc} for t_ in lines] + [{"speaker": "narrator", "text": narr}]
                stp = {"intro": intro, "enemies": enemies, "level": step_levels[qi][si]}
                if si == 1 and mini: stp['mini'] = True
                if si == 1 and qi == 4: stp['boss'] = True
                out_steps.append(stp)
            entry = {"id": qid, "zone": z, "name": qname, "minLevel": step_levels[qi][0]}
            if prev: entry['requires'] = prev
            entry.update(description=desc, steps=out_steps, outro=[{"speaker": "npc", "text": outro, "name": npc}], reward=reward)
            if choice:
                prompt, (a1, l1, t1, r1, m1), (a2, l2, t2, r2, m2) = choice
                entry['choice'] = {"prompt": prompt, "options": [
                  {"id": a1, "label": l1, "lines": [{"speaker": "narrator", "text": t1}], "reward": r1, "temper": m1},
                  {"id": a2, "label": l2, "lines": [{"speaker": "narrator", "text": t2}], "reward": r2, "temper": m2}]}
            stories.append(entry); prev = qid
        gold = 760 + 400 * k
        pool = [{"id": bid, "kind": "defeat", "count": n, "text": text, "reward": {"gold": gold, "materials": {"ore": 3}} if i % 2 == 0 else {"gold": gold - 20, "embers": 1}, "enemy": eid} for i, (bid, text, eid, n) in enumerate(A_['bounty'])]
        where = A_['name'].replace('The ', 'the ')
        pool += [{"id": f"{A_['place']}-wins", "kind": "wins", "count": 6, "text": f"Win 6 fights in {where}", "reward": {"gold": gold + 140, "materials": {"ore": 4}}},
                 {"id": f"{A_['place']}-clear", "kind": "clear", "count": 2, "text": f"Finish 2 runs in {where}", "reward": {"gold": gold + 300, "embers": 3}},
                 {"id": f"{ids[5]}-hunt", "kind": "defeat", "count": 1, "text": f"Defeat the {A_['enemies'][5][1]}", "reward": {"gold": gold + 140, "materials": {"scale": 1}}, "enemy": ids[5]}]
        bounties['pools'][z] = pool

    for zid in zone_tail:
        zz = next(x for x in zs if x['id'] == zid); zs.remove(zz); zs.append(zz)
    regions_fn(regions)
    p = load('progression.json'); p['levelCap'] = cap; save('progression.json', p)
    c = load('combat.json'); sp = c['riderMoves']['spells']
    for s_ in spells:
        if not any(x['id'] == s_['id'] for x in sp): sp.append(s_)
    save('combat.json', c)
    for n_, d_ in [('enemies.json', en), ('zones.json', zs), ('gear.json', gear), ('sets.json', sets), ('shop.json', shop), ('forge.json', forge), ('stories.json', stories), ('bounties.json', bounties), ('regions.json', regions)]:
        save(n_, d_)
    print('ok', len(zs), 'zones', len(en), 'enemies')


def region(regions, rid):
    return next(x for x in regions['regions'] if x['id'] == rid)


def add_zone(regions, rid, zid, pin):
    r = region(regions, rid)
    if zid not in r['zones']: r['zones'].append(zid)
    r['map']['pins'][zid] = pin
