import subprocess, sys
from PIL import Image
S='/home/user/dracoquest/tools/art/out/'
rig, name, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
els=['fire','frost','verdant','stone','storm','tide','light','shadow']
cols=['#e8603c,#f2a541','#3f8fd8,#7fc8f0','#5fbf5a,#e9e4da','#7a5c9e,#f5e27a']
ps=[subprocess.Popen(['node',S+'rigpreview.mjs','--manifest',S+'art-dragons/preview.json','--rig',rig,'--out',S+f'art-dragons/{name}-{e}.png','--width',str(w),'--vars','element='+e,'--colors',cols[i%4]+',#505050']+(['--pose','tail=22'] if i%2 else []),stdout=subprocess.DEVNULL) for i,e in enumerate(els)]
for p in ps: p.wait()
ims=[Image.open(S+f'art-dragons/{name}-{e}.png') for e in els]
W,H=ims[0].size
o=Image.new('RGB',(W*4,H*2))
for k,i in enumerate(ims): o.paste(i,((k%4)*W,(k//4)*H))
o.save(S+f'art-dragons/{name}-tips.png'); print(S+f'art-dragons/{name}-tips.png')
