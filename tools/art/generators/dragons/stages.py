import subprocess
from PIL import Image
S='/home/user/dracoquest/tools/art/out/'
rigs=[('dragon.hatchling',0.62),('dragon.juvenile',0.84),('dragon.adult',1),('dragon.elder',1.12)]
ps=[subprocess.Popen(['node',S+'rigpreview.mjs','--manifest',S+'art-dragons/preview.json','--rig',r,'--out',S+f'art-dragons/st-{i}.png','--width',str(int(400*b)),'--colors','#e8603c,#f2a541,#505050','--vars','element=fire'],stdout=subprocess.DEVNULL) for i,(r,b) in enumerate(rigs)]
for p in ps: p.wait()
ims=[Image.open(S+f'art-dragons/st-{i}.png') for i in range(4)]
H=max(i.height for i in ims); W=sum(i.width for i in ims)+60
o=Image.new('RGB',(W,H+20),'#8a74b8'); x=10
for i in ims: o.paste(i,(x,H+10-i.height)); x+=i.width+14
o.save(S+'art-dragons/stages.png'); print('ok')
