"""Variety plan V5: story chains and bounty boards for the five zones that had none (Cinder Pass, Thunderspire,
Frostmere, Deepstone Mines, Eclipse Peak). Five quests each, chained by `requires`, a choice in the second and fourth,
the mini-boss in the fourth and the boss in the fifth, like the side areas. Rewards are interpolated by level from
the existing chains at the same quest position, so they line up with the rest of the game.
Run once from the repo root: python3 tools/content/v5_stories.py"""
import json
P = 'src/data/'
stories = json.load(open(P + 'stories.json'))
bounties = json.load(open(P + 'bounties.json'))
zones = {z['id']: z for z in json.load(open(P + 'zones.json'))}
enemies = {e['id']: e for e in json.load(open(P + 'enemies.json'))}

# Reward curves from the existing five-quest chains: (first level, reward) per quest position.
by_zone = {}
for q in stories: by_zone.setdefault(q['zone'], []).append(q)
curves = {i: [] for i in range(5)}
for zid, qs in by_zone.items():
    if len(qs) != 5: continue
    for i, q in enumerate(qs): curves[i].append((q['minLevel'], q['reward']))
for i in curves: curves[i].sort(key=lambda x: x[0])

def interp(i, level, key):
    pts = [(l, r.get(key, 0)) for l, r in curves[i]]
    if level <= pts[0][0]: return pts[0][1]
    for (l0, v0), (l1, v1) in zip(pts, pts[1:]):
        if l0 <= level <= l1: return v0 + (v1 - v0) * (level - l0) / max(1, l1 - l0)
    return pts[-1][1]

def nearest(i, level):
    return min(curves[i], key=lambda x: abs(x[0] - level))[1]

def reward(i, level):
    r = {'xp': int(round(interp(i, level, 'xp'), -1)), 'gold': int(round(interp(i, level, 'gold'), -1))}
    for k in ('embers', 'items', 'materials'):
        if k in nearest(i, level): r[k] = nearest(i, level)[k]
    return r

N = lambda name, text: {"speaker": "npc", "name": name, "text": text}
R = lambda text: {"speaker": "rider", "text": text}
D = lambda text: {"speaker": "dragon", "text": text}
T = lambda text: {"speaker": "narrator", "text": text}

def chain(zid, npc, quests):
    z = zones[zid]
    out, prev = [], None
    for i, q in enumerate(quests):
        lv = q['level']
        steps = []
        for j, (intro, foes) in enumerate(q['steps']):
            step = {"intro": intro, "enemies": foes, "level": lv + j}
            if i == 3 and j == 1: step['mini'] = True
            if i == 4 and j == 1: step['boss'] = True; step['level'] = z['boss']['level']
            steps.append(step)
        s = {"id": q['id'], "zone": zid, "name": q['name'], "minLevel": lv}
        if prev: s['requires'] = prev
        s.update({"description": q['description'], "steps": steps, "outro": q['outro'], "reward": reward(i, lv)})
        if 'choice' in q:
            prompt, opts = q['choice']
            s['choice'] = {"prompt": prompt, "options": [
                {"id": oid, "label": label, "lines": lines, "reward": rw, "temper": temper} for oid, label, lines, rw, temper in opts]}
        out.append(s); prev = q['id']
    return out

NEW = []
# ---------------- Cinder Pass (12 to 20) ----------------
M = 'Mira the Ash-Walker'
NEW += chain('cinder-pass', M, [
 {'id': 'hot-feet', 'name': 'Hot Feet', 'level': 12, 'description': "Mira guides travelers over the pass. Today her boots melted halfway across.",
  'steps': [([N(M, "Keeper! Don't step there. Or there. Honestly, just step where I step."), R("Why are you hopping?"), N(M, "New boots. Old lava.")], ['ash-lizard']),
            ([T("An imp sits on a warm rock, toasting Mira's other boot on a stick."), D("*sniffs the smoke, sneezes a tiny flame*")], ['ember-imp'])],
  'outro': [N(M, "My boot! Slightly crispy. Still a boot. Thank you, keeper."), T("Mira hops back to the trail, one sock smoking.")]},
 {'id': 'imp-pranks', 'name': 'Imp Pranks', 'level': 14, 'description': "Someone stole the bellows from the pass forge. Someone small, red and giggling.",
  'steps': [([N(M, "The forge is cold. The smith is colder. The imps took the bellows."), R("What do imps want with bellows?"), N(M, "Fun. Always fun.")], ['ember-imp', 'ember-imp']),
            ([T("The bellows wheeze somewhere up the trail. Then a bat coughs out a cloud of smog.")], ['smog-bat', 'ember-imp'])],
  'outro': [T("You find the bellows under a rock, wrapped in a tiny imp blanket."), N(M, "So. Do we give it back to the smith?")],
  'choice': ("What do you do with the bellows?", [
     ('return', "Return them to the smith", [N('Smith Dorran', "My bellows! The forge lives again. Take these embers, warm from the coals.")], {'embers': 3}, 'gentle'),
     ('sell', "Sell them to a passing trader", [T("The trader pays well and doesn't ask. The forge stays cold. Your dragon sighs at you.")], {'gold': 260}, 'proud')])},
 {'id': 'the-snail-road', 'name': 'The Snail Road', 'level': 16, 'description': "A Magma Snail has parked itself across the only road. It is in no hurry.",
  'steps': [([N(M, "That snail has been there since breakfast. Last Tuesday's breakfast."), D("*pokes the snail with a claw, regrets it*")], ['magma-snail']),
            ([T("With the road open, a mole pops out of the ash, and a crow swoops down to see what's shiny.")], ['soot-mole', 'storm-crow'])],
  'outro': [N(M, "The road is open! The snail will be back by spring, but that's spring's problem."), T("Carts rattle over the pass again.")]},
 {'id': 'the-imp-chieftain', 'name': 'The Imp Chieftain', 'level': 17, 'description': "The imps have a leader, and he has a crown. It is a teacup with spikes glued on.",
  'steps': [([N(M, "The Imp Chieftain wants a word. Several words. Mostly rude ones."), R("Then let's answer him.")], ['ember-imp', 'ash-lizard']),
            ([N('Imp Chieftain', "Who dares? I dare! I mean, who dares to stop me daring?"), D("*growls in a way that means 'enough'*")], ['imp-chieftain'])],
  'outro': [N('Imp Chieftain', "Fine! FINE. We'll prank somewhere else. Somewhere colder."), N(M, "He dropped his crown. Well, his teacup.")],
  'choice': ("What about the Chieftain's spiky teacup crown?", [
     ('keep', "Keep it as a trophy", [T("It looks very silly on your shelf. Your dragon guards it proudly.")], {'materials': {'ore': 2}}, 'proud'),
     ('give', "Give it back to the imps", [N('Imp Chieftain', "...thank you. Here. Shiny rocks. Don't tell anyone I was nice.")], {'embers': 3}, 'gentle')])},
 {'id': 'the-magma-wyrm', 'name': 'The Magma Wyrm', 'level': 19, 'description': "The mountain rumbles. The Magma Wyrm is awake, and the whole pass is shaking.",
  'steps': [([N(M, "When the ground shakes like this, the Wyrm is hungry. And grumpy."), T("Lava hisses in the cracks around you.")], ['lava-toad', 'cinder-beetle']),
            ([T("The Magma Wyrm rises from a lake of glowing rock."), N('Magma Wyrm', "Who walks on my roof?"), D("*stands tall and breathes out a long, steady flame*")], [zones['cinder-pass']['boss']['enemy']])],
  'outro': [T("The Wyrm sinks back into the lava, grumbling about manners."), N(M, "Quiet at last. I can finally buy new boots. Fireproof ones."), N(M, "Thank you, keeper. The pass is yours to walk any time.")]},
])
# ---------------- Thunderspire (18 to 28) ----------------
H = 'Shepherd Hale'
NEW += chain('thunderspire', H, [
 {'id': 'runaway-goats', 'name': 'Runaway Goats', 'level': 18, 'description': "Shepherd Hale's goats ran up the mountain at the first thunderclap. All of them.",
  'steps': [([N(H, "Every time it thunders, they bolt. Up. Always up."), R("We'll bring them down.")], ['thunder-goat']),
            ([T("A huge ram blocks the path, very proud of being in the way.")], ['granite-ram'])],
  'outro': [N(H, "Twelve goats home, and only a little singed. You've a way with animals, keeper."), D("*looks smug*")]},
 {'id': 'harpy-gossip', 'name': 'Harpy Gossip', 'level': 20, 'description': "The Cliff Harpies know everyone's secrets, and tell everyone everyone else's.",
  'steps': [([N(H, "The harpies are spreading tales about my goats. Terrible tales. Some are true."), D("*cackles, then pretends it didn't*")], ['cliff-harpy', 'cliff-harpy']),
            ([T("The harpies call in a friend from higher up the cliff.")], ['cliff-harpy', 'gale-hawk'])],
  'outro': [T("A harpy drops a scroll as it flees: a list of every secret on the mountain."), N(H, "Oh my. What do we do with that?")],
  'choice': ("What do you do with the scroll of secrets?", [
     ('burn', "Burn it, unread", [N(H, "Good. Some things should stay up the mountain. Here, from the village, for your kindness.")], {'embers': 3}, 'gentle'),
     ('read', "Read it (just a little)", [T("You learn where an old miner hid his savings. He won't miss it. Probably.")], {'gold': 320}, 'clever')])},
 {'id': 'sparks-in-the-wool', 'name': 'Sparks in the Wool', 'level': 22, 'description': "Spark Sprites have been hiding in the goats' wool. Every hug is a shock.",
  'steps': [([N(H, "I hugged Bessie this morning and my hair is still standing up."), R("Spark Sprites. They love wool.")], ['spark-sprite']),
            ([T("A whole cloud of sprites crackles out of a goat that is very done with today.")], ['spark-sprite', 'thunder-goat'])],
  'outro': [N(H, "Fluffy and safe again. Here, some ore the sprites left behind."), T("Bessie headbutts you gratefully. It still stings a bit.")]},
 {'id': 'the-thunderhead', 'name': 'The Thunderhead', 'level': 24, 'description': "A storm cloud with arms and a bad temper sits on the peak and won't leave.",
  'steps': [([N(H, "That's no ordinary cloud. It has a face. And it's frowning at me."), D("*flaps up to look and comes back damp*")], ['gale-hawk', 'spark-sprite']),
            ([N('The Thunderhead', "RUMBLE. That means go away."), R("We don't speak cloud.")], ['thunderhead'])],
  'outro': [T("The Thunderhead drizzles away into a sulky little mist."), N(H, "Look what it left: a bottle of real lightning. What a thing.")],
  'choice': ("What do you do with the bottled lightning?", [
     ('forge', "Take it to the Forge", [T("It crackles in the coals and leaves a bright crystal behind.")], {'materials': {'crystal': 1}}, 'clever'),
     ('free', "Let it go back to the sky", [N(H, "Kind of you. The sky's been quieter since. Have these, from all of us.")], {'embers': 3}, 'gentle')])},
 {'id': 'the-storm-roc', 'name': 'The Storm Roc', 'level': 27, 'description': "The Storm Roc nests at the very top, and every thunderstorm starts in its wings.",
  'steps': [([N(H, "The Roc is why the goats run. Settle it, and the mountain settles too."), T("Hail rattles off the rocks.")], ['cliff-harpy', 'thunder-goat']),
            ([T("The Storm Roc spreads its wings and the sky goes dark."), N('Storm Roc', "SKREEEE."), D("*roars back, louder*")], [zones['thunderspire']['boss']['enemy']])],
  'outro': [T("The Roc settles into its nest, and the clouds part for the first time in weeks."), N(H, "Sunshine on the Spire! The goats will hardly know what to do."), N(H, "Come back any time, keeper. Bessie will want to see you.")]},
])
# ---------------- Frostmere (26 to 36) ----------------
F = 'Ice-fisher Pell'
NEW += chain('frostmere', F, [
 {'id': 'thin-ice', 'name': 'Thin Ice', 'level': 26, 'description': "Pell fishes the frozen lake. Today something is cracking the ice from below.",
  'steps': [([N(F, "Crack, crack, crack, all morning. Not the good kind of crack."), R("Is there a good kind?")], ['frostbite-hare']),
            ([T("A turtle the size of a cart bumps up through the ice, very pleased with itself.")], ['glacier-turtle'])],
  'outro': [N(F, "The ice holds again. Here, a fish. And some coins, since you don't look like a fish person."), D("*is absolutely a fish person*")]},
 {'id': 'the-yeti-cub', 'name': 'The Yeti Cub', 'level': 28, 'description': "A lost Yeti Cub keeps stealing Pell's catch. The wolves have noticed it too.",
  'steps': [([N(F, "Little rascal took my whole bucket. I'd be angry if it weren't so round."), D("*sniffs the cub; the cub sniffs back*")], ['yeti-cub']),
            ([T("The wolves close in on the cub. The cub hides behind you.")], ['rime-wolf', 'yeti-cub'])],
  'outro': [T("The wolves slink off. The cub looks up at you with enormous eyes."), N(F, "It's chosen you, I think. What now?")],
  'choice': ("What do you do with the Yeti Cub?", [
     ('home', "Walk it home to its family", [T("A very large yeti nods at you from the snowline and leaves a sack of shiny ice at your feet.")], {'materials': {'crystal': 1}}, 'gentle'),
     ('play', "Let it tag along for the day", [T("It plays with your dragon until sunset, then waddles home. Your dragon is thrilled.")], {'embers': 3}, 'bold')])},
 {'id': 'whispers-under-the-ice', 'name': 'Whispers Under the Ice', 'level': 30, 'description': "At night Pell hears voices under the lake. They are asking for his fish.",
  'steps': [([N(F, "'Fiiish,' they say. 'Giiive us fiiish.' I'm not sleeping well, keeper."), T("Pale shapes drift beneath the ice.")], ['ice-wraith']),
            ([T("A wraith rises, a hare clinging to its back for the ride.")], ['ice-wraith', 'frostbite-hare'])],
  'outro': [N(F, "Quiet at last. They left something behind in the ice, too."), T("Frozen in the lake: a lump of ore and a long-lost fishing hook.")]},
 {'id': 'the-rime-alpha', 'name': 'The Rime Alpha', 'level': 32, 'description': "The wolf pack has a leader now, a huge white wolf with ice on its back.",
  'steps': [([N(F, "The pack hunts together now. Smarter. Colder."), R("Then we find the one in charge.")], ['rime-wolf', 'rime-wolf']),
            ([N('Rime Alpha', "*a long howl that frosts the air*"), D("*howls back, slightly off key*")], ['rime-alpha'])],
  'outro': [T("The Alpha backs away and the pack follows it into the snow."), N(F, "It dropped this. A tooth? A very nice tooth.")],
  'choice': ("What do you do with the Alpha's tooth?", [
     ('charm', "Wear it as a charm", [T("It hangs at your neck, cold and lucky. Your dragon thinks you look fierce.")], {'materials': {'ore': 3}}, 'bold'),
     ('trade', "Trade it in the village", [T("The village tanner pays handsomely for a tooth like that.")], {'gold': 350}, 'clever')])},
 {'id': 'the-glacier-hydra', 'name': 'The Glacier Hydra', 'level': 35, 'description': "Deep in the frozen lake sleeps the Glacier Hydra. It is not sleeping any more.",
  'steps': [([N(F, "The lake is groaning, keeper. All three of its heads are waking."), T("The ice splits in a long blue line.")], ['glacier-turtle', 'ice-wraith']),
            ([T("The Glacier Hydra rises, three heads of ice glaring down."), N('Glacier Hydra', "Three heads. One opinion. LEAVE."), D("*takes a deep, warm breath*")], [zones['frostmere']['boss']['enemy']])],
  'outro': [T("The Hydra sinks back into the deep and the lake goes still and clear."), N(F, "I can see every fish in the lake. That feels like cheating."), N(F, "Thank you, keeper. Come fish with me sometime.")]},
])
# ---------------- Deepstone Mines (34 to 42) ----------------
W = 'Foreman Nell'
NEW += chain('deepstone-mines', W, [
 {'id': 'lights-out', 'name': 'Lights Out', 'level': 34, 'description': "Someone keeps blowing out the lanterns in the mine. Someone giggling.",
  'steps': [([N(W, "Third time today. It's dark down there, keeper. Darker than dark."), D("*lights the tunnel with a puff, very helpful*")], ['lantern-gnome']),
            ([T("In the new light, something crunchy and sparkly scuttles toward you.")], ['crystal-crawler'])],
  'outro': [N(W, "Lights on, crew back to work. Here's your pay, and thanks."), T("Somewhere deep below, a gnome blows out a candle out of spite.")]},
 {'id': 'glitter-thieves', 'name': 'Glitter Thieves', 'level': 36, 'description': "The Gemback Lizards are stealing gems right out of the miners' carts.",
  'steps': [([N(W, "They wear the gems on their backs like it's fashion. It IS fashion, but it's our fashion."), R("We'll get them back.")], ['gemback-lizard', 'gemback-lizard']),
            ([T("A lizard dives behind a rusty sprite for cover.")], ['gemback-lizard', 'rust-sprite'])],
  'outro': [T("You gather a pouch of loose gems. Nell eyes it. So does your dragon."), N(W, "Your call, keeper.")],
  'choice': ("What do you do with the pouch of gems?", [
     ('return', "Give them back to the miners", [N(W, "The crew will remember this. They chipped in, look: embers from the deep vein.")], {'embers': 3}, 'gentle'),
     ('hoard', "Let your dragon keep a few", [T("Your dragon sleeps on them that night, very happy. You sell the rest.")], {'gold': 400}, 'proud')])},
 {'id': 'rust-never-sleeps', 'name': 'Rust Never Sleeps', 'level': 37, 'description': "Rust Sprites are eating the mine carts. The tracks are next.",
  'steps': [([N(W, "They nibble iron like it's toffee. Our carts are lace now."), D("*bites a sprite, spits it out, offended*")], ['rust-sprite']),
            ([T("A mole tunnels up under the tracks with a sprite riding on its head.")], ['tunnel-mole', 'rust-sprite'])],
  'outro': [N(W, "Tracks saved. Here, some ore before the sprites come back for it."), T("A cart rolls past, intact. The miners cheer.")]},
 {'id': 'the-foreman-golem', 'name': 'The Foreman Golem', 'level': 39, 'description': "An old golem thinks it runs the mine. It keeps ordering Nell around.",
  'steps': [([N(W, "It says I'm late. I'm the FOREMAN. I decide when late is."), R("Let's go have a talk with it.")], ['crystal-crawler', 'lantern-gnome']),
            ([N('Foreman Golem', "BREAK TIME IS OVER. BACK TO WORK."), D("*sits down on purpose*")], ['foreman-golem'])],
  'outro': [T("The golem powers down with a long, tired creak."), N(W, "It left its clipboard. Huh. It was keeping really good notes.")],
  'choice': ("What do you do with the golem's notes?", [
     ('nell', "Give them to Nell", [N(W, "These are... actually great. Ten new seams marked! Take a share of the first dig.")], {'materials': {'crystal': 1}}, 'clever'),
     ('scrap', "Scrap the golem for parts", [T("Its gears and plates fetch a good price in town.")], {'gold': 500}, 'bold')])},
 {'id': 'the-iron-golem', 'name': 'The Iron Golem', 'level': 41, 'description': "At the bottom of the deepest shaft, something huge and iron is waking.",
  'steps': [([N(W, "We dug too deep, keeper. Every miner's nightmare. It's stomping."), T("Dust falls from the ceiling with every step below.")], ['tunnel-mole', 'gemback-lizard']),
            ([T("The Iron Golem fills the cavern, eyes glowing like furnaces."), N('Iron Golem', "MINE. MINE. ALL OF IT, MINE."), D("*plants its feet and roars*")], [zones['deepstone-mines']['boss']['enemy']])],
  'outro': [T("The Golem slumps against the wall and goes still, a mountain of iron."), N(W, "We'll be mining that thing for years. You've made us all rich, keeper."), N(W, "There's always a lantern lit for you down here.")]},
])
# ---------------- Eclipse Peak (40 to 50) ----------------
I = 'Stargazer Ilo'
NEW += chain('eclipse-peak', I, [
 {'id': 'dawn-and-dusk', 'name': 'Dawn and Dusk', 'level': 40, 'description': "Stargazer Ilo watches the eclipse from the peak. The light and dark keep squabbling.",
  'steps': [([N(I, "Morning and evening can't agree whose turn it is. It's very loud for something so pretty."), R("We'll calm them down.")], ['dawn-sprite']),
            ([T("A bat of pure dusk swoops out of the half-dark, squeaking indignantly.")], ['dusk-bat'])],
  'outro': [N(I, "Balance, for now. Here, keeper. Starlight pays poorly, but it pays."), D("*watches the sky, entranced*")]},
 {'id': 'the-moth-lanterns', 'name': 'The Moth Lanterns', 'level': 42, 'description': "Twilight Moths are stealing the lanterns that light the stair to the peak.",
  'steps': [([N(I, "They love the lights, keeper. They love them right off their hooks."), D("*tries to catch a moth in its mouth*")], ['twilight-moth', 'twilight-moth']),
            ([T("The moths fly into the glow of a dawn sprite, and both turn on you.")], ['twilight-moth', 'dawn-sprite'])],
  'outro': [T("You find the lanterns in a heap, still glowing softly."), N(I, "Shall we hang them back up?")],
  'choice': ("What do you do with the lanterns?", [
     ('hang', "Hang them back on the stair", [N(I, "Lovely. Pilgrims will thank you. And so do I, with these.")], {'embers': 3}, 'gentle'),
     ('moths', "Leave a few for the moths", [T("The moths circle them happily and leave you a little pile of moon-silver.")], {'gold': 600}, 'clever')])},
 {'id': 'knights-of-noon', 'name': 'Knights of Noon', 'level': 44, 'description': "The Sun Knights have declared it always noon. The shadows disagree, loudly.",
  'steps': [([N(I, "The knights won't let the sun set. My stars haven't come out in days."), R("Then it's time for an evening.")], ['sun-knight']),
            ([T("A shade stalker slides out of a knight's own shadow to join the fight.")], ['sun-knight', 'shade-stalker'])],
  'outro': [N(I, "Sunset! Real, proper sunset! Have some ore the knights left behind."), T("The first star blinks on over the peak.")]},
 {'id': 'the-eclipse-herald', 'name': 'The Eclipse Herald', 'level': 46, 'description': "A herald in half-light announces the coming of something big.",
  'steps': [([N(I, "It's shouting from the ridge. 'The eclipse comes!' It's very dramatic."), D("*yawns pointedly*")], ['dusk-bat', 'shade-stalker']),
            ([N('Eclipse Herald', "BOW BEFORE THE DARK THAT IS ALSO THE LIGHT!"), R("Which one is it?")], ['eclipse-herald'])],
  'outro': [T("The Herald drops its horn and flees down the far side of the peak."), N(I, "A herald's horn. It still hums with the eclipse.")],
  'choice': ("What do you do with the Herald's horn?", [
     ('blow', "Blow it, once", [T("A great note rolls over the mountain. Your dragon answers it, proud and loud.")], {'materials': {'crystal': 1}}, 'proud'),
     ('give', "Give it to Ilo", [N(I, "I'll study it for years. Here, all my savings on the stars. Well, most of them.")], {'embers': 3}, 'clever')])},
 {'id': 'the-eclipse-dragon', 'name': 'The Eclipse Dragon', 'level': 49, 'description': "The eclipse is total. In the dark at the top of the world, the Eclipse Dragon waits.",
  'steps': [([N(I, "This is it, keeper. The sun and moon line up, and it wakes."), T("The light goes strange and silver.")], ['twilight-moth', 'sun-knight']),
            ([T("The Eclipse Dragon unfolds, half sun and half shadow."), N('Eclipse Dragon', "Light and dark. Day and night. And you, small thing, in between."), D("*stands between you and it, wings wide*")], [zones['eclipse-peak']['boss']['enemy']])],
  'outro': [T("The eclipse passes. Day and night take turns again, politely."), N(I, "The finest sky I've ever seen. And I've seen a lot of skies."), N(I, "Come back on a clear night, keeper. I'll show you your dragon's star.")]},
])

assert not {s['id'] for s in NEW} & {s['id'] for s in stories}
for s in NEW:
    for step in s['steps']:
        for e in step['enemies']: assert e in enemies, e
stories += NEW

# ---------------- Bounty boards ----------------
def board_gold(level):
    pts = sorted((zones[z]['minLevel'], max(b['reward'].get('gold', 0) for b in pool if b['kind'] == 'defeat')) for z, pool in bounties['pools'].items())
    for (l0, v0), (l1, v1) in zip(pts, pts[1:]):
        if l0 <= level <= l1: return int(round(v0 + (v1 - v0) * (level - l0) / max(1, l1 - l0), -1))
    return pts[-1][1] if level > pts[-1][0] else pts[0][1]

VERBS = {
 'ash-lizard': 'Shoo 4 Ash Lizards off the road', 'cinder-beetle': 'Flip 3 Cinder Beetles', 'ember-imp': 'Catch 4 Ember Imps', 'lava-toad': 'Cool off 3 Lava Toads',
 'smog-bat': 'Clear the air of 3 Smog Bats', 'magma-snail': 'Move 3 Magma Snails off the road', 'soot-mole': 'Sweep up 3 Soot Moles', 'storm-crow': 'Ground 3 Storm Crows',
 'cliff-harpy': 'Hush 4 Cliff Harpies', 'gale-hawk': 'Ground 3 Gale Hawks', 'granite-ram': 'Herd 3 Granite Rams', 'spark-sprite': 'Unplug 4 Spark Sprites', 'thunder-goat': 'Bring down 3 Thunder Goats',
 'frostbite-hare': 'Chase 4 Frostbite Hares', 'glacier-turtle': 'Turn back 3 Glacier Turtles', 'ice-wraith': 'Quiet 3 Ice Wraiths', 'rime-wolf': 'Drive off 3 Rime Wolves', 'yeti-cub': 'Send 3 Yeti Cubs home',
 'crystal-crawler': 'Clear 4 Crystal Crawlers', 'gemback-lizard': 'Recover gems from 3 Gemback Lizards', 'lantern-gnome': 'Relight after 3 Lantern Gnomes', 'rust-sprite': 'Stop 3 Rust Sprites', 'tunnel-mole': 'Block 3 Tunnel Moles',
 'dawn-sprite': 'Settle 4 Dawn Sprites', 'dusk-bat': 'Chase off 3 Dusk Bats', 'shade-stalker': 'Find 3 Shade Stalkers', 'sun-knight': 'Unhorse 3 Sun Knights', 'twilight-moth': 'Net 4 Twilight Moths',
}
SHORT = {'cinder-pass': 'the Pass', 'thunderspire': 'the Spire', 'frostmere': 'Frostmere', 'deepstone-mines': 'the Mines', 'eclipse-peak': 'the Peak'}
for zid in SHORT:
    z = zones[zid]
    gold = board_gold(z['minLevel'])
    regs = []
    for enc in z['encounters']:
        for e in enc['enemies']:
            if e not in regs: regs.append(e)
    pool = []
    mats = [{'materials': {'ore': 2}}, {'embers': 1}, {'embers': 1}, {'materials': {'crystal': 1}}, {'materials': {'ore': 2}}]
    for i, e in enumerate(regs):
        count = int(VERBS[e].split(' ')[VERBS[e].split(' ').index(next(w for w in VERBS[e].split(' ') if w.isdigit()))])
        pool.append({"id": f"{e}-bounty", "kind": "defeat", "count": count, "text": VERBS[e], "reward": {"gold": gold, **mats[i % len(mats)]}, "enemy": e})
    pool.append({"id": f"{zid}-wins", "kind": "wins", "count": 6, "text": f"Win 6 fights in {SHORT[zid]}", "reward": {"gold": int(gold * 1.2 // 10 * 10), "materials": {"ore": 3}}})
    pool.append({"id": f"{zid}-clear", "kind": "clear", "count": 2, "text": f"Finish 2 runs in {SHORT[zid]}", "reward": {"gold": int(gold * 1.4 // 10 * 10), "embers": 2}})
    mini = z['miniBoss']['enemy']
    pool.append({"id": f"{zid}-mini", "kind": "defeat", "count": 1, "text": f"Defeat the {enemies[mini]['name']}", "reward": {"gold": int(gold * 1.2 // 10 * 10), "materials": {"crystal": 1}}, "enemy": mini})
    bounties['pools'][zid] = pool

json.dump(stories, open(P + 'stories.json', 'w'), indent=2, ensure_ascii=False); open(P + 'stories.json', 'a').write('\n')
json.dump(bounties, open(P + 'bounties.json', 'w'), indent=2, ensure_ascii=False); open(P + 'bounties.json', 'a').write('\n')
print('stories', len(NEW), 'boards', len(SHORT))
for s in NEW: print(s['zone'], s['id'], s['minLevel'], [st['level'] for st in s['steps']], s['reward'])
