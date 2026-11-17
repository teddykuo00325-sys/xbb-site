#!/usr/bin/env python3
"""把 App 的網頁版（xiaobenben 的 ios-v161/App/Site）複製到官網的 app/ 子目錄。

用法：python3 tools/sync-app.py <xiaobenben>/ios-v161/App/Site [/xbb-site/app/]

App 的網頁用根目錄絕對路徑（/assets/...、/pet-switcher.js）。官網放在 GitHub Pages
專案網址 /xbb-site/ 底下，所以把這些路徑改成帶前綴的路徑。之後換成自己的網域、
App 放在根目錄時，前綴傳 / 即可。/api 是手機 App 內建伺服器的
端點，網頁版本來就沒有，不改。
"""
import os, re, shutil, sys

src = os.path.abspath(sys.argv[1])
prefix = sys.argv[2] if len(sys.argv) > 2 else '/xbb-site/app/'
assert prefix.startswith('/') and prefix.endswith('/'), prefix
dst = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app')

shutil.rmtree(dst, ignore_errors=True)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('.DS_Store'))

skip = {'api', 'index.html'}
tops = sorted((n for n in os.listdir(dst) if n not in skip), key=len, reverse=True)
pat = re.compile(r'''(?<=["'`(])/(%s)(?=[/?#"'`)]|$)''' % '|'.join(map(re.escape, tops)))

changed = 0
for d, _, files in os.walk(dst):
    for f in files:
        if not f.endswith(('.js', '.mjs', '.html', '.css', '.json')):
            continue
        p = os.path.join(d, f)
        text = open(p, encoding='utf8').read()
        new = pat.sub(lambda m: prefix + m.group(1), text)
        if f == 'index.html' and d == dst and 'name="robots"' not in new:
            new = new.replace('<head>', '<head>\n    <meta name="robots" content="noindex">', 1)
        if new != text:
            open(p, 'w', encoding='utf8').write(new)
            changed += 1
print('copied', src, '->', dst, '; rewrote', changed, 'files with prefix', prefix)
