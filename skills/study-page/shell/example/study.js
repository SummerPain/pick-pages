// ================================================================== the shell's example study: a loading spinner with stand-in drawings
// Build: powershell -NoProfile -ExecutionPolicy Bypass -File ..\build.ps1 -Title "Spinner look" -Out example.html -Src study.js
// It shows every part of the format: two sections (one pick / any number), versions with Before, branches, a combine, a ghost
// stem, a control, sliders with live figures, questions, last round's ratings, stars, and example marks.

// ---------------------------------------------------------------- painters (each draws one frame: ctx, w, h in CSS px, t in s, p = slider values, V = view)
const TAU = Math.PI * 2;
const ICE = [207, 227, 255], BLUE = [96, 170, 255], AMB = [243, 182, 94], PALE = [159, 180, 208], WHITE = [242, 248, 255];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${(a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3)})`;
const fr = x => x - Math.floor(x);
function glow(ctx, x, y, r, c, a) { if (!(a > 0)) return; r = Math.max(.5, r); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function dot(ctx, x, y, r, c, a) { if (!(a > 0)) return; ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(x, y, Math.max(.3, r), 0, TAU); ctx.fill(); }
// the Size control scales every spinner, as a real study's controls would change what is drawn
const frameOf = (W, H, V) => ({ cx: W / 2, cy: H / 2, R: Math.max(4, Math.min(W, H) * .27 * (V && V.ctl.size === 'small' ? .45 : 1)) });
function arcSpin(ctx, cx, cy, R, turn, c) { const a = -Math.PI / 2 + turn * TAU; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1, R * .12); ctx.strokeStyle = rgba(c, .92); ctx.beginPath(); ctx.arc(cx, cy, Math.max(.5, R), a, a + TAU * .75); ctx.stroke(); }
function petal(ctx, x, y, a, L, Wd, c, al) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rgba(c, al); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.5, L), Math.max(.5, Wd), 0, 0, TAU); ctx.fill(); ctx.restore(); }
function petals(ctx, W, H, t, V, o) {
  const { cx, cy, R } = frameOf(W, H, V), n = 6, ph = t * o.speed * n;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i / n * TAU + (o.turn || 0) * t * TAU, age = ((ph - i) % n + n) % n, b = Math.max(0, 1 - age / o.decay);
    const x = cx + R * o.r * Math.cos(a), y = cy + R * o.r * Math.sin(a);
    if (o.split) { const sep = R * o.split * b, tx = -Math.sin(a), ty = Math.cos(a); for (const s of [-1, 1]) petal(ctx, x + tx * sep * s, y + ty * sep * s, a, R * o.L, R * o.Wd * .55, ICE, .15 + .8 * b); }
    else petal(ctx, x, y, a, R * o.L, R * o.Wd, ICE, .14 + .8 * b);
    if (b > .05) glow(ctx, x, y, R * .45, BLUE, .2 * b);
  }
}
function comet(ctx, W, H, t, V, o) {
  const { cx, cy, R } = frameOf(W, H, V), a0 = -Math.PI / 2 + t * TAU * .9, N = 48;
  for (let i = N; i >= 1; i--) { const u = i / N, a = a0 - u * o.tail * TAU; dot(ctx, cx + R * Math.cos(a), cy + R * Math.sin(a), R * o.head * (1 - u) * .9 + .4, ICE, Math.pow(1 - u, 1.2 + o.crisp) * .6); }
  const hx = cx + R * Math.cos(a0), hy = cy + R * Math.sin(a0); glow(ctx, hx, hy, R * o.head * 5, BLUE, .35); dot(ctx, hx, hy, R * o.head, WHITE, 1);
}
function cometEllipse(ctx, W, H, t, V, o) {
  const { cx, cy, R } = frameOf(W, H, V), A = R * o.a, B = R * o.b, rot = o.rot + t * o.prec, N = 44;
  const pos = u => { const g = u * TAU, x = A * Math.cos(g), y = B * Math.sin(g); return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; };
  ctx.strokeStyle = rgba(PALE, .13); ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i <= 64; i++) { const [x, y] = pos(i / 64); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
  const h = t * o.sp; for (let i = N; i >= 1; i--) { const u = i / N, [x, y] = pos(h - u * .28); dot(ctx, x, y, R * .07 * (1 - u) + .4, ICE, Math.pow(1 - u, 2) * .6); }
  const [hx, hy] = pos(h); glow(ctx, hx, hy, R * .4, BLUE, .35); dot(ctx, hx, hy, R * .075, WHITE, 1);
}
const P = {
  arc: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V); arcSpin(ctx, cx, cy, R, t, PALE); },
  dots: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V), n = 8, ph = t * 1.1 * n; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * TAU, age = ((ph - i) % n + n) % n, b = Math.max(0, 1 - age / 5.5), x = cx + R * Math.cos(a), y = cy + R * Math.sin(a); glow(ctx, x, y, R * .3, BLUE, .28 * b); dot(ctx, x, y, R * (.06 + .035 * b), ICE, .25 + .75 * b); } },
  comet: (c, W, H, t, p, V) => comet(c, W, H, t, V, { head: .075, tail: .3, crisp: 1.2 }),
  comet22: (c, W, H, t, p, V) => comet(c, W, H, t, V, { head: .1, tail: .38, crisp: .3 }),
  pulse: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V), s = .5 + .5 * Math.sin(t * TAU * .8); glow(ctx, cx, cy, R * (.9 + .3 * s), BLUE, .1 + .12 * s); ctx.lineWidth = Math.max(1, R * (.05 + .05 * s)); ctx.strokeStyle = rgba(ICE, .35 + .55 * s); ctx.beginPath(); ctx.arc(cx, cy, R * (.86 + .12 * s), 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = rgba(PALE, .25); ctx.beginPath(); ctx.arc(cx, cy, R * .55, 0, TAU); ctx.stroke(); },
  petals: (c, W, H, t, p, V) => petals(c, W, H, t, V, { speed: 1, decay: 3.2, r: .62, L: .26, Wd: .1 }),
  petalsSlow: (c, W, H, t, p, V) => petals(c, W, H, t, V, { speed: .5, decay: 4.2, r: .64, L: .3, Wd: .13 }),
  split: (c, W, H, t, p, V) => petals(c, W, H, t, V, { speed: 1, decay: 2.2, r: .62, L: .26, Wd: .12, split: .1 }),
  split41: (c, W, H, t, p, V) => petals(c, W, H, t, V, { speed: 1, decay: 3.6, r: .62, L: .26, Wd: .12, split: .2 }),
  twin: (c, W, H, t, p, V) => { petals(c, W, H, t, V, { speed: 1, decay: 2.2, r: .8, L: .2, Wd: .1, split: .08, turn: .12 }); petals(c, W, H, t + .5, V, { speed: 1, decay: 2.2, r: .38, L: .14, Wd: .08, split: .06, turn: -.18 }); },
  orbit: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V), a = -Math.PI / 2 + t * TAU * .55, ox = cx + R * .7 * Math.cos(a), oy = cy + R * .7 * Math.sin(a); ctx.strokeStyle = rgba(PALE, .14); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R * .7, 0, TAU); ctx.stroke(); for (const s of [0, .5]) { const b = t * TAU * 1.5 + s * TAU, x = ox + R * .24 * Math.cos(b), y = oy + R * .24 * Math.sin(b); glow(ctx, x, y, R * .3, BLUE, .3); dot(ctx, x, y, R * .075, ICE, 1); } },
  cometOrbit: (c, W, H, t, p, V) => cometEllipse(c, W, H, t, V, { a: 1, b: .55, rot: -.35, prec: .05, sp: .8 }),
  cometWide: (c, W, H, t, p, V) => cometEllipse(c, W, H, t, V, { a: 1.25, b: .42, rot: -.2, prec: .03, sp: .55 }),
  spiral: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V), a0 = t * TAU * .7; ctx.lineCap = 'round'; for (let k = 26; k >= 0; k--) { const a = a0 - k * .07, al = Math.pow(1 - k / 27, 2); ctx.strokeStyle = rgba(k ? ICE : WHITE, k ? al * .5 : 1); ctx.lineWidth = Math.max(1, R * (k ? .025 : .04)); ctx.beginPath(); for (let i = 0; i <= 24; i++) { const r = R * i / 24, b = a - (i / 24) * .9, x = cx + r * Math.cos(b), y = cy + r * Math.sin(b); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); } glow(ctx, cx, cy, R * .25, BLUE, .25); },
  softBurst: (ctx, W, H, t, p, V) => { const { cx, cy, R } = frameOf(W, H, V), ph = fr(t * .7); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = R * (.2 + .8 * ph); dot(ctx, cx + r * Math.cos(a), cy + r * Math.sin(a), R * .05 * (1 - ph * .5), ICE, (1 - ph) * .9); } glow(ctx, cx, cy, R * .5 * (1 - ph), BLUE, .3 * (1 - ph)); },
};
// timing: the same arc turned by a different clock, with its last 4 s drawn as a graph beside it
const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const CLOCK = {
  steady: () => t => t,
  ease: p => t => { const T = Math.max(.1, p.turn), k = Math.floor(t / T); return k + easeIO(t / T - k); },
  pause: p => t => { const c = 1 + p.pause / 1000, k = Math.floor(t / c); return k + Math.min(1, t - k * c); },
  two: p => t => { const C = 2 * p.idle + 2 * p.busy, k = Math.floor(t / 4), u = t - k * 4; return k * C + (u < 2 ? p.idle * u : 2 * p.idle + p.busy * (u - 2)); },
};
const TURNS10 = { steady: () => 10, ease: p => 10 / p.turn, pause: p => 10 / (1 + p.pause / 1000), two: p => 10 * (p.idle + p.busy) / 2 };
function timingCard(clock, label) {
  return (ctx, W, H, t, p, V) => {
    const f = CLOCK[clock](p), R = Math.max(4, Math.min(W * .15, H * .26) * (V.ctl.size === 'small' ? .45 : 1)), cx = W * .25, cy = H * .5, fs = Math.max(10, Math.min(15, H * .045));
    arcSpin(ctx, cx, cy, R, fr(f(t)), ICE);
    if (label) { ctx.fillStyle = rgba(AMB, .9); ctx.font = `600 ${fs}px ui-monospace, Consolas, monospace`; ctx.textAlign = 'center'; ctx.fillText(label(t), cx, cy + Math.min(W * .15, H * .26) + fs * 2); }
    const gx = W * .47, gw = W * .46, gy = H * .26, gh = H * .48;
    ctx.strokeStyle = rgba(PALE, .2); ctx.lineWidth = 1; ctx.strokeRect(gx + .5, gy + .5, gw, gh);
    ctx.strokeStyle = rgba(ICE, .85); ctx.lineWidth = Math.max(1.2, H * .005); ctx.beginPath();
    let pv = null; for (let i = 0; i <= 200; i++) { const tt = t - 4 + 4 * i / 200, v = tt < 0 ? 0 : fr(f(tt)), x = gx + gw * i / 200, y = gy + gh * (1 - v); if (pv === null || Math.abs(v - pv) > .5) ctx.moveTo(x, y); else ctx.lineTo(x, y); pv = v; }
    ctx.stroke(); ctx.fillStyle = rgba(PALE, .75); ctx.font = `${(fs * .85).toFixed(1)}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillText('turn over the last 4 s', gx, gy - fs * .6); ctx.textAlign = 'right'; ctx.fillText('now', gx + gw, gy + gh + fs * 1.2);
  };
}
const turnsFig = clock => p => `Turns in 10 s: <b>${TURNS10[clock](p).toFixed(1)}</b>${clock === 'steady' ? '' : ' · Now: 10.0'}`;

// ---------------------------------------------------------------- the study
const STUDY = {
  id: 'spinner-look-example', title: 'Spinner look', round: 4, kind: 'look',
  subtitle: 'the shell\'s example study, stand-in drawings',
  about: '<p><b>The shell\'s example.</b> A loading spinner in its fourth round. It shows every part of a study page; the marks already on it are examples (Clear removes them, Undo brings them back).</p><p><b>Shape</b> takes one pick, as look studies do. <b>Timing</b> takes any number, as enhance and expand studies do; it has a pick (2), so it is finished and its improve on 3 is set aside.</p>',
  since: '<p>Your line for round 3 asked: improve 2.2 and 4B.1, branch 4B.1 and 6, drop 8, more takes 1; rate 2.2 7, 4A 4.</p><p><span class="mono">2.2 → 2.3</span> a smaller, sharper head · <span class="mono">4B.1 → 4B.2</span> the halves close in 0.35 s, not 0.6 · new <span class="mono">4B.2D</span> Twin split, a branch off 4B.2 (it grows from the improved version) · new <span class="mono">6E</span> Wide orbit, a branch off 6 · new <span class="mono">7</span> Spiral (more takes) · <span class="mono">8</span> dropped; its branch 8C stays on 8\'s hollow stem.</p>',
  controls: [{ key: 'size', label: 'Size', options: [['big', 'Large'], ['small', 'Small']] }],
  questions: [
    { id: 'Q1', t: 'Where the spinner sits', x: 'It shows while a level loads.', o: [['a', 'centre', 'In the middle of the screen.'], ['b', 'corner', 'In the bottom right corner, small.']] },
    { id: 'Q2', t: 'A label under it', o: [['a', 'none', 'No label.'], ['b', 'percent', 'The percent loaded.'], ['c', 'tips', 'A rotating tip.']] },
  ],
  sections: [
    { id: 'shape', n: 1, name: 'Shape', hook: 'one pick', start: '4B', row: ['now', '1', '2', '3', '4', '5', '6', '7', '8'],
      brief: 'What turns. Every take keeps one turn a second, so only the shape differs; <b>Timing</b> decides the motion.', its: {
      now: { name: 'Plain arc', paint: P.arc, cap: 'The game today: a three-quarter arc turning once a second.' },
      1: { name: 'Ring of dots', paint: P.dots, cap: 'Eight dots in a ring; the light runs round them, each dot lit by the one before.', why: 'Calm and readable even small. Risk: the most common spinner there is.' },
      2: { v: 3, name: 'Comet', paint: P.comet, prev: P.comet22, changed: true, cap: 'One bright head runs the circle; its tail is the light it leaves behind.', why: 'One clear moving point, so it reads at any size. Risk: at ×¼ the tail looks like a smear.', hist: [['2', 'Comet'], ['2.1', 'the tail fades sooner'], ['2.2', 'retried: one head, not two'], ['2.3', 'a smaller, sharper head']], last: { rate: 7 } },
      3: { name: 'Pulse', paint: P.pulse, cap: 'The ring breathes: it swells and brightens, then settles.', why: 'Quiet, good for long waits. Risk: it says "busy" less clearly than something that turns.' },
      4: { name: 'Petals', paint: P.petals, kids: ['4A', '4B'], cap: 'Six petals light in turn round the centre.', why: 'More shape than a ring of dots. Risk: busy next to small text.' },
      '4A': { name: 'Petals, slow', paint: P.petalsSlow, cap: 'The same petals at half the pace, larger and softer.', why: 'Calmer. Risk: at ×½ it reads as stuck.', last: { rate: 4 } },
      '4B': { v: 2, name: 'Split petals', paint: P.split, prev: P.split41, kids: ['4B.2D'], changed: true, cap: 'Each petal splits in two as it lights; the halves part and close again.', why: 'A small surprise on every beat. Risk: the split is lost below 24 px.', hist: [['4B', 'Split petals'], ['4B.1', 'the halves part wider'], ['4B.2', 'the halves close in 0.35 s, not 0.6']] },
      '4B.2D': { name: 'Twin split', paint: P.twin, fresh: true, star: 'it keeps the split you liked and adds depth without adding speed, and it reads at a glance at both sizes.', cap: 'Two rings of split petals turning against each other, the inner one half a beat behind.', why: 'Depth from two layers. Risk: two motions can be too much in a small corner.' },
      5: { name: 'Orbit', paint: P.orbit, cap: 'Two dots circle each other as they go round.', why: 'Playful. Risk: hard to tell which way it turns.' },
      6: { name: 'Comet on an orbit', paint: P.cometOrbit, kids: ['6E'], from: '2.1 + 5 (your combine, round 2)', cap: '2.1\'s comet riding 5\'s path, an ellipse that slowly turns.', why: 'The comet\'s clarity with more life. Risk: the ellipse looks tilted, not round.' },
      '6E': { name: 'Wide orbit', paint: P.cometWide, fresh: true, cap: 'The same comet on a wider, flatter ellipse, a third slower.', why: 'Calmer and more horizontal. Risk: it reads as a loading bar.' },
      7: { name: 'Spiral', paint: P.spiral, fresh: true, cap: 'A sweep line turns from the centre and leaves a fading spiral.', why: 'The only one that grows from the middle out. Risk: the trail can look like radar.' },
      8: { name: 'Burst', ghost: true, kids: ['8C'] },
      '8C': { name: 'Soft burst', paint: P.softBurst, cap: 'A ring of dots blooms outward from the centre and fades, once a second and a half.', why: 'Reads as "working" without turning. Risk: it can look like a hit flash.' },
    } },
    { id: 'timing', n: 2, name: 'Timing', hook: 'any number of picks', one: false, row: ['now', '1', '2', '3'], its: {
      now: { name: 'Steady', paint: timingCard('steady'), fig: turnsFig('steady'), cap: 'One turn a second, always.' },
      1: { name: 'Ease each turn', paint: timingCard('ease'), fig: turnsFig('ease'), params: [{ k: 'turn', label: 'turn', min: .6, max: 2, step: .1, def: 1.2, unit: 's' }], cap: 'Each turn starts slowly, speeds up and settles at the top.', why: 'Feels alive. Risk: a long turn looks like a stall.' },
      2: { name: 'Pause at the top', paint: timingCard('pause'), fig: turnsFig('pause'), star: 'it keeps Now\'s steady speed and adds one clear beat, and the pause is easy to tune.', params: [{ k: 'pause', label: 'pause', min: 0, max: 600, step: 20, def: 200, unit: 'ms' }], cap: 'Steady turns with a short rest at the top of each.', why: 'A rhythm you can count. Risk: past 400 ms it reads as frozen.' },
      3: { name: 'Two speeds', paint: timingCard('two', tt => Math.floor(Math.max(0, tt) / 2) % 2 ? 'busy' : 'idle'), fig: turnsFig('two'), fresh: true, params: [{ k: 'idle', label: 'idle', min: .3, max: 1, step: .05, def: .5, unit: 'turns/s' }, { k: 'busy', label: 'busy', min: 1, max: 3, step: .1, def: 1.6, unit: 'turns/s' }], cap: 'Slow while waiting, fast while working; here it swaps every 2 s.', why: 'Tells waiting from working. Risk: the game has to say which one it is.' },
    } },
  ],
  // example marks, only for this example page (a real study starts with none)
  example: () => ({
    m: { 'shape/2': { req: 'improve', rate: 8, note: 'the head a touch smaller still' }, 'shape/3': { drop: true }, 'shape/1': { rate: 6 }, 'shape/4A': { rate: 3, note: 'too slow at ×½' }, 'shape/4B': { branch: 1, note: 'the same in two colours' },
      'timing/2': { pick: true }, 'timing/3': { req: 'improve', note: 'a softer change between the speeds' }, 'timing/1': { rate: 7 } },
    rows: { 'shape/6': true }, groups: [{ id: 1, sid: 'shape', keys: ['1', '5'], note: '1\'s dots riding 5\'s orbit' }], gid: 1,
  }),
};
