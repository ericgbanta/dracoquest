"""The generator that wrote Rotroot Thicket, Emberwild and the Steelspine Range (dragons plan chunks 5 and 6).
Each AREAS entry gives an area's enemies, set, gear names, stories and bounties; the script writes enemies, zone,
gear, set, shop stock, Forge recipe, stories, bounty pool and region changes in one go. It is a record of how those
three were made and a template for the next band: copy it, replace AREAS with the new areas, update the analog
enemies (ANALOG: the 7 enemies whose stats are copied), the zone order, regions, levelCap and spell at the bottom,
then run it from the repo root and tune with scale_enemies.py and the sim. It is idempotent: rerunning replaces
the same ids. Do not rerun it as it stands; it would reset the three areas' tuned stats to Sunken Spires'."""
import json, copy
D='src/data/'
def load(n): return json.load(open(D+n))
def save(n, d, a=False): open(D+n,'w').write(json.dumps(d, indent=2, ensure_ascii=a)+"\n")
P = lambda i, n: {"id": i, "name": n, "intent": "attack", "weight": 5, "power": 1, "physical": True}
A = lambda i, n, w, pw, st=None, ch=None: {**{"id": i, "name": n, "intent": "attack", "weight": w, "power": pw}, **({"status": st, "statusChance": ch} if st else {})}
BIG = lambda i, n, st=None, ch=None: {**{"id": i, "name": n, "intent": "big", "weight": 2, "power": 1}, **({"status": st, "statusChance": ch} if st else {})}
BUFF = lambda i, n, b: {"id": i, "name": n, "intent": "buff", "weight": 1, "buff": b, "target": "self"}
HEAL = lambda i, n, h: {"id": i, "name": n, "intent": "heal", "weight": 1, "heal": h, "target": "self", "condition": "selfHurt"}
SHIFT = lambda i, n, to: {"id": i, "name": n, "intent": "shift", "weight": 1, "shiftTo": to, "target": "self", "condition": "notShifted"}
ANALOG = ['reef-stalker', 'storm-gull', 'barnacle-brute', 'squall-sprite', 'drowned-sentry', 'thunder-ray', 'tidelord']

AREAS = [
 dict(id='rotroot-thicket', name='Rotroot Thicket', region='hidden-reach', elements=['blight', 'verdant'], lo=50, hi=60, after='voidmarch',
      blurb='A rotting swamp forest where sickness creeps through the roots. Mind where you step. Mind what you breathe.',
      npc='Herbalist Moss', set=('mirebloom', 'Mirebloom', 'Swamp-herb gear from the thicket. A full set shrugs off poison and keeps you going.', {"vigor": 4, "arcana": 4}, {"riderHp": 90, "healPct": 0.06}),
      enemies=[
       ('rot-grub', 'Rot Grub', 'blight', 'A fat little grub that eats rotten things. It thinks you look a bit rotten.', [P('chomp', 'Chomp'), A('rot-drool', 'Rot Drool', 2, 0.6, 'rot', 0.5), BUFF('curl', 'Curl Up', 'harden')]),
       ('thornvine-creeper', 'Thornvine Creeper', 'verdant', 'A walking tangle of thorny vine. It has no face, which is somehow worse.', [P('lash', 'Vine Lash'), BIG('thorn-snag', 'Thorn Snag', 'root', 0.5), BUFF('bristle', 'Bristle', 'harden')]),
       ('spore-toad', 'Spore Toad', 'blight', 'Puffs out its cheeks and a cloud of spores comes out the back. Every time.', [P('tongue', 'Tongue Slap'), A('spore-puff', 'Spore Puff', 2, 0.7, 'rot', 0.5), A('gloop', 'Gloop', 1, 0.5, 'blind', 0.4)]),
       ('mire-lurker', 'Mire Lurker', 'verdant', 'A mossy crocodile that has been lying in the same puddle for nine years. Patient.', [P('snap', 'Snap'), BIG('death-roll', 'Death Roll'), BUFF('lurk', 'Lurk', 'fade')]),
       ('gloomcap-walker', 'Gloomcap Walker', 'blight', 'A mushroom that got tired of sitting still. Now it walks, grumpily.', [P('cap-bonk', 'Cap Bonk'), A('gloom-dust', 'Gloom Dust', 2, 0.6, 'rot', 0.5), HEAL('root-in', 'Root In', 0.15)]),
       ('rotwood-ent', 'Rotwood Ent', 'verdant', 'An old tree that caught the rot and got very cross about it.', [P('branch-slam', 'Branch Slam'), BIG('bramble-crush', 'Bramble Crush', 'root', 0.5), BUFF('bark-up', 'Bark Up', 'fury'), HEAL('drink-mire', 'Drink the Mire', 0.2)]),
       ('rotroot-queen', 'Rotroot Queen', 'blight', 'The oldest tree in the thicket, hollow and sick and very, very grumpy about both.', [P('root-whip', 'Root Whip'), A('sap-spray', 'Sap Spray', 2, 0.8, 'rot', 0.6), BIG('rotfall', 'Rotfall'), SHIFT('green-again', 'Green Again', 'verdant'), BUFF('thick-bark', 'Thick Bark', 'harden'), HEAL('deep-roots', 'Deep Roots', 0.12)])],
      gear=dict(setw=('Mirebloom Sickle', 'Mirebloom Reed Bow', 'Mirebloom Mushroom Staff'), armor='Mirebloom Bark Shroud', trinket='Mirebloom Ent Acorn',
                shop=[('rotfang-cleaver', 'Rotfang Cleaver', 'melee', 'Its edge is a little bit rusty. On purpose.'), ('sporeshot-bow', 'Sporeshot Bow', 'ranged', 'The arrows burst into spores. Aim away from yourself.'), ('mildew-wand', 'Mildew Wand', 'magic', 'Leaves a faint smell of old cheese.')],
                armor2=('bogwalker-coat', 'Bogwalker Coat', 'Waterproof, mud-proof and very nearly smell-proof.'), trinket2=('clean-air-charm', 'Clean Air Charm', 'A little sprig that keeps the spores away. Mostly.'),
                forge=('heartwood-talisman', 'Heartwood Talisman', 'Carved from a healthy piece of the Queen. It still grows a leaf now and then.')),
      tier=53, story=[
       ('the-sick-wood', 'The Sick Wood', 'Something is rotting the trees in the thicket. Herbalist Moss wants to know what.', [
         (["Every tree in here is sick. Every single one. I've been making tea for them, but trees don't drink tea."], 'Herbalist Moss', ['rot-grub'], "A fat grub wriggles out of a tree, munching happily on the rot."),
         (["Watch the vines. They move when you're not looking."], None, ['thornvine-creeper'], "A tangle of thorny vine stands up and shuffles toward you.")],
        "Two less pests. The trees look a little less sad already. Here, for your trouble.", {"xp": 1600, "gold": 1500, "items": {"mana-tonic": 2}}, None),
       ('spore-season', 'Spore Season', "The Spore Toads are puffing their spores all over Moss's herb garden.", [
         (["My garden! My lovely garden! It's all fuzzy now!"], 'Herbalist Moss', ['spore-toad'], "A toad puffs its cheeks, and a cloud of spores drifts out behind it."),
         ([], None, ['spore-toad', 'gloomcap-walker'], "A Gloomcap Walker stomps in to join the fun.")],
        "The garden will grow back. It always does. You two, though, could use a bath.", {"xp": 1700, "gold": 1300},
        ("The last Spore Toad looks at you with big sorry eyes. It just wants somewhere damp to live.",
         ('pond', "Find it a pond far from the garden", "It hops into a quiet pond and blows one happy little bubble. Moss gives you a jar of her best salve.", {"items": {"potion": 3}, "gold": 400}, 'gentle'),
         ('shoo', "Shoo it off into the swamp", "It hops off in a huff, leaving a trail of spores and something shiny.", {"materials": {"crystal": 2}, "embers": 2}, 'bold'))),
       ('the-patient-croc', 'The Patient Croc', 'A Mire Lurker has been lying across the only path through the thicket for nine years.', [
         (["It doesn't do anything. It just lies there. Waiting. Nine years!"], 'Herbalist Moss', ['mire-lurker'], "The crocodile opens one eye. Then the other. Then its mouth."),
         ([], None, ['mire-lurker', 'thornvine-creeper'], "Vines rise out of the water around it.")],
        "The path is clear for the first time since I was a girl. Well. Since I was a younger lady.", {"xp": 1800, "gold": 1700, "materials": {"ore": 5, "crystal": 2}}, None),
       ('the-rotwood-ent', 'The Rotwood Ent', 'The biggest tree outside the Queen herself has started walking. It is not in a good mood.', [
         ([], None, ['gloomcap-walker', 'rot-grub'], "Mushrooms and grubs scatter as the ground shakes."),
         (["Who... has been... pruning... MY branches?"], 'Rotwood Ent', ['rotwood-ent'], "A tree three times your height pulls its roots out of the mud and turns around.")],
        "It sat back down. That's good. Trees should sit down. Now only the Queen is left.", {"xp": 1900, "gold": 1900, "embers": 4},
        ("The Rotwood Ent asks you to cut away its sickest branch.",
         ('cut', "Cut it away gently", "The Ent sighs with relief and drops a heavy, healthy acorn into your hands.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('sell', "Cut it and sell the wood", "Rotwood fetches a strange price at market. Moss doesn't ask who buys it.", {"gold": 1200}, 'clever')), True),
       ('the-rotroot-queen', 'The Rotroot Queen', 'At the heart of the thicket stands the tree where the rot began. She is awake.', [
         (["I'll stay here and brew something strong. You go and be brave. Bravely. Away from me."], 'Herbalist Moss', ['spore-toad', 'mire-lurker'], "The last guards of the heart of the wood rise from the mud."),
         (["Who dares... walk... in MY wood?"], 'Rotroot Queen', ['rotroot-queen'], "The ground cracks. A huge hollow tree drags herself up on her roots, eyes glowing sickly yellow.")],
        "The Queen settles back into the earth. Her leaves turn green, one by one. Moss cries a little, and pretends it's the spores.", {"xp": 2600, "gold": 3000, "embers": 10}, None)],
      bounty=[('grub-pick', 'Pick 5 Rot Grubs off the trees', 'rot-grub', 5), ('vine-trim', 'Trim 4 Thornvine Creepers', 'thornvine-creeper', 4), ('toad-hush', 'Calm 4 Spore Toads', 'spore-toad', 4), ('croc-move', 'Move along 3 Mire Lurkers', 'mire-lurker', 3), ('cap-pick', 'Pick 3 Gloomcap Walkers', 'gloomcap-walker', 3)],
      place='thicket'),
 dict(id='emberwild', name='Emberwild', region='beyond', elements=['fire', 'verdant'], lo=60, hi=70, after='sunken-spires',
      blurb='A volcanic jungle where the leaves are red and the rivers glow. Everything here is either on fire or about to be.',
      npc='Ranger Ashby', set=('pyreleaf', 'Pyreleaf', 'Jungle gear that stands the heat. A full set hits harder and catches more.', {"strength": 5, "agility": 5}, {"riderDamagePct": 0.07, "riderCrit": 0.03}),
      enemies=[
       ('cinder-monkey', 'Cinder Monkey', 'fire', 'Steals your lunch and sets it on fire. Then eats it anyway.', [P('slap', 'Monkey Slap'), A('ember-toss', 'Ember Toss', 2, 0.7, 'burn', 0.5), BUFF('hoot', 'Hoot', 'fury')]),
       ('flame-lily', 'Flame Lily', 'verdant', 'Beautiful, fragrant, and very hungry.', [P('chomp', 'Petal Chomp'), A('pollen-blast', 'Pollen Blast', 2, 0.6, 'root', 0.5), HEAL('sunbathe', 'Sunbathe', 0.15)]),
       ('magma-tortoise', 'Magma Tortoise', 'fire', 'Takes a hundred years to cross the jungle. Not in a hurry.', [P('shell-bash', 'Shell Bash'), BIG('lava-bath', 'Lava Bath', 'burn', 0.4), BUFF('shell-in', 'Shell In', 'harden')]),
       ('jungle-raptor', 'Jungle Raptor', 'verdant', "Fast, clever, and definitely smiling at you.", [P('raptor-claw', 'Raptor Claw'), BIG('pounce', 'Pounce'), BUFF('hide', 'Hide in the Ferns', 'fade')]),
       ('ember-parrot', 'Ember Parrot', 'fire', 'Learned three words. All of them rude.', [P('peck', 'Peck'), A('hot-squawk', 'Hot Squawk', 2, 0.6, 'burn', 0.5), A('mimic', 'Mimic', 1, 0.5, 'blind', 0.4)]),
       ('vine-tyrant', 'Vine Tyrant', 'verdant', 'King of the jungle canopy, by his own announcement.', [P('fist', 'Big Fist'), BIG('vine-slam', 'Vine Slam', 'root', 0.5), BUFF('chest-beat', 'Chest Beat', 'fury'), HEAL('banana', 'Banana Break', 0.2)]),
       ('volcanadon', 'Volcanadon', 'fire', 'A dinosaur with a volcano on its back. It has never once been in a good mood.', [P('tail-club', 'Tail Club'), A('ash-cloud', 'Ash Cloud', 2, 0.8, 'burn', 0.6), BIG('eruption', 'Eruption'), SHIFT('jungle-hide', 'Jungle Hide', 'verdant'), BUFF('rock-plates', 'Rock Plates', 'harden'), HEAL('cool-off', 'Cool Off', 0.12)])],
      gear=dict(setw=('Pyreleaf Machete', 'Pyreleaf Blowgun', 'Pyreleaf Torch Staff'), armor='Pyreleaf Volcano Plate', trinket='Pyreleaf Tyrant Crown',
                shop=[('ashfall-blade', 'Ashfall Blade', 'melee', 'Still warm from the forge. Or from the volcano.'), ('canopy-longbow', 'Canopy Longbow', 'ranged', 'Strung with jungle vine. Smells of flowers.'), ('magma-orb', 'Magma Orb', 'magic', 'Hold it by the cool end.')],
                armor2=('heatproof-leathers', 'Heatproof Leathers', "Doesn't burn. Doesn't breathe either."), trinket2=('fire-orchid', 'Fire Orchid', 'A flower that blooms in lava. Keep it watered with lava.'),
                forge=('caldera-heart', 'Caldera Heart', 'A stone from the bottom of the volcano, forged into a pendant. It beats like a drum.')),
      tier=63, story=[
       ('the-burning-path', 'The Burning Path', 'Ranger Ashby keeps a trail through the volcanic jungle. Something keeps setting it on fire.', [
         (["My trail's on fire. Again. Third time this week."], 'Ranger Ashby', ['cinder-monkey'], "A monkey with a burning tail swings past, giggling."),
         ([], None, ['ember-parrot'], "A parrot lands on a branch and shouts something very rude.")],
        "Trail's safe. For today. Come back tomorrow, it'll be on fire again.", {"xp": 2600, "gold": 2100, "items": {"mana-tonic": 2}}, None),
       ('the-hungry-garden', 'The Hungry Garden', "Ashby's camp is surrounded by Flame Lilies. They are growing closer every night.", [
         (["They were six feet away yesterday. Today they're four. I'm not sleeping well."], 'Ranger Ashby', ['flame-lily'], "A Flame Lily turns its petals toward you and opens its mouth."),
         ([], None, ['flame-lily', 'jungle-raptor'], "A raptor bursts out of the ferns behind it.")],
        "The camp's safe. I'm moving it anyway.", {"xp": 2700, "gold": 1900},
        ("One small Flame Lily is left, curled up and scared.",
         ('pot', "Pot it and give it to Ashby", "Ashby names it Petal and feeds it bugs. She seems pleased. So does Petal.", {"gold": 1000, "items": {"dragon-treat": 3}}, 'gentle'),
         ('seeds', "Take its seeds for the Forge", "The seeds glow like coals. They'll make good fuel.", {"materials": {"crystal": 2}, "embers": 3}, 'clever'))),
       ('the-slow-road', 'The Slow Road', 'A Magma Tortoise has stopped in the middle of the only bridge. It might move in a hundred years.', [
         (["I've asked it nicely. I've asked it rudely. It just blinks."], 'Ranger Ashby', ['magma-tortoise'], "The tortoise blinks. Slowly."),
         ([], None, ['magma-tortoise', 'cinder-monkey'], "A monkey hops on its shell and starts throwing embers.")],
        "Bridge is clear. The tortoise found somewhere warmer to sit.", {"xp": 2800, "gold": 2400, "materials": {"ore": 5, "crystal": 2}}, None),
       ('king-of-the-canopy', 'King of the Canopy', 'The Vine Tyrant has declared the whole jungle his. Including Ashby.', [
         ([], None, ['jungle-raptor', 'ember-parrot'], "The canopy rustles as his loyal subjects come to meet you."),
         (["Bow before the KING of the CANOPY!"], 'Vine Tyrant', ['vine-tyrant'], "A great gorilla wrapped in vines drops down from the trees and beats his chest.")],
        "He'll be fine. He's just a bit full of himself. Now, about that volcano.", {"xp": 2900, "gold": 2600, "embers": 4},
        ("The Vine Tyrant offers you a place in his court.",
         ('accept', "Accept, politely", "He gives you a crown of leaves. It's itchy, but it's the thought that counts.", {"materials": {"scale": 1}, "embers": 2}, 'gentle'),
         ('decline', "Tell him there's only one king here, and it's your dragon", "Your dragon roars. The Tyrant bows. Ashby laughs for a full minute.", {"gold": 1600}, 'proud')), True),
       ('the-volcanadon', 'The Volcanadon', 'At the heart of Emberwild walks a dinosaur with a volcano on its back. It erupts when it gets cross, and it is always cross.', [
         (["I'll be at camp. With the buckets. Lots of buckets."], 'Ranger Ashby', ['magma-tortoise', 'flame-lily'], "The ground shakes. Lava trickles past your feet."),
         (["RRRAAAWR!"], 'Volcanadon', ['volcanadon'], "A huge armored dinosaur stomps out of the smoke, the volcano on its back rumbling.")],
        "The Volcanadon lies down in a river and cools off with a long hiss of steam. For the first time in years, Emberwild is quiet.", {"xp": 3800, "gold": 4200, "embers": 12}, None)],
      bounty=[('monkey-chase', 'Chase off 5 Cinder Monkeys', 'cinder-monkey', 5), ('lily-trim', 'Trim 4 Flame Lilies', 'flame-lily', 4), ('tortoise-nudge', 'Nudge 3 Magma Tortoises along', 'magma-tortoise', 3), ('raptor-track', 'Track down 4 Jungle Raptors', 'jungle-raptor', 4), ('parrot-hush', 'Hush 3 Ember Parrots', 'ember-parrot', 3)],
      place='jungle'),
 dict(id='steelspine-range', name='The Steelspine Range', region='elder-wilds', elements=['steel', 'storm'], lo=60, hi=70, after='rotroot-thicket',
      blurb='Iron mountains where lightning strikes every few seconds, and the oldest metal-scaled dragons roost.',
      npc='Smith Torva', set=('ironclad', 'Ironclad', 'Heavy mountain gear forged in lightning. A full set stands like a wall.', {"vigor": 5, "strength": 5}, {"riderDefense": 6, "riderHp": 110}),
      enemies=[
       ('rivet-beetle', 'Rivet Beetle', 'steel', 'Its shell is held together with rivets. Nobody knows who put them there.', [P('horn-poke', 'Horn Poke'), A('rivet-shot', 'Rivet Shot', 2, 0.6, 'rend', 0.5), BUFF('bolt-down', 'Bolt Down', 'harden')]),
       ('thunder-hound', 'Thunder Hound', 'storm', 'Howls when lightning strikes. Lightning strikes a lot.', [P('bite', 'Bite'), A('spark-howl', 'Spark Howl', 2, 0.7, 'shock', 0.5), BUFF('bristle', 'Bristle', 'fury')]),
       ('iron-hawk', 'Iron Hawk', 'steel', 'Feathers like knives. Very proud of them. Polishes them daily.', [P('talons', 'Talons'), BIG('blade-dive', 'Blade Dive', 'rend', 0.4), BUFF('soar', 'Soar', 'fade')]),
       ('static-ferret', 'Static Ferret', 'storm', 'Rubbed itself on a carpet once and never recovered.', [P('nibble', 'Nibble'), A('zap', 'Static Zap', 2, 0.6, 'shock', 0.5), A('fluff-up', 'Fluff Up', 1, 0.5, 'blind', 0.4)]),
       ('scrap-wolf', 'Scrap Wolf', 'steel', 'Wears armor it found lying around. Some of it is a bucket.', [P('scrap-bite', 'Scrap Bite'), BIG('iron-lunge', 'Iron Lunge'), BUFF('pack-howl', 'Pack Howl', 'fury')]),
       ('lightning-lynx', 'Lightning Lynx', 'storm', 'The fastest thing in the mountains. Including the lightning.', [P('swipe', 'Swipe'), BIG('bolt-pounce', 'Bolt Pounce', 'shock', 0.5), BUFF('crackle', 'Crackle', 'fury'), HEAL('groom', 'Groom', 0.2)]),
       ('ferrovane', 'Ferrovane', 'steel', 'The oldest dragon in the mountains, scaled in steel. She remembers when the mountains were young.', [P('steel-claw', 'Steel Claw'), A('shrapnel-wing', 'Shrapnel Wing', 2, 0.8, 'rend', 0.6), BIG('iron-breath', 'Iron Breath'), SHIFT('lightning-rod', 'Lightning Rod', 'storm'), BUFF('plate-up', 'Plate Up', 'harden'), HEAL('old-strength', 'Old Strength', 0.12)])],
      gear=dict(setw=('Ironclad Warblade', 'Ironclad Crossbow', 'Ironclad Lightning Rod'), armor='Ironclad Dragonplate', trinket='Ironclad Lynx Claw',
                shop=[('girder-maul', 'Girder Maul', 'melee', 'A steel beam with a handle. Subtle it is not.'), ('bolt-thrower', 'Bolt Thrower', 'ranged', 'Throws bolts. The metal kind, not the lightning kind.'), ('alloy-scepter', 'Alloy Scepter', 'magic', 'Three metals and a bit of luck.')],
                armor2=('chainmail-of-ages', 'Chainmail of Ages', 'Heavy, clanky and handed down through nine smiths.'), trinket2=('grounding-charm', 'Grounding Charm', 'Lightning goes around you. Mostly.'),
                forge=('dragonsteel-band', 'Dragonsteel Band', "Forged from a scale Ferrovane let you keep. It's warm, and it hums.")),
      tier=63, story=[
       ('the-smiths-request', "The Smith's Request", 'Smith Torva forges with the lightning that hits the Steelspine. Something keeps stealing her iron.', [
         (["My iron's gone. Again. And there are little shell marks all over the floor."], 'Smith Torva', ['rivet-beetle'], "A beetle trundles away with a horseshoe on its back."),
         ([], None, ['static-ferret'], "A ferret, fur on end, is hiding in the charcoal.")],
        "My iron's back. Mostly. One horseshoe has a bite out of it.", {"xp": 2600, "gold": 2100, "items": {"mana-tonic": 2}}, None),
       ('the-howling-pass', 'The Howling Pass', 'The Thunder Hounds howl every time lightning strikes, and it strikes every few seconds.', [
         (["I haven't slept in a week. The howling. THE HOWLING."], 'Smith Torva', ['thunder-hound'], "A hound throws back its head and howls as lightning cracks overhead."),
         ([], None, ['thunder-hound', 'scrap-wolf'], "A wolf in bucket armor joins the chorus.")],
        "Quiet. Beautiful quiet. I could cry.", {"xp": 2700, "gold": 1900},
        ("The smallest Thunder Hound sits down and looks up at you, sparks fizzing in its fur.",
         ('pat', "Give it a pat", "Zap. Your hair stands on end for the rest of the day. The hound follows you home, then wanders off, happy.", {"items": {"dragon-treat": 3}, "gold": 900}, 'gentle'),
         ('rod', "Teach it to howl into Torva's lightning rod", "Its howl rings through the rod and charges the forge. Torva is delighted.", {"materials": {"crystal": 2}, "embers": 3}, 'clever'))),
       ('blades-of-the-sky', 'Blades of the Sky', 'Iron Hawks have been diving at anything shiny. Torva is very shiny.', [
         (["They took my best hammer. Who takes a hammer? A bird took a hammer."], 'Smith Torva', ['iron-hawk'], "A hawk with knife-feathers screeches overhead."),
         ([], None, ['iron-hawk', 'rivet-beetle'], "Another hawk drops a beetle on you, on purpose.")],
        "My hammer! Look, it's barely dented.", {"xp": 2800, "gold": 2400, "materials": {"ore": 6, "crystal": 2}}, None),
       ('the-lightning-lynx', 'The Lightning Lynx', 'Something faster than lightning prowls the high ridges. Torva wants one of its whiskers for her forge.', [
         ([], None, ['scrap-wolf', 'static-ferret'], "The ridge crackles. Fur and scrap metal everywhere."),
         (["You're slow. Everyone's slow."], 'Lightning Lynx', ['lightning-lynx'], "A silver lynx appears out of nowhere, ears crackling with lightning.")],
        "One whisker. That's all I needed. Now, about the dragon at the top.", {"xp": 2900, "gold": 2600, "embers": 4},
        ("The Lightning Lynx offers you a race up the mountain instead of a fight.",
         ('race', "Race it", "You lose, of course. But your dragon gives it a good run, and the lynx drops a crackling claw as a prize.", {"materials": {"scale": 1}, "embers": 2}, 'bold'),
         ('trade', "Trade it a polished bolt for a whisker", "It loves the shiny bolt. You get a whisker and the lynx's respect.", {"gold": 1600}, 'clever')), True),
       ('ferrovane', 'Ferrovane', 'At the top of the Steelspine sleeps Ferrovane, the oldest steel-scaled dragon. The lightning is her heartbeat.', [
         (["Be polite. She's older than the mountain. Bring her something shiny. No, not my hammer."], 'Smith Torva', ['thunder-hound', 'iron-hawk'], "The last guards of the peak bar the way."),
         (["Another young dragon. How lovely. Let us see if you are worth the climb."], 'Ferrovane', ['ferrovane'], "A huge dragon of polished steel unfolds on the summit, sparks crackling along her horns.")],
        "Ferrovane folds her wings and lowers her head to your dragon. Two dragons, one very young and one very old, sit together in the storm for a long time.", {"xp": 3800, "gold": 4200, "embers": 12}, None)],
      bounty=[('beetle-sort', 'Sort 5 Rivet Beetles', 'rivet-beetle', 5), ('hound-hush', 'Hush 4 Thunder Hounds', 'thunder-hound', 4), ('hawk-ground', 'Ground 3 Iron Hawks', 'iron-hawk', 3), ('ferret-calm', 'Calm 4 Static Ferrets', 'static-ferret', 4), ('wolf-scrap', 'Scrap 3 Scrap Wolves', 'scrap-wolf', 3)],
      place='range'),
]

en = load('enemies.json'); by = {x['id']: x for x in en}
zs = load('zones.json'); gear = load('gear.json'); sets = load('sets.json'); shop = load('shop.json'); forge = load('forge.json')
stories = load('stories.json'); bounties = load('bounties.json'); regions = load('regions.json')
for A_ in AREAS:
    ids = [e[0] for e in A_['enemies']]
    en = [x for x in en if x['id'] not in ids]
    for (eid, name, el, flavor, moves), src in zip(A_['enemies'], ANALOG):
        d = copy.deepcopy(by[src]); d.pop('moves', None)
        d.update(id=eid, name=name, element=el, flavor=flavor, moves=moves)
        order = ['id','name','element','flavor','base','perLevel','moves','miniBoss','xpMultiplier','boss','goldMultiplier']
        en.append({k: d[k] for k in order if k in d})
    z = A_['id']; lo, hi = A_['lo'], A_['hi']; reg = ids[:5]
    sid = A_['set'][0]
    zs = [x for x in zs if x['id'] != z]
    zs.append({"id": z, "name": A_['name'], "element": A_['elements'][0], "elements": A_['elements'], "minLevel": lo, "maxLevel": hi, "gate": None,
      "unlock": {"level": lo, "afterBoss": A_['after']}, "blurb": A_['blurb'], "fights": {"min": 3, "max": 5},
      "encounters": [{"enemies": [reg[0]], "weight": 3}, {"enemies": [reg[1]], "weight": 3}, {"enemies": [reg[2]], "weight": 2}, {"enemies": [reg[3]], "weight": 2}, {"enemies": [reg[4]], "weight": 2},
                     {"enemies": [reg[1], reg[1]], "weight": 1, "minLevel": lo + 2}, {"enemies": [reg[0], reg[3]], "weight": 1, "minLevel": lo + 4}],
      "levelSpread": 1, "multiEnemyLevelOffset": -3,
      "boss": {"enemy": ids[6], "level": hi, "unlockRiderLevel": hi - 1, "trophy": {"gear": f"{sid}-armor", "chance": 0.25}},
      "miniBoss": {"enemy": ids[5], "levelOffset": 0, "trophy": {"gear": f"{sid}-trinket", "chance": 0.25}},
      "dropChances": {"potion": 0.25, "dragon-treat": 0.15, "mana-tonic": 0.1},
      "eggDrop": {"element": A_['elements'][0], "chance": 0.1, "elements": A_['elements']},
      "gearDrops": {"chance": 0.06, "gear": [f"{sid}-melee", f"{sid}-ranged", f"{sid}-magic"]}})
    # gear: set weapons at tier-1, shop tier at `tier`, armor tiers scale with level
    t = A_['tier']; G = A_['gear']; el = A_['elements'][0]
    k = (t - 53) // 10                      # 0 for the 50s, 1 for the 60s
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
    # stories
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
    pool += [{"id": f"{A_['place']}-wins", "kind": "wins", "count": 6, "text": f"Win 6 fights in {A_['name'].replace('The ', 'the ')}", "reward": {"gold": gold + 140, "materials": {"ore": 4}}},
             {"id": f"{A_['place']}-clear", "kind": "clear", "count": 2, "text": f"Finish 2 runs in {A_['name'].replace('The ', 'the ')}", "reward": {"gold": gold + 300, "embers": 3}},
             {"id": f"{ids[5]}-hunt", "kind": "defeat", "count": 1, "text": f"Defeat the {A_['enemies'][5][1]}", "reward": {"gold": gold + 140, "materials": {"scale": 1}}, "enemy": ids[5]}]
    bounties['pools'][z] = pool

# zone order: the cap zone last
order = [z['id'] for z in zs]
for zid in ['sunken-spires', 'rotroot-thicket', 'emberwild', 'steelspine-range']:
    zz = next(x for x in zs if x['id'] == zid); zs.remove(zz); zs.append(zz)

# regions
hr = next(x for x in regions['regions'] if x['id'] == 'hidden-reach')
if 'rotroot-thicket' not in hr['zones']: hr['zones'].append('rotroot-thicket')
hr['map']['pins']['rotroot-thicket'] = [0.33, 0.33]
bey = next(x for x in regions['regions'] if x['id'] == 'beyond')
if 'emberwild' not in bey['zones']: bey['zones'].append('emberwild')
bey['map']['pins']['emberwild'] = [0.24, 0.52]
regions['regions'] = [x for x in regions['regions'] if x['id'] != 'elder-wilds']
regions['regions'].append({"id": "elder-wilds", "name": "The Elder Wilds", "levels": "Levels 60 to 100", "blurb": "Ancient wild lands at the edge of the world, where the oldest dragons live.",
                           "zones": ["steelspine-range"], "map": {"art": "map-elder-wilds", "pins": {"steelspine-range": [0.3, 0.83]}}})
regions['upcoming'] = [u for u in regions['upcoming'] if u['name'] not in ('Rotroot Thicket', 'Emberwild', 'Skyreach Isles', 'Twilight Rift')]
regions['upcoming'] += [
  {"name": "Skyreach Isles", "region": "beyond", "minLevel": 70, "maxLevel": 80, "gate": "emberwild", "elements": ["storm", "light"], "blurb": "Floating islands of sun and wind, high above the clouds.", "pin": [0.76, 0.51]},
  {"name": "Twilight Rift", "region": "elder-wilds", "minLevel": 70, "maxLevel": 80, "gate": "steelspine-range", "elements": ["aether", "void"], "blurb": "Where starlight and emptiness meet and tear at each other.", "pin": [0.7, 0.61]}]

p = load('progression.json'); p['levelCap'] = 70; save('progression.json', p)
c = load('combat.json'); sp = c['riderMoves']['spells']
if not any(s_['id'] == 'inferno' for s_ in sp):
    sp.append({"id": "inferno", "name": "Inferno", "kind": "damage", "level": 63, "element": "fire", "status": "burn", "statusChance": 0.45, "base": 28, "mp": 10, "description": "A roaring column of fire on one enemy. Hits very hard and may Burn."})
save('combat.json', c)
for n_, d_ in [('enemies.json', en), ('zones.json', zs), ('gear.json', gear), ('sets.json', sets), ('shop.json', shop), ('forge.json', forge), ('stories.json', stories), ('bounties.json', bounties), ('regions.json', regions)]:
    save(n_, d_)
print('ok', len(zs), len(en))
