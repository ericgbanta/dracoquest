"""Chunk 9 (W9 and E12): Starfall Summit (the final area and the final boss) and Dragonsrest (all four new elements,
Behemoth eggs), levels 90 to 100, cap 100, the Eventide spell. No teasers are left after this.
Run from the repo root after chunk 8 is tuned: python3 tools/content/area_gen_90s.py, then tune with scale_enemies.py
and the sim. The analogs are the tuned 80s areas. Rerunning resets the tuned stats, so don't rerun it as it stands."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from arealib import P, A, BIG, BUFF, HEAL, SHIFT, write, add_zone

AREAS = [
 dict(id='starfall-summit', name='Starfall Summit', region='beyond', elements=['light', 'shadow'], lo=90, hi=100, after='hollow-crown', shopEl='light',
      analog=['crown-mole', 'lantern-wraith', 'gemback-armadillo', 'shadow-jester', 'pillar-knight', 'shadow-chancellor', 'hollow-king'],
      blurb='The top of the world, above the clouds, where the falling stars land. Something up here has been catching them.',
      npc='Stargazer Orrin', set=('starforged', 'Starforged', 'Gear forged from fallen stars. A full set makes every blow land like a meteor.', {"agility": 8, "arcana": 8}, {"riderDamagePct": 0.09, "riderHp": 120}),
      enemies=[
       ('star-sprite', 'Star Sprite', 'light', 'A star that fell, bounced, and decided it liked it down here. It is very bright and very rude about it.', [P('star-bonk', 'Star Bonk'), A('twinkle', 'Twinkle', 2, 0.7), BUFF('shine-on', 'Shine On', 'ward')]),
       ('dusk-moth', 'Dusk Moth', 'shadow', 'A fat moth that only comes out at dusk. It eats moonlight and leaves crumbs.', [P('wing-buffet', 'Wing Buffet'), A('dusk-dust', 'Dusk Dust', 2, 0.6, 'blind', 0.5), BUFF('flutter-off', 'Flutter Off', 'fade')]),
       ('meteor-tortoise', 'Meteor Tortoise', 'light', 'Its shell is a meteorite that landed on it a thousand years ago. It has been carrying it ever since, out of pride.', [P('shell-bash', 'Shell Bash'), BIG('meteor-roll', 'Meteor Roll'), BUFF('tuck-in', 'Tuck In', 'harden')]),
       ('nightcap-owl', 'Nightcap Owl', 'shadow', 'Stays up all night counting stars. Gets very cross if you make it lose count.', [P('talon', 'Talon'), A('hoot-of-night', 'Hoot of Night', 2, 0.6, 'blind', 0.5), HEAL('power-nap', 'Power Nap', 0.15)]),
       ('comet-ferret', 'Comet Ferret', 'light', 'Fast as a comet and twice as nosy. It has stolen something from everyone on the mountain.', [P('nip', 'Nip'), A('comet-dash', 'Comet Dash', 2, 0.7), BUFF('zoom', 'Zoom', 'fury')]),
       ('eclipse-sentinel', 'Eclipse Sentinel', 'shadow', 'A stone guardian with a face of sun and shadow. It has guarded the summit since before the mountain was finished.', [P('spear-thrust', 'Spear Thrust'), BIG('eclipse-gaze', 'Eclipse Gaze', 'blind', 0.5), BUFF('halo-guard', 'Halo Guard', 'ward'), HEAL('starlight-mend', 'Starlight Mend', 0.2)]),
       ('vesperax', 'Vesperax', 'light', 'The star that fell. It landed on the summit an age ago, grew a body out of the night sky, and has been catching every falling star since so nobody else can wish on them.', [P('star-claw', 'Star Claw'), A('sunflare-roar', 'Sunflare Roar', 2, 0.8), BIG('meteor-pounce', 'Meteor Pounce'), SHIFT('nightfall', 'Nightfall', 'shadow'), BUFF('mane-of-dawn', 'Mane of Dawn', 'ward'), HEAL('starlight', 'Starlight', 0.12)])],
      gear=dict(setw=('Starforged Blade', 'Starforged Longbow', 'Starforged Comet Staff'), armor='Starforged Night Mantle', trinket='Starforged Eclipse Ring',
                shop=[('dawnsteel-sword', 'Dawnsteel Sword', 'melee', 'Forged at sunrise on the summit. It is always a little warm.'), ('shooting-star-bow', 'Shooting Star Bow', 'ranged', 'Every arrow leaves a short glittering trail. Make a wish.'), ('zenith-staff', 'Zenith Staff', 'magic', 'Topped with a sliver of fallen star. It hums when the sky is clear.')],
                armor2=('stargazers-cloak', "Stargazer's Cloak", "Orrin's spare cloak, embroidered with every constellation, some of them made up."), trinket2=('wishing-shard', 'Wishing Shard', 'A shard of a fallen star. Nobody has wished on it yet. It is waiting for a good one.'),
                forge=('heart-of-the-sky', 'Heart of the Sky', "Forged from the core of Vesperax's last caught star. Hold it up at night and the sky holds still.")),
      tier=93, story=[
       ('the-stargazer', 'The Stargazer', 'Orrin has climbed to the top of the world to count the falling stars. Lately they stop falling halfway down.', [
         (["I've counted every falling star for forty years. Last night: none. Not one made it to the ground."], 'Stargazer Orrin', ['star-sprite'], "A little star with a big attitude bounces down the path and glares at your dragon."),
         ([], None, ['comet-ferret'], "A ferret with a glowing tail streaks past and grabs Orrin's telescope.")],
        "My telescope! Thank you. Something up there is catching the stars, and I mean to find out what.", {"xp": 5400, "gold": 4400, "items": {"mana-tonic": 2}}, None),
       ('counting-the-night', 'Counting the Night', 'The Nightcap Owls are counting stars too, and they say Orrin keeps making them lose count.', [
         (["They've been counting longer than me, to be fair. They're very rude about it, though."], 'Stargazer Orrin', ['nightcap-owl'], "An owl in a nightcap swoops down, furious. It has lost count. Again."),
         ([], None, ['nightcap-owl', 'dusk-moth'], "A fat moth drifts in and eats the moonlight off the rocks, which really does not help.")],
        "We compared notes. The owls agree: the stars stop falling over the summit. Every one.", {"xp": 5500, "gold": 4200},
        ("The oldest Nightcap Owl offers you its count of every star it has ever seen. It is a very, very long list.",
         ('listen', "Listen to the whole count", "It takes all night. The owl is so happy that someone listened that it gives you a little bag of star dust.", {"items": {"potion": 3}, "gold": 1800}, 'gentle'),
         ('chart', "Turn it into a star chart", "Your dragon helps Orrin turn the count into a chart. It shows exactly where the stars go missing. The owls hand over a shining crystal.", {"materials": {"crystal": 3}, "embers": 4}, 'clever'))),
       ('the-meteor-field', 'The Meteor Field', 'A field of fallen stones on the slope. The tortoises carrying them do not want to share.', [
         (["Real meteorites! Old ones, from before whatever is up there started catching them."], 'Stargazer Orrin', ['meteor-tortoise'], "A tortoise with a meteor for a shell turns around very, very slowly, and charges."),
         ([], None, ['meteor-tortoise', 'star-sprite'], "A star sprite rolls down the slope to help its slow friend.")],
        "Look at these. Every one is a star that landed before the catching began. Let's get to the top.", {"xp": 5600, "gold": 4600, "materials": {"ore": 8, "crystal": 3}}, None),
       ('the-eclipse-sentinel', 'The Eclipse Sentinel', 'A gate of standing stones blocks the last climb. A guardian with a face of sun and shadow stands in it.', [
         ([], None, ['dusk-moth', 'comet-ferret'], "The air gets thin and cold as you climb, and the creatures get bolder."),
         (["None pass to the summit. None have passed since the first star fell. Turn back, little dragon."], 'Eclipse Sentinel', ['eclipse-sentinel'], "A tall stone figure steps out of the arch. Half its face glows like the sun. The other half is night.")],
        "The guardian has stepped aside. Up there, at the very top, something huge is waiting with a mouthful of stars.", {"xp": 5700, "gold": 4800, "embers": 7},
        ("The Eclipse Sentinel lowers its spear. It asks what you will do at the top.",
         ('free', "Free the stars", "The sentinel nods slowly and gives you a pale stone from its halo. 'Then go, and let them fall.'", {"materials": {"scale": 1}, "embers": 3}, 'gentle'),
         ('wish', "Make a wish on one", "The sentinel laughs, a sound like grinding rock, and hands you a pouch of star gold. 'Make it a good one.'", {"gold": 3000}, 'clever')), True),
       ('the-star-that-fell', 'The Star That Fell', 'At the top of the world sits Vesperax, the star that fell, guarding every star it has ever caught.', [
         (["It's here. All the stars it caught are in its mane. I can see them shining. Be careful. Please."], 'Stargazer Orrin', ['eclipse-sentinel', 'nightcap-owl'], "The last guardians of the summit gather on the path to the peak."),
         (["I fell. Nobody wished on me. Nobody caught me. So I catch them all now, and nobody gets a wish."], 'Vesperax', ['vesperax'], "A beast made of the night sky rises from the peak. Its mane is the dawn, and every caught star in the world glitters in it.")],
        [(None, "Vesperax sinks down onto the peak. Its golden mane loosens, and the caught stars slip free one by one, until the whole sky is falling."),
         ('Vesperax', "...You caught me. Nobody has ever caught me."),
         (None, "Your dragon nudges the great beast with its nose. Vesperax looks at it for a long time. Then, very quietly, it makes a wish."),
         "Thousands of them, all at once. I'll never finish counting. I don't think I want to.",
         "You started with one small egg, you know. Look at you now, at the top of the world. Every keeper in the land will tell this story.",
         (None, "The stars fall all night. In the morning Vesperax is curled up on the peak, asleep, with your dragon curled up beside it. The world below is quiet and bright. The end... for now.")],
        {"xp": 7400, "gold": 8000, "embers": 20}, None)],
      bounty=[('sprite-catch', 'Catch 5 Star Sprites', 'star-sprite', 5), ('moth-dust', 'Dust off 4 Dusk Moths', 'dusk-moth', 4), ('tortoise-meteors', 'Weigh the meteors on 4 Meteor Tortoises', 'meteor-tortoise', 4), ('owl-count', 'Help 3 Nightcap Owls finish counting', 'nightcap-owl', 3), ('ferret-loot', 'Get back what 3 Comet Ferrets stole', 'comet-ferret', 3)],
      place='starfall'),
 dict(id='dragonsrest', name='Dragonsrest', region='elder-wilds', elements=['aether', 'void', 'blight', 'steel'], lo=90, hi=100, after='the-confluence', shopEl='void',
      eggBreed='behemoth',
      analog=['scald-puff', 'magma-crab', 'glacier-seal', 'monsoon-heron', 'brimstone-newt', 'coral-colossus', 'seethe'],
      blurb='A hidden valley where the very first dragons lived. It has been quiet for a thousand years. Its old guardian would like it to stay that way.',
      npc='Keeper Ysolde', set=('eldest', 'Eldest', 'Gear left behind by the first dragon keepers. A full set lets you stand your ground against anything.', {"strength": 8, "vigor": 8}, {"riderDefense": 9, "healPct": 0.07}),
      enemies=[
       ('wisp-drake', 'Wisp Drake', 'aether', 'The ghost of a baby dragon from long ago, still playing in the valley. It does not know it is a ghost and nobody has told it.', [P('wisp-nip', 'Wisp Nip'), A('starlit-puff', 'Starlit Puff', 2, 0.7, 'silence', 0.5), BUFF('fade-away', 'Fade Away', 'fade')]),
       ('rustback-beetle', 'Rustback Beetle', 'steel', 'Its shell is iron, and the iron is rusty, and the beetle is very sensitive about it.', [P('pincer', 'Pincer'), BIG('iron-charge', 'Iron Charge', 'rend', 0.4), BUFF('shell-up', 'Shell Up', 'harden')]),
       ('moldwing-bat', 'Moldwing Bat', 'blight', 'A bat with mushrooms growing on its head. It thinks they make it look distinguished.', [P('bite', 'Bite'), A('spore-cloud', 'Spore Cloud', 2, 0.6, 'rot', 0.5), HEAL('mushroom-snack', 'Mushroom Snack', 0.15)]),
       ('hush-fox', 'Hush Fox', 'void', 'A fox that shushes everything. Its tail ends in a little hole in the world, and things that fall in are never heard from again.', [P('snap', 'Snap'), A('hush', 'Hush', 2, 0.6, 'hollow', 0.5), BUFF('slip-away', 'Slip Away', 'fade')]),
       ('relic-golem', 'Relic Golem', 'steel+aether', 'A little golem the first keepers built to sweep the nests. It has kept sweeping for a thousand years. The nests are very clean.', [P('clank', 'Clank'), A('rune-flash', 'Rune Flash', 2, 0.7, 'silence', 0.4), BUFF('tighten-bolts', 'Tighten Bolts', 'harden')]),
       ('mossback-keeper', 'Mossback Keeper', 'blight+steel', 'An ancient tortoise who kept the nests before the keepers came. Moss on its shell, a lantern on a stick, and no patience for visitors.', [P('shell-slam', 'Shell Slam'), BIG('rust-bloom', 'Rust Bloom', 'rot', 0.5), BUFF('dig-in', 'Dig In', 'harden'), HEAL('old-moss', 'Old Moss', 0.2)]),
       ('ossarion', 'Ossarion', 'steel+blight', 'The Old Guardian of Dragonsrest, the last of the first dragons. He has guarded the empty nests for a thousand years, and his beard has grown very long.', [P('horn-butt', 'Horn Butt'), A('ancient-roar', 'Ancient Roar', 2, 0.8, 'rend', 0.6), BIG('stomp-of-ages', 'Stomp of Ages', 'rot', 0.4), SHIFT('heavy-as-the-earth', 'Heavy as the Earth', 'void+steel'), BUFF('plated-hide', 'Plated Hide', 'harden'), HEAL('long-rest', 'Long Rest', 0.12)])],
      gear=dict(setw=('Eldest Greatsword', 'Eldest Hornbow', 'Eldest Nest Staff'), armor="Eldest Guardian's Plate", trinket="Eldest Keeper's Lantern",
                shop=[('hollowpoint-blade', 'Hollowpoint Blade', 'melee', 'Its point is a tiny hole in the world. Do not look at it too closely.'), ('silent-bow', 'Silent Bow', 'ranged', 'No twang, no whistle. The arrow just arrives.'), ('nothing-staff', 'Staff of Nothing', 'magic', 'Topped with a perfect little nothing. It is heavier than it looks.')],
                armor2=('nestkeepers-coat', "Nestkeeper's Coat", 'Soft, warm and lined with old dragon down. Smells faintly of eggshell.'), trinket2=('first-scale', 'First Scale', 'A single scale from one of the first dragons. It is still warm, after all this time.'),
                forge=('guardians-beard-clasp', "Guardian's Beard Clasp", "Forged from the iron clasp in Ossarion's beard. He said you could have it. He has a spare.")),
      tier=93, story=[
       ('the-last-keeper', 'The Last Keeper', 'Keeper Ysolde has found the way into Dragonsrest, the valley where dragons began. Something small keeps blocking the path.', [
         (["The old books say the first dragons hatched here. Nobody has seen it in a thousand years. Mind the little ghosts."], 'Keeper Ysolde', ['wisp-drake'], "A see-through baby dragon tumbles out of the mist and squeaks at you."),
         ([], None, ['rustback-beetle'], "An iron beetle trundles across the path and refuses, very firmly, to move.")],
        "We're in. Look at the nests on the cliffs. Hundreds of them. Empty for a thousand years.", {"xp": 5400, "gold": 4400, "items": {"mana-tonic": 2}}, None),
       ('the-mushroom-roost', 'The Mushroom Roost', 'Moldwing Bats have moved into the oldest nests, and mushrooms are growing over everything.', [
         (["Those nests are history! And there are mushrooms on them. Lots of mushrooms."], 'Keeper Ysolde', ['moldwing-bat'], "A bat with two mushrooms on its head hangs upside down and sneers."),
         ([], None, ['moldwing-bat', 'hush-fox'], "A dark fox slips out of the shadows and shushes everyone.")],
        "The nests are clear. Under the moss there are drawings of dragons on the walls. The first keepers drew them.", {"xp": 5500, "gold": 4200},
        ("A small Moldwing Bat is still clinging to one of the old nests. It says it was born there.",
         ('stay', "Let it stay in its nest", "It squeaks happily. Ysolde laughs and says the nests were always meant for someone small. She gives you her spare potions.", {"items": {"potion": 3}, "gold": 1800}, 'gentle'),
         ('copy', "Copy the drawings under it", "Your dragon holds the bat while you copy the drawings. They show where the first dragons went. Ysolde gives you a crystal from the nest.", {"materials": {"crystal": 3}, "embers": 4}, 'clever'))),
       ('the-sweeping-golems', 'The Sweeping Golems', 'Little golems are still sweeping the nests, a thousand years after anyone told them to stop.', [
         (["The first keepers built them. Look, they're still sweeping! They do not like being interrupted."], 'Keeper Ysolde', ['relic-golem'], "A boxy little golem sweeps right up to your boots, stops, and glows."),
         ([], None, ['relic-golem', 'rustback-beetle'], "A rusty beetle rolls in to help. The golem tries to sweep it up.")],
        "We switched them off, gently. One of them had a keeper's journal in its chest. Listen to this.", {"xp": 5600, "gold": 4600, "materials": {"ore": 8, "crystal": 3}}, None),
       ('the-mossback-keeper', 'The Mossback Keeper', 'The path to the heart of the valley goes past an ancient tortoise. It was keeping the nests long before the keepers came.', [
         ([], None, ['hush-fox', 'wisp-drake'], "The mist gets thicker. The little ghosts follow you, giggling."),
         (["Visitors. Hmph. The last visitors were a thousand years ago. They didn't wipe their feet either."], 'Mossback Keeper', ['mossback-keeper'], "A huge mossy tortoise lifts its lantern and squints at you.")],
        "The tortoise has let us by. It says the Old Guardian is waiting at the heart of the valley, and that he will not be pleased.", {"xp": 5700, "gold": 4800, "embers": 7},
        ("The Mossback Keeper asks if you will tell the world that Dragonsrest is still here.",
         ('secret', "Keep it a secret", "The old tortoise nods slowly and gives you a scale it has kept under its moss for a thousand years.", {"materials": {"scale": 1}, "embers": 3}, 'gentle'),
         ('tell', "Tell the keepers in town", "The tortoise grumbles, but gives you a sack of old keeper coins for the trip. 'Tell them to wipe their feet.'", {"gold": 3000}, 'clever')), True),
       ('the-old-guardian', 'The Old Guardian', 'At the heart of Dragonsrest, among the oldest nests, waits Ossarion, the last of the first dragons.', [
         (["That's him. Ossarion. The books say he was the first dragon ever to hatch. He's been alone here a very long time."], 'Keeper Ysolde', ['mossback-keeper', 'relic-golem'], "The last guardians of the valley stand together in front of the oldest nest."),
         (["Go home, little keeper. The nests are empty. The first dragons are gone. Let an old dragon rest."], 'Ossarion', ['ossarion'], "A huge armored dragon heaves himself up from the oldest nest. Moss slides off his back, and his long white beard sweeps the ground.")],
        [(None, "Ossarion sits down heavily in the oldest nest. He looks at your dragon for a long time, and his eyes go soft."),
         ('Ossarion', "You fight like the first ones did. Together. I thought nobody remembered how."),
         "He wasn't guarding the nests from us. He was waiting for someone to come back.",
         (None, "Ossarion lifts one huge foot. Under it, warm and safe, is a heavy, round egg. He nudges it toward you."),
         ('Ossarion', "The last egg of Dragonsrest. Raise it well, keeper. Bring it home sometimes."),
         (None, "When you leave, the old guardian is already asleep in his nest, snoring softly, and the little ghosts are curled up in his beard.")],
        {"xp": 7400, "gold": 8000, "embers": 20}, None)],
      bounty=[('wisp-play', 'Play tag with 5 Wisp Drakes', 'wisp-drake', 5), ('beetle-polish', 'Polish 4 Rustback Beetles', 'rustback-beetle', 4), ('bat-trim', 'Trim the mushrooms off 4 Moldwing Bats', 'moldwing-bat', 4), ('fox-noise', 'Make 3 Hush Foxes jump', 'hush-fox', 3), ('golem-rest', 'Give 3 Relic Golems a rest', 'relic-golem', 3)],
      place='dragonsrest'),
]


def regions_fn(regions):
    add_zone(regions, 'beyond', 'starfall-summit', [0.66, 0.15])
    add_zone(regions, 'elder-wilds', 'dragonsrest', [0.62, 0.17])
    regions['upcoming'] = [u for u in regions['upcoming'] if u['name'] not in ('Starfall Summit', 'Dragonsrest')]


SPELLS = [{"id": "eventide", "name": "Eventide", "kind": "damage", "level": 93, "element": "shadow", "status": "blind", "statusChance": 0.4, "base": 37, "mp": 13,
           "description": "The whole evening falls on one enemy at once, and may Blind it. Hits very hard. Strong against Light."}]

if __name__ == '__main__':
    write(AREAS, ['sunken-spires', 'rotroot-thicket', 'emberwild', 'steelspine-range', 'skyreach-isles', 'twilight-rift', 'hollow-crown', 'the-confluence', 'starfall-summit', 'dragonsrest'], regions_fn, 100, SPELLS)
