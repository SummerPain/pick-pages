// Checks a study page in headless Edge (Playwright): inline scripts compile, no console errors, the selftest passes,
// no sideways scroll, every take keeps a smooth frame rate on a slow CPU, and screenshots that are never stale.
//   node check.mjs <page.html> [--out DIR] [--mobile] [--takes all|sec/key,sec/key] [--wait MS] [--no-selftest]
//                  [--perf | --no-perf] [--cpu N] [--every] [--jobs N] [--words]
// --words (7.11.2026) checks only the page's words against the shell's limits (reference/words.md), in a few seconds: for rewriting.
// Before the slow run, a fast pass at full speed clears takes whose drawing is far under the budget, and takes that draw the
// same picture share one run; the slow runs go --jobs at a time (3), each in a browser of its own (5.11.2026).
// Frame times (31.10.2026, after a take froze the author's phone again and again): with --takes, each take runs for 3 s with
// the CPU slowed N times (--cpu, 6 by default, about a phone), after 1.5 s to build. Meanwhile the window loses 56 px of
// height and gets them back, as a phone's address bar does when the page scrolls. It fails when a frame takes over 200 ms,
// one frame in twenty over 60 ms, or a take reads a shown canvas back (getImageData) every few frames: headless Edge does
// that cheaply, a phone's GPU stalls on it. On by default with --mobile; --perf turns it on for the desktop run.
// The PC's load (6.11.2026): both budgets stretch with how busy the PC is while it times (LOAD below); --no-load keeps them fixed,
// --load 0.4 sets the load by hand (to test the stretch).
// Prints one line per finding and ends with "CHECK ok" or "CHECK failed (n)"; exit code 0 / 1.
// Part of the pick-page skill (checker/, README.md there): once per PC, Node 18 or later and `npm install` in this folder
// (playwright-core, which drives the Microsoft Edge already installed; no browser download).
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir, cpus } from 'node:os';
import vm from 'node:vm';

const args = process.argv.slice(2), page = args.find(a => !a.startsWith('--') && !isValue(a));
function isValue(a) { const i = args.indexOf(a); return i > 0 && ['--out', '--takes', '--wait', '--cpu', '--jobs', '--load'].includes(args[i - 1]); }
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
if (!page) { console.log('usage: node check.mjs <page.html> [--out DIR] [--mobile] [--takes all|sec/key,...] [--wait MS] [--no-selftest]'); process.exit(2); }

const file = resolve(page), name = basename(file, '.html');
const out = resolve(opt('--out') || join(tmpdir(), 'study-check', name)), wait = +(opt('--wait') || 700);
const mobile = args.includes('--mobile'), takesArg = opt('--takes');
const perf = (mobile || args.includes('--perf')) && !args.includes('--no-perf'), cpu = +(opt('--cpu') || 6);
const jobs = Math.max(1, +(opt('--jobs') || 3));
const PERF = { warm: 1500, span: 3000, worst: 200, p95: 60 };
// The PC's load (6.11.2026). Frames slow down when other programs use the CPU: the same takes drew about 1.6× slower with another
// program using about 40 % of a 20-thread desktop's CPU than idle at about 5 %: half the frames 49–56 ms against 35, 1 in 20
// over 63–90 ms against 42–49, the worst 104–146 ms against 69–76. So the check measures the whole PC's busy share for 2 s before
// the slow runs and 1.5 s after them (this check's own page is open and drawing then, which LOAD.idle allows for), takes the higher,
// and stretches both budgets by 1 + 2 × (load − 10 %), at most ×2.5: ×1.6 at 40 %, ×2 at 60 %. Approximate on purpose.
const LOAD = { idle: 0.10, per: 2.0, max: 2.5 };
const loadScale = l => Math.min(LOAD.max, 1 + LOAD.per * Math.max(0, l - LOAD.idle));
async function pcLoad(span) {
  if (opt('--load') !== undefined) return +opt('--load');
  const a = cpus(); await new Promise(r => setTimeout(r, span)); const b = cpus();
  let busy = 0, all = 0;
  b.forEach((c, i) => { const p = a[i].times, q = c.times, idle = q.idle - p.idle, tot = q.user - p.user + q.nice - p.nice + q.sys - p.sys + q.irq - p.irq + idle; busy += tot - idle; all += tot; });
  return all ? busy / all : 0;
}
let F = 1;   // the budgets' stretch for the load measured (1: as written)
mkdirSync(out, { recursive: true });
const fails = []; const fail = m => { fails.push(m); console.log('FAIL ' + m); };

// 1. Syntax: compile every classic inline script without running it.
const html = readFileSync(file, 'utf8');
let n = 0;
for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  if (/\bsrc=|type=["']?(module|application\/json|text\/plain)/i.test(m[1] || '')) continue;
  n++;
  try { new vm.Script(m[2], { filename: `${name}.html <script #${n}>` }); }
  catch (e) { const line = (e.stack || '').split('\n')[0]; fail(`syntax in script #${n}: ${e.message} (${line})`); }
}
if (fails.length) { console.log(`CHECK failed (${fails.length})`); process.exit(1); }

// 2. Load in headless Edge.
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] });
const ctx = await browser.newContext(mobile
  ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 820 } });
// Count reads of shown canvases (getImageData on a canvas in the page), for the frame-time check.
await ctx.addInitScript(() => {
  const orig = CanvasRenderingContext2D.prototype.getImageData; window.__shownReads = 0;
  CanvasRenderingContext2D.prototype.getImageData = function (...a) { if (this.canvas && this.canvas.isConnected) window.__shownReads++; return orig.apply(this, a); };
});
const tab = await ctx.newPage();
tab.on('console', m => { if (m.type() === 'error') fail(`console: ${m.text()}`); });
tab.on('pageerror', e => fail(`page error: ${e.message}`));
await tab.goto(pathToFileURL(file).href, { waitUntil: 'load' });
// A page without a viewport meta lays out at 980 px on a phone; the published artifact gets one, so add it here.
if (mobile) await tab.evaluate(() => { if (!document.querySelector('meta[name=viewport]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1'; document.head.appendChild(m); } });
await tab.waitForTimeout(wait);

// --words (7.11.2026): only the words, every block over its limits (the self-test runs the same check); nothing else.
if (args.includes('--words')) {
  const over = await tab.evaluate(() => window.__study && window.__study.words ? window.__study.words() : null);
  if (over === null) fail('words: this page\'s shell has no words check (rebuild it)');
  else { for (const m of over) console.log(`words: ${m}`); console.log(`WORDS ${over.length ? over.length + ' blocks over the limits (the pick-page skill\'s reference/words.md)' : 'ok'}`); if (over.length) fail('words over the limits'); }
  await browser.close();
  console.log(fails.length ? `CHECK failed (${fails.length})` : 'CHECK ok');
  process.exit(fails.length ? 1 : 0);
}

// 3. Selftest (shell pages only).
if (!args.includes('--no-selftest')) {
  const st = await tab.evaluate(() => typeof window.__runSelftest === 'function' ? window.__runSelftest() : null);
  if (st === null) console.log('selftest: none on this page');
  else { console.log(st.trim()); const m = /errors=(\d+)/.exec(st); if (!m || +m[1]) fail('selftest reported errors'); }
}

// 3b. A sound's background (5.11.2026): a tab that plays over something (`under`) must send it into X.under, so Solo can silence it.
// Silent: the shell starts each such tab's first take into a gain that reaches no speaker and watches what connects where.
if (!mobile) {
  const under = await tab.evaluate(() => window.__study && window.__study.underCheck ? window.__study.underCheck() : null);
  if (under) for (const u of under) {
    console.log(`under ${u.sec}/${u.take}: over ${u.under} (${JSON.stringify(u.ctl)}): ${u.toUnder} into X.under, ${u.toOut} into out${u.err ? ', error ' + u.err : ''}`);
    if (u.err) fail(`under ${u.sec}/${u.take}: the sound failed: ${u.err}`);
    else if (!u.toUnder) fail(`under ${u.sec}/${u.take}: plays over ${u.under}, but nothing went into X.under in 2.5 s: Solo cannot silence it (connect the background to X.under)`);
  }
}

// 4. Sideways scroll.
const wide = await tab.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
if (wide.sw > wide.w + 1) fail(`page scrolls sideways: ${wide.sw} px wide in a ${wide.w} px window`);

// 5. Screenshots, and frame times on a slowed CPU.
const tag = mobile ? 'phone' : 'desk', shots = [], ms = x => Math.round(x);
const shoot = async label => { const p = join(out, `${tag}-${label.replace(/[^\w.-]+/g, '_')}.png`); await tab.screenshot({ path: p }); shots.push(p); };
await shoot('start');
const ctxOpts = mobile ? { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 820 } };
// One browser of its own per job, so the timed takes don't share a GPU process (5.11).
async function worker() {
  const b = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] }), c = await b.newContext(ctxOpts);
  await c.addInitScript(() => {
    const orig = CanvasRenderingContext2D.prototype.getImageData; window.__shownReads = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (...a) { if (this.canvas && this.canvas.isConnected) window.__shownReads++; return orig.apply(this, a); };
  });
  const tb = await c.newPage();
  tb.on('pageerror', e => fail(`page error (timing): ${e.message}`));
  await tb.goto(pathToFileURL(file).href, { waitUntil: 'load' });
  if (mobile) await tb.evaluate(() => { if (!document.querySelector('meta[name=viewport]')) { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1'; document.head.appendChild(m); } });
  await tb.waitForTimeout(wait);
  return { b, tb, cdp: await c.newCDPSession(tb) };
}
// Frame times of the take on show: the first frame (it may build caches), then the steady frames with the CPU slowed.
async function frames({ tb, cdp }, t) {
  const [s, k] = t.split('/');
  await tb.evaluate(([s, k]) => window.__study.go(s, k), [s, k]);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  const vp = tb.viewportSize();
  const run = tb.evaluate(async ([warm, span]) => {
    const t0 = performance.now(), raf = () => new Promise(res => requestAnimationFrame(res));
    await raf(); await raf(); const first = performance.now() - t0;
    await new Promise(res => setTimeout(res, warm));
    window.__shownReads = 0;
    const ts = [], end = performance.now() + span;
    while (performance.now() < end) ts.push(await raf());
    const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]); d.sort((a, b) => a - b);
    const at = q => d.length ? d[Math.min(d.length - 1, Math.floor(d.length * q))] : 0;
    return { first, n: d.length, med: at(0.5), p95: at(0.95), worst: d.length ? d[d.length - 1] : 0, reads: window.__shownReads };
  }, [PERF.warm, PERF.span]);
  // the address bar: 56 px of height lost and given back while the frames are counted
  await tb.waitForTimeout(PERF.warm + PERF.span / 3);
  await tb.setViewportSize({ width: vp.width, height: vp.height - 56 });
  await tb.waitForTimeout(PERF.span / 3);
  await tb.setViewportSize(vp);
  const r = await run;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const lines = [`perf ${t} (cpu ×${cpu}): first ${ms(r.first)} ms, frames ${r.n}, median ${ms(r.med)} ms, 1 in 20 over ${ms(r.p95)} ms, worst ${ms(r.worst)} ms, shown-canvas reads ${r.reads}`];
  return { lines, bad: judge(t, r), r };
}
// a take's findings against the budgets as stretched for the PC's load (F)
function judge(t, r) {
  const bad = [], W = PERF.worst * F, P = PERF.p95 * F;
  if (r.reads > r.n / 4) bad.push(`perf ${t}: reads a shown canvas back ${r.reads} times in ${r.n} frames (getImageData on the canvas on show stalls a phone's GPU; draw into a canvas of your own)`);
  if (r.worst > W || r.p95 > P) bad.push(`perf ${t}: frames too slow (worst ${ms(r.worst)} ms, 1 in 20 over ${ms(r.p95)} ms; the budget is ${ms(W)} and ${ms(P)} ms${F > 1 ? `, ${PERF.worst} and ${PERF.p95} × ${F.toFixed(2)} for the PC's load` : ''})`);
  return bad;
}
if (takesArg) {
  const list = await tab.evaluate(() => window.__study && window.__study.takes ? window.__study.takes() : null);
  if (!list) fail('--takes: this page has no window.__study.takes (made before the 30.10 shell)');
  else {
    const want = (takesArg === 'all' ? list.flatMap(s => s.keys.map(k => `${s.sec}/${k}`)) : takesArg.split(',')).filter(t => {
      const [s, k] = t.split('/'); const ok = list.some(x => x.sec === s && x.keys.includes(k)); if (!ok) fail(`--takes: no take ${t}`); return ok; });
    if (perf) {
      const every = args.includes('--every'), note = {}, T0 = Date.now();
      let toTime = want.slice();
      // Fast pass (5.11.2026): the shell's __study.cost draws the take frame by frame at full speed, at the shown size, and times
      // the drawing itself. Times the CPU slowdown, a take far under the budget (1 in 20 under half of 60 ms, the worst under half
      // of 200 ms) is cleared without the slow run; the rest are timed. --every skips the fast pass and the fingerprints.
      if (!every) {
        const costs = await tab.evaluate(w => window.__study.cost ? w.map(t => { const [s, k] = t.split('/'); try { return window.__study.cost(s, k); } catch (e) { return null; } }) : null, want);
        if (!costs) console.log('fast: this page has no __study.cost (shell before 5.11), every take gets the slow run');
        else {
          toTime = want.filter((t, i) => {
            const c = costs[i]; if (!c) { console.log(`fast ${t}: the drawing failed, timed`); return true; }
            const clear = c.p95 * cpu <= PERF.p95 / 2 && c.worst * cpu <= PERF.worst / 2;
            console.log(`fast ${t}: drawing ${c.med.toFixed(2)} ms median, 1 in 20 over ${c.p95.toFixed(2)}, worst ${c.worst.toFixed(2)} at full speed (×${cpu}: ${ms(c.p95 * cpu)} / ${ms(c.worst * cpu)} ms), ${clear ? 'cleared' : 'timed'}`);
            if (clear) note[t] = 'cleared by the fast pass';
            return !clear;
          });
        }
        // takes that draw the same picture share one slow run (__study.still)
        if (toTime.length > 1) {
          const prints = await tab.evaluate(w => window.__study.still ? w.map(t => { const [s, k] = t.split('/'); try { return window.__study.still(s, k); } catch (e) { return 'x' + t; } }) : null, toTime);
          if (prints) { const first = {}; toTime = toTime.filter((t, i) => { if (prints[i] in first) { note[t] = `same picture as ${first[prints[i]]}`; return false; } first[prints[i]] = t; return true; }); }
        }
      }
      console.log(`perf: ${toTime.length} of ${want.length} takes get the slow run, ${Math.min(jobs, toTime.length)} at a time`);
      // Slow runs, `jobs` browsers at once (--jobs, 3 by default; fewer on a small PC)
      const res = {}, queue = toTime.slice(), noLoad = args.includes('--no-load'), pc = l => `${Math.round(l * 100)} %`;
      // the PC's load before the timing browsers open (LOAD, above): it stretches the budgets for the first judgement
      const before = noLoad || !queue.length ? 0 : await pcLoad(2000);
      F = noLoad ? 1 : loadScale(before);
      // every browser loads the page before any timing starts: a page loading in one browser slowed the frames timed in another
      const ws = await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, worker));
      try { await Promise.all(ws.map(async w => { while (queue.length) { const t = queue.shift(); res[t] = await frames(w, t); } })); }
      finally { await Promise.all(ws.map(w => w.b.close())); }
      // running together only makes frames slower, never faster: a pass stands, a fail is timed again alone before it counts
      const again = toTime.filter(t => res[t].bad.length);
      if (again.length && ws.length > 1) {
        console.log(`perf: ${again.length} failed with ${ws.length} at a time, timed again alone: ${again.join(', ')}`);
        const w = await worker();
        try { for (const t of again) res[t] = await frames(w, t); } finally { await w.b.close(); }
      }
      // and after them: the higher of the two counts (a program started mid-run is caught), and every take is judged again with it
      if (!noLoad && toTime.length) {
        const after = await pcLoad(1500), l = Math.max(before, after);
        F = loadScale(l);
        for (const t of toTime) res[t].bad = judge(t, res[t].r);
        console.log(`perf: the PC was ${pc(before)} busy before the slow runs and ${pc(after)} after${opt('--load') !== undefined ? ' (set by --load)' : ''} (other programs, and this check's own page); ${F > 1 ? `the budgets stretch ×${F.toFixed(2)} to ${ms(PERF.worst * F)} and ${ms(PERF.p95 * F)} ms (frames slow down under load; approximate)` : `the budgets stay ${PERF.worst} and ${PERF.p95} ms`}${F >= LOAD.max ? '. Too busy for a fair timing: time again on an idle PC' : ''}`);
      }
      for (const t of want) {
        if (res[t]) { res[t].lines.forEach(l => console.log(l)); res[t].bad.forEach(fail); }
        else if (note[t]) console.log(`perf ${t}: ${note[t]}, no slow run`);
      }
      console.log(`perf: done in ${((Date.now() - T0) / 1000).toFixed(1)} s`);
    }
    for (const t of want) {
      const [s, k] = t.split('/');
      await tab.evaluate(([s, k]) => window.__study.go(s, k), [s, k]);
      await tab.waitForTimeout(wait);
      await shoot(t);
    }
  }
}
await browser.close();

console.log(`shots: ${out}  (${shots.length})`);
console.log(fails.length ? `CHECK failed (${fails.length})` : 'CHECK ok');
process.exit(fails.length ? 1 : 0);
