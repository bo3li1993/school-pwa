import os, chardet
exts = ('.js', '.html', '.css')
skip = {'node_modules', '.git'}
fixed = 0
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in skip and not d.startswith('.')]
    for f in files:
        if not any(f.endswith(e) for e in exts):
            continue
        path = os.path.join(root, f)
        try:
            raw = open(path, 'rb').read()
            det = chardet.detect(raw)
            enc = (det.get('encoding') or 'utf-8').lower()
            if enc in ('utf-8', 'utf-8-sig', 'ascii'):
                continue
            text = raw.decode(enc, errors='replace')
            open(path, 'w', encoding='utf-8').write(text)
            print('Fixed: ' + path)
            fixed += 1
        except Exception as e:
            print('Skip: ' + path + ' - ' + str(e))
print(str(fixed) + ' files fixed')