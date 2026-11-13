"""Chunk 7 (W7 and E10): Skyreach Isles and Twilight Rift, levels 70 to 80, cap 80, the Astral Nova spell.
Run from the repo root: python3 tools/content/area_gen_70s.py, then tune with scale_enemies.py and the sim.
Rerunning resets the tuned stats to the 60s analogs, so don't rerun it as it stands."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from arealib import P, A, BIG, BUFF, HEAL, SHIFT, write, add_zone

AREAS = [
 dict(id='skyreach-isles', name='Skyreach Isles', region='beyond', elements=['storm', 'light'], lo=70, hi=80, after='emberwild', shopEl='light',
      analog=['cinder-monkey', 'flame-lily', 'magma-tortoise', 'jungle-raptor', 'ember-parrot', 'vine-tyrant', 'volcanadon'],
      blurb='Floating islands of sun and wind, high above the clouds. The view is wonderful. Try not to look down.',
      npc='Captain Wynn', set=('galeborn', 'Galeborn', 'Sky-sailor gear from the isles. A full set makes you quick and very hard to pin down.', {"agility": 6, "arcana": 6}, {"riderDamagePct": 0.08, "riderCrit": 0.04}),
      enemies=[
       ('gust-sprite', 'Gust Sprite', 'storm', 'A little whirl of wind with eyes. It steals hats, and it has a lot of hats.', [P('buffet', 'Buffet'), A('static-puff', 'Static Puff', 2, 0.7, 'shock', 0.5), BUFF('whirl', 'Whirl Away', 'fade')]),
       ('sunwing-moth', 'Sunwing Moth', 'light', 'A moth the size of a sail. It has finally found the brightest lamp of all: the sun.', [P('wing-slap', 'Wing Slap'), A('dazzle-dust', 'Dazzle Dust', 2, 0.6, 'blind', 0.5), HEAL('bask', 'Bask', 0.15)]),
       ('cloud-ram', 'Cloud Ram', 'storm', 'A fluffy ram made of thundercloud. Its headbutts come with a free haircut.', [P('headbutt', 'Headbutt'), BIG('thunder-charge', 'Thunder Charge', 'shock', 0.4), BUFF('fluff-up', 'Fluff Up', 'harden')]),
       ('prism-hawk', 'Prism Hawk', 'light', 'Its feathers bend the light, so there always seem to be three of it.', [P('talon', 'Talon Swipe'), BIG('sun-dive', 'Sun Dive', 'blind', 0.4), BUFF('glint', 'Glint', 'fury')]),
       ('sky-eel', 'Sky Eel', 'storm', 'Swims through the clouds as if they were water. It is very confused by actual water.', [P('nip', 'Nip'), A('spark-coil', 'Spark Coil', 2, 0.6, 'shock', 0.5), A('slither', 'Slither', 1, 0.5, 'blind', 0.4)]),
       ('sunscale-griffin', 'Sunscale Griffin', 'light', 'Half eagle, half lion, all show-off. It polishes its own feathers between fights.', [P('beak', 'Beak Strike'), BIG('dawn-pounce', 'Dawn Pounce', 'blind', 0.5), BUFF('preen', 'Preen', 'fury'), HEAL('sunbathe', 'Sunbathe', 0.2)]),
       ('aurelith', 'Aurelith', 'storm', 'A whale as big as an island that swims through the sky. It carries three islands on its back and is tired of all of them.', [P('fluke', 'Fluke Slap'), A('thunder-spout', 'Thunder Spout', 2, 0.8, 'shock', 0.6), BIG('sky-breach', 'Sky Breach'), SHIFT('sun-song', 'Sun Song', 'light'), BUFF('cloud-coat', 'Cloud Coat', 'harden'), HEAL('deep-breath', 'Deep Breath', 0.12)])],
      gear=dict(setw=('Galeborn Cutlass', 'Galeborn Harpoon Bow', 'Galeborn Compass Staff'), armor='Galeborn Whalehide Coat', trinket='Galeborn Griffin Feather',
                shop=[('dawnsteel-saber', 'Dawnsteel Saber', 'melee', 'Polished so bright you can comb your hair in it. Many do.'), ('sunray-bow', 'Sunray Bow', 'ranged', 'The arrows leave a trail of warm light.'), ('halo-rod', 'Halo Rod', 'magic', 'A ring of light floats above the tip. It hums when happy.')],
                armor2=('skysail-jacket', 'Skysail Jacket', 'Cut from an old sail. Catches the wind in all the right places.'), trinket2=('weathervane-charm', 'Weathervane Charm', 'Always points toward trouble. Useful, and a little alarming.'),
                forge=('whalesong-pearl', 'Whalesong Pearl', "A pearl Aurelith gave you, forged into a pendant. Hold it to your ear and you can hear the sky.")),
      tier=73, story=[
       ('the-lost-hats', 'The Lost Hats', "Captain Wynn sails a skyship between the isles. Something keeps stealing her crew's hats.", [
         (["Every hat on my ship is gone. Every one! A sailor without a hat is just a person on a boat."], 'Captain Wynn', ['gust-sprite'], "A little whirlwind spins past, wearing four hats at once."),
         ([], None, ['sky-eel'], "Something long and sparkling slides out of a cloud, a feathered hat on its head.")],
        "Hats! Hats everywhere! The crew is so happy. Have this, with my thanks.", {"xp": 3600, "gold": 2800, "items": {"mana-tonic": 2}}, None),
       ('moths-in-the-sails', 'Moths in the Sails', 'Sunwing Moths have found the ship. They think the sails are the most delicious thing in the sky.', [
         (["My sails! They're eating my sails! In broad daylight!"], 'Captain Wynn', ['sunwing-moth'], "A moth as big as a sail flutters down and takes a bite out of the mainsail."),
         ([], None, ['sunwing-moth', 'prism-hawk'], "A Prism Hawk dives in, hoping for a moth snack. It doesn't mind which side it's on.")],
        "The sails are full of holes, but they still fly. Mostly they whistle now.", {"xp": 3700, "gold": 2600},
        ("The smallest Sunwing Moth lands on your dragon's nose and won't let go.",
         ('lamp', "Give it the ship's old lamp", "It curls around the lamp and glows with joy. Wynn gives you a crate from the hold for being kind.", {"items": {"potion": 3}, "gold": 1100}, 'gentle'),
         ('chase', "Shoo it off into the sun", "It flies straight up into the sunlight and drops a glittering scale as it goes.", {"materials": {"crystal": 2}, "embers": 3}, 'bold'))),
       ('the-ram-stampede', 'The Ram Stampede', 'A herd of Cloud Rams is stampeding across the isles, and every step comes with thunder.', [
         (["They're running toward the market island. The market is made of glass."], 'Captain Wynn', ['cloud-ram'], "A ram of dark cloud lowers its head. Lightning crackles between its horns."),
         ([], None, ['cloud-ram', 'gust-sprite'], "The wind picks up behind the herd, pushing them faster.")],
        "The market is safe. Well, one window broke. It was already a bit cracked.", {"xp": 3800, "gold": 3000, "materials": {"ore": 6, "crystal": 3}}, None),
       ('the-sunscale-griffin', 'The Sunscale Griffin', 'A griffin has built its nest on the highest island, right on top of the lighthouse.', [
         ([], None, ['prism-hawk', 'sky-eel'], "The lighthouse island is crowded with feathers and sparks."),
         (["This is MY tower. It is the shiniest tower. I am the shiniest bird. Go away."], 'Sunscale Griffin', ['sunscale-griffin'], "A griffin with feathers like polished gold spreads its wings across the lighthouse lamp.")],
        "The lighthouse shines again. Ships can find the isles at night. Now, about that whale.", {"xp": 3900, "gold": 3200, "embers": 5},
        ("The griffin asks to keep one corner of the lighthouse for its nest.",
         ('share', "Let it share the tower", "It folds its wings and keeps watch beside the lamp. It drops a golden feather for you.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('deal', "Let it stay if it keeps the lamp polished", "It agrees, very seriously. The keepers pay you for the free cleaning.", {"gold": 2000}, 'clever')), True),
       ('aurelith', 'Aurelith', "The isles are drifting apart. Aurelith, the great sky whale who carries them, is shaking them off its back.", [
         (["She's never done this before. Something has her upset. Go and find out. Gently, if you can."], 'Captain Wynn', ['cloud-ram', 'sunscale-griffin'], "The last guards of the high wind circle around you."),
         (["Too heavy... too many... I want to SWIM."], 'Aurelith', ['aurelith'], "The clouds part. A whale the size of an island rolls toward you, thunder rumbling in her belly.")],
        "Aurelith settles. She hums a long, deep note that you feel in your bones, and the islands drift gently back together. Wynn's crew cheers so loudly they lose their hats again.", {"xp": 5000, "gold": 5400, "embers": 14}, None)],
      bounty=[('hat-back', 'Get hats back from 5 Gust Sprites', 'gust-sprite', 5), ('sail-moth-shoo', 'Shoo 4 Sunwing Moths off the sails', 'sunwing-moth', 4), ('ram-calm', 'Calm 4 Cloud Rams', 'cloud-ram', 4), ('hawk-count', 'Catch 3 Prism Hawks (all of them)', 'prism-hawk', 3), ('eel-untangle', 'Untangle 3 Sky Eels', 'sky-eel', 3)],
      place='isles'),
 dict(id='twilight-rift', name='Twilight Rift', region='elder-wilds', elements=['aether', 'void'], lo=70, hi=80, after='steelspine-range',
      analog=['rivet-beetle', 'thunder-hound', 'iron-hawk', 'static-ferret', 'scrap-wolf', 'lightning-lynx', 'ferrovane'],
      blurb='A crack in the sky where starlight and emptiness meet and tear at each other. It is quiet here. Too quiet.',
      npc='Stargazer Ilo', set=('riftwalker', 'Riftwalker', 'Gear stitched from starlight and shadow. A full set keeps your spells flowing.', {"arcana": 6, "vigor": 6}, {"riderMp": 30, "riderHp": 130}),
      enemies=[
       ('star-mote', 'Star Mote', 'aether', 'A tiny fallen star that wants to go home. It is very cross about the whole thing.', [P('zap', 'Star Zap'), A('twinkle', 'Twinkle', 2, 0.6, 'silence', 0.5), BUFF('shine-on', 'Shine On', 'fury')]),
       ('null-hound', 'Null Hound', 'void', 'A dog-shaped hole in the world. It still wags. Nobody knows what with.', [P('bite', 'Empty Bite'), A('hollow-howl', 'Hollow Howl', 2, 0.6, 'hollow', 0.5), BUFF('vanish', 'Vanish', 'fade')]),
       ('comet-lizard', 'Comet Lizard', 'aether', 'Runs so fast it leaves a trail of sparkles. It has never once stopped to see them.', [P('tail-whip', 'Tail Whip'), BIG('comet-dash', 'Comet Dash', 'silence', 0.4), BUFF('sparkle', 'Sparkle', 'fury')]),
       ('hollow-coat', 'Hollow Coat', 'void', 'A long coat with nobody inside. It would very much like yours.', [P('sleeve-slap', 'Sleeve Slap'), A('pocket-grab', 'Pocket Grab', 2, 0.6, 'hollow', 0.5), HEAL('patch-up', 'Patch Up', 0.15)]),
       ('orbit-jelly', 'Orbit Jelly', 'aether', 'A jellyfish floating in starlight, with three tiny moons circling it like pets.', [P('sting', 'Sting'), A('moon-toss', 'Moon Toss', 2, 0.7, 'silence', 0.4), HEAL('glow-mend', 'Glow Mend', 0.15)]),
       ('gloam-stalker', 'Gloam Stalker', 'void', 'A great cat made of the dark between stars. You only see it when it blinks.', [P('claw', 'Night Claw'), BIG('pounce', 'Gloam Pounce', 'hollow', 0.5), BUFF('fade-out', 'Fade Out', 'fade'), HEAL('lick', 'Lick Wounds', 0.2)]),
       ('nyxaris', 'Nyxaris', 'aether', 'A dragon whose wings are half a night sky and half nothing at all. She has been guarding the rift since before there were stars to count.', [P('rake', 'Starclaw'), A('starfall', 'Starfall Breath', 2, 0.8, 'silence', 0.6), BIG('rift-roar', 'Rift Roar'), SHIFT('night-turn', 'Turn to Night', 'void'), BUFF('star-scales', 'Star Scales', 'harden'), HEAL('drink-light', 'Drink the Light', 0.12)])],
      gear=dict(setw=('Riftwalker Glaive', 'Riftwalker Starbow', 'Riftwalker Orrery Staff'), armor='Riftwalker Night Mantle', trinket='Riftwalker Stalker Eye',
                shop=[('meteor-blade', 'Meteor Blade', 'melee', 'Forged from a fallen star. It still remembers the fall.'), ('constellation-bow', 'Constellation Bow', 'ranged', 'Strung with a line of tiny stars. Very hard to lose at night.'), ('galaxy-wand', 'Galaxy Wand', 'magic', 'A little swirl of galaxy lives in the glass tip.')],
                armor2=('duskweave-robe', 'Duskweave Robe', 'Woven from the last light of evening. It glows faintly in the dark, which is lovely until you try to sleep.'), trinket2=('quiet-stone', 'Quiet Stone', 'A pebble from the edge of nothing. It makes the world feel a little calmer.'),
                forge=('nightwing-sigil', 'Nightwing Sigil', 'Forged around a scale Nyxaris shed for you. Half of it shines and half of it is not quite there.')),
      tier=73, story=[
       ('the-falling-stars', 'The Falling Stars', 'Stargazer Ilo counts the stars over the rift. Lately the stars have been falling, and they are not happy about it.', [
         (["Twelve stars fell last night. Twelve! I had names for all of them."], 'Stargazer Ilo', ['star-mote'], "A tiny star bounces across the ground, sizzling with temper."),
         ([], None, ['orbit-jelly'], "A jellyfish drifts out of the rift, its little moons spinning faster as it sees you.")],
        "You calmed them. I'll help them back up, one at a time. It's a long ladder.", {"xp": 3600, "gold": 2800, "items": {"mana-tonic": 2}}, None),
       ('the-empty-dogs', 'The Empty Dogs', 'Null Hounds have been sniffing around the observatory. Where they walk, things go missing.', [
         (["My telescope is gone. My chair is gone. Half my sandwich is gone. Only half!"], 'Stargazer Ilo', ['null-hound'], "Something dog-shaped and empty pads out from behind the observatory, wagging nothing."),
         ([], None, ['null-hound', 'hollow-coat'], "A coat with nobody in it floats along behind, sleeves full of telescope.")],
        "Everything is back. Except the sandwich. I don't want to know.", {"xp": 3700, "gold": 2600},
        ("The last Null Hound sits and looks at you. Something in the emptiness looks sad.",
         ('name', "Give it a name", "You call it Nothing. It wags so hard it almost becomes something. Ilo shares a bundle of supplies with you.", {"items": {"dragon-treat": 3}, "gold": 1100}, 'gentle'),
         ('fetch', "Throw a stick into the rift", "It bounds after the stick into the dark and comes back with a glittering crystal instead.", {"materials": {"crystal": 2}, "embers": 3}, 'bold'))),
       ('the-comet-race', 'The Comet Race', 'Comet Lizards are racing in circles around the rift, and every lap cracks it a little wider.', [
         (["If they keep this up, the rift will be big enough to fall into. I don't want to fall into it."], 'Stargazer Ilo', ['comet-lizard'], "A lizard streaks past in a blur of sparkles, then turns around for another lap."),
         ([], None, ['comet-lizard', 'star-mote'], "A star mote hitches a ride on the next lizard's tail.")],
        "They've stopped. The rift is closing up a bit. You can almost hear it sigh.", {"xp": 3800, "gold": 3000, "materials": {"ore": 6, "crystal": 3}}, None),
       ('the-gloam-stalker', 'The Gloam Stalker', 'Something hunts in the dark between the stars. Ilo has only ever seen its eyes.', [
         ([], None, ['hollow-coat', 'orbit-jelly'], "The stars go out one by one as you walk."),
         (["You can see me. Nobody sees me. That's rude."], 'Gloam Stalker', ['gloam-stalker'], "Two eyes open in the dark ahead. Then the dark stands up, and it's shaped like a very large cat.")],
        "It's gone back into the dark. I think it was only lonely. Now there's only her.", {"xp": 3900, "gold": 3200, "embers": 5},
        ("The Gloam Stalker comes back and rubs against your dragon, purring like distant thunder.",
         ('stay', "Let it walk with you a while", "It pads beside you to the edge of the rift and leaves one of its whiskers behind, cold as night.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('map', "Ask it to show you the hidden paths", "It leads you to an old stash of starlight trinkets. Ilo buys them for her collection.", {"gold": 2000}, 'clever')), True),
       ('nyxaris', 'Nyxaris', 'At the heart of the rift waits Nyxaris, the dragon of starlight and nothing. The rift is tearing because she is.', [
         (["She's very old and very tired. Be kind. But be ready."], 'Stargazer Ilo', ['null-hound', 'gloam-stalker'], "The last shadows of the rift gather to bar your way."),
         (["Light, then dark. Dark, then light. I have held them apart so long. Show me you can hold on too."], 'Nyxaris', ['nyxaris'], "A great dragon unfolds from the rift. One wing is full of stars. The other is not there at all, and yet it moves.")],
        "Nyxaris folds both wings, the bright one and the empty one, and lowers her head. The rift stitches itself closed. Ilo counts every star in the sky, and for the first time in weeks, none of them fall.", {"xp": 5000, "gold": 5400, "embers": 14}, None)],
      bounty=[('mote-home', 'Send 5 Star Motes home', 'star-mote', 5), ('null-hound-walk', 'Walk 4 Null Hounds back to the rift', 'null-hound', 4), ('lizard-stop', 'Stop 4 Comet Lizards', 'comet-lizard', 4), ('coat-hang', 'Hang up 3 Hollow Coats', 'hollow-coat', 3), ('jelly-count', 'Count the moons of 3 Orbit Jellies', 'orbit-jelly', 3)],
      place='rift'),
]


def regions_fn(regions):
    add_zone(regions, 'beyond', 'skyreach-isles', [0.76, 0.51])
    add_zone(regions, 'elder-wilds', 'twilight-rift', [0.70, 0.55])
    regions['upcoming'] = [u for u in regions['upcoming'] if u['name'] not in ('Skyreach Isles', 'Twilight Rift', 'Hollow Crown', 'The Confluence')]
    regions['upcoming'] += [
      {"name": "Hollow Crown", "region": "beyond", "minLevel": 80, "maxLevel": 90, "gate": "skyreach-isles", "elements": ["stone", "shadow"], "blurb": "An underground kingdom, lost in the dark for a thousand years.", "pin": [0.25, 0.31]},
      {"name": "The Confluence", "region": "elder-wilds", "minLevel": 80, "maxLevel": 90, "gate": "twilight-rift", "elements": ["fire", "tide"], "blurb": "Where the wild elements run together and mix.", "pin": [0.29, 0.43]}]


SPELLS = [{"id": "astral-nova", "name": "Astral Nova", "kind": "damage", "level": 73, "element": "aether", "status": "silence", "statusChance": 0.45, "base": 31, "mp": 11,
           "description": "A burst of starlight on one enemy. Hits very hard and may Silence. Strong against Void."}]

if __name__ == '__main__':
    write(AREAS, ['sunken-spires', 'rotroot-thicket', 'emberwild', 'steelspine-range', 'skyreach-isles', 'twilight-rift'], regions_fn, 80, SPELLS)
