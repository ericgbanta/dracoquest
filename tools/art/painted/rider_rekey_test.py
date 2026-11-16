# Looks plan L0 proof (docs/LOOKS_PLAN.md): recolor the seven rider images by color family and write a before/after sheet.
# Usage: python3 tools/art/painted/rider_rekey_test.py <repo> [out.png]. Needs numpy, scipy and Pillow. A test, not the packer.
import sys, numpy as np, colorsys
from PIL import Image
from scipy import ndimage as ndi
R=sys.argv[1].rstrip('/')+'/src/art/painted/'
def hsv(a):
    r,g,b=[a[...,i]/255. for i in range(3)]
    mx=np.max(a[...,:3],-1)/255.; mn=np.min(a[...,:3],-1)/255.; c=mx-mn
    h=np.zeros_like(mx)
    m=c>0
    rm=m&(mx==r); gm=m&(mx==g)&~rm; bm=m&~rm&~gm
    h[rm]=((g-b)[rm]/c[rm])%6; h[gm]=(b-r)[gm]/c[gm]+2; h[bm]=(r-g)[bm]/c[bm]+4
    return h*60, c*255, mx*255
def classify(a):
    h,c,v=hsv(a); al=a[...,3]>40
    lum=0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
    fam=np.zeros(h.shape,int)
    fam[al&(c>70)&((h<12)|(h>=335))]=1            # cape red
    fam[al&(c>45)&(h>=140)&(h<190)]=2             # tunic teal
    fam[al&(c>45)&(h>=195)&(h<250)&(lum>35)]=3    # trousers blue
    warm=al&(c>30)&(h>=12)&(h<45)
    fam[warm&(lum>=150)]=4                        # skin (light warm)
    fam[warm&(lum<150)]=5                         # brown: hair + leather
    return fam,lum
def run(name):
    a=np.array(Image.open(R+name+'.webp').convert('RGBA')).astype(float)
    fam,lum=classify(a)
    H=a.shape[0]
    # hair = brown components whose centroid is in the top 30% of the figure
    lab,n=ndi.label(ndi.binary_closing(fam==5,iterations=2))
    hair=np.zeros(fam.shape,bool)
    for i in range(1,n+1):
        m=lab==i
        if m.sum()<150: continue
        cy=ndi.center_of_mass(m)[0]/H
        if cy<TOP.get(name,0.30): hair|=m&(fam==5)
    fam[hair]=6
    print(name,{k:int((fam==k).sum()) for k in range(1,7)})
    to={1:(60,110,220),2:(150,70,190),3:(70,70,80),4:(140,90,60),6:(240,205,90)}
    out=a.copy()
    for k,col in to.items():
        m=fam==k
        if not m.any(): continue
        base=np.bincount((lum[m]/4).astype(int),minlength=64); bt=np.argmax(base[::-1]); bt=(63-bt)*4+2 if False else np.argmax(base)*4+2
        t=(lum[m]/bt)[:,None]; c=np.array(col,float)[None]
        out[m,:3]=np.clip(np.where(t<=1,c*t,c+(255-c)*np.minimum(1,(t-1)*1.2)),0,255)
    return Image.fromarray(a.astype('uint8')),Image.fromarray(out.astype('uint8'))
TOP={'rider-mounted':0.30}
names=['rider-sword','rider-sword-attack','rider-bow','rider-bow-attack','rider-staff','rider-staff-attack','rider-mounted']
ims=[run(n) for n in names]
W=sum(i[0].width for i in ims); Hh=max(i[0].height for i in ims)
sheet=Image.new('RGBA',(W,Hh*2),(235,235,235,255)); x=0
for o,r in ims:
    sheet.alpha_composite(o,(x,0)); sheet.alpha_composite(r,(x,Hh)); x+=o.width
sheet=sheet.resize((W//2,Hh)); sheet.convert('RGB').save(sys.argv[2] if len(sys.argv)>2 else 'rekey-test.png')
