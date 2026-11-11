#!/bin/bash
# usage: sheet.sh rig name width  -> renders 3 tints + pose + grid, combines into art-dragons/<name>-sheet.png
S=/home/user/dracoquest/tools/art/out
R=$1; N=$2; Wd=${3:-300}; EL=${4:-fire}
M=$S/art-dragons/preview.json; O=$S/art-dragons
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-a.png --width $Wd --colors "#e8603c,#f2a541,#505050" --vars element=$EL >/dev/null &
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-b.png --width $Wd --colors "#3f8fd8,#7fc8f0,#505050" --vars element=$EL >/dev/null &
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-c.png --width $Wd --colors "#5fbf5a,#e9e4da,#505050" --vars element=$EL >/dev/null &
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-d.png --width $Wd --colors "#7a5c9e,#f5e27a,#505050" --pose head=-18,jaw=26,wing-front=-25,wing-back=25,tail=25,leg-front=-20 --vars element=$EL >/dev/null &
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-e.png --width $Wd --grid --pose head=18,jaw=10,wing-front=25,wing-back=-25,tail=-25,leg-front=20 --vars element=$EL >/dev/null &
node $S/rigpreview.mjs --manifest $M --rig $R --out $O/$N-f.png --width 110 --flip --vars element=$EL >/dev/null &
wait
python3 -c "
from PIL import Image
O='$O/$N'
ims=[Image.open(O+'-'+k+'.png') for k in 'abcdef']
w=ims[0].width;h=ims[0].height
o=Image.new('RGB',(w*3,h*2),'#8a74b8')
for k,i in enumerate(ims[:6]): o.paste(i,((k%3)*w,(k//3)*h))
o.save(O+'-sheet.png')
"
echo $O/$N-sheet.png
