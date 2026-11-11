import json, subprocess, sys, os
from PIL import Image
SCR = '/home/user/dracoquest/tools/art/out/'
G = SCR + 'enemygen/'

def render(jobs, tag='x'):
    jf = G + f'tmp/jobs-{tag}.json'
    json.dump(jobs, open(jf, 'w'))
    r = subprocess.run(['node', G + 'sheet.mjs', jf], capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:])
    elif r.stderr: print(r.stderr[-1000:])

def grid(files, out, cols=4, bg=(138, 116, 184)):
    ims = [Image.open(f) for f in files]
    w = max(i.width for i in ims); h = max(i.height for i in ims)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (w * cols, h * rows), bg)
    for k, im in enumerate(ims):
        sheet.paste(im, ((k % cols) * w, (k // cols) * h))
    sheet.save(out)

if __name__ == '__main__':
    # view.py rigkey out.png [colors...]  -> tri-color sheet with flip + pose
    key, out = sys.argv[1], sys.argv[2]
    pose = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    rigs = json.load(open(G + 'plans.json'))['rigs']
    sets = ['#8a6a4a,#e0c9a0,#3a3030', '#5a7fc0,#d6e6f5,#f2c14e', '#e8603c,#f6c08a,#5fbf5a']
    jobs = []; files = []
    for i, c in enumerate(sets):
        f = f'{G}tmp/{key}-{i}.png'; jobs.append({'rig': rigs[key], 'colors': c, 'out': f, 'width': 260, 'grid': i == 0}); files.append(f)
    f = G + f'tmp/{key}-f.png'; jobs.append({'rig': rigs[key], 'colors': sets[1], 'out': f, 'width': 260, 'flip': True, 'pose': pose}); files.append(f)
    render(jobs, key); grid(files, out, cols=4)
    print('ok', out)
