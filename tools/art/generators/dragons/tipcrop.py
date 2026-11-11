import subprocess, sys
from PIL import Image
S='/home/user/dracoquest/tools/art/out/'
rig, name = sys.argv[1], sys.argv[2]
box=[float(x) for x in sys.argv[3].split(',')]  # x0,y0,x1,y1 fractions
els=['fire','frost','verdant','stone','storm','tide','light','shadow']
cols=['#e8603c,#f2a541','#3f8fd8,#7fc8f0','#5fbf5a,#e9e4da','#7a5c9e,#f5e27a']
ps=[subprocess.Popen(['node',S+'rigpreview.mjs','--manifest',S+'art-dragons/preview.json','--rig',rig,'--out',S+f'art-dragons/{name}-z{e}.png','--width','900','--vars','element='+e,'--colors',cols[i%4]+',#505050'],stdout=subprocess.DEVNULL) for i,e in enumerate(els)]
for p in ps: p.wait()
ims=[]
for e in els:
    i=Image.open(S+f'art-dragons/{name}-z{e}.png'); W,H=i.size
    ims.append(i.crop((int(box[0]*W),int(box[1]*H),int(box[2]*W),int(box[3]*H))))
W,H=ims[0].size
o=Image.new('RGB',(W*4,H*2))
for k,i in enumerate(ims): o.paste(i,((k%4)*W,(k//4)*H))
o.save(S+f'art-dragons/{name}-tipzoom.png'); print('ok')
