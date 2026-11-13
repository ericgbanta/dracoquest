"""Chunk 8 (W8 and E11): Hollow Crown and The Confluence (hybrid enemies), levels 80 to 90, cap 90, the Daybreak spell.
Run from the repo root after chunk 7 is tuned: python3 tools/content/area_gen_80s.py, then tune with scale_enemies.py
and the sim. The analogs are the tuned 70s areas. Rerunning resets the tuned stats, so don't rerun it as it stands."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from arealib import P, A, BIG, BUFF, HEAL, SHIFT, write, add_zone

AREAS = [
 dict(id='hollow-crown', name='Hollow Crown', region='beyond', elements=['stone', 'shadow'], lo=80, hi=90, after='skyreach-isles', shopEl='shadow',
      analog=['gust-sprite', 'sunwing-moth', 'cloud-ram', 'prism-hawk', 'sky-eel', 'sunscale-griffin', 'aurelith'],
      blurb='An underground kingdom, lost in the dark for a thousand years. The halls are grand, the torches are out, and something is still sitting on the throne.',
      npc='Lamplighter Tamsin', set=('deepcrown', 'Deepcrown', "Royal gear from the lost kingdom's vaults. A full set turns you into a walking fortress.", {"strength": 7, "vigor": 7}, {"riderDefense": 8, "riderHp": 150}),
      enemies=[
       ('crown-mole', 'Crown Mole', 'stone', 'A mole wearing a bottle cap for a crown. It believes it is the rightful king. Nobody has argued.', [P('dig-claw', 'Dig Claw'), A('pebble-toss', 'Pebble Toss', 2, 0.7, 'crack', 0.5), BUFF('royal-huff', 'Royal Huff', 'fury')]),
       ('lantern-wraith', 'Lantern Wraith', 'shadow', 'A little ghost carrying a lantern full of darkness. It lights the way to nowhere.', [P('cold-touch', 'Cold Touch'), A('dark-flicker', 'Dark Flicker', 2, 0.6, 'blind', 0.5), BUFF('snuff-out', 'Snuff Out', 'fade')]),
       ('gemback-armadillo', 'Gemback Armadillo', 'stone', 'Its shell is studded with gems. It rolls up into a ball whenever anyone looks at it greedily.', [P('scratch', 'Scratch'), BIG('gem-roll', 'Gem Roll', 'crack', 0.4), BUFF('curl-up', 'Curl Up', 'harden')]),
       ('shadow-jester', 'Shadow Jester', 'shadow', "The shadow of the old court jester. The jester left a thousand years ago. The shadow stayed for the jokes.", [P('bonk', 'Bladder Bonk'), A('pratfall', 'Pratfall', 2, 0.6, 'blind', 0.5), HEAL('take-a-bow', 'Take a Bow', 0.15)]),
       ('pillar-knight', 'Pillar Knight', 'stone', 'A suit of stone armor still guarding a door that fell down centuries ago.', [P('halberd', 'Halberd Swing'), BIG('shield-slam', 'Shield Slam', 'crack', 0.4), BUFF('stand-guard', 'Stand Guard', 'harden')]),
       ('shadow-chancellor', 'Shadow Chancellor', 'shadow', "The king's old advisor, now mostly cloak and whispers. Still taking notes on everyone.", [P('quill-jab', 'Quill Jab'), BIG('dread-decree', 'Dread Decree', 'blind', 0.5), BUFF('fold-away', 'Fold Away', 'fade'), HEAL('ink-mend', 'Ink Mend', 0.2)]),
       ('hollow-king', 'Hollow King', 'stone', 'A giant king of stone on a throne of stone, with a crown and nothing underneath it. He has waited a thousand years for someone to bow.', [P('scepter', 'Scepter Smash'), A('royal-quake', 'Royal Quake', 2, 0.8, 'crack', 0.6), BIG('throne-slam', 'Throne Slam'), SHIFT('crown-of-night', 'Crown of Night', 'shadow'), BUFF('stone-robes', 'Stone Robes', 'harden'), HEAL('royal-rest', 'Royal Rest', 0.12)])],
      gear=dict(setw=('Deepcrown Warhammer', 'Deepcrown Crossbow', 'Deepcrown Lantern Staff'), armor="Deepcrown King's Mail", trinket="Deepcrown Chancellor's Quill",
                shop=[('nightglass-sword', 'Nightglass Sword', 'melee', 'Black glass from the deepest mine. It never reflects anything, not even you.'), ('duskstring-bow', 'Duskstring Bow', 'ranged', 'Strung with a thread of shadow. Silent as a held breath.'), ('gloomlight-scepter', 'Gloomlight Scepter', 'magic', 'It glows, but darkly. Your eyes hurt in a cozy way.')],
                armor2=('delvers-coat', "Delver's Coat", 'Many pockets, all of them full of string, chalk and emergency biscuits.'), trinket2=('everburning-candle', 'Everburning Candle', 'It never goes out. You have tried. Everyone has tried.'),
                forge=('crown-of-echoes', 'Crown of Echoes', "A circlet forged from the Hollow King's crown. Say something into it and the kingdom whispers back.")),
      tier=83, story=[
       ('the-last-lamplighter', 'The Last Lamplighter', 'Tamsin lights the lamps of a kingdom nobody lives in. Something keeps putting them out again.', [
         (["Four hundred lamps. I light them every morning. By lunch they're all out again."], 'Lamplighter Tamsin', ['lantern-wraith'], "A little ghost floats past a lamp and blows it out, giggling."),
         ([], None, ['crown-mole'], "A mole in a bottle-cap crown pops out of the floor. It looks deeply offended that you are standing on its kingdom.")],
        "The lamps stay lit! Well, most of them. One mole keeps eating the wicks.", {"xp": 4600, "gold": 3600, "items": {"mana-tonic": 2}}, None),
       ('the-jesters-joke', "The Jester's Joke", 'A shadow is telling jokes in the great hall. They are very bad, and it will not stop.', [
         (["Why did the stone cross the road? It didn't. It's a stone. That's the joke. I've heard it four hundred times."], 'Lamplighter Tamsin', ['shadow-jester'], "A shadow in a floppy hat cartwheels across the wall and bows."),
         ([], None, ['shadow-jester', 'lantern-wraith'], "A lantern wraith floats in to laugh at the jokes. It's the only one who does.")],
        "Silence. Wonderful silence. Though I'll admit I'll miss the one about the cheese.", {"xp": 4700, "gold": 3400},
        ("The Shadow Jester sits down, sad. Nobody has laughed in a thousand years.",
         ('laugh', "Laugh at its best joke", "It's terrible. You laugh anyway. The shadow does a happy little dance and Tamsin brings out her biscuits.", {"items": {"potion": 3}, "gold": 1500}, 'gentle'),
         ('teach', "Teach it a new joke", "Your dragon tells the one about the knight and the soup. The jester is delighted and hands over a glittering prop crown.", {"materials": {"crystal": 3}, "embers": 3}, 'clever'))),
       ('the-treasury', 'The Treasury', 'The old royal treasury is full of gems. It is also full of armadillos who think the gems are theirs.', [
         (["Don't touch the gems. I mean it. The armadillos bite."], 'Lamplighter Tamsin', ['gemback-armadillo'], "A pile of gems stands up, unrolls and glares at you."),
         ([], None, ['gemback-armadillo', 'pillar-knight'], "A stone knight clanks in from the doorway it has been guarding for nine hundred years.")],
        "The armadillos went back to sleep on their gems. Fair enough. They were here first.", {"xp": 4800, "gold": 3800, "materials": {"ore": 7, "crystal": 3}}, None),
       ('the-shadow-chancellor', 'The Shadow Chancellor', "Somebody is still running the kingdom. Tamsin has found a thousand years of very neat notes.", [
         ([], None, ['pillar-knight', 'crown-mole'], "The guards of the throne room step out to stop you."),
         (["You have no appointment. Nobody has had an appointment for a thousand years. Fill in this form."], 'Shadow Chancellor', ['shadow-chancellor'], "A tall cloak unfolds from the shadows, quill in hand, and looks at you over invisible glasses.")],
        "It's gone quiet. The notes stop at today. Now there's only the king himself.", {"xp": 4900, "gold": 4000, "embers": 6},
        ("The Shadow Chancellor offers you its book of notes about everyone in the kingdom.",
         ('keep', "Keep it safe for the kingdom", "You put it back on the shelf where it belongs. The chancellor bows and leaves you a royal seal.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('sell', "Sell it to a historian", "A historian in town pays a small fortune for it and promises not to read the rude bits.", {"gold": 2600}, 'clever')), True),
       ('the-hollow-king', 'The Hollow King', 'On a throne at the heart of the kingdom sits a king of stone, and he has finally noticed you.', [
         (["Whatever you do, don't sit on the throne. And maybe don't bow either. I'm not sure what he wants."], 'Lamplighter Tamsin', ['shadow-jester', 'shadow-chancellor'], "The last loyal subjects of the kingdom gather in the throne room."),
         (["At last. Someone has come to bow. ...You are not bowing."], 'Hollow King', ['hollow-king'], "The stone king rises from his throne. Dust pours off him. There is nothing under his crown, and yet he is looking right at you.")],
        "The Hollow King sits back down and takes off his crown. He sets it on the floor in front of your dragon. Then, very slowly, he bows. Tamsin lights the last lamp in the throne room.", {"xp": 6300, "gold": 6800, "embers": 16}, None)],
      bounty=[('mole-crowns', 'Collect 5 Crown Mole crowns', 'crown-mole', 5), ('wraith-lamps', 'Relight lamps after 4 Lantern Wraiths', 'lantern-wraith', 4), ('armadillo-gems', 'Count the gems on 4 Gemback Armadillos', 'gemback-armadillo', 4), ('jester-hush', 'Hush 3 Shadow Jesters', 'shadow-jester', 3), ('knight-relieve', 'Relieve 3 Pillar Knights of duty', 'pillar-knight', 3)],
      place='crown'),
 dict(id='the-confluence', name='The Confluence', region='elder-wilds', elements=['fire', 'tide'], lo=80, hi=90, after='twilight-rift', shopEl='tide',
      eggHybrids=[['fire', 'tide'], ['fire', 'stone'], ['frost', 'tide'], ['storm', 'tide'], ['stone', 'tide']],
      analog=['star-mote', 'null-hound', 'comet-lizard', 'empty-coat', 'orbit-jelly', 'gloam-stalker', 'nyxaris'],
      blurb="Where lava runs into the sea and the wild elements mix. Everything here is two things at once, and most of it is hot.",
      npc='Alchemist Brindle', set=('wellspring', 'Wellspring', 'Gear tempered in the boiling springs. A full set hits hard and bounces back.', {"strength": 7, "arcana": 7}, {"riderDamagePct": 0.08, "healPct": 0.06}),
      enemies=[
       ('scald-puff', 'Scald Puff', 'fire+tide', "A little cloud of steam with a kettle's temper. It whistles when it's angry, which is always.", [P('puff', 'Puff'), A('scald', 'Scald', 2, 0.7, 'burn', 0.5), BUFF('steam-up', 'Steam Up', 'fade')]),
       ('magma-crab', 'Magma Crab', 'fire+stone', 'A crab with a shell of cooling lava. Its pinches are hot. Its hugs are worse.', [P('pinch', 'Pinch'), BIG('lava-claw', 'Lava Claw', 'burn', 0.4), BUFF('crust-over', 'Crust Over', 'harden')]),
       ('glacier-seal', 'Glacier Seal', 'frost+tide', 'A round seal with a little iceberg on its back. Sleepy until it is not.', [P('belly-flop', 'Belly Flop'), A('ice-spray', 'Ice Spray', 2, 0.6, 'chill', 0.5), HEAL('nap', 'Nap', 0.15)]),
       ('monsoon-heron', 'Monsoon Heron', 'storm+tide', 'Brings the rain wherever it goes. It has never once been dry and is quite smug about it.', [P('beak-stab', 'Beak Stab'), A('downpour', 'Downpour', 2, 0.6, 'soak', 0.5), A('thunderclap', 'Thunderclap', 1, 0.5, 'shock', 0.4)]),
       ('brimstone-newt', 'Brimstone Newt', 'fire+blight', 'Smells of rotten eggs and burnt toast. Very proud of both.', [P('nibble', 'Nibble'), A('sulfur-spit', 'Sulfur Spit', 2, 0.6, 'rot', 0.5), BUFF('stink-up', 'Stink Up', 'fury')]),
       ('coral-colossus', 'Coral Colossus', 'stone+tide', 'A giant made of living reef. Small fish live in its armpits and pay no rent.', [P('reef-fist', 'Reef Fist'), BIG('tidal-crush', 'Tidal Crush', 'soak', 0.5), BUFF('barnacle-up', 'Barnacle Up', 'harden'), HEAL('tide-pool', 'Tide Pool', 0.2)]),
       ('seethe', 'Seethe', 'fire+tide', 'A great serpent with two heads, one of lava and one of sea water. They have been arguing for three hundred years, and the steam has never stopped.', [P('double-bite', 'Double Bite'), A('boiling-breath', 'Boiling Breath', 2, 0.8, 'burn', 0.6), BIG('geyser-slam', 'Geyser Slam', 'soak', 0.4), SHIFT('cool-to-stone', 'Cool to Stone', 'fire+stone'), BUFF('steam-shroud', 'Steam Shroud', 'fade'), HEAL('hot-spring', 'Hot Spring', 0.12)])],
      gear=dict(setw=('Wellspring Trident', 'Wellspring Geyser Bow', 'Wellspring Kettle Staff'), armor='Wellspring Hydra Scale', trinket='Wellspring Coral Heart',
                shop=[('undertow-blade', 'Undertow Blade', 'melee', 'Pulls a little toward the sea, wherever you are.'), ('sea-spray-bow', 'Sea Spray Bow', 'ranged', 'Every shot comes with a fine salty mist.'), ('whirlpool-staff', 'Whirlpool Staff', 'magic', 'Stir your tea with it and the tea stirs back.')],
                armor2=('steamproof-apron', 'Steamproof Apron', "Brindle's spare apron. Stained in eleven elements."), trinket2=('mixing-vial', 'Mixing Vial', 'Two liquids that never quite mix, swirling forever. Calming to watch.'),
                forge=('twinflow-locket', 'Twinflow Locket', "Forged from a scale off each of Seethe's heads. One side is warm and one side is cool.")),
      tier=83, story=[
       ('the-alchemists-kettle', "The Alchemist's Kettle", 'Alchemist Brindle studies the place where fire and water meet. Her kettle has run away.', [
         (["It's a very good kettle. It whistles. It walks, apparently. And now it has friends."], 'Alchemist Brindle', ['scald-puff'], "A puff of steam whistles at you furiously from the top of a rock."),
         ([], None, ['magma-crab'], "A crab of glowing lava sidles out of the spring, holding Brindle's kettle like a prize.")],
        "My kettle! A little dented, but it still whistles. Here, for your trouble.", {"xp": 4600, "gold": 3600, "items": {"mana-tonic": 2}}, None),
       ('the-iceberg-nap', 'The Iceberg Nap', 'Glacier Seals have taken over the warm springs for a nap, and the springs are freezing over.', [
         (["They're lovely. They're adorable. They are freezing my laboratory solid."], 'Alchemist Brindle', ['glacier-seal'], "A round seal with an iceberg on its back opens one sleepy eye."),
         ([], None, ['glacier-seal', 'monsoon-heron'], "A heron stalks in, dripping, and the rain starts.")],
        "The springs are steaming again. The seals have gone to find a nicer cold spot.", {"xp": 4700, "gold": 3400},
        ("The smallest Glacier Seal won't leave. It has found the warmest rock in the Confluence and it is very comfortable.",
         ('share', "Let it keep the rock", "It sighs happily and goes back to sleep. Brindle hands you a box of warming tonics.", {"items": {"potion": 3}, "gold": 1500}, 'gentle'),
         ('ice', "Ask it for a bit of its iceberg", "It grumbles, but snaps off a shard of ancient ice. Brindle is thrilled; it's full of old crystals.", {"materials": {"crystal": 3}, "embers": 3}, 'clever'))),
       ('the-stink', 'The Stink', 'Something smells awful near the sulfur pools. Brindle has a strong nose and a weak stomach.', [
         (["Rotten eggs. Burnt toast. And... is that old socks? I'll wait here."], 'Alchemist Brindle', ['brimstone-newt'], "A small newt waddles out of a yellow cloud, looking very pleased with itself."),
         ([], None, ['brimstone-newt', 'scald-puff'], "A puff of steam blows the smell right at you.")],
        "The air's clearing. I can smell the sea again. Mostly.", {"xp": 4800, "gold": 3800, "materials": {"ore": 7, "crystal": 3}}, None),
       ('the-coral-colossus', 'The Coral Colossus', 'A reef has stood up and walked out of the sea. It is blocking the only path to the boiling heart of the Confluence.', [
         ([], None, ['magma-crab', 'monsoon-heron'], "The shore bubbles and hisses as you go."),
         (["This is a reef. Reefs do not move. I have moved. I regret it."], 'Coral Colossus', ['coral-colossus'], "A giant of living coral heaves itself out of the water, little fish darting out of its armpits.")],
        "It's lying down in the shallows again, happier. Now there's only Seethe.", {"xp": 4900, "gold": 4000, "embers": 6},
        ("The Coral Colossus asks you to take the fish living in its armpits somewhere nicer.",
         ('move', "Carry them to a quiet lagoon", "The fish dart off into the lagoon. The colossus gives you a piece of its oldest coral.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('market', "Sell them as pets in town", "They're very popular. The colossus is relieved, and you are richer.", {"gold": 2600}, 'clever')), True),
       ('seethe', 'Seethe', 'In the boiling heart of the Confluence lives Seethe, the two-headed serpent. Their argument is about to boil the sea dry.', [
         (["One head wants the sea. One head wants the volcano. They need someone to tell them they're both right."], 'Alchemist Brindle', ['glacier-seal', 'coral-colossus'], "The last creatures of the springs crowd the path to the heart."),
         (["FIRE!", "WATER!"], 'Seethe', ['seethe'], "A great serpent rises from the boiling lake. Its left head glows like lava. Its right head pours like the sea. Both of them are shouting.")],
        "Seethe's two heads look at each other for the first time in three hundred years. Then they look at your dragon, and both of them laugh. The steam clears. Brindle writes everything down, and then she laughs too.", {"xp": 6300, "gold": 6800, "embers": 16}, None)],
      bounty=[('puff-cool', 'Cool down 5 Scald Puffs', 'scald-puff', 5), ('crab-pinch', 'Out-pinch 4 Magma Crabs', 'magma-crab', 4), ('seal-wake', 'Wake 4 Glacier Seals', 'glacier-seal', 4), ('heron-dry', 'Dry off 3 Monsoon Herons', 'monsoon-heron', 3), ('newt-air', 'Air out 3 Brimstone Newts', 'brimstone-newt', 3)],
      place='confluence'),
]


def regions_fn(regions):
    add_zone(regions, 'beyond', 'hollow-crown', [0.25, 0.31])
    add_zone(regions, 'elder-wilds', 'the-confluence', [0.29, 0.43])
    regions['upcoming'] = [u for u in regions['upcoming'] if u['name'] not in ('Hollow Crown', 'The Confluence', 'Starfall Summit', 'Dragonsrest')]
    regions['upcoming'] += [
      {"name": "Starfall Summit", "region": "beyond", "minLevel": 90, "maxLevel": 100, "gate": "hollow-crown", "elements": ["light", "shadow"], "blurb": "Where the stars land. The final climb.", "pin": [0.66, 0.15]},
      {"name": "Dragonsrest", "region": "elder-wilds", "minLevel": 90, "maxLevel": 100, "gate": "the-confluence", "elements": ["aether", "void", "blight", "steel"], "blurb": "The home of the first dragons.", "pin": [0.62, 0.17]}]


SPELLS = [{"id": "daybreak", "name": "Daybreak", "kind": "damage", "level": 83, "element": "light", "base": 34, "mp": 12,
           "description": "The first light of morning, all at once, on one enemy. Hits very hard. Strong against Shadow."}]

if __name__ == '__main__':
    write(AREAS, ['sunken-spires', 'rotroot-thicket', 'emberwild', 'steelspine-range', 'skyreach-isles', 'twilight-rift', 'hollow-crown', 'the-confluence'], regions_fn, 90, SPELLS)
