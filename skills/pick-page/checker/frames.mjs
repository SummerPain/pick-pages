// Draws chosen painters of a study at chosen times on one sheet (PNG), to look at key frames (wind-up, release, impact,
// settle) before publishing. A built page hides its painters inside a closure, so this loads the page's source files instead.
//   node frames.mjs "<src1.js;src2.js;...>" <out.png> "<painter@t[?k=v&k=v]>,..." [--size PX] [--cols N]
// Each item draws painter(ctx, w, h, t, params, { ctl, thumb: false }). In ?k=v, keys starting with "ctl." go to V.ctl (the
// page's controls, e.g. ctl.crew=four) and the rest to params (numbers when they look like numbers). Example:
//   node frames.mjs "src\engine.js;src\round6.js" sheet.png "red15@1.4,red15@1.55?ctl.crew=four,blue91@2.2?pov=2"
// Put Node on the Path first (check.ps1 shows how it finds it); playwright-core from this folder (README.md). 1.11.2026.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return +v; };
const size = opt('--size', 420), cols = opt('--cols', 4);
const [srcs, out, spec] = args;
if (!spec) { console.error('usage: node frames.mjs "<src1.js;src2.js;...>" <out.png> "<painter@t[?k=v&k=v]>,..." [--size PX] [--cols N]'); process.exit(2); }
const num = v => (v !== '' && !isNaN(+v) ? +v : v);
const items = spec.split(',').map(s => {
  const [head, query] = s.split('?'), [fn, t] = head.split('@'), p = {}, ctl = {};
  for (const kv of (query || '').split('&').filter(Boolean)) { const [k, v] = kv.split('='); if (k.startsWith('ctl.')) ctl[k.slice(4)] = num(v); else p[k] = num(v); }
  return { fn: fn.trim(), t: +t, p, ctl };
});
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] });
try {
  const pg = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = []; pg.on('pageerror', e => errors.push(e.message));
  await pg.setContent('<html><body></body></html>');
  await pg.addScriptTag({ content: srcs.split(';').map(f => readFileSync(f.trim(), 'utf-8')).join('\n') });
  if (errors.length) throw new Error('the sources failed to load: ' + errors.join('; '));
  const png = await pg.evaluate(({ items, size, cols }) => {
    const n = items.length, c = Math.min(cols, n), rows = Math.ceil(n / c);
    const sheet = document.createElement('canvas'); sheet.width = c * size; sheet.height = rows * size;
    const sc = sheet.getContext('2d'); sc.fillStyle = '#05060a'; sc.fillRect(0, 0, sheet.width, sheet.height);
    items.forEach((it, k) => {
      const cv = document.createElement('canvas'); cv.width = size; cv.height = size; const g = cv.getContext('2d'); g.fillStyle = '#05060a'; g.fillRect(0, 0, size, size);
      (0, eval)(it.fn)(g, size, size, it.t, it.p, { ctl: it.ctl, thumb: false });
      const cap = `${it.fn} @${it.t} ${JSON.stringify(Object.assign({}, it.ctl, it.p))}`; g.font = '12px sans-serif'; g.textAlign = 'left';
      g.fillStyle = 'rgba(5,6,10,.85)'; g.fillRect(4, 26, g.measureText(cap).width + 8, 18); g.fillStyle = '#fff'; g.fillText(cap, 8, 39);
      sc.drawImage(cv, (k % c) * size, Math.floor(k / c) * size);
    });
    return sheet.toDataURL('image/png');
  }, { items, size, cols });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('sheet: ' + out + '  (' + items.length + ' frames)');
} finally { await browser.close(); }
