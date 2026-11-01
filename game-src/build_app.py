# Builds the offline mobile-app version of the game into the Capacitor www/ folder.
import re, pathlib, shutil, subprocess, sys
d = pathlib.Path(__file__).resolve().parent
subprocess.run([sys.executable, str(d / 'build.py')], check=True)
src = (d / 'voltworks.html').read_text()
# drop Google Fonts links, use bundled fonts instead
src = re.sub(r'<link rel="(preconnect|stylesheet)"[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n?', '', src)
src = src.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
faces = ''
for fam, slug, ws in [('Rajdhani', 'rajdhani', [500, 600, 700]), ('Exo 2', 'exo-2', [500, 600, 700]), ('Orbitron', 'orbitron', [800, 900]), ('Fredoka', 'fredoka', [500, 600, 700]), ('Nunito', 'nunito', [600, 700, 800, 900])]:
    for w in ws:
        faces += f"@font-face {{ font-family: '{fam}'; font-weight: {w}; font-style: normal; font-display: swap; src: url('fonts/{slug}-latin-{w}-normal.woff2') format('woff2'); }}\n"
head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#070a14">
<style>
{faces}:root {{ padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }}
body {{ margin: 0; overscroll-behavior: none; }}
</style>
"""
out = head + src.replace('<title>', '<title>', 1) + '\n</html>\n'
# body tag: the template has no <body>; browsers create one implicitly, which is fine.
www = d.parent / 'www'
(www / 'index.html').write_text(out)
shutil.copytree(d / 'art', www / 'art', dirs_exist_ok=True, ignore=shutil.ignore_patterns('app_icon.png'))
print('app index.html', len(out))

# mirror the built game into the iOS project (same as `npx cap copy ios`), so Xcode always runs the latest game
# without needing Node.js. Capacitor's own generated files (cordova.js, cordova_plugins.js) are kept.
KEEP = ('cordova.js', 'cordova_plugins.js')
dst = d.parent / 'ios/App/App/public'
if dst.parent.exists():
    keep = {n: (dst / n).read_bytes() for n in KEEP if (dst / n).exists()}
    shutil.rmtree(dst, ignore_errors=True); shutil.copytree(www, dst)
    for n, b in keep.items(): (dst / n).write_bytes(b)
    print('mirrored www into ios (kept ' + ', '.join(keep) + ')')
