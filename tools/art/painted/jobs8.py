"""Eighth batch: the painted region maps for the Map tab (one per region). Run from the gen folder: python3 v2/jobs8.py.
Each map is portrait, full bleed, with landmarks at fixed spots so the game's pins (regions.json `map.pins`) can sit on them."""
import os
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (portrait, about 1024x1536). Do not write code to draw it; generate it with the image tool. The attached image is the STYLE reference only: match its flat two-tone cel shading, simple chunky shapes and friendly look, so this looks like art from the same game. Do not copy its subject."
MAP = (" COMPOSITION RULES: an illustrated fantasy adventure map of one region, seen from high above at a gentle angle like a board-game map, full bleed to every edge."
       " Each landmark is a small, clear, chunky vignette with plenty of plain ground around it, so a round marker can sit on it. Landmarks are connected by a winding dirt path."
       " For this map, adapt the style: scenery is flat color shapes with two or three value steps and soft dark outlines only on the landmarks, terrain colors soft and slightly desaturated."
       " ABSOLUTELY NO text, letters, labels, numbers, compass rose, legend, banners, frame or border, and no characters or creatures.")
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True)

def job(name, body):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + MAP + "\n\n" + STYLE + "\n")

job('map-wilds', "SUBJECT: the map of The Wilds, green lowlands close to home. Landmarks, at these exact positions (fractions of width and height from the top-left):"
    " (0.27, 0.80) Mossy Hollow, a ring of big round mossy green trees around a sunny clearing;"
    " (0.75, 0.70) Saltmarsh Shore, a pale sandy beach with a little lighthouse and teal sea filling the right edge of the lower half;"
    " (0.25, 0.47) Whispering Fen, a foggy blue-green marsh with drooping willows and lily pads;"
    " (0.68, 0.22) Cinder Pass, a dark volcano with a thin orange lava ribbon and a small smoke plume, gray rocky slopes around it;"
    " (0.55, 0.50) a small cozy town of a few houses with red and blue roofs and a tiny market tent."
    " Rolling green meadows, a few small trees and a stream fill the rest; the top edge fades to distant blue mountains.")
job('map-highlands', "SUBJECT: the map of The High Lands, rugged mountains, lakes and far lands beyond the lowlands. Landmarks, at these exact positions (fractions of width and height from the top-left):"
    " (0.25, 0.84) Thunderspire, a tall needle-like rock spire with a small yellow lightning bolt at its tip and violet storm clouds;"
    " (0.74, 0.80) Rustcliff Ruins, a ruined stone fortress with broken towers on a cliff and a big brass gear in its walls;"
    " (0.24, 0.62) Frostmere, a round frozen pale-blue lake with snowy pines;"
    " (0.74, 0.58) Moonwell Woods, a dark blue-violet forest with a small glowing pale-blue stone well in it;"
    " (0.26, 0.38) Deepstone Mines, a gray mountainside with a wooden mine entrance, a mine cart and teal crystals;"
    " (0.74, 0.34) Gilded Wastes, golden desert dunes with a small sandstone obelisk and a palm;"
    " (0.50, 0.13) Eclipse Peak, the tallest snowy mountain with a small golden eclipse ring above its summit."
    " Rocky hills, ridges and grassy plateaus fill the rest, greener at the bottom and colder, snowier toward the top.")
job('map-beyond', "SUBJECT: the map of Beyond the Peak, mysterious far lands past the highest mountain, mostly unexplored. Landmarks, at these exact positions (fractions of width and height from the top-left):"
    " (0.50, 0.80) Sunken Spires, a drowned city: several pale stone towers rising out of dark teal sea with small storm clouds and lightning above, clearly visible;"
    " (0.24, 0.57) Emberwild, a volcanic jungle of red-orange leaves and a small glowing vent;"
    " (0.76, 0.52) Skyreach Isles, three small floating grassy islands with tiny waterfalls;"
    " (0.27, 0.32) Hollow Crown, a dark rocky mountain with a cave entrance shaped like a crown;"
    " (0.62, 0.12) Starfall Summit, a sharp silver peak with a big glowing falling star above it."
    " Everything except the Sunken Spires is softly veiled in pale drifting mist and clouds, as if not explored yet. Deep blues and violets with warm glints.")
print(sorted(f for f in os.listdir('v2/prompts') if f.startswith('map-')))
