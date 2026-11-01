import re, pathlib
d = pathlib.Path(__file__).parent
t = (d / 'template.html').read_text()
def strip_exports(s):
    return re.sub(r"\nif \(typeof module !== 'undefined'\).*\n?", "\n", s)
for key, f in [('ENGINE', 'engine.js'), ('LEVELS', 'levels.js'), ('PAINT', 'paint.js'), ('DAILY', 'dailies.js'), ('CLOUD', 'cloud.js'), ('MONEY', 'money.js'), ('APP', 'app.js')]:
    t = t.replace('/*' + key + '*/', strip_exports((d / f).read_text()))
(d / 'voltworks.html').write_text(t)
(d / 'voltworks_test.html').write_text('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>' + t + '</body></html>')
print('built', len(t), 'bytes')
