// ================================================================== pick-page shell (the pick-page skill; edit it there, never per page)
// The page's own source defines STUDY (and its painters) before this runs; reference/shell.md in the skill describes STUDY.
// Everything here is generic: the header, the pick line and Load, the tree of takes, the row of chips, the panel and Compare,
// the marks, the branch map and the whole tree, keys and swipes, the clock with Play and Restart, and the self-test.
(() => {
'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SELF = location.hash === '#selftest' || !!window.__SELFTEST__;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const MONO = 'ui-monospace, "Cascadia Mono", Consolas, monospace', FONT = 'system-ui, "Segoe UI", sans-serif';
const store = {
  off: false,
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { if (this.off) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage (a data: page, a private window): the page still works */ } },
};
let strict = false;

// ---------------------------------------------------------------- the page's STUDY, checked and indexed
function fail(msg) { document.body.insertAdjacentHTML('afterbegin', `<pre style="color:#f08f9d;padding:16px;white-space:pre-wrap">pick page: ${esc(msg)}</pre>`); throw new Error(msg); }
if (typeof STUDY !== 'object' || !STUDY) fail('the page defines no STUDY.');
for (const f of ['id', 'title', 'round', 'sections']) if (STUDY[f] === undefined) fail(`STUDY.${f} is missing.`);
const KIND = STUDY.kind || 'look';
const SECS = STUDY.sections;
const CTL = STUDY.controls || [];
const QUESTIONS = STUDY.questions || [];
const secOf = sid => SECS.find(s => s.id === sid);
const shownId = (S, k) => k === 'now' ? 'Now' : (S.its[k].v ? `${k}.${S.its[k].v}` : k);
if (!Array.isArray(SECS) || !SECS.length) fail('STUDY.sections is empty.');
for (const S of SECS) {
  if (!S.id || !S.name || !Array.isArray(S.row) || !S.its) fail(`a section needs id, name, row and its (${S.id || S.name || '?'}).`);
  if (S.one === undefined) S.one = KIND === 'look';
  S.parent = {}; S.keys = [];
  const walk = (ks, p) => { for (const k of ks) { if (!S.its[k]) fail(`section ${S.id}: the tree names ${k}, which has no take.`); if (S.keys.includes(k)) fail(`section ${S.id}: ${k} appears twice.`); S.keys.push(k); if (p) S.parent[k] = p; if (S.its[k].kids) walk(S.its[k].kids, k); } };
  walk(S.row, null);
  S.ids = {}; for (const k of S.keys) S.ids[k] = shownId(S, k);
  for (const k of S.keys) { const it = S.its[k]; if (!it.name) fail(`section ${S.id}, take ${k}: no name.`); if (!it.ghost && typeof it.paint !== 'function' && !it.audio) fail(`section ${S.id}, take ${k}: no paint function and no audio.`); }
}
for (const q of QUESTIONS) if (!q.id || !Array.isArray(q.o) || !q.o.length) fail(`question ${q.id || '?'} needs an id and options.`);
const HAS_AUDIO = SECS.some(S => S.keys.some(k => S.its[k].audio));
const rowOf = (S, k) => S.parent[k] ? S.its[S.parent[k]].kids : S.row;
const under = (S, p) => { const out = [], w = ks => { for (const k of ks || []) { out.push(k); w(S.its[k].kids); } }; w(S.its[p].kids); return out; };

// ---------------------------------------------------------------- complexes (author, 4.11): the parts of one thing in the game, each its own tab. A section's
// `in` names its complex ('The Schism › Gravity sphere'); STUDY.complexes says how a complex's parts play together (reference/shell.md)
const splitPath = p => Array.isArray(p) ? p.slice() : p ? String(p).split('›').map(s => s.trim()).filter(Boolean) : [];
const CXS = STUDY.complexes || [];
for (const S of SECS) { S.path = splitPath(S.in); S.full = S.path.concat(S.name).join(' › '); S.icon = S.icon || (S.keys.some(k => S.its[k].audio) ? 'sound' : 'look'); }
for (const S of SECS) { if (SECS.some(T => T !== S && T.full === S.full)) fail(`two sections are both called ${S.full}.`); if (S.base && !secOf(S.base)) fail(`section ${S.id}: its base ${S.base} is not a section.`); }
for (const C of CXS) { C.pathA = splitPath(C.path); C.key = C.pathA.join(' › '); }
const CX_PATHS = [...new Set(SECS.flatMap(S => S.path.map((_, i) => S.path.slice(0, i + 1).join(' › '))))];
const cxDef = key => CXS.find(C => C.key === key);
const partsOf = C => SECS.filter(P => P.path.slice(0, C.pathA.length).join(' › ') === C.key);
function complexOf(S) {   // the nearest complex around a part that says how its parts play together (lanes or a scene)
  for (let i = S.path.length; i > 0; i--) { const C = cxDef(S.path.slice(0, i).join(' › ')); if (C && (C.lanes || C.scene)) return C; }
  return null;
}
const secByName = name => { const n = name.trim().toLowerCase(); return SECS.find(s => s.full.toLowerCase() === n) || SECS.find(s => s.name.toLowerCase() === n); };   // old lines name the tab alone

// ---------------------------------------------------------------- marks
const MKEY = `${STUDY.id}-marks-r${STUDY.round}`, VKEY = `${STUDY.id}-view`;
const TONES = [0, .5, 1, 2, 4];   // tone variation: each play of a sound is tuned by a random amount within ± this many semitones (author, 4.11)
const blank = () => ({ m: {}, rows: {}, groups: [], open: null, more: {}, secNote: {}, cxNote: {}, base: {}, pageNote: '', tone: 0, vals: {}, ans: {}, gid: 0 });
const fixMarks = x => { const b = Object.assign(blank(), x && typeof x === 'object' ? x : {}); for (const k of ['m', 'rows', 'more', 'secNote', 'cxNote', 'base', 'vals', 'ans']) if (!b[k] || typeof b[k] !== 'object' || Array.isArray(b[k])) b[k] = {}; if (!Array.isArray(b.groups)) b.groups = []; if (typeof b.pageNote !== 'string') b.pageNote = ''; if (!TONES.includes(b.tone)) b.tone = 0; return b; };
const starting = () => fixMarks(typeof STUDY.example === 'function' ? STUDY.example() : blank());
let marks = fixMarks(store.get(MKEY, null) || starting());
const mk = (sid, k) => (marks.m[sid + '/' + k] = marks.m[sid + '/' + k] || {});
const mget = (sid, k) => marks.m[sid + '/' + k] || {};
// the parts of a compound sound (author, 5.11): a take whose sound is several parts in one (a wind-up, a slash, a tail) lists them in
// `layers` ([{ id, name }] or ids); each part takes its own rating and note, kept as m.lay[id] = { rate, note }
const layersOf = it => ((it && it.layers) || []).map(l => typeof l === 'string' ? { id: l, name: l } : l);
const layText = (S, k) => { const lm = mget(S.id, k).lay || {}; return layersOf(S.its[k]).filter(l => lm[l.id] && (lm[l.id].rate || lm[l.id].note)).map(l => { const v = lm[l.id]; return `${l.id}${v.rate ? ' ' + v.rate : ''}${v.note ? ' ' + q(v.note) : ''}`; }).join(', '); };
const splitList = s => { const out = []; let cur = '', inq = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (inq && c === '\\') { cur += c + (s[i + 1] || ''); i++; continue; } if (c === '"') inq = !inq; if (!inq && c === ',' && s[i + 1] === ' ') { out.push(cur); cur = ''; i++; continue; } cur += c; } if (cur.trim()) out.push(cur); return out.map(x => x.trim()).filter(Boolean); };
const groupOf = (sid, k) => marks.groups.find(g => g.sid === sid && g.keys.includes(k));
function dropRowOf(X, S, k) { let p = S.parent[k]; while (p) { if (X.rows[S.id + '/' + p]) return p; p = S.parent[p]; } return null; }
const inDropRow = (S, k) => dropRowOf(marks, S, k);
// the author's rule: a pick is final. A section with a pick is finished; its other marks (but ratings and notes) are set aside.
const livePicksOf = (X, S) => S.keys.filter(k => X.m[S.id + '/' + k] && X.m[S.id + '/' + k].pick && !dropRowOf(X, S, k));
const finishedOf = (X, S) => livePicksOf(X, S).length > 0;
const finished = S => finishedOf(marks, S);
// a pick from an earlier round (author, 5.11): the take carries `picked: { round }`; the tab stays as it was, marked as picked
const wasPicks = S => S.keys.filter(k => S.its[k].picked && !S.its[k].ghost);
const wasRound = it => it.picked && it.picked.round ? it.picked.round : '?';
const dropLive = (S, k) => !finished(S) && (!!mget(S.id, k).drop || !!inDropRow(S, k));
// the take a part plays at in its complex: its pick, else the one last shown in its tab (author, 4.11)
const partKey = P => { const p = livePicksOf(marks, P); return p.length ? p[0] : wasPicks(P)[0] || view.cur[P.id]; };
// a part made for another (its `base`) remembers that part's take when it is picked; a later, different pick there asks to check it again
function checkAgain(S) {
  if (!S.base || !finished(S) || !marks.base[S.id]) return null;
  const B = secOf(S.base), p = livePicksOf(marks, B);
  return p.length && !p.includes(marks.base[S.id]) ? { B, was: marks.base[S.id], now: p[0] } : null;
}
const splitKey = key => { const i = key.indexOf('/'); return [key.slice(0, i), key.slice(i + 1)]; };
function tidy() {
  for (const [key, m] of Object.entries(marks.m)) {
    if (m.lay) { for (const [id, v] of Object.entries(m.lay)) { if (!v.rate) delete v.rate; if (!v.note) delete v.note; if (!Object.keys(v).length) delete m.lay[id]; } if (!Object.keys(m.lay).length) delete m.lay; }
    for (const f of ['pick', 'req', 'branch', 'drop', 'rate', 'note']) if (!m[f]) delete m[f]; if (!Object.keys(m).length) delete marks.m[key];
  }
  for (const k of Object.keys(marks.rows)) if (!marks.rows[k]) delete marks.rows[k];
  marks.groups = marks.groups.filter(g => g.id === marks.open ? g.keys.length > 0 : g.keys.length >= 2);
  if (marks.open && !marks.groups.some(g => g.id === marks.open)) marks.open = null;
  for (const k of Object.keys(marks.more)) if (!marks.more[k]) delete marks.more[k];
  for (const k of Object.keys(marks.secNote)) if (!marks.secNote[k]) delete marks.secNote[k];
  for (const k of Object.keys(marks.cxNote)) if (!marks.cxNote[k] || !CX_PATHS.includes(k)) delete marks.cxNote[k];
  for (const sid of Object.keys(marks.base)) { const S = secOf(sid); if (!S || !S.base || !finished(S) || !secOf(S.base).its[marks.base[sid]]) delete marks.base[sid]; }
  for (const [key, v] of Object.entries(marks.vals)) { const [sid, k] = splitKey(key), S = secOf(sid), it = S && S.its[k]; if (!it || !it.params) { delete marks.vals[key]; continue; } for (const p of it.params) if (v[p.k] === undefined || v[p.k] === p.def) delete v[p.k]; if (!Object.keys(v).length) delete marks.vals[key]; }
  for (const q of QUESTIONS) if (marks.ans[q.id] === q.o[0][0]) delete marks.ans[q.id];
}
const ACTS = ['pick', 'improve', 'branch', 'drop', 'combine', 'retryKeep', 'retryNew', 'dropBranch'];
const BRANCH_MAX = 9;   // Branch off asks for ×1 to ×9 (author, 4.11: "sometimes i need more branched iterations than 3"): the button turns it on and off,
                        // + beside it and B add one, Shift+B takes one off
function can(a, S, k) { if (S.its[k].ghost) return false; if (a === 'dropBranch') return !!S.parent[k]; if (inDropRow(S, k)) return false; if (k === 'now') return a === 'pick' && S.one; return true; }
function leave(sid, k) { for (const g of marks.groups) if (g.sid === sid) g.keys = g.keys.filter(x => x !== k); }
function closeOpen() { marks.open = null; marks.groups = marks.groups.filter(g => g.keys.length >= 2); }
function cancelOpen() { marks.groups = marks.groups.filter(g => g.id !== marks.open); marks.open = null; }
function combine(sid, k) {
  const open = marks.groups.find(g => g.id === marks.open), mine = groupOf(sid, k);
  if (mine) { mine.keys = mine.keys.filter(x => x !== k); if (mine.keys.length) marks.open = mine.id; return; }
  if (open && open.sid === sid) { open.keys.push(k); return; }
  if (open) closeOpen();
  const g = { id: ++marks.gid, sid, keys: [k], note: '' }; marks.groups.push(g); marks.open = g.id;
}
// the parts of a compound sound in the panel: each its name, ten rating buttons and a note (last round's faded under it)
function renderLayers(S, k, it, m, ghost) {
  const lays = layersOf(it), lm = m.lay || {}, lb = $('laybox');
  lb.hidden = !lays.length || ghost; if (lb.hidden) return;
  const key = S.id + '/' + k + '|' + lays.map(l => l.id).join(',');
  if (lb.dataset.for !== key) {
    lb.dataset.for = key;
    lb.innerHTML = `<div class="lh">The parts of ${esc(S.ids[k])} · ${esc(S.its[k].name)}: rate and note each</div>` + lays.map(l => `<div class="lay" data-lay="${esc(l.id)}"><span class="ln">${esc(l.name)}</span><span class="lr">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-lrate="${i + 1}" aria-label="Rate ${esc(l.name)} ${i + 1} of 10">${i + 1}</button>`).join('')}</span><input type="text" data-lnote placeholder="Note on ${esc(l.name)}" aria-label="Note on ${esc(l.name)}"><span class="ll"></span></div>`).join('');
  }
  for (const row of lb.querySelectorAll('.lay')) {
    const id = row.dataset.lay, v = lm[id] || {}, last = it.last && it.last.layers && it.last.layers[id];
    for (const b of row.querySelectorAll('[data-lrate]')) { const n = +b.dataset.lrate; b.className = v.rate === n ? 'on' : v.rate > n ? 'lit' : ''; b.setAttribute('aria-pressed', String(v.rate === n)); }
    const inp = row.querySelector('[data-lnote]'); if (document.activeElement !== inp) inp.value = v.note || '';
    row.querySelector('.ll').textContent = last ? `Last round: ${[last.rate ? 'rated ' + last.rate : '', last.note ? '“' + last.note + '”' : ''].filter(Boolean).join(', ')}` : '';
  }
}
function layMark(sid, k, id, f, v) {
  const m = mk(sid, k), e = ((m.lay = m.lay || {})[id] = m.lay[id] || {});
  if (f === 'rate') e.rate = e.rate === v ? 0 : v; else e.note = v;
  tidy(); save(); renderLine(); renderTabs(); renderMap();
}
function act(a, sid, k, arg, quiet) {
  const S = secOf(sid);
  if (S.its[k].ghost || (a !== 'rate' && !can(a, S, k))) return;
  if (!quiet) pushUndo();
  const m = mk(sid, k), wasFinished = finished(S);
  switch (a) {
    case 'pick': if (m.pick) m.pick = false; else { if (S.one) for (const kk of S.keys) { const o = marks.m[sid + '/' + kk]; if (o) o.pick = false; } m.pick = true; m.drop = false; } break;
    case 'improve': case 'retryKeep': case 'retryNew': m.req = m.req === a ? null : a; if (m.req) m.drop = false; break;
    case 'branch': m.branch = m.branch ? 0 : 1; if (m.branch) m.drop = false; break;   // on and off like every mark; + and the keys set the count
    case 'branchMore': if ((m.branch || 0) >= BRANCH_MAX) { if (!quiet) hint(`${BRANCH_MAX} new takes is the most one branch asks for.`); } else m.branch = (m.branch || 0) + 1; m.drop = false; break;
    case 'branchLess': m.branch = Math.max(0, (m.branch || 0) - 1); break;
    case 'drop': m.drop = !m.drop; if (m.drop) { m.pick = false; m.req = null; m.branch = 0; leave(sid, k); } break;
    case 'dropBranch': { const p = inDropRow(S, k) || S.parent[k], rk = sid + '/' + p; if (marks.rows[rk]) delete marks.rows[rk]; else marks.rows[rk] = true; break; }
    case 'combine': combine(sid, k); m.drop = false; break;
    case 'rate': m.rate = m.rate === arg ? 0 : arg; break;
  }
  if (a === 'pick' && S.base) { if (m.pick) marks.base[sid] = partKey(secOf(S.base)); else if (!finished(S)) delete marks.base[sid]; }
  const picked = a === 'pick' && !!m.pick;
  tidy();
  if (quiet) return;
  save(); renderAll();
  if (picked) { const n = parkedCount(S); if (n) hint(`Your pick is final: ${n} other mark${n === 1 ? '' : 's'} in ${S.name} ${n === 1 ? 'is' : 'are'} set aside. Unpick to bring ${n === 1 ? 'it' : 'them'} back.`, 9000); }
  else if (wasFinished && finished(S) && !['pick', 'rate'].includes(a)) hint(`${S.name} has a pick (${livePicksOf(marks, S).map(x => S.ids[x]).join(', ')}), and your pick is final, so this mark is set aside until you unpick it.`, 9000);
}
const undoStack = [];
function pushUndo() { undoStack.push(JSON.stringify(marks)); if (undoStack.length > 80) undoStack.shift(); }
function undo() { if (!undoStack.length) { hint('Nothing to undo.'); return; } marks = fixMarks(JSON.parse(undoStack.pop())); save(); renderAll(); hint('Undone.'); }
const save = () => store.set(MKEY, marks);

// ---------------------------------------------------------------- the pick line: written from the marks, read back by Load (grammar: reference/pick-line.md)
const QSRC = '"((?:[^"\\\\]|\\\\.)*)"';
const q = s => '"' + String(s).replace(/\s*\n\s*/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const unq = s => s.replace(/\\(.)/g, '$1');
const num = v => String(+(+v).toFixed(3));
function valsText(S, k) { const it = S.its[k], v = marks.vals[S.id + '/' + k]; if (!it.params || !v) return ''; const parts = it.params.filter(p => v[p.k] !== undefined && v[p.k] !== p.def).map(p => `${p.label} ${num(v[p.k])}${p.unit ? ' ' + p.unit : ''}`); return parts.length ? ` (${parts.join(', ')})` : ''; }
// a take's note and slider values are written once, with the first clause that names it
const clauseCx = () => ({ usedN: new Set(), usedV: new Set() });
const noteOnce = (S, k, cx) => { const m = mget(S.id, k); if (cx.usedN.has(k) || !m.note) return ''; cx.usedN.add(k); return ' ' + q(m.note); };
const valsOnce = (S, k, cx) => { if (cx.usedV.has(k)) return ''; cx.usedV.add(k); return valsText(S, k); };
function requestClauses(S, cx) {   // what asks for work; left out when the section has a pick
  const out = [], id = k => S.ids[k], M = k => mget(S.id, k), live = k => !inDropRow(S, k), K = S.keys;
  for (const [r, w] of [['improve', 'improve'], ['retryKeep', 'retry keep'], ['retryNew', 'retry new']]) for (const k of K) if (live(k) && M(k).req === r) out.push(`${w} ${id(k)}${valsOnce(S, k, cx)}${noteOnce(S, k, cx)}`);
  for (const k of K) if (live(k) && M(k).branch) out.push(`branch ${id(k)}${M(k).branch > 1 ? ' ×' + M(k).branch : ''}${valsOnce(S, k, cx)}${noteOnce(S, k, cx)}`);
  for (const g of marks.groups) { const ks = g.sid === S.id ? g.keys.filter(live) : []; if (ks.length >= 2) out.push(`combine ${ks.map(id).join(' + ')}${g.note ? ' ' + q(g.note) : ''}`); }
  const d = K.filter(k => live(k) && M(k).drop); if (d.length) out.push(`drop ${d.map(id).join(', ')}`);
  for (const p of K) if (marks.rows[S.id + '/' + p] && live(p)) out.push(`drop branch under ${id(p)} (${under(S, p).map(id).join(', ')})`);
  if (marks.more[S.id]) out.push(`more takes ${marks.more[S.id]}`);
  return out;
}
const parkedCount = S => finished(S) ? requestClauses(S, clauseCx()).length : 0;
function secClauses(S) {
  const out = [], cx = clauseCx(), id = k => S.ids[k], M = k => mget(S.id, k), live = k => !inDropRow(S, k), K = S.keys;
  for (const k of K) if (live(k) && M(k).pick) out.push(k === 'now' ? `keep Now${noteOnce(S, k, cx)}` : `pick ${id(k)} · ${S.its[k].name}${valsOnce(S, k, cx)}${noteOnce(S, k, cx)}`);
  if (S.base && finished(S) && marks.base[S.id]) { const B = secOf(S.base), ch = checkAgain(S); out.push(`made for ${B.full} ${B.ids[marks.base[S.id]]}${ch ? ` (${B.name} is ${B.ids[ch.now]} now: check again)` : ''}`); }
  if (!finished(S)) out.push(...requestClauses(S, cx));
  for (const k of K) if (!cx.usedV.has(k) && valsText(S, k)) out.push(`set ${id(k)}${valsOnce(S, k, cx)}`);
  const r = K.filter(k => M(k).rate); if (r.length) out.push(`rate ${r.map(k => `${id(k)} ${M(k).rate}`).join(', ')}`);
  for (const k of K) if (M(k).note && !cx.usedN.has(k)) out.push(`note ${id(k)}${noteOnce(S, k, cx)}`);
  for (const k of K) { const L = layText(S, k); if (L) out.push(`parts ${id(k)} · ${L}`); }
  if (marks.secNote[S.id]) out.push(`tab note ${q(marks.secNote[S.id])}`);
  return out;
}
function answersText() {
  const ch = QUESTIONS.filter(x => marks.ans[x.id] && marks.ans[x.id] !== x.o[0][0]).map(x => { const o = x.o.find(o => o[0] === marks.ans[x.id]); return `${x.id} ${o[0]} (${o[1]})`; });
  return ch.length ? 'defaults except ' + ch.join(', ') : 'all defaults';
}
function lineOf() {
  const L = [`${STUDY.title} (round ${STUDY.round})`];
  for (const S of SECS) { const c = secClauses(S); L.push(`${S.full} — ${c.length ? c.join('; ') : 'none'}`); }
  for (const p of CX_PATHS) if (marks.cxNote[p]) L.push(`${p} — complex note ${q(marks.cxNote[p])}`);
  if (QUESTIONS.length) L.push(`Answers — ${answersText()}`);
  if (HAS_AUDIO && marks.tone) L.push(`Tone variation ±${num(marks.tone)} semitones`);
  if (marks.pageNote) L.push(`Page note ${q(marks.pageNote)}`);
  return L.join('\n');
}
const countMarks = () => SECS.reduce((n, S) => n + secClauses(S).length, 0) + Object.keys(marks.cxNote).filter(p => marks.cxNote[p]).length + (marks.pageNote ? 1 : 0) + (HAS_AUDIO && marks.tone ? 1 : 0) + Object.keys(marks.ans).length;
function splitClauses(s) { const out = []; let cur = '', inq = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (inq && c === '\\') { cur += c + (s[i + 1] || ''); i++; continue; } if (c === '"') inq = !inq; if (c === ';' && !inq) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; } cur += c; } if (cur.trim()) out.push(cur.trim()); return out; }
function keyOf(S, id, warn) {
  if (id === 'Now' && S.its.now) return 'now';
  for (const k of S.keys) if (S.ids[k] === id) return k;
  const base = S.its[id] && id !== 'now' ? id : id.replace(/\.\d+$/, '');
  if (base !== 'now' && S.its[base]) { warn.push(`${id} is now ${S.ids[base]}.`); return base; }
  warn.push(`${S.name}: ${id} is not on this page.`); return null;
}
function clause(S, c, res) {
  const X = res.marks, sid = S.id, key = id => keyOf(S, id, res.warn), mm = k => (X.m[sid + '/' + k] = X.m[sid + '/' + k] || {});
  const note = (k, s) => { if (s !== undefined) mm(k).note = unq(s); };
  const vals = (k, s) => { if (!s) return; const it = S.its[k]; for (const part of s.split(', ')) { const pm = part.match(/^(.+?) (-?[\d.]+)(?: \S.*)?$/), p = pm && (it.params || []).find(p => p.label === pm[1]); if (p) (X.vals[sid + '/' + k] = X.vals[sid + '/' + k] || {})[p.k] = Math.max(p.min, Math.min(p.max, +pm[2])); else res.warn.push(`${S.ids[k]} has no slider “${part}”.`); } };
  const N = '(?: ' + QSRC + ')?$', V = '(?: \\(([^)]*)\\))?';
  let m;
  if (c === 'none') return;
  if ((m = c.match(new RegExp('^keep Now' + N)))) { if (S.its.now) { mm('now').pick = true; note('now', m[1]); } return; }
  if ((m = c.match(new RegExp('^pick (\\S+)(?: · [^"(]*?)?' + V + N)))) { const k = key(m[1]); if (k) { mm(k).pick = true; vals(k, m[2]); note(k, m[3]); } return; }
  if ((m = c.match(new RegExp('^(improve|retry keep|retry new) (\\S+)' + V + N)))) { const k = key(m[2]); if (k) { mm(k).req = { 'improve': 'improve', 'retry keep': 'retryKeep', 'retry new': 'retryNew' }[m[1]]; vals(k, m[3]); note(k, m[4]); } return; }
  if ((m = c.match(new RegExp('^branch (\\S+)(?: ×(\\d+))?' + V + N)))) { const k = key(m[1]); if (k) { mm(k).branch = Math.max(1, Math.min(BRANCH_MAX, +(m[2] || 1))); vals(k, m[3]); note(k, m[4]); } return; }
  if ((m = c.match(new RegExp('^combine (.+?)' + N)))) { const ks = m[1].split(' + ').map(s => key(s.trim())).filter(Boolean); if (ks.length >= 2) X.groups.push({ id: ++X.gid, sid, keys: ks, note: m[2] !== undefined ? unq(m[2]) : '' }); return; }
  if ((m = c.match(/^drop branch under (\S+)(?: \(.*\))?$/))) { const k = key(m[1]); if (k) X.rows[sid + '/' + k] = true; return; }
  if ((m = c.match(/^drop (.+)$/))) { for (const id of m[1].split(', ')) { const k = key(id.trim()); if (k) mm(k).drop = true; } return; }
  if ((m = c.match(/^more takes (\d+)$/))) { X.more[sid] = Math.min(9, +m[1]); return; }
  if ((m = c.match(/^set (\S+) \(([^)]*)\)$/))) { const k = key(m[1]); if (k) vals(k, m[2]); return; }
  if ((m = c.match(/^parts (\S+) · (.+)$/))) {
    const k = key(m[1]); if (!k) return;
    const known = layersOf(S.its[k]), re = new RegExp('^(\\S+)(?: (\\d+))?(?: ' + QSRC + ')?$');
    for (const part of splitList(m[2])) {
      const pm = part.match(re), L = pm && known.find(l => l.id === pm[1]);
      if (!L || (!pm[2] && pm[3] === undefined)) { res.warn.push(`${S.name}: ${S.ids[k]} has no part “${part}”.`); continue; }
      const v = ((mm(k).lay = mm(k).lay || {})[L.id] = {});
      if (pm[2]) v.rate = Math.max(1, Math.min(10, +pm[2])); if (pm[3] !== undefined) v.note = unq(pm[3]);
    }
    return;
  }
  if ((m = c.match(/^rate (.+)$/))) { for (const part of m[1].split(', ')) { const pm = part.match(/^(\S+) (\d+)$/), k = pm && key(pm[1]); if (k) mm(k).rate = Math.max(1, Math.min(10, +pm[2])); } return; }
  if ((m = c.match(new RegExp('^note (\\S+) ' + QSRC + '$')))) { const k = key(m[1]); if (k) mm(k).note = unq(m[2]); return; }
  if ((m = c.match(new RegExp('^(?:tab|section) note ' + QSRC + '$')))) { X.secNote[sid] = unq(m[1]); return; }
  if ((m = c.match(/^made for (.+?) (\S+)(?: \(.*\))?$/))) { const B = secByName(m[1]), bk = B && keyOf(B, m[2], res.warn); if (B && bk && S.base === B.id) X.base[sid] = bk; else res.warn.push(`${S.name}: skipped “${c}”.`); return; }
  res.warn.push(`${S.name}: skipped “${c}”.`);
}
function parseLine(text) {
  const res = { marks: blank(), warn: [], title: '', round: 0 };
  const lines = String(text).replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  const hm = lines.length ? lines[0].match(/^(.*?) \(round (\d+)\)$/) : null;
  if (!hm) throw new Error(`The first line should name the page and its round, like “${STUDY.title} (round ${STUDY.round})”.`);
  res.title = hm[1]; res.round = +hm[2];
  if (res.title !== STUDY.title) throw new Error(`That line is for “${res.title}”, not for “${STUDY.title}”.`);
  if (res.round !== STUDY.round) res.warn.push(`It is from round ${res.round}; this page is round ${STUDY.round}.`);
  for (const L of lines.slice(1)) {
    let m = L.match(new RegExp('^(?:Study|Page) note ' + QSRC + '$'));
    if (m) { res.marks.pageNote = unq(m[1]); continue; }
    m = L.match(/^Tone variation ±([\d.]+) semitones?$/);
    if (m) { if (HAS_AUDIO && TONES.includes(+m[1])) res.marks.tone = +m[1]; else res.warn.push(`Skipped “${L}”.`); continue; }
    m = L.match(/^Answers — (?:all defaults|defaults except (.+))$/);
    if (m) { for (const part of (m[1] || '').split(', ').filter(Boolean)) { const am = part.match(/^(\S+) (\S+)/), x = am && QUESTIONS.find(x => x.id === am[1]); if (x && x.o.some(o => o[0] === am[2])) res.marks.ans[x.id] = am[2]; else res.warn.push(`Skipped the answer “${part}”.`); } continue; }
    m = L.match(new RegExp('^(.+?) — complex note ' + QSRC + '$'));
    if (m && CX_PATHS.includes(m[1].trim())) { res.marks.cxNote[m[1].trim()] = unq(m[2]); continue; }
    m = L.match(/^(.+?) — (.*)$/);
    if (!m) { res.warn.push(`Skipped “${L}”.`); continue; }
    const S = secByName(m[1]);
    if (!S) { res.warn.push(`There is no section “${m[1]}” here.`); continue; }
    for (const c of splitClauses(m[2])) clause(S, c, res);
  }
  return res;
}
// what the line carries, as one comparable string: marks inside a dropped branch and requests in a section with a pick don't travel (ratings and notes do)
function norm(X) {
  const flat = s => String(s).replace(/\s*\n\s*/g, ' ');
  const out = { m: {}, rows: [], groups: [], more: {}, secNote: {}, cxNote: {}, base: {}, pageNote: flat(X.pageNote || ''), tone: HAS_AUDIO ? X.tone || 0 : 0, vals: {}, ans: {} };
  for (const p of CX_PATHS) if (X.cxNote && X.cxNote[p]) out.cxNote[p] = flat(X.cxNote[p]);
  for (const S of SECS) {
    const live = k => !dropRowOf(X, S, k), fin = finishedOf(X, S);
    for (const k of S.keys) {
      const m = X.m[S.id + '/' + k], e = {};
      if (m) { if (live(k)) { if (m.pick) e.pick = 1; if (!fin) { if (m.req) e.req = m.req; if (m.branch) e.branch = m.branch; if (m.drop) e.drop = 1; } } if (m.rate) e.rate = m.rate; if (m.note) e.note = flat(m.note); }
      if (m && m.lay) { const L = {}; for (const l of layersOf(S.its[k])) { const v = m.lay[l.id]; if (v && (v.rate || v.note)) L[l.id] = Object.assign({}, v.rate ? { rate: v.rate } : {}, v.note ? { note: flat(v.note) } : {}); } if (Object.keys(L).length) e.lay = L; }
      if (Object.keys(e).length) out.m[S.id + '/' + k] = e;
      if (!fin && X.rows[S.id + '/' + k] && live(k)) out.rows.push(S.id + '/' + k);
      const v = X.vals[S.id + '/' + k], vv = {};
      if (v) for (const p of S.its[k].params || []) if (v[p.k] !== undefined && v[p.k] !== p.def) vv[p.k] = num(v[p.k]);
      if (Object.keys(vv).length) out.vals[S.id + '/' + k] = vv;
    }
    if (!fin) for (const g of X.groups) if (g.sid === S.id) { const ks = g.keys.filter(live); if (ks.length >= 2) out.groups.push(`${S.id}:${ks.join('+')}:${flat(g.note || '')}`); }
    if (!fin && X.more[S.id]) out.more[S.id] = X.more[S.id];
    if (X.secNote[S.id]) out.secNote[S.id] = flat(X.secNote[S.id]);
    if (fin && S.base && X.base && X.base[S.id]) out.base[S.id] = X.base[S.id];
  }
  for (const x of QUESTIONS) if (X.ans[x.id] && X.ans[x.id] !== x.o[0][0]) out.ans[x.id] = X.ans[x.id];
  return JSON.stringify(out);
}
function applyLine(text) {
  let res;
  try { res = parseLine(text); } catch (e) { hint(e.message, 12000); return false; }
  pushUndo(); marks = fixMarks(res.marks); tidy(); save(); renderAll();
  const n = countMarks();
  hint(`Loaded ${n} mark${n === 1 ? '' : 's'}.${res.warn.length ? ' ' + res.warn.join(' ') : ''} Undo puts back what was here.`, 12000);
  return true;
}

// ---------------------------------------------------------------- where the author is (per device)
const firstOf = S => S.its.now ? 'now' : S.row[0];
const view = Object.assign({ sec: SECS[0].id, cur: {}, last: {}, cmp: 'off', pin: {}, starsHidden: false, speed: 1, seen: [], ctl: {}, vol: .8, auto: true, solo: false }, store.get(VKEY, {}));
for (const f of ['cur', 'last', 'pin', 'ctl']) if (!view[f] || typeof view[f] !== 'object') view[f] = {};
if (!Array.isArray(view.seen)) view.seen = [];
if (!secOf(view.sec)) view.sec = SECS[0].id;
for (const S of SECS) if (!S.its[view.cur[S.id]]) view.cur[S.id] = S.start && S.its[S.start] ? S.start : firstOf(S);
for (const c of CTL) if (!c.options.some(o => o[0] === view.ctl[c.key])) view.ctl[c.key] = c.def !== undefined ? c.def : c.options[0][0];
const saveView = () => store.set(VKEY, view);
const curS = () => secOf(view.sec) || SECS[0];
const cur = () => view.cur[curS().id];
const seen = (S, k) => view.seen.includes(S.id + '/' + k);
let firstLook = false;   // the shown take had not been opened before: its "new" ribbon stays while it is shown
function go(sid, k, quiet) {
  const S = secOf(sid); if (!S || !S.its[k]) return;
  const moved = sid !== view.sec || k !== view.cur[sid];
  if (moved) { firstLook = !seen(S, k); stopAudio(); }
  view.sec = sid; view.cur[sid] = k;
  if (S.parent[k]) view.last[sid + '/' + S.parent[k]] = k;
  if (!seen(S, k)) view.seen.push(sid + '/' + k);
  if (quiet) return;
  const auto = moved && view.auto;   // auto-restart (author, 4.11): the new take's motion from 0 and playing, its sound played
  if (auto) { simT = 0; paused = false; }
  saveView(); renderAll();
  if (auto && clipOf(S, k) === 'sound') playClip(S, k);
}
function toggleAuto() { view.auto = !view.auto; saveView(); renderControls(); hint(view.auto ? 'Auto-restart on: switching to a take starts its sound or motion from the beginning.' : 'Auto-restart off: switching keeps the clock running and plays no sound.'); }
function navTarget(dir) {
  const S = curS(), k = cur(), row = rowOf(S, k), i = row.indexOf(k);
  if (dir === 'l') return row[i - 1] || null;
  if (dir === 'r') return row[i + 1] || null;
  if (dir === 'u') return S.parent[k] || null;
  const kids = S.its[k].kids; if (!kids || !kids.length) return null;
  const l = view.last[S.id + '/' + k]; return kids.includes(l) ? l : kids[0];
}
function nav(dir) { const t = navTarget(dir); if (t) go(view.sec, t); }
const posText = (S, k) => { const row = rowOf(S, k); return `${row.indexOf(k) + 1} of ${row.length} ${S.parent[k] ? `in the branch under ${S.ids[S.parent[k]]}` : 'on the top row'}`; };

// ---------------------------------------------------------------- drawing: only the shown take (and what it is compared with) moves
const valsFor = (S, k) => { const it = S.its[k], v = marks.vals[S.id + '/' + k] || {}, o = {}; for (const p of it.params || []) o[p.k] = v[p.k] !== undefined ? v[p.k] : p.def; return o; };
function ground(ctx, w, h) {
  if (typeof STUDY.ground === 'function') { STUDY.ground(ctx, w, h); return; }
  if (typeof STUDY.ground === 'string') { ctx.fillStyle = STUDY.ground; ctx.fillRect(0, 0, w, h); return; }
  const g = ctx.createRadialGradient(w / 2, h * .45, 0, w / 2, h * .45, Math.max(w, h) * .7); g.addColorStop(0, '#111522'); g.addColorStop(1, '#06070a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function soundCard(ctx, w, h, t, p, V, it) {   // what an audio take shows when it has no painter of its own
  const playing = audioKey && audioKey === V.key, r = Math.min(w, h) * .18;
  ctx.strokeStyle = playing ? 'rgba(140,200,255,.9)' : 'rgba(159,180,208,.4)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = w * .2 + w * .6 * i / 120, a = playing ? Math.sin(i * .35 + t * 9) * Math.sin(i / 120 * Math.PI) : 0; if (i) ctx.lineTo(x, h / 2 + a * r); else ctx.moveTo(x, h / 2 + a * r); } ctx.stroke();
  ctx.fillStyle = 'rgba(217,222,232,.8)'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(playing ? 'Playing' : 'Press ▶ Play', w / 2, h / 2 + r + 26);
}
// every part of a complex at the take it plays at (this part at k), for a scene to draw and a sound to follow
function partsFor(C, S, k) {
  const o = {};
  for (const P of partsOf(C)) {
    const kk = P === S ? k : partKey(P), it = P.its[kk]; if (!it) continue;
    const vals = valsFor(P, kk);
    o[P.id] = { sec: P, key: kk, id: P.ids[kk], it, vals, paint: (c, w, h, t, V) => (it.paint ? it.paint(c, w, h, t, vals, V) : null) };
  }
  return o;
}
// the zoom of the shown pictures (author, 4.11): z, and the centre's offset as a fraction of the view; Compare and the big view share it
const zoom = { z: 1, x: 0, y: 0 }, ZMAX = 8;
function paintTo(cv, S, k, t, vals, w, h, thumb, painter, zoomed) {
  w = w || cv.clientWidth; h = h || cv.clientHeight; if (!w || !h) return;
  const W = Math.round(w * DPR), H = Math.round(h * DPR); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d'), it = S.its[k];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ground(ctx, w, h);
  if (it.ghost && !painter) { ctx.fillStyle = 'rgba(139,148,167,.8)'; ctx.font = `${thumb ? 11 : 13}px ${FONT}`; ctx.textAlign = 'center'; if (thumb) ctx.fillText('Dropped', w / 2, h / 2); else { ctx.fillText('Dropped in an earlier round,', w / 2, h / 2 - 9); ctx.fillText('kept as the stem of its branches.', w / 2, h / 2 + 11); } return; }
  // a part of a complex with a scene is shown inside the whole complex: the scene draws every part at its take, this one at k
  const C = !thumb && !painter ? complexOf(S) : null, scene = C && C.scene;
  const fn = scene ? (c, W2, H2, tt, pp, V) => scene(c, W2, H2, tt, V) : painter || it.paint || ((c, W2, H2, tt, pp, V) => soundCard(c, W2, H2, tt, pp, V, it));
  ctx.save();
  if (zoomed && zoom.z > 1) { ctx.translate(w / 2, h / 2); ctx.scale(zoom.z, zoom.z); ctx.translate(-w / 2 - zoom.x * w, -h / 2 - zoom.y * h); }
  let LW = w, LH = h;
  if (STUDY.logical) { LW = STUDY.logical.w; LH = STUDY.logical.h; const s = Math.min(w / LW, h / LH); ctx.transform(s, 0, 0, s, (w - LW * s) / 2, (h - LH * s) / 2); ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip(); }
  const V = { ctl: view.ctl, dpr: DPR, base: ctx.getTransform(), thumb: !!thumb, key: S.id + '/' + k, sec: S.id, take: k, solo: !!view.solo, parts: scene ? partsFor(C, S, k) : null };
  try { fn(ctx, LW, LH, t, vals, V); }
  catch (e) { if (strict) throw e; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#f08f9d'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('This drawing failed: ' + e.message, 12, 22); if (!paintTo.err) { paintTo.err = 1; console.error(e); } }
  finally { ctx.restore(); }
}
function cmpMode(S, k) { const c = view.cmp, p = view.pin[S.id]; if (c === 'now' && k !== 'now' && S.its.now) return c; if (c === 'before' && S.its[k].prev) return c; if (c === 'pin' && p && p !== k && S.its[p]) return c; return 'off'; }
function drawFrame(t) {
  const S = curS(), k = cur();
  if (!$('big').hidden) { paintTo($('cvBig'), S, k, t, valsFor(S, k), 0, 0, false, null, true); return; }   // the big view alone, while it is open
  paintTo($('cvA'), S, k, t, valsFor(S, k), 0, 0, false, null, true);
  const c = cmpMode(S, k);
  if (c === 'now') paintTo($('cvB'), S, 'now', t, valsFor(S, 'now'), 0, 0, false, null, true);
  else if (c === 'before') paintTo($('cvB'), S, k, t, valsFor(S, k), 0, 0, false, S.its[k].prev, true);
  else if (c === 'pin') { const p = view.pin[S.id]; paintTo($('cvB'), S, p, t, valsFor(S, p), 0, 0, false, null, true); }
  drawLanes(t);
}

// ---------------------------------------------------------------- sound: a take's audio, or a complex's parts in step, at the header's volume
let audioKey = null, audioStop = null, actx = null, audioTone = 0, playN = 0, mute = false;
const gains = new Set(), els = new Set();   // what plays now, so the volume slider moves it live
// a sound's background (author, 5.11): a tab whose sounds play over something (the fight, music, a room) names it in `under` (or the
// page in STUDY.under), a string or ctl => string | null (null: nothing under it with these controls). Its sounds get X.under, an
// output of its own for that background; Solo silences it at once, even mid-play, and offers itself on such a tab outside a complex too
const unders = new Set();
const underOf = S => { const u = S.under !== undefined ? S.under : STUDY.under; if (!u || !S.keys.some(k => S.its[k].audio)) return null;   /* a tab without sounds has no background */ const v = typeof u === 'function' ? u(view.ctl, S) : u; return v ? String(v) : null; };
const soloOn = S => !!(view.solo && (complexOf(S) || underOf(S)));
const setUnders = () => { if (!actx) return; for (const g of unders) g.gain.setTargetAtTime(view.solo ? 0 : 1, actx.currentTime, 0.03); };
function stopAudio() { playN++; const s = audioStop; audioStop = null; audioKey = null; if (s) { try { s(); } catch (e) { /* already stopped */ } } }
// tone variation for a sound made in code: the take gets the context through a wrapper that tunes each oscillator and sample it makes
// by the same cents, as a game's random pitch does (a sample's speed changes with it). The wrapper also counts the sources the take starts:
// when every one has ended and none starts again for 0.3 s, the sound is over and Play shows again (author, 4.11)
// Tone variation (author, 5.11): every sound gets its own random pitch within ±range cents when it starts, as a game varies each play;
// sources starting within 25 ms of each other (one sound's layers, a synth's partials) share it, so a sound is never detuned against itself
const tracked = (ctx, range, done, st = { live: 0, wait: 0 }) => {   // st: one count shared by the take's context and its background's
  const groups = [], offsetAt = when => { let g = groups.find(x => Math.abs(x.at - when) < .025); if (!g) { g = { at: when, c: (Math.random() * 2 - 1) * range }; groups.push(g); if (groups.length > 64) groups.shift(); } return g.c; };
  return new Proxy(ctx, { get(t, p) {
    const v = t[p];
    if (p === 'createOscillator' || p === 'createBufferSource' || p === 'createConstantSource') return (...a) => {
      const n = v.apply(t, a);
      const start = n.start.bind(n); n.start = (...s) => { if (range && n.detune) n.detune.value += offsetAt(Math.max(+s[0] || 0, t.currentTime)); st.live++; clearTimeout(st.wait); n.addEventListener('ended', () => { if (--st.live === 0) st.wait = setTimeout(() => { if (!st.live) done(); }, 300); }, { once: true }); return start(...s); };
      return n;
    };
    return typeof v === 'function' ? v.bind(t) : v;
  } });
};
// one take's sound, started now. done() runs once, when it has ended, failed or been stopped. A sound made in code gets a 5th argument,
// { parts }: the other parts of its complex at their takes, so it can follow them (a tick on each turn of the Timing part)
function startSound(S, k, done) {
  const it = S.its[k]; let range = marks.tone ? marks.tone * 100 : 0, over = false;
  const end = () => { if (!over) { over = true; if (done) done(); } };
  if (mute || !it.audio) { setTimeout(end, 0); return { tone: 0, stop: end }; }   // the self-test plays nothing
  if (typeof it.audio === 'function') {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const gain = actx.createGain(); gain.gain.value = view.vol; gain.connect(actx.destination); gains.add(gain);
      let ugRef = null;
      const fin = () => { gains.delete(gain); if (ugRef) unders.delete(ugRef); try { gain.disconnect(); } catch (e) { /* gone */ } end(); };
      const C = complexOf(S), ug = actx.createGain(); ug.gain.value = soloOn(S) ? 0 : 1; ug.connect(gain); unders.add(ug);
      const st = { live: 0, wait: 0 }, X = { parts: C ? partsFor(C, S, k) : null, solo: soloOn(S), under: ug, underCtx: tracked(actx, 0, fin, st) }; ugRef = ug;
      let stop; try { stop = it.audio(tracked(actx, range, fin, st), gain, valsFor(S, k), view.ctl, X); } catch (e) { if (!range) throw e; range = 0; stop = it.audio(actx, gain, valsFor(S, k), view.ctl, X); hint('This sound builds its nodes in a way tone variation cannot reach: it plays at its own pitch.'); }
      return { tone: range ? marks.tone : 0, stop: () => { if (typeof stop === 'function') { try { stop(); } catch (e) { /* already stopped */ } } fin(); } };
    } catch (e) { hint('This sound could not play: ' + e.message); setTimeout(end, 0); return { tone: 0, stop: end }; }
  }
  const el = new Audio(it.audio), tone = marks.tone ? (Math.random() * 2 - 1) * marks.tone : 0; el.volume = view.vol; els.add(el);
  if (tone) { el.preservesPitch = el.mozPreservesPitch = el.webkitPreservesPitch = false; el.playbackRate = 2 ** (tone / 12); }
  const fin = () => { els.delete(el); end(); };
  el.addEventListener('ended', fin);
  el.play().catch(e => { hint('This sound could not play: ' + e.message); fin(); });
  return { tone: marks.tone || 0, stop: () => { el.pause(); fin(); } };
}
function playTake(S, k) {
  stopAudio(); if (!S.its[k].audio) return;
  const n = playN; audioKey = S.id + '/' + k;
  const s = startSound(S, k, () => { if (playN === n) { audioStop = null; audioKey = null; syncClip(); } });
  if (playN === n) { audioTone = s.tone; audioStop = s.stop; }
  syncClip();
}
// ---------------------------------------------------------------- a complex in play (author, 4.11): every part at its take; its sounds start on the complex's clock
// a part's lanes: spans [[a, b, label]], or one line per sound { 'Launch': spans, 'Rings': spans }
const laneOf = (C, P) => { const l = C.lanes && C.lanes[P.id]; return !l ? [] : Array.isArray(l) ? l : Object.values(l).flat().sort((a, b) => a[0] - b[0]); };
// `whole`: each take's own sound already plays the whole complex (the page's own scene player), so the shell plays the take alone
const complexSound = S => { const C = complexOf(S); return !!(C && C.lanes && !C.whole && partsOf(C).some(P => laneOf(C, P).length && P.keys.some(k => P.its[k].audio))); };
const clipKey = (S, k) => (complexSound(S) ? 'cx:' : '') + S.id + '/' + k;
function playComplex(S, k) {
  stopAudio(); const C = complexOf(S), n = playN, sp = +view.speed || 1;
  simT = 0; paused = false; audioTone = 0;
  const list = partsOf(C).filter(P => !view.solo || P === S).map(P => ({ P, kk: P === S ? k : partKey(P) })).filter(x => x.P.its[x.kk] && x.P.its[x.kk].audio && laneOf(C, x.P).length);
  if (!list.length) { syncClip(); if (view.solo) hint(`Solo: ${S.name} has no sound of its own, so only its picture plays.`); return; }
  if (!mute && list.some(x => typeof x.P.its[x.kk].audio === 'function')) { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); }   // while the click still counts
  audioKey = clipKey(S, k); let left = list.length; const stops = [], timers = [];
  const one = () => { if (--left === 0 && playN === n) { audioStop = null; audioKey = null; syncClip(); } };
  for (const { P, kk } of list) timers.push(setTimeout(() => { if (playN !== n) return; const s = startSound(P, kk, one); stops.push(s.stop); if (P === S) { audioTone = s.tone; syncClip(); } }, laneOf(C, P)[0][0] * 1000 / sp));
  audioStop = () => { timers.forEach(clearTimeout); stops.forEach(f => f()); };
  syncClip();
}
const playClip = (S, k) => (complexSound(S) ? playComplex(S, k) : playTake(S, k));
function toggleSolo() {
  const S = curS(), k = cur();
  const C = complexOf(S), u = underOf(S);
  if (!C && !u) { hint('Solo is for a part of a complex, or a sound that plays over something.'); return; }
  view.solo = !view.solo; saveView(); renderPanel(); drawFrame(simT); setUnders();
  if (audioKey && audioKey === clipKey(S, k)) playClip(S, k);   // a background goes quiet at once; the take restarts, so the other parts and X.solo follow
  hint(view.solo ? `Solo: only ${S.full} plays${u ? `, without ${u}` : ''}.` : C ? `Solo off: the whole complex plays${u ? `, over ${u}` : ''}.` : `Solo off: ${u} plays under it again.`);
}

// ---------------------------------------------------------------- the clip: the shown take's sound, or its motion. ▶/❚❚ and ↺ Restart in the panel, Space and R on the keys
const movesSeen = {};
function moves(S, k, painter) {   // does it change with t? A take may say (`moves`); otherwise it is drawn at a few times into a canvas of its own, once
  const it = S.its[k];
  if (it.ghost && !painter) return false;
  const said = painter ? undefined : it.moves !== undefined ? it.moves : STUDY.moves;
  if (said !== undefined) return !!said;
  const key = S.id + '/' + k + (painter ? '/prev' : '');
  if (movesSeen[key] === undefined) {
    let m = false;
    try {
      const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
      let first = null;
      for (const t of [.37, 1.13, 2.29, 3.61, 4.87, 6.43, 8.09]) {   // uneven steps, so no loop length hides the motion
        paintTo(cv, S, k, t, valsFor(S, k), 160, 90, false, painter);
        const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
        if (!first) first = px; else if (px.some((v, i) => v !== first[i])) { m = true; break; }
      }
    } catch (e) { m = true; }   // could not tell: offer the buttons
    movesSeen[key] = m;
  }
  return movesSeen[key];
}
function clipOf(S, k) {   // 'sound', 'motion', or '' for a still picture
  if (S.its[k].audio || complexSound(S)) return 'sound';
  if (moves(S, k)) return 'motion';
  const c = cmpMode(S, k);   // a still beside a moving take in Compare still has motion to play
  return (c === 'now' && moves(S, 'now')) || (c === 'before' && moves(S, k, S.its[k].prev)) || (c === 'pin' && moves(S, view.pin[S.id])) ? 'motion' : '';
}
function clipHtml(S, k) {
  const c = clipOf(S, k); if (!c) return '';
  const on = c === 'sound' ? audioKey === clipKey(S, k) : !paused, label = c === 'sound' ? (on ? '■ Stop' : '▶ Play') : (on ? '❚❚ Pause' : '▶ Play');
  return `<button type="button" class="btn${c === 'sound' && on ? ' on' : ''}" id="playBtn" title="${c === 'sound' ? (on ? 'Stop the sound' : 'Play the sound') : on ? 'Pause' : 'Play'} (Space)">${label}<kbd>Space</kbd></button>`
    + '<button type="button" class="btn" id="restartBtn" title="Play it from the start (R)">↺ Restart<kbd>R</kbd></button>';
}
function syncClip() { const el = $('clip'); if (el) el.innerHTML = clipHtml(curS(), cur()); }
function toggleClip() {
  const S = curS(), k = cur(), c = clipOf(S, k);
  if (!c) { hint(`${S.ids[k]} is a still picture: there is nothing to play.`); return; }
  if (c === 'sound') { if (audioKey === clipKey(S, k)) { stopAudio(); if (complexSound(S)) paused = true; } else playClip(S, k); } else paused = !paused;
  syncClip();
}
function restartClip() {   // from t = 0, playing; a sound starts again with its picture
  const S = curS(), k = cur(), c = clipOf(S, k);
  if (!c) { hint(`${S.ids[k]} is a still picture: there is nothing to restart.`); return; }
  simT = 0;
  if (c === 'sound') playClip(S, k); else paused = false;
  syncClip();
}

// ---------------------------------------------------------------- render
const REQ = { improve: 'Improve asked', retryKeep: 'Retry · keep idea asked', retryNew: 'Retry · new idea asked' };
function hint(s, ms) { const h = $('hint'); h.textContent = s; clearTimeout(hint.t); hint.t = setTimeout(() => { h.textContent = ''; }, ms || 6000); }
// icons (author, 4.11: «more icons and more graphic representation with tooltips»): a part's kind and state, and the header's buttons
const ICON_D = {
  look: [['f', 'M6 .8 10.4 6 6 11.2 1.6 6z']],
  sound: [['f', 'M1.9 10.2A2.3 1.7 -25 1 0 6.1 8.2A2.3 1.7 -25 1 0 1.9 10.2z'], ['s', 'M6 8.4V1.4c1.8.4 3.4 1.6 3.8 3.4']],
  mech: [['s', 'M6 3.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8zM6 .8v1.6M6 9.6v1.6M.8 6h1.6M9.6 6h1.6M2.3 2.3l1.1 1.1M8.6 8.6l1.1 1.1M2.3 9.7l1.1-1.1M8.6 3.4l1.1-1.1']],
  ui: [['s', 'M2 2h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM1 4.6h10']],
  folder: [['f', 'M1 2.5h3.6l1.2 1.3H11v6.2H1z']],
  lock: [['s', 'M3.6 5.4V4a2.4 2.4 0 0 1 4.8 0v1.4'], ['f', 'M3.4 5.4h5.2a1 1 0 0 1 1 1v3.4a1 1 0 0 1-1 1H3.4a1 1 0 0 1-1-1V6.4a1 1 0 0 1 1-1z']],
  wait: [['s', 'M3 1.2h6M3 10.8h6M3.6 1.2c0 3 4.8 3.6 4.8 4.8S3.6 7.8 3.6 10.8M8.4 1.2c0 3-4.8 3.6-4.8 4.8s4.8 1.8 4.8 4.8']],
};
const ICON_COL = { look: '#cfe0ff', sound: '#7fe0cf', mech: '#f3c98a', ui: '#b3a6e8', folder: '#6c7891', lock: '#9aa5bb', wait: '#b3a6e8' };
const icoHtml = (kind, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 12 12" aria-hidden="true" style="color:${ICON_COL[kind] || ICON_COL.look}">${(ICON_D[kind] || ICON_D.look).map(([t, p]) => t === 'f' ? `<path d="${p}" fill="currentColor"/>` : `<path d="${p}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
function drawIcon(c, kind, x, y, s, col) {
  c.save(); c.translate(x - s / 2, y - s / 2); c.scale(s / 12, s / 12); c.fillStyle = c.strokeStyle = col || ICON_COL[kind] || ICON_COL.look; c.lineWidth = 1.4; c.lineCap = 'round'; c.lineJoin = 'round';
  for (const [t, p] of ICON_D[kind] || ICON_D.look) { const P = new Path2D(p); if (t === 'f') c.fill(P); else c.stroke(P); }
  c.restore();
}
const SVG = Object.fromEntries(Object.entries({
  about: '<circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.2v4.2M8 4.6v.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  since: '<path d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8M2.4 2.6v2.6H5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 5.2V8l2 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  copy: '<rect x="5.2" y="5.2" width="8" height="8.6" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10.6 3.2V3a1.6 1.6 0 0 0-1.6-1.6H4.2A1.6 1.6 0 0 0 2.6 3v5.8a1.6 1.6 0 0 0 1.6 1.6h.4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  load: '<path d="M8 1.8v8.4M4.6 7l3.4 3.4L11.4 7M2.6 12.2v1a1.4 1.4 0 0 0 1.4 1.4h8a1.4 1.4 0 0 0 1.4-1.4v-1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  undo: '<path d="M5.6 3.4 2.4 6.6l3.2 3.2M2.6 6.6h6.8a4 4 0 0 1 0 8H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  clear: '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  more: '<path d="M4 6.2 8 10l4-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  big: '<path d="M2.4 6V2.4H6M10 2.4h3.6V6M13.6 10v3.6H10M6 13.6H2.4V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  vol: '<path d="M2.4 6h2.4L8.4 3v10L4.8 10H2.4z" fill="currentColor"/><path d="M10.6 5.4a3.4 3.4 0 0 1 0 5.2M12.4 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  tree: '<rect x="6" y="1.6" width="4" height="3" rx=".8" fill="currentColor"/><rect x="1.6" y="11.4" width="4" height="3" rx=".8" fill="currentColor"/><rect x="10.4" y="11.4" width="4" height="3" rx=".8" fill="currentColor"/><path d="M8 4.6v3.4M3.6 11.4V8h8.8v3.4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  keys: '<rect x="1.4" y="3.8" width="13.2" height="8.4" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4 6.6h.1M6.6 6.6h.1M9.2 6.6h.1M11.8 6.6h.1M4.8 9.4h6.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  warn: '<path d="M8 1.8 14.6 13.6H1.4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.4v3.4M8 11.6v.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
}).map(([k, v]) => [k, `<svg class="si" viewBox="0 0 16 16" aria-hidden="true">${v}</svg>`]));
const KEYS_TIP = 'Keys\nSpace play / stop · R restart · A auto-restart · S solo (in a complex)\n← → takes in a row · ↑ ↓ up and into branches · [ ] tabs\nF big view · + − zoom · Ctrl+wheel or pinch zooms the picture\nP pick · I improve · B one more new take, Shift+B one fewer\nC combine · K, N retry · D drop · Shift+D drop branch\n1–0 rate · U undo · O whole tree · M map';
const stripHtml = s => String(s || '').replace(/<[^>]+>/g, '');
function renderHead() {
  document.title = STUDY.title;
  $('title').innerHTML = `${esc(STUDY.title)} <small>round ${STUDY.round}</small>`;
  $('title').dataset.tip = `${STUDY.title} · round ${STUDY.round}${STUDY.subtitle ? '\n' + STUDY.subtitle : ''}`;
  $('about').innerHTML = (STUDY.subtitle ? `<p class="subt">${esc(STUDY.subtitle)}</p>` : '') + (STUDY.about || '');
  $('aboutFold').hidden = !STUDY.about && !STUDY.subtitle;
  $('aboutSum').innerHTML = SVG.about;
  $('sinceFold').hidden = !STUDY.since;
  if (STUDY.since) { $('since').innerHTML = STUDY.since; $('sinceSum').innerHTML = SVG.since; $('sinceSum').dataset.tip = `Since your last line (round ${STUDY.round - 1})\nwhat it asked, and what changed`; }
  for (const [id, s] of [['copy', 'copy'], ['load', 'load'], ['undo', 'undo'], ['clear', 'clear'], ['pickMore', 'more']]) $(id).innerHTML = SVG[s];
  $('copy').innerHTML = SVG.copy + '<span class="cl">Copy</span>';   // the main button of the line (author, 5.11)
  // controls as small drop-downs: a label and the value now; the options open under it
  const dd = (id, key, label, tip, opts) => `<details class="dd"${id ? ` id="${id}DD"` : ''}${key ? ` data-ctlw="${esc(key)}"` : ''}><summary data-tip="${esc(tip)}"><span class="ddl">${esc(label)}</span><b class="ddv"></b></summary><div class="ddm seg"${id ? ` id="${id}Seg"` : ''}${key ? ` data-ctl="${esc(key)}"` : ''}>${opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></details>`;
  let h = CTL.map(c => dd('', c.key, c.label, c.label, c.options)).join('');
  h += dd('speed', '', 'Speed', 'Speed of the motion', [[1, '×1'], [0.5, '×½'], [0.25, '×¼']]);
  h += '<button type="button" class="ibtn" id="autoBtn" aria-pressed="false"></button>';
  if (HAS_AUDIO) h += dd('tone', '', 'Tone ±', 'Tone variation\nevery sound (each shot, each hit) gets its own random pitch within this when it plays, as the game varies its sounds', TONES.map(v => [v, v ? `±${v === .5 ? '½' : v} semitone${v > 1 ? 's' : ''}` : 'Off']));
  if (HAS_AUDIO) h += `<details class="dd" id="volDD"><summary data-tip="Volume">${SVG.vol}<b class="ddv"></b></summary><div class="ddm volm"><input type="range" id="vol" min="0" max="1" step="0.05" value="${view.vol}" aria-label="Volume"></div></details>`;
  if (SECS.some(S => S.keys.some(k => S.its[k].star))) h += '<button type="button" class="ibtn" id="stars">★</button>';
  h += `<button type="button" class="ibtn" id="ovBtn" data-tip="The whole tree of this tab, a frame of every take (O)">${SVG.tree}</button>`;
  h += `<button type="button" class="ibtn" id="keysBtn" data-tip="${esc(KEYS_TIP)}">${SVG.keys}</button>`;
  $('controls').innerHTML = h;
  if (QUESTIONS.length) buildQs();
}
function renderControls() {
  for (const d of document.querySelectorAll('#controls .dd[data-ctlw]')) {
    // a control with `secs` shows only on those tabs
    const c = CTL.find(c => c.key === d.dataset.ctlw), o = c.options.find(o => String(view.ctl[c.key]) === String(o[0]));
    d.style.display = c.secs && !c.secs.includes(view.sec) ? 'none' : '';
    d.querySelector('.ddv').textContent = o ? o[1] : '';
    for (const b of d.querySelectorAll('[data-v]')) b.classList.toggle('on', String(view.ctl[c.key]) === b.dataset.v);
  }
  for (const b of document.querySelectorAll('#speedSeg button')) b.classList.toggle('on', +b.dataset.v === +view.speed);
  $('speedDD').querySelector('.ddv').textContent = ({ 1: '×1', 0.5: '×½', 0.25: '×¼' })[+view.speed] || '×1';
  if ($('toneDD')) { for (const b of document.querySelectorAll('#toneSeg button')) b.classList.toggle('on', +b.dataset.v === (marks.tone || 0)); $('toneDD').querySelector('.ddv').textContent = marks.tone ? (marks.tone === .5 ? '½' : marks.tone) : 'Off'; }
  if ($('volDD')) $('volDD').querySelector('.ddv').textContent = Math.round(view.vol * 100) + '%';
  const ab = $('autoBtn'); ab.classList.toggle('on', !!view.auto); ab.setAttribute('aria-pressed', String(!!view.auto)); ab.innerHTML = `A<small>${view.auto ? 'on' : 'off'}</small>`;
  ab.dataset.tip = `Auto-restart: ${view.auto ? 'on' : 'off'} (A)\nwhen on, switching to a take plays its sound or motion from the beginning`;
  if ($('stars')) { $('stars').classList.toggle('on', !view.starsHidden); $('stars').dataset.tip = view.starsHidden ? 'My ★ picks are hidden\nclick to show them' : 'My ★ picks are shown\nclick to hide them'; }
  if (QUESTIONS.length) { const n = Object.keys(marks.ans).length, u = qsUnseen().length, b = $('qsBtn'); b.hidden = false; b.classList.toggle('qnew', u > 0);
    b.innerHTML = `<span class="qi">?</span>Questions <b>${QUESTIONS.length}</b>`;   // the same words lit or not, so the row never shifts (author, 5.11)
    b.dataset.tip = `Questions (${QUESTIONS.length})\n${u ? u + ' not opened yet\n' : ''}${n ? n + ' changed from my defaults' : 'all at my defaults'}`; }
}
// the tabs (author's pick 4.11, «5 · Split dock, complex cards»): each complex a card, its own parts three to a column, each sub-complex a
// column of its own with its name on top; tabs outside any complex share a card. A part is a chip: its kind, its name and its state
function tabNodes() {
  const root = { kids: [] };
  const nodeAt = path => { let n = root; path.forEach((g, i) => { const key = path.slice(0, i + 1).join(' › '); let c = n.kids.find(x => x.key === key); if (!c) { c = { g, key, kids: [] }; n.kids.push(c); } n = c; }); return n; };
  for (const S of SECS) nodeAt(S.path).kids.push({ S });
  for (const C of CXS) for (const w of C.waiting || []) nodeAt(splitPath(w.in || C.path)).kids.push({ wait: w });
  return root.kids;
}
function secChip(S) {
  const picked = livePicksOf(marks, S), was = wasPicks(S), n = secClauses(S).length, fresh = S.keys.some(k => (S.its[k].fresh || S.its[k].changed) && !seen(S, k)), ch = checkAgain(S), on = view.sec === S.id;
  const badge = ch ? '<i class="tb tb-chk">!</i>' : picked.length ? '<i class="tb tb-pick">✓</i>' : n ? `<i class="tb tb-n">${n}</i>` : was.length ? '<i class="tb tb-was">✓</i>' : fresh ? '<i class="tb tb-new"></i>' : '';
  const tip = [S.full + (S.hook ? ` (${S.hook})` : ''), `${S.icon} · ` + (picked.length ? `picked ${picked.map(k => S.ids[k]).join(', ')} · final` : n ? `${n} mark${n === 1 ? '' : 's'}` : was.length ? 'finished' : 'open, no marks yet'),
    was.length ? `picked earlier: ${was.map(k => `${S.ids[k]} in round ${wasRound(S.its[k])}`).join(', ')}` : '',
    ch ? `check again: made for ${ch.B.name} ${ch.B.ids[ch.was]}, it is ${ch.B.ids[ch.now]} now` : '', fresh ? 'new takes you haven’t opened' : ''].filter(Boolean).join('\n');
  return `<button type="button" role="tab" class="tchip${on ? ' on' : ''}${picked.length ? ' done' : was.length ? ' was' : ''}${ch ? ' chk' : ''}" data-sec="${esc(S.id)}" aria-selected="${on}" data-tip="${esc(tip)}">${icoHtml(S.icon)}<span class="tn">${esc(S.name)}</span>${badge}</button>`;
}
function waitChip(w) {
  const F = secOf(w.for), tip = `${w.name}\nwaits for the ${F ? F.full : w.for} pick${w.note ? '\n' + stripHtml(w.note) : ''}`;
  return `<span class="tchip wait" data-tip="${esc(tip)}">${icoHtml(w.icon || 'sound')}<span class="tn">${esc(w.name)}</span>${icoHtml('wait', 'tb-wait')}</span>`;
}
const leafHtml = n => (n.S ? secChip(n.S) : waitChip(n.wait));
function kidsHtml(kids) {   // a run of parts goes three to a column; a sub-complex is a column with its name on top
  let h = '', run = [];
  const flush = () => { if (run.length) { h += `<div class="cgrid">${run.map(leafHtml).join('')}</div>`; run = []; } };
  for (const k of kids) { if (k.g) { flush(); h += `<div class="ccol"><div class="csub" data-tip="${esc(k.key)}">${esc(k.g)}</div><div class="cbody">${kidsHtml(k.kids)}</div></div>`; } else run.push(k); }
  flush(); return h;
}
function renderTabs() {
  let h = '', lone = [];
  const flush = () => { if (lone.length) { h += `<div class="card lone"><div class="cbody">${kidsHtml(lone)}</div></div>`; lone = []; } };
  for (const n of tabNodes()) {
    if (!n.g) { lone.push(n); continue; }
    flush(); const C = cxDef(n.key);
    h += `<div class="card"><div class="chd" data-tip="${esc(n.key + (C && C.about ? '\n' + stripHtml(C.about) : ''))}">${icoHtml('folder')}<span>${esc(n.g)}</span></div><div class="cbody">${kidsHtml(n.kids)}</div></div>`;
  }
  flush();
  const tabs = $('tabs'), keep = tabs.scrollLeft; tabs.innerHTML = h; tabs.scrollLeft = keep;
  const on = tabs.querySelector('.tchip.on');   // the shown tab's chip slides in whole, as the take's chip does
  if (on) { const r = tabs.getBoundingClientRect(), b = on.getBoundingClientRect(); if (b.left < r.left + 4) tabs.scrollLeft -= r.left + 4 - b.left; else if (b.right > r.right - 4) tabs.scrollLeft += b.right - r.right + 4; }
  $('head').classList.toggle('one', SECS.length === 1 && !CX_PATHS.length);
}
let briefFor = null;
function renderWhere() {
  const S = curS(), k = cur(), chain = []; let p = k; while (p) { chain.unshift(p); p = S.parent[p]; }
  $('crumbs').innerHTML = S.path.map(g => `<span class="cxc">${esc(g)}</span><span class="dim">›</span>`).join('') + `<span>${esc(S.name)}</span>` + chain.map(c => `<span class="dim">›</span><button type="button" data-go="${esc(c)}" class="${c === k ? 'here' : ''}">${esc(S.ids[c])}</button>`).join('') + `<span class="pos">${posText(S, k)}</span>`;
  const sb = $('sbrief'); sb.hidden = !S.brief;
  if (S.brief && briefFor !== S.id) { briefFor = S.id; $('sbriefSum').textContent = S.briefTitle || `About ${S.name}`; $('sbriefText').innerHTML = S.brief; sb.open = !matchMedia('(max-width: 700px)').matches; }
  // the row of chips: ▲ the take this grew from, ◀ every take of this row ▶, ▼ its branch
  const chip = x => { const m = mget(S.id, x), it = S.its[x], cls = ['chip', x === k ? 'cur' : '', it.ghost ? 'ghost' : '', m.pick && !inDropRow(S, x) ? 'pick' : '', it.picked && !it.ghost ? 'was' : '', dropLive(S, x) ? 'drop' : ''].filter(Boolean).join(' '); return `<button type="button" class="${cls}" data-go="${esc(x)}" title="${esc(S.ids[x] + ' · ' + it.name)}">${esc(S.ids[x])}${it.star && !view.starsHidden ? '<span class="cs">★</span>' : ''}${(it.fresh || it.changed) && !seen(S, x) ? '<span class="cn"></span>' : ''}</button>`; };
  const bar = rb => {   // the row under the crumbs, and its copy in the where-line
    const keep = rb.querySelector('.rbrow') ? rb.querySelector('.rbrow').scrollLeft : 0;
    rb.innerHTML = `<button type="button" class="rb" data-nav="u" aria-label="Up to the take this grew from"><span>▲</span><span class="nid"></span></button><button type="button" class="rb" data-nav="l" aria-label="Previous in this row">◀</button><div class="rbrow">${rowOf(S, k).map(chip).join('')}</div><button type="button" class="rb" data-nav="r" aria-label="Next in this row">▶</button><button type="button" class="rb" data-nav="d" aria-label="Down into its branch"><span>▼</span><span class="nid"></span></button>`;
    const row = rb.querySelector('.rbrow'), c = row.querySelector('.cur'); row.scrollLeft = keep;
    // the shown take's chip is always whole: a cut one slides in to the nearer edge of the row (author, 3.11)
    if (c) { const r = row.getBoundingClientRect(), b = c.getBoundingClientRect(), pad = 4; if (b.left < r.left + pad) row.scrollLeft -= r.left + pad - b.left; else if (b.right > r.right - pad) row.scrollLeft += b.right - r.right + pad; }
    for (const b of rb.querySelectorAll('[data-nav]')) { const d = b.dataset.nav, t = navTarget(d), n = b.querySelector('.nid'), more = d === 'd' && t ? S.its[k].kids.length : 0; b.disabled = !t; if (n) n.textContent = t ? S.ids[t] + (more > 1 ? ` · ${more}` : '') : ''; }
  };
  bar($('rowbar')); bar($('wlbar'));
  $('wlTab').innerHTML = SECS.map(T => `<option value="${esc(T.id)}"${T === S ? ' selected' : ''}>${finished(T) || wasPicks(T).length ? '✓ ' : ''}${esc(T.full)}</option>`).join('');
  $('wlTab').classList.toggle('done', finished(S));
  $('wlName').innerHTML = `<span class="dim">›</span> <b>${esc(S.ids[k])}</b> · ${esc(S.its[k].name)}`;
}
// the where-line shows once the crumbs (which name the tab and the take) have gone up under the header or off the screen
function placeWline() {
  const w = $('wline'), edge = Math.max(0, $('head').getBoundingClientRect().bottom), show = $('crumbs').getBoundingClientRect().top < edge;
  if (show === w.hidden) { w.hidden = !show; $('app').classList.toggle('wl', show); if (show) renderWhere(); }   // its chips fit only once it is shown
  $('app').style.setProperty('--wlH', (show ? w.offsetHeight : 0) + 'px');
}
function renderPanel() {
  const S = curS(), k = cur(), it = S.its[k], m = mget(S.id, k), fin = finished(S), rowDrop = inDropRow(S, k), drop = dropLive(S, k);
  $('stage').classList.toggle('is-pick', !!m.pick && !rowDrop);
  $('stage').classList.toggle('is-drop', drop);
  $('stage').classList.toggle('is-ghost', !!it.ghost);
  const ribs = [], off = t => `<span class="rib off">${t} · set aside</span>`;
  if (it.ghost) ribs.push('<span class="rib off">Dropped · stem of its branches</span>');
  if (it.picked && !it.ghost) ribs.push(`<span class="rib was">${k === 'now' ? 'Kept as it is' : 'Picked'} in round ${wasRound(it)}</span>`);
  if (m.pick && !rowDrop) ribs.push(`<span class="rib pick">${k === 'now' ? 'Kept as it is' : 'Picked'} · final</span>`);
  if (m.drop) ribs.push(fin ? off('Drop') : '<span class="rib drop">Marked to drop</span>');
  else if (rowDrop) ribs.push(fin ? off('In a dropped branch') : `<span class="rib drop">In the branch under ${esc(S.ids[rowDrop])}, marked to drop</span>`);
  if (!rowDrop) {
    if (m.req) ribs.push(fin ? off(REQ[m.req]) : `<span class="rib req">${REQ[m.req]}</span>`);
    if (m.branch) { const t = `Branch off${m.branch > 1 ? ' ×' + m.branch : ''}`; ribs.push(fin ? off(t) : `<span class="rib req">${t}</span>`); }
    const g = groupOf(S.id, k);
    if (g) { const t = `Combine ${g.keys.map(x => esc(S.ids[x])).join(' + ')}`; ribs.push(fin ? off(t) : `<button type="button" class="rib comb" data-reopen="${g.id}" title="${g.id === marks.open ? 'Open: add takes with Combine' : 'Click to add more to it'}">${t}${g.id === marks.open ? ' · open' : ''}</button>`); }
  }
  const ch = checkAgain(S);
  if (ch && m.pick) ribs.push(`<span class="rib req" data-tip="Picked while ${esc(ch.B.full)} was ${esc(ch.B.ids[ch.was])}; it is ${esc(ch.B.ids[ch.now])} now">Check again: made for ${esc(ch.B.name)} ${esc(ch.B.ids[ch.was])}</span>`);
  if (m.rate) ribs.push(`<span class="rib">Rated ${m.rate}</span>`);
  if (m.note) ribs.push('<span class="rib">Note</span>');
  if (m.lay && Object.keys(m.lay).length) ribs.push(`<span class="rib">Parts rated · ${Object.keys(m.lay).length}</span>`);
  if ((it.fresh || it.changed) && firstLook) ribs.push(`<span class="rib new">${it.fresh ? 'New' : 'Changed'} this round</span>`);
  const c = cmpMode(S, k), pin = view.pin[S.id];
  const play = `<span class="clip" id="clip">${clipHtml(S, k)}</span>`;
  const seg = `<div class="seg" id="cmpSeg"><span>Compare</span><button type="button" data-cmp="off" class="${c === 'off' ? 'on' : ''}">Off</button>${S.its.now ? `<button type="button" data-cmp="now" class="${c === 'now' ? 'on' : ''}"${k === 'now' ? ' disabled' : ''}>Now</button>` : ''}<button type="button" data-cmp="before" class="${c === 'before' ? 'on' : ''}"${it.prev ? '' : ' disabled'}>Before</button><button type="button" data-cmp="pin" class="${c === 'pin' ? 'on' : ''}"${pin && pin !== k ? '' : ' disabled'}>${pin && pin !== k ? 'Pinned ' + esc(S.ids[pin]) : 'Pinned'}</button></div>`;
  const star = it.star && !view.starsHidden ? '<span class="star" title="My pick">★</span>' : '';
  const C = complexOf(S);
  const u = underOf(S), soloTip = C ? `only this part plays; the rest of ${C.key} goes quiet${u ? `, and ${u} under it` : ''}` : `this sound alone, without ${u} under it`;
  const solo = C || u ? `<button type="button" class="btn${view.solo ? ' on' : ''}" id="soloBtn" aria-pressed="${!!view.solo}" data-tip="${esc('Solo (S)\n' + soloTip)}">Solo<kbd>S</kbd></button>` : '';
  $('ptitle').innerHTML = `<span class="pid">${esc(S.ids[k])}</span><span class="pname">${esc(it.name)}</span>${star}${ribs.join('')}<span class="ptools">${play}${solo}${seg}<button type="button" class="btn" id="pinBtn">${pin === k ? 'Unpin' : 'Pin to compare'}</button>${zoomHtml()}</span>`;
  // the part in its complex (author's pick 4.11, «2 · Lanes under the picture»): what it changes in one line, then a lane per part
  $('cx').hidden = !(C && C.lanes);
  if (C && C.lanes) { $('cxLine').innerHTML = `${icoHtml(S.icon)}<span class="cxw">You’re choosing</span><b>${esc(S.full)}</b>${S.part ? `<span class="cxp">${S.part}</span>` : ''}${view.solo ? '<span class="rib req">Solo</span>' : ''}`; sizeLanes(); }
  $('vB').hidden = c === 'off';
  $('views').classList.toggle('two', c !== 'off');
  const beforeId = it.hist && it.hist.length > 1 ? it.hist[it.hist.length - 2][0] : 'the last version';
  $('labA').textContent = c === 'off' ? S.ids[k] : `${S.ids[k]} · shown`;
  $('labB').textContent = c === 'now' ? 'Now' : c === 'before' ? `Before · ${beforeId}` : c === 'pin' ? `Pinned · ${S.ids[pin]}` : '';
  // the take's words (author, 4.11: «looks all mashed up… I always search for the risk section»): the caption, then Why and Risk as
  // blocks side by side, my ★ reason, one line of history, then the sliders
  const parts = [], wr = splitWhy(it.why, it.risk);
  if (it.cap) parts.push(`<div class="cap">${it.cap}</div>`);
  if (wr.why || wr.risk) parts.push(`<div class="wr">${wr.why ? `<div class="blk why"><div class="bl">Why</div><div>${wr.why}</div></div>` : ''}${wr.risk ? `<div class="blk risk"><div class="bl">${SVG.warn}Risk</div><div>${wr.risk}</div></div>` : ''}</div>`);
  if (it.star && !view.starsHidden) parts.push(`<div class="blk mine"><div class="bl">★ My pick</div><div>Because ${it.star}</div></div>`);
  const meta = [];
  if (it.from) meta.push(`<span class="mt"><span class="mk">Combined from</span>${esc(it.from)}</span>`);
  if (it.hist) meta.push(`<span class="mt hist"><span class="mk">Versions</span>${it.hist.map(([id, t], i) => `<span class="v${i === it.hist.length - 1 ? ' cur' : ''}"><span class="mono">${esc(id)}</span> ${esc(t)}</span>`).join('<span class="dim">→</span>')}</span>`);
  if (it.last) meta.push(`<span class="mt last"><span class="mk">Last round</span>${[it.last.rate ? `rated ${it.last.rate}` : '', it.last.note ? `“${esc(it.last.note)}”` : ''].filter(Boolean).join(', ')}</span>`);
  if (meta.length) parts.push(`<div class="meta">${meta.join('')}</div>`);
  const tr = [];
  if (it.params) { const vals = valsFor(S, k); for (const p of it.params) tr.push(`<div class="prm"><label for="prm-${esc(p.k)}">${esc(p.label)}</label><input type="range" id="prm-${esc(p.k)}" data-k="${esc(p.k)}" min="${p.min}" max="${p.max}" step="${p.step}" value="${vals[p.k]}"><span class="pv" id="pv-${esc(p.k)}">${num(vals[p.k])}${p.unit ? ' ' + esc(p.unit) : ''}</span></div>`); }
  if (it.fig) tr.push(`<div class="fig" id="fig">${figHtml(S, k)}</div>`);
  if (tr.length) parts.push(`<div class="tryit">${tr.join('')}</div>`);
  $('ptext').innerHTML = parts.join('');
  renderBig();
}
// a take's `why` says its risk after «Risk:»; the page shows the two apart (a take may also give `risk` on its own)
function splitWhy(why, risk) {
  const cap = s => s.replace(/^([a-zа-яё])/, c => c.toUpperCase());
  if (risk) return { why: why || '', risk: cap(String(risk)) };
  if (!why) return { why: '', risk: '' };
  const m = String(why).match(/^([\s\S]*?)\s*(?:<b>)?\s*Risks?\s*(?:<\/b>)?\s*:\s*(?:<\/b>)?\s*([\s\S]+)$/);
  return m ? { why: m[1].trim(), risk: cap(m[2].trim()) } : { why, risk: '' };
}
const zoomHtml = () => `<span class="zoomg" data-tip="Zoom\nCtrl+wheel or pinch on the picture · drag to look around · double-click for 2.5× · + − keys · F big view"><button type="button" data-zoom="out" aria-label="Zoom out">−</button><button type="button" data-zoom="reset" class="zl" aria-label="Back to 1×">${zoomLabel()}</button><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="big" aria-label="Big view">${SVG.big}</button></span>`;
const zoomLabel = () => zoom.z > 1.001 ? `${+zoom.z.toFixed(zoom.z < 2 ? 2 : 1)}×` : '1×';
// ---------------------------------------------------------------- lanes: one per part on the complex's clock, this part's lit, the playhead across them
const LANE_H = 22;
function laneRows(C) {
  const rel = p => p.slice(C.pathA.length);
  const rows = [];
  for (const P of partsOf(C)) {
    const name = rel(P.path).concat(P.name).join(' · '), l = C.lanes[P.id];
    const u = underOf(P);
    if (l && !Array.isArray(l)) Object.entries(l).forEach(([snd, spans], j) => rows.push({ P, sub: j, name: `${name} · ${snd}`, icon: P.icon, spans, under: !!u && snd === u }));   // one line per sound; the background's line by its name
    else rows.push({ P, name, icon: P.icon, spans: l || [] });
  }
  for (const L of C.locked || []) rows.push({ lock: L, name: L.name, icon: 'lock', spans: L.spans || [] });
  for (const w of C.waiting || []) rows.push({ wait: w, name: rel(splitPath(w.in || C.path)).concat(w.name).join(' · '), icon: w.icon || 'sound', spans: [] });
  return rows;
}
function sizeLanes() { const C = complexOf(curS()); if (C && C.lanes) $('cxCv').style.height = (laneRows(C).length * LANE_H + 6) + 'px'; }
function drawLanes(t) {
  const S = curS(), C = complexOf(S), cv = $('cxCv'); if (!C || !C.lanes || $('cx').hidden) return;
  if (C.clock) t = C.clock(t, S.id + '/' + cur());   // the page's own sound clock, so the playhead stays on what you hear
  const rows = laneRows(C), w = cv.clientWidth, h = rows.length * LANE_H + 6; if (!w) return;
  const W = Math.round(w * DPR), H = Math.round(h * DPR); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const c = cv.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
  const T = C.loop || Math.max(1, ...rows.flatMap(r => r.spans.map(s => s[1]))), lab = Math.min(270, Math.max(170, w * (w < 600 ? .46 : .3))), x0 = lab + 10, tw = Math.max(10, w - x0 - 6);
  c.textBaseline = 'middle';
  rows.forEach((r, i) => {
    const y = 3 + i * LANE_H, my = y + LANE_H / 2, on = r.P === S;
    if (on) { c.fillStyle = '#222b3e'; c.beginPath(); c.roundRect ? c.roundRect(0, y + 1, w, LANE_H - 2, 5) : c.rect(0, y + 1, w, LANE_H - 2); c.fill(); }
    c.globalAlpha = view.solo && (!on || r.under) ? .32 : 1;
    drawIcon(c, r.icon, 10, my, 11);
    c.font = `${on ? 600 : 400} 12px ${FONT}`; c.fillStyle = on ? '#fff' : '#d9dee8'; c.textAlign = 'left';
    let name = r.name; const room = lab - 92; while (name.length > 2 && c.measureText(name).width > room) name = name.slice(0, -2) + '…';
    c.fillText(name, 22, my);
    const fin = r.P && finished(r.P), info = r.sub ? '' : r.P ? (fin ? '✓ ' + livePicksOf(marks, r.P).map(x => r.P.ids[x]).join(',') : r.P.ids[on ? cur() : partKey(r.P)]) : r.lock ? 'other page' : 'waits';
    c.font = `11px ${MONO}`; c.fillStyle = fin ? '#8cc8ff' : r.wait ? '#b3a6e8' : '#8b94a7'; c.textAlign = 'right'; c.fillText(info, lab, my);
    c.fillStyle = '#1b2130'; c.fillRect(x0, my - .5, tw, 1);
    for (const [a, b, label] of r.spans) {
      const sx = x0 + tw * a / T, sw = Math.max(3, tw * (b - a) / T), snd = r.icon === 'sound';
      c.fillStyle = on ? (snd ? 'rgba(127,224,207,.42)' : 'rgba(140,200,255,.4)') : 'rgba(120,135,165,.3)';
      c.beginPath(); c.roundRect ? c.roundRect(sx, y + 4, sw, LANE_H - 8, 4) : c.rect(sx, y + 4, sw, LANE_H - 8); c.fill();
      if (on) { c.strokeStyle = snd ? '#7fe0cf' : '#8cc8ff'; c.lineWidth = 1; c.stroke(); }
      if (label && on && sw > 36) { c.font = `10.5px ${FONT}`; c.fillStyle = '#eef8ff'; c.textAlign = 'left'; let s = label; while (s.length > 2 && c.measureText(s).width > sw - 8) s = s.slice(0, -2) + '…'; c.fillText(s, sx + 5, my); }
    }
    c.globalAlpha = 1;
  });
  const ph = x0 + tw * (((t % T) + T) % T) / T; c.fillStyle = '#fff'; c.fillRect(ph, 0, 1.5, h);
}
function figHtml(S, k) { try { return S.its[k].fig(valsFor(S, k), view.ctl) || ''; } catch (e) { if (strict) throw e; return 'The figures failed: ' + esc(e.message); } }
function renderActs() {
  const S = curS(), k = cur(), m = mget(S.id, k), rowP = inDropRow(S, k) || S.parent[k], fin = finished(S), picks = livePicksOf(marks, S), ghost = !!S.its[k].ghost;
  $('actbtns').classList.toggle('off', fin);
  for (const b of $('actbtns').querySelectorAll('.act')) {
    const a = b.dataset.act;
    const on = a === 'pick' ? !!m.pick : a === 'drop' ? !!m.drop : a === 'dropBranch' ? !!(rowP && marks.rows[S.id + '/' + rowP]) : a === 'branch' ? !!m.branch : a === 'combine' ? !!groupOf(S.id, k) : m.req === a;
    b.setAttribute('aria-pressed', String(on)); b.disabled = !can(a, S, k);
    const L = b.querySelector('.long'), Sh = b.querySelector('.short');
    if (a === 'pick') { L.textContent = k === 'now' ? (on ? 'Kept as it is' : 'Keep Now') : on ? 'Picked' : 'Pick'; Sh.textContent = k === 'now' ? 'Keep' : on ? 'Picked' : 'Pick'; }
    if (a === 'branch') { L.textContent = on ? `Branch off ×${m.branch}` : 'Branch off'; Sh.textContent = on ? `Branch ×${m.branch}` : 'Branch'; $('branchMore').hidden = !on; $('branchMore').disabled = b.disabled || m.branch >= BRANCH_MAX; b.title = on ? `Asks for ${m.branch} new take${m.branch > 1 ? 's' : ''} under ${S.ids[k]}; click to take the branch off (B one more, Shift+B one fewer)` : 'Branch off: new takes grown from this one (B)'; }
    if (a !== 'dropBranch' && a !== 'branch') b.title = L.textContent;
    if (a === 'dropBranch') { const n = rowP ? under(S, rowP).length : 0; L.textContent = rowP ? `Drop branch (${n})` : 'Drop branch'; Sh.textContent = rowP ? `Drop br. (${n})` : 'Drop br.'; b.title = rowP ? `Drops the branch under ${S.ids[rowP]}: ${under(S, rowP).map(x => S.ids[x]).join(', ')}` : 'Only inside a branch'; }
  }
  const park = $('parkNote');
  park.hidden = !fin;
  if (fin) park.textContent = picks.includes(k) ? `This is your pick, and your pick is final: ${S.name} is finished. Its note and slider values go with it.` : `${S.name} has a pick (${picks.map(x => S.ids[x]).join(', ')}), and your pick is final: other marks here are set aside, except ratings and notes. Unpick it to ask for changes.`;
  const og = marks.groups.find(g => g.id === marks.open);
  $('combbar').hidden = !og;
  if (og) { const sg = secOf(og.sid); $('combText').textContent = og.keys.length < 2 ? `Combining ${og.keys.map(x => sg.ids[x]).join(' + ')} + …: go to another take and press Combine.` : `Combining ${og.keys.map(x => sg.ids[x]).join(' + ')}.`; if (document.activeElement !== $('combNote')) $('combNote').value = og.note || ''; }
  $('rate').innerHTML = Array.from({ length: 10 }, (_, i) => `<button type="button" data-rate="${i + 1}" class="${m.rate === i + 1 ? 'on' : m.rate > i + 1 ? 'lit' : ''}" aria-pressed="${m.rate === i + 1}" aria-label="Rate ${i + 1} of 10"${ghost ? ' disabled' : ''}>${i + 1}</button>`).join('');
  $('rateLbl').textContent = `Rate ${S.ids[k]}`;
  $('noteLbl').textContent = `Note on ${S.ids[k]}`;
  $('note').disabled = ghost;
  if (document.activeElement !== $('note')) $('note').value = m.note || '';
  renderLayers(S, k, S.its[k], m, ghost);
  $('secName').textContent = S.name; $('moreN').textContent = marks.more[S.id] || 0;
  // a note on each complex around this part, nearest first (author, 4.11)
  const cxs = S.path.map((_, i) => S.path.slice(0, i + 1).join(' › ')).reverse(), box = $('cxNotes');
  if (box.dataset.for !== cxs.join('|')) { box.dataset.for = cxs.join('|'); box.innerHTML = cxs.map((p, i) => `<div class="sech">The whole ${esc(p)}, every part</div><label for="cxn${i}">Note on ${esc(p)}</label><textarea id="cxn${i}" data-cx="${esc(p)}"></textarea>`).join(''); }
  for (const ta of box.querySelectorAll('textarea')) if (document.activeElement !== ta) ta.value = marks.cxNote[ta.dataset.cx] || '';
  const sn = (marks.more[S.id] ? 1 : 0) + (marks.secNote[S.id] ? 1 : 0) + cxs.filter(p => marks.cxNote[p]).length + (marks.pageNote ? 1 : 0);
  $('secSum').innerHTML = `${esc(S.name)} tab · ${S.path.length ? 'complex · ' : ''}whole page${sn ? ` <span class="cnt">${sn}</span>` : ''}`;
  if (document.activeElement !== $('secNote')) $('secNote').value = marks.secNote[S.id] || '';
  if (document.activeElement !== $('pageNote')) $('pageNote').value = marks.pageNote || '';
}
// the pick line: one line in the header (the tabs with marks, side by side); ▾ or a click opens it whole
function renderLine() {
  const n = countMarks(), t = $('pickText');
  $('pickN').textContent = n ? `${n} mark${n === 1 ? '' : 's'}` : '';
  if (!n) { t.innerHTML = '<span class="ln">No marks yet.</span>'; return; }
  t.innerHTML = lineOf().split('\n').map((L, i) => { if (!i) return `<span class="ln h">${esc(L)}</span>`; const j = L.indexOf(' — '); return `<span class="ln${/ — none$/.test(L) ? ' none' : ''}">${j < 0 ? esc(L) : `<span class="s">${esc(L.slice(0, j))}</span>${esc(L.slice(j))}`}</span>`; }).join('');
}
// the tree's places: each take sits above its own branch row, which starts at the take's left edge; a take is as wide as its branches need
function treeLayout(S, nodeW, gap, rowH) {
  const nodes = {}, wOf = {}; let maxD = 0;
  const sub = k => { if (wOf[k] != null) return wOf[k]; const it = S.its[k], own = nodeW(k); let w = own; if (it.kids && it.kids.length) w = Math.max(own, it.kids.reduce((s, c) => s + sub(c), 0) + gap * (it.kids.length - 1)); return (wOf[k] = w); };
  const place = (ks, x0, d) => { let x = x0; for (const k of ks) { nodes[k] = { k, x, y: d * rowH, w: nodeW(k), d }; maxD = Math.max(maxD, d); if (S.its[k].kids) place(S.its[k].kids, x, d + 1); x += sub(k) + gap; } return x - gap; };
  const W = place(S.row, 0, 0);
  return { nodes, W, D: maxD };
}
const MEAS = document.createElement('canvas').getContext('2d');
const textW = (s, font) => { MEAS.font = font; return MEAS.measureText(s).width; };
function linkPaths(S, L, pad, nh, cx) {
  let s = '';
  const fin = finished(S);
  for (const k of S.keys) {
    const kids = S.its[k].kids; if (!kids || !kids.length) continue;
    const a = L.nodes[k], ax = pad + cx(a), ay = pad + a.y + nh, ky = pad + L.nodes[kids[0]].y, mid = ay + (ky - ay) * .5;
    const drop = !fin && (!!marks.rows[S.id + '/' + k] || !!inDropRow(S, k)), xs = kids.map(c => pad + cx(L.nodes[c]));
    let d = `M${ax},${ay}V${mid}M${Math.min(ax, ...xs)},${mid}H${Math.max(ax, ...xs)}`;
    for (const x of xs) d += `M${x},${mid}V${ky}`;
    s += `<path class="lk${drop ? ' drop' : ''}" d="${d}"/>`;
  }
  return s;
}
const combLift = (x1, x2) => 12 + Math.min(26, Math.abs(x2 - x1) * .12);
// How far the tree must move down so the combine arcs over its top row stay inside the map (an arc peaks 3/4 of its lift up).
function combineRoom(S, L, pad, cx) {
  let ty = 0;
  for (const g of marks.groups) { if (g.sid !== S.id) continue; for (let i = 1; i < g.keys.length; i++) { const a = L.nodes[g.keys[i - 1]], b = L.nodes[g.keys[i]]; if (a && b) ty = Math.max(ty, Math.ceil(4 + .75 * combLift(cx(a), cx(b)) - pad - Math.min(a.y, b.y))); } }
  return ty;
}
function combinePaths(S, L, pad, cx) {
  let s = '';
  const off = finished(S) ? ' off' : '';
  for (const g of marks.groups) { if (g.sid !== S.id) continue; for (let i = 1; i < g.keys.length; i++) { const a = L.nodes[g.keys[i - 1]], b = L.nodes[g.keys[i]]; if (!a || !b) continue; const x1 = pad + cx(a), y1 = pad + a.y, x2 = pad + cx(b), y2 = pad + b.y, lift = combLift(x1, x2); s += `<path class="cbk${off}" d="M${x1},${y1}C${x1},${y1 - lift} ${x2},${y2 - lift} ${x2},${y2}"/>`; } }
  return s;
}
function renderMap() {
  const S = curS(), k = cur(), nh = 22, rowH = 48, pad = 12, F = `600 11px ${MONO}`, fin = finished(S);
  const L = treeLayout(S, kk => Math.ceil(textW(S.ids[kk], F)) + 14, 8, rowH), cx = n => n.x + n.w / 2;
  const ty = combineRoom(S, L, pad, cx), Wt = Math.ceil(L.W + pad * 2), Ht = L.D * rowH + nh + pad * 2 + ty;
  let s = `<svg width="${Wt}" height="${Ht}" viewBox="0 ${-ty} ${Wt} ${Ht}"><defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#2b1219"/><rect width="1.6" height="5" fill="#f08f9d" opacity=".55"/></pattern></defs>`;
  s += linkPaths(S, L, pad, nh, cx) + combinePaths(S, L, pad, cx);
  let seenN = 0;
  for (const kk of S.keys) {
    const n = L.nodes[kk], x = pad + n.x, y = pad + n.y, it = S.its[kk], m = mget(S.id, kk), rowDrop = inDropRow(S, kk), drop = dropLive(S, kk), sn = seen(S, kk), asks = !rowDrop && (m.req || m.branch || (m.drop && fin) || groupOf(S.id, kk));
    if (sn) seenN++;
    const cls = ['nd', kk === 'now' ? 'now' : '', it.ghost ? 'ghost' : '', m.pick && !rowDrop ? 'pick' : '', it.picked && !it.ghost ? 'was' : '', drop ? 'drop' : '', groupOf(S.id, kk) && !rowDrop && !fin ? 'comb' : ''].filter(Boolean).join(' ');
    const status = [it.ghost ? 'dropped, the stem of its branches' : '', it.picked && !it.ghost ? `picked in round ${wasRound(it)}` : '', m.pick && !rowDrop ? 'picked, final' : '', drop ? 'to drop' : '', asks ? (fin ? 'set aside' : 'change asked') : '', m.rate ? 'rated ' + m.rate : '', it.star && !view.starsHidden ? 'my pick' : ''].filter(Boolean).join(', ');
    s += `<g class="${cls}" data-go="${esc(kk)}" tabindex="0" role="button" aria-label="${esc(S.ids[kk] + ' ' + it.name + (status ? ', ' + status : ''))}"><title>${esc(S.ids[kk] + ' · ' + it.name + (status ? ' · ' + status : ''))}</title>`;
    if (kk === k) s += `<rect class="ring" x="${x - 3.5}" y="${y - 3.5}" width="${n.w + 7}" height="${nh + 7}" rx="8"/>`;
    s += `<rect class="b" x="${x}" y="${y}" width="${n.w}" height="${nh}" rx="6"/><text class="t" x="${x + n.w / 2}" y="${y + 15}" text-anchor="middle">${esc(S.ids[kk])}</text>`;
    if (it.star && !view.starsHidden) s += `<text class="mk-star" x="${x + n.w - 5}" y="${y - 3}">★</text>`;
    if (asks) s += `<circle class="mk-req${fin ? ' off' : ''}" cx="${x + n.w}" cy="${y + nh}" r="3.6"/>`;
    if ((it.fresh || it.changed) && !sn) s += `<circle class="mk-new" cx="${x + 1}" cy="${y + 1}" r="3.2"/>`;
    if (m.rate) s += `<text class="mk-rate" x="${x + n.w}" y="${y + nh + 11}" text-anchor="end">${m.rate}</text>`;
    if (m.note) s += `<text class="mk-note" x="${x + 1}" y="${y + nh + 11}">✎</text>`;
    s += '</g>';
  }
  s += '</svg>';
  const body = $('mBody'); body.innerHTML = s;
  $('mTitle').textContent = `${S.name} · map`;
  $('mProg').textContent = `seen ${seenN} of ${S.keys.length}`;
  const n = L.nodes[k], nx = pad + n.x, ny = pad + n.y + ty;
  if (nx < body.scrollLeft || nx + n.w > body.scrollLeft + body.clientWidth - 12) body.scrollLeft = Math.max(0, nx - body.clientWidth / 2 + n.w / 2);
  if (ny < body.scrollTop || ny + nh > body.scrollTop + body.clientHeight - 12) body.scrollTop = Math.max(0, ny - body.clientHeight / 2);
}
function renderOverview() {
  // the combine arcs rise above the cards, so the tree starts 44 px down; the svg is shifted by the same amount
  const S = curS(), k = cur(), cw = 156, chv = 88, ch = chv + 29, rowH = ch + 44, pad = 6, top = 44;
  const L = treeLayout(S, () => cw, 20, rowH), cx = n => n.x + cw / 2;
  const W = L.W + pad * 2, H = L.D * rowH + ch + top + pad;
  let html = `<svg width="${W}" height="${H}"><g transform="translate(0 ${top - pad})">${linkPaths(S, L, pad, ch, cx)}${combinePaths(S, L, pad, cx)}</g></svg>`;
  for (const kk of S.keys) {
    const n = L.nodes[kk], it = S.its[kk], m = mget(S.id, kk), drop = dropLive(S, kk);
    html += `<button type="button" class="oc${it.ghost ? ' ghost' : ''}${m.pick && !inDropRow(S, kk) ? ' pick' : ''}${it.picked && !it.ghost ? ' was' : ''}${drop ? ' drop' : ''}${kk === k ? ' cur' : ''}" style="left:${pad + n.x}px;top:${top + n.y}px" data-go="${esc(kk)}" title="${esc(S.ids[kk] + ' · ' + it.name)}"><canvas data-k="${esc(kk)}"></canvas><span class="ol"><b>${esc(S.ids[kk])}</b><span>${esc(it.name)}</span>${it.star && !view.starsHidden ? '<span class="star">★</span>' : ''}${m.rate ? `<span>${m.rate}</span>` : ''}</span></button>`;
  }
  const tree = $('ovTree'); tree.style.width = W + 'px'; tree.style.height = H + 'px'; tree.innerHTML = html;
  $('ovTitle').textContent = `${S.name} · the whole tree`;
  for (const cv of tree.querySelectorAll('canvas')) { const kk = cv.dataset.k; paintTo(cv, S, kk, S.its[kk].still !== undefined ? S.its[kk].still : (STUDY.still !== undefined ? STUDY.still : .8), valsFor(S, kk), cw, chv, true); }
}
function openOverview() { $('overview').hidden = false; renderOverview(); $('ovClose').focus({ preventScroll: true }); }
function closeOverview() { $('overview').hidden = true; }
// ---------------------------------------------------------------- the big view (author, 4.11): the shown take filling the window; zoom and drag work there too
function renderBig() { if ($('big').hidden) return; const S = curS(), k = cur(); $('bigTitle').innerHTML = `<span class="mono">${esc(S.ids[k])}</span> ${esc(S.its[k].name)} <span class="dim">· ${esc(S.full)}</span>`; for (const b of document.querySelectorAll('[data-zoom="reset"]')) b.textContent = zoomLabel(); }
function sizeBig() {
  const b = $('bigBody'), cv = $('cvBig'), aw = b.clientWidth - 16, ah = b.clientHeight - 16, ar = STUDY.logical ? STUDY.logical.w / STUDY.logical.h : 16 / 9;
  let w = aw, h = w / ar; if (h > ah) { h = ah; w = h * ar; }
  cv.style.width = Math.max(0, Math.floor(w)) + 'px'; cv.style.height = Math.max(0, Math.floor(h)) + 'px';
}
function openBig() { $('big').hidden = false; document.body.classList.add('bigopen'); renderBig(); sizeBig(); drawFrame(simT); }
function closeBig() { $('big').hidden = true; document.body.classList.remove('bigopen'); drawFrame(simT); }
function clampZoom() { zoom.z = Math.max(1, Math.min(ZMAX, zoom.z)); const m = .5 * (1 - 1 / zoom.z); zoom.x = Math.max(-m, Math.min(m, zoom.x)) || 0; zoom.y = Math.max(-m, Math.min(m, zoom.y)) || 0; }
function setZoom(z, fx, fy) {   // fx, fy: the point that stays put, as a fraction of the view from its centre
  const z0 = zoom.z, z1 = Math.max(1, Math.min(ZMAX, z));
  if (fx !== undefined) { zoom.x += fx / z0 - fx / z1; zoom.y += fy / z0 - fy / z1; }
  zoom.z = z1; clampZoom();
  for (const b of document.querySelectorAll('[data-zoom="reset"]')) b.textContent = zoomLabel();
  $('views').classList.toggle('zoomed', zoom.z > 1); drawFrame(simT);
}
const fracAt = (cv, x, y) => { const r = cv.getBoundingClientRect(); return { fx: (x - r.left) / r.width - .5, fy: (y - r.top) / r.height - .5 }; };
// Ctrl+wheel (or any wheel in the big view) and a pinch zoom at the pointer; a drag looks around once zoomed; a double-click goes to 2.5× and back;
// a sideways swipe at 1× still steps through the takes
function zoomable(box, canvasAt, wheelFree) {
  const pts = new Map(); let pinch = null, drag = null, swipe = null;
  box.addEventListener('wheel', e => { if (!wheelFree() && !e.ctrlKey && !e.metaKey) return; const cv = canvasAt(e.target); if (!cv) return; e.preventDefault(); const f = fracAt(cv, e.clientX, e.clientY); setZoom(zoom.z * Math.exp(-Math.max(-160, Math.min(160, e.deltaY)) * (Math.abs(e.deltaY) < 40 ? .012 : .0022)), f.fx, f.fy); }, { passive: false });   // a trackpad pinch sends small steps, a wheel notch about 100
  box.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return; const cv = canvasAt(e.target); if (!cv) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, cv });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom.z }; drag = null; swipe = null; return; }
    if (zoom.z > 1) { drag = { x: e.clientX, y: e.clientY, cv }; try { box.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }
    else if (e.pointerType !== 'mouse') swipe = { x: e.clientX, y: e.clientY };
  });
  box.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()], f = fracAt(a.cv, (a.x + b.x) / 2, (a.y + b.y) / 2); setZoom(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, f.fx, f.fy); return; }
    if (drag) { const r = drag.cv.getBoundingClientRect(); zoom.x -= (e.clientX - drag.x) / (r.width * zoom.z); zoom.y -= (e.clientY - drag.y) / (r.height * zoom.z); drag.x = e.clientX; drag.y = e.clientY; clampZoom(); drawFrame(simT); }
  });
  box.addEventListener('pointerup', e => {
    if (swipe && pts.size === 1 && !pinch) { const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.8) nav(dx < 0 ? 'r' : 'l'); }
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { drag = null; swipe = null; }
  });
  box.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = null; drag = null; swipe = null; });
  box.addEventListener('dblclick', e => { const cv = canvasAt(e.target); if (!cv) return; const f = fracAt(cv, e.clientX, e.clientY); if (zoom.z > 1) setZoom(1); else setZoom(2.5, f.fx, f.fy); });
}

// ---------------------------------------------------------------- tooltips: a hover on a PC, a long press on a phone (author's answer, 4.11)
let tipT = 0, tipFor = null, longT = 0, eatClick = false;
function showTip(el) {
  const s = el.dataset.tip; if (!s) return; const tip = $('tip'), [h, ...rest] = s.split('\n');
  tip.innerHTML = `<b>${esc(h)}</b>${rest.map(l => `<span>${esc(l)}</span>`).join('')}`; tip.hidden = false;
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, th = tip.offsetHeight;
  let y = r.bottom + 8; if (y + th > innerHeight - 8) y = r.top - th - 8;
  tip.style.left = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)) + 'px'; tip.style.top = Math.max(8, y) + 'px'; tipFor = el;
}
function hideTip() { clearTimeout(tipT); $('tip').hidden = true; tipFor = null; }
document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest && e.target.closest('[data-tip]'); if (el === tipFor) return; hideTip(); if (el) tipT = setTimeout(() => showTip(el), 320); });
document.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest && e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
document.addEventListener('pointerdown', e => {
  eatClick = false; hideTip(); clearTimeout(longT); if (e.pointerType === 'mouse') return;
  const el = e.target.closest && e.target.closest('[data-tip]'); if (el) longT = setTimeout(() => { showTip(el); eatClick = true; }, 480);
}, true);
for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => clearTimeout(longT), true);
document.addEventListener('click', e => { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); setTimeout(hideTip, 1800); } }, true);   // a long press shows the tip and does not click
addEventListener('scroll', hideTip, { passive: true });

function renderAll() {
  renderControls(); renderTabs(); renderWhere(); renderPanel(); renderActs(); renderMap(); renderLine();
  if (!$('overview').hidden) renderOverview();
  if (!$('qs').hidden) renderQs();
  placeWline();
  drawFrame(simT);
}

// ---------------------------------------------------------------- questions: options with my default chosen; the answers ride in the pick line
function buildQs() {
  $('qs').innerHTML = `<div class="qhead"><div><h2>Questions</h2><div class="dim">My default is chosen on each. Change only what you disagree with; your answers go into the pick line.</div><div class="qnag" id="qsNag" hidden></div></div><span class="qbtns"><button type="button" class="btn qcopy" id="qsCopy">Copy the line</button><button type="button" class="btn" id="qsClose">Close</button></span></div>${QUESTIONS.map(x => `<div class="q" data-qid="${esc(x.id)}"><div class="qt"><span class="qn">${esc(x.id)}</span>${esc(x.t || '')}</div>${x.x ? `<div class="qx">${x.x}</div>` : ''}<div class="opts">${x.o.map((o, i) => `<button type="button" class="opt" data-q="${esc(x.id)}" data-o="${esc(o[0])}"><b>${esc(o[0])}</b>${o[2] || esc(o[1])}${i ? '' : '<span class="def">default</span>'}</button>`).join('')}</div></div>`).join('')}`;
}
// which questions the author has opened, kept per page across rounds: a question asked again with the same words stays opened
const qSig = x => x.id + '|' + (x.t || '');
const qsUnseen = () => QUESTIONS.filter(x => !(view.qseen || []).includes(qSig(x)));
function openQs(nag) {
  const u = qsUnseen(); $('qs').hidden = false; renderQs();
  $('qsNag').hidden = !nag; if (nag) $('qsNag').textContent = `Copied. Before you send it: ${u.length === QUESTIONS.length ? 'you have not opened these questions yet' : `${u.length} of these questions ${u.length === 1 ? 'is' : 'are'} new`}, and the line keeps my default for each. Change any you disagree with, then copy again.`;
  for (const q of $('qs').querySelectorAll('.q')) q.classList.toggle('qnewq', u.some(x => x.id === q.dataset.qid));
  view.qseen = [...new Set((view.qseen || []).filter(s => QUESTIONS.some(x => qSig(x) === s)).concat(QUESTIONS.map(qSig)))]; saveView(); renderControls();
  $('qsClose').focus({ preventScroll: true }); $('qs').scrollTop = 0;
}
function renderQs() { for (const b of $('qs').querySelectorAll('[data-q]')) { const x = QUESTIONS.find(x => x.id === b.dataset.q); b.classList.toggle('on', (marks.ans[x.id] || x.o[0][0]) === b.dataset.o); } }

// ---------------------------------------------------------------- the map's popover below 1100 px
const midW = () => matchMedia('(max-width: 1099px)').matches;
const secPop = () => getComputedStyle($('secbox').querySelector('.in')).position === 'absolute';   // on a PC it opens beside the marks
function closeSheets() { $('map').classList.remove('open'); if (secPop()) $('secbox').open = false; }
function toggleMap() { if (midW()) { $('map').classList.toggle('open'); renderMap(); } else openOverview(); }
function measure() {
  const head = $('head');
  $('app').style.setProperty('--headH', (getComputedStyle(head).position === 'sticky' ? head.getBoundingClientRect().height : 0) + 'px');
}

// ---------------------------------------------------------------- events
document.addEventListener('click', e => {
  const t = e.target;
  // a click elsewhere closes the tab and page notes, but not playing or replaying the take beside them (author, 4.11)
  if ($('secbox').open && !t.closest('#secbox, #clip, #views, #controls, #soloBtn, .zoomg, #cx, #big') && secPop()) $('secbox').open = false;
  for (const d of document.querySelectorAll('details.dd[open], details.pop[open]')) if (!d.contains(t)) d.open = false;   // a drop-down closes on a click elsewhere
  const zb = t.closest('[data-zoom]'); if (zb) { const z = zb.dataset.zoom; if (z === 'in') setZoom(zoom.z * 1.25); else if (z === 'out') setZoom(zoom.z / 1.25); else if (z === 'reset') setZoom(1); else if ($('big').hidden) openBig(); else closeBig(); return; }
  if (t.closest('#pickText') && !$('pickText').classList.contains('open')) { $('pickText').classList.add('open'); $('pickMore').classList.add('on'); measure(); return; }
  const nb = t.closest('[data-nav]'); if (nb && !nb.disabled) { nav(nb.dataset.nav); return; }
  const ab = t.closest('[data-act]'); if (ab && !ab.disabled) { act(ab.dataset.act, view.sec, cur()); if (ab.dataset.act === 'combine' && marks.open) $('combNote').focus({ preventScroll: true }); return; }
  const rb = t.closest('[data-rate]'); if (rb && !rb.disabled) { act('rate', view.sec, cur(), +rb.dataset.rate); return; }
  const lr = t.closest('[data-lrate]'); if (lr) { pushUndo(); layMark(view.sec, cur(), lr.closest('.lay').dataset.lay, 'rate', +lr.dataset.lrate); renderPanel(); renderActs(); return; }
  const sb = t.closest('[data-sec]'); if (sb) { go(sb.dataset.sec, view.cur[sb.dataset.sec]); return; }
  const gb = t.closest('[data-go]');
  if (gb) { go(view.sec, gb.dataset.go); if (gb.closest('#overview')) closeOverview(); else if (gb.closest('#map') && midW()) closeSheets(); return; }
  const cb = t.closest('[data-cmp]'); if (cb && !cb.disabled) { view.cmp = cb.dataset.cmp; saveView(); renderPanel(); drawFrame(simT); return; }
  const rr = t.closest('[data-reopen]'); if (rr) { pushUndo(); marks.open = +rr.dataset.reopen; save(); renderAll(); return; }
  const cs = t.closest('#controls .seg[data-ctl] [data-v]'); if (cs) { const key = cs.closest('.seg').dataset.ctl, c = CTL.find(c => c.key === key), o = c.options.find(o => String(o[0]) === cs.dataset.v); cs.closest('details').open = false; if (o) { view.ctl[key] = o[0]; saveView(); renderAll(); } return; }
  const sp = t.closest('#speedSeg [data-v]'); if (sp) { sp.closest('details').open = false; view.speed = +sp.dataset.v; saveView(); renderControls(); return; }
  const tn = t.closest('#toneSeg [data-v]'); if (tn) { tn.closest('details').open = false; pushUndo(); marks.tone = +tn.dataset.v; save(); renderControls(); renderLine(); return; }
  const qo = t.closest('#qs [data-q]'); if (qo) { pushUndo(); marks.ans[qo.dataset.q] = qo.dataset.o; tidy(); save(); renderQs(); renderControls(); renderLine(); return; }
  switch (t.closest('button') && t.closest('button').id) {
    case 'pinBtn': { const S = curS(), k = cur(); if (view.pin[S.id] === k) delete view.pin[S.id]; else view.pin[S.id] = k; saveView(); renderPanel(); break; }
    case 'playBtn': toggleClip(); break;
    case 'restartBtn': restartClip(); break;
    case 'autoBtn': toggleAuto(); break;
    case 'soloBtn': toggleSolo(); break;
    case 'bigClose': closeBig(); break;
    case 'pickMore': { const o = $('pickText').classList.toggle('open'); $('pickMore').classList.toggle('on', o); measure(); break; }
    case 'combDone': pushUndo(); closeOpen(); tidy(); save(); renderAll(); break;
    case 'combCancel': pushUndo(); cancelOpen(); tidy(); save(); renderAll(); break;
    case 'moreMinus': case 'morePlus': { pushUndo(); const sid = view.sec; marks.more[sid] = Math.max(0, Math.min(5, (marks.more[sid] || 0) + (t.closest('button').id === 'morePlus' ? 1 : -1))); tidy(); save(); renderAll(); break; }
    case 'stars': view.starsHidden = !view.starsHidden; saveView(); renderAll(); break;
    case 'ovBtn': case 'mExpand': openOverview(); break;
    case 'ovClose': closeOverview(); break;
    case 'fabMap': toggleMap(); break;
    case 'mClose': closeSheets(); break;
    case 'qsBtn': openQs(false); break;
    case 'qsCopy': copyText(lineOf(), $('pickText'), true); break;
    case 'qsClose': $('qs').hidden = true; break;
    case 'copy': copyText(lineOf(), $('pickText')); break;
    case 'load': loadLine(); break;
    case 'pasteGo': if (applyLine($('pasteIn').value)) closePaste(); break;
    case 'pasteNo': closePaste(); break;
    case 'undo': undo(); break;
    case 'clear': pushUndo(); marks = blank(); save(); renderAll(); hint('Cleared every mark. Undo brings them back.'); break;
  }
});
// a key by its place on the keyboard, so the letter keys work in any layout (author, 4.11: they did nothing with another Windows layout);
// an event without a code (the self-test's) goes by its key
const keyName = e => { const c = e.code || ''; let m; if ((m = c.match(/^Key([A-Z])$/))) return m[1].toLowerCase(); if ((m = c.match(/^(?:Digit|Numpad)(\d)$/))) return m[1]; if (c === 'BracketLeft') return '['; if (c === 'BracketRight') return ']'; return e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key; };
document.addEventListener('keydown', e => {
  const kn = keyName(e);
  const g = e.target.closest && e.target.closest('.nd');
  if (g && e.key === 'Enter') { e.preventDefault(); go(view.sec, g.dataset.go); return; }
  const field = e.target.closest && e.target.closest('textarea, input, select');
  if (field && !(field.type === 'range' && (e.key === ' ' || kn === 'r'))) { if (e.key === 'Escape') e.target.blur(); return; }   // a slider still lets Space and R through
  if (e.altKey || e.metaKey) return;
  if (e.ctrlKey) { if (kn === 'z') { e.preventDefault(); undo(); } return; }
  if (e.key === 'Escape') { if (!$('big').hidden) { closeBig(); return; } closeOverview(); closeSheets(); closePaste(); $('qs').hidden = true; for (const d of document.querySelectorAll('details.dd[open], details.pop[open]')) d.open = false; return; }
  if (e.code === 'Equal' || e.code === 'NumpadAdd' || (!e.code && (e.key === '+' || e.key === '='))) { e.preventDefault(); setZoom(zoom.z * 1.25); return; }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract' || (!e.code && e.key === '-')) { e.preventDefault(); setZoom(zoom.z / 1.25); return; }
  if (e.key === ' ') { e.preventDefault(); if (!e.repeat) toggleClip(); return; }   // never scrolls the page or clicks the focused button
  const arrows = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' };
  if (arrows[e.key]) { e.preventDefault(); nav(arrows[e.key]); return; }
  if (kn === '[' || kn === ']') { const i = SECS.indexOf(curS()), S = SECS[(i + (kn === ']' ? 1 : SECS.length - 1)) % SECS.length]; go(S.id, view.cur[S.id]); return; }
  const L = kn, A = { p: 'pick', i: 'improve', b: e.shiftKey ? 'branchLess' : 'branchMore', c: 'combine', k: 'retryKeep', n: 'retryNew', d: e.shiftKey ? 'dropBranch' : 'drop' };
  if (A[L]) { e.preventDefault(); act(A[L], view.sec, cur()); return; }
  if (/^[0-9]$/.test(kn)) { act('rate', view.sec, cur(), kn === '0' ? 10 : +kn); return; }
  if (L === 'r') { if (!e.repeat) restartClip(); } else if (L === 'a') toggleAuto(); else if (L === 's') toggleSolo(); else if (L === 'f') { if ($('big').hidden) openBig(); else closeBig(); } else if (L === 'u') undo(); else if (L === 'o') { if ($('overview').hidden) openOverview(); else closeOverview(); } else if (L === 'm') toggleMap();
});
document.addEventListener('keyup', e => { if (e.key === ' ' && !(e.target.closest && e.target.closest('textarea, input:not([type=range]), select'))) e.preventDefault(); });   // Firefox clicks a focused button on Space's keyup
$('note').addEventListener('focus', () => pushUndo());
$('laybox').addEventListener('focusin', e => { if (e.target.closest('[data-lnote]')) pushUndo(); });
$('laybox').addEventListener('input', e => { const inp = e.target.closest('[data-lnote]'); if (inp) { layMark(view.sec, cur(), inp.closest('.lay').dataset.lay, 'note', inp.value); renderPanel(); renderActs(); } });
$('note').addEventListener('input', () => { mk(view.sec, cur()).note = $('note').value; tidy(); save(); renderLine(); renderTabs(); renderMap(); renderPanel(); });
$('combNote').addEventListener('input', () => { const og = marks.groups.find(g => g.id === marks.open); if (og) { og.note = $('combNote').value; save(); renderLine(); } });
$('combNote').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pushUndo(); closeOpen(); tidy(); save(); renderAll(); } });
for (const id of ['secNote', 'pageNote']) {
  $(id).addEventListener('focus', () => pushUndo());
  $(id).addEventListener('input', () => { if (id === 'secNote') marks.secNote[view.sec] = $(id).value; else marks.pageNote = $(id).value; tidy(); save(); renderLine(); renderTabs(); });
}
$('ptext').addEventListener('input', e => {
  const r = e.target.closest('input[type=range]'); if (!r) return;
  const S = curS(), k = cur(), key = S.id + '/' + k, p = S.its[k].params.find(p => p.k === r.dataset.k);
  (marks.vals[key] = marks.vals[key] || {})[p.k] = +r.value; tidy(); save();
  $('pv-' + p.k).textContent = `${num(+r.value)}${p.unit ? ' ' + p.unit : ''}`; if ($('fig')) $('fig').innerHTML = figHtml(S, k); renderLine();
});
document.addEventListener('input', e => {
  if (e.target.id !== 'vol') return;
  view.vol = +e.target.value; saveView(); $('volDD').querySelector('.ddv').textContent = Math.round(view.vol * 100) + '%';
  for (const el of els) el.volume = view.vol;
  if (actx) for (const g of gains) g.gain.setTargetAtTime(view.vol, actx.currentTime, .015);   // a short glide, so dragging never clicks
});
$('cxNotes').addEventListener('focusin', e => { if (e.target.dataset.cx) pushUndo(); });
$('cxNotes').addEventListener('input', e => { const p = e.target.dataset.cx; if (!p) return; marks.cxNote[p] = e.target.value; tidy(); save(); renderLine(); renderActs(); });
$('cxCv').addEventListener('click', e => { const C = complexOf(curS()); if (!C) return; const r = laneRows(C)[Math.floor((e.offsetY - 3) / LANE_H)]; if (r && r.P) go(r.P.id, view.cur[r.P.id]); });   // a lane opens its part
zoomable($('views'), t => (t.closest && t.closest('.view') ? t.closest('.view').querySelector('canvas') : $('cvA')), () => false);   // a captured drag reports the box itself
zoomable($('bigBody'), () => $('cvBig'), () => true);
function copyText(text, sel, fromQs) {
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); hint('The page may not write to the clipboard here: the line is selected, so press Ctrl+C (or long-press → Copy).', 12000); };
  const done = () => { hint('Copied the pick line.'); const b = $('copy'), l = b && b.querySelector('.cl'); if (l) { b.classList.add('done'); l.textContent = 'Copied ✓'; clearTimeout(copyText.t); copyText.t = setTimeout(() => { b.classList.remove('done'); l.textContent = 'Copy'; }, 1600); } if (!fromQs && QUESTIONS.length && qsUnseen().length) openQs(true); else if (fromQs) { $('qsNag').hidden = false; $('qsNag').textContent = 'Copied the line with these answers.'; } };
  try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
}
async function loadLine() {
  if (navigator.clipboard && navigator.clipboard.readText) {
    try { const text = await Promise.race([navigator.clipboard.readText(), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 1500))]); if (text && text.trim() && applyLine(text)) return; } catch (e) { /* reading the clipboard is refused in the artifact viewer: paste instead */ }
  }
  $('paste').hidden = false; $('pasteIn').value = ''; $('pasteIn').focus(); measure();
}
function closePaste() { $('paste').hidden = true; measure(); }
$('pasteIn').addEventListener('paste', () => setTimeout(() => { if ($('pasteIn').value.trim() && applyLine($('pasteIn').value)) closePaste(); }, 0));
addEventListener('storage', e => { if (e.key === MKEY) { marks = fixMarks(store.get(MKEY, null) || blank()); renderAll(); } });
addEventListener('resize', () => { measure(); renderMap(); renderWhere(); placeWline(); sizeLanes(); if (!$('big').hidden) { sizeBig(); drawFrame(simT); } });
addEventListener('scroll', placeWline, { passive: true });
$('wlTab').addEventListener('change', e => { const S = secOf(e.target.value); e.target.blur(); if (S) go(S.id, view.cur[S.id]); });   // blurred, so the arrow keys move between takes again
if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => measure()); ro.observe($('head')); }

// ---------------------------------------------------------------- the clock (rAF, with a timer behind it for a hidden pane)
let simT = 0, last = performance.now(), paused = false, raf = 0, backup = 0;
function setPaused(p) { paused = p; syncClip(); }
function tick(now) {
  raf = requestAnimationFrame(tick); clearTimeout(backup); backup = setTimeout(() => { cancelAnimationFrame(raf); tick(performance.now()); }, 150);
  const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
  if (!paused) simT += dt * (+view.speed || 1);
  try { drawFrame(simT); } catch (e) { if (!tick.err) { tick.err = 1; console.error(e); } }
}

// ---------------------------------------------------------------- self-test: every take drawn frame by frame in every control setting; every mark written and read back
function runSelftest() {
  const t0 = performance.now(), errs = [], keepMarks = JSON.stringify(marks), keepView = JSON.stringify(view), keepFirst = firstLook, keepPaused = paused, keepT = simT;
  const press = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  const ST = STUDY.selftest || {}, SECONDS = ST.seconds || 6, STEP = ST.step || .23;
  let checks = 0; store.off = true; strict = true; view.auto = false; mute = true;   // walking every take must not play every sound
  const ok = (c, msg) => { checks++; if (!c && errs.length < 60) errs.push(msg); };
  const tryit = (label, f) => { try { f(); } catch (e) { checks++; if (errs.length < 60) errs.push(`${label}: ${String(e && (e.stack || e.message)).split('\n').slice(0, 2).join(' | ')}`); } };
  const roundTrip = label => { const line = lineOf(); let res = null; try { res = parseLine(line); } catch (e) { ok(false, `${label}: ${e.message}`); return; } ok(norm(res.marks) === norm(marks), `${label}: the line did not load back the same.\n   line ${line.replace(/\n/g, ' ⏎ ')}\n   had  ${norm(marks)}\n   got  ${norm(res.marks)}`); ok(!res.warn.length, `${label}: warnings ${res.warn.join(' ')}`); };
  // control settings: each option of each control once (the others at their defaults), or the page's own list
  const base = Object.assign({}, view.ctl), combos = ST.ctl || (CTL.length ? CTL.flatMap(c => c.options.map(o => Object.assign({}, base, { [c.key]: o[0] }))) : [base]);
  for (const combo of combos) {
    Object.assign(view.ctl, combo);
    for (const S of SECS) {
      for (const k of S.keys) tryit(`show ${S.id}/${k} ${JSON.stringify(combo)}`, () => {
        go(S.id, k);
        // a take must not read a shown canvas back (getImageData on a canvas on the page): it stalls a phone's GPU every frame (31.10)
        const gid = CanvasRenderingContext2D.prototype.getImageData; let reads = 0, frames = 0;
        CanvasRenderingContext2D.prototype.getImageData = function (...a) { if (this.canvas && this.canvas.isConnected) reads++; return gid.apply(this, a); };
        try { for (let t = 0; t < SECONDS; t += STEP) { drawFrame(t); frames++; } } finally { CanvasRenderingContext2D.prototype.getImageData = gid; }
        ok(reads <= frames / 4, `${S.id}/${k}: reads the shown canvas back ${reads} times in ${frames} frames (getImageData on a canvas on show stalls a phone's GPU every frame; draw into a canvas of your own)`);
        if (combo === combos[0]) addressBar(S, k, ok);
        for (const c of ['now', 'before', 'pin', 'off']) { view.cmp = c; if (c === 'pin') view.pin[S.id] = S.keys.find(x => x !== k) || k; renderPanel(); drawFrame(1.37); }
        const clip = clipOf(S, k);   // Play and Restart only for a sound or a moving take; Space and R play, pause and restart it
        ok(!!$('playBtn') === !!clip && !!$('restartBtn') === !!clip, `${S.id}/${k}: Play and Restart ${clip ? 'missing on a ' + clip : 'shown on a still'} take`);
        if (clip !== 'sound') {
          const p0 = paused; press(' ');
          ok(paused === (clip ? !p0 : p0), `${S.id}/${k}: Space ${clip ? 'did not pause or play it' : 'changed the clock on a still'}`);
          if (clip) { simT = 3.3; press('r'); ok(simT === 0 && !paused, `${S.id}/${k}: R did not restart it`); }
          setPaused(p0);
        }
        for (const d of ['l', 'r', 'u', 'd']) { const t = navTarget(d), shown = [...document.querySelectorAll(`#rowbar [data-nav="${d}"]`)]; ok(shown.length === 1, `${S.id}/${k}: no ${d} arrow in the row`); for (const b of shown) ok(b.disabled === !t, `${S.id}/${k}: the ${d} arrow is ${b.disabled ? 'off' : 'on'} but its target is ${t || 'none'}`); }
        if (S.its[k].fig) ok(typeof figHtml(S, k) === 'string', `${S.id}/${k}: fig() returned no text`);
      });
      tryit(`whole tree ${S.id}`, () => { openOverview(); closeOverview(); });
    }
  }
  Object.assign(view.ctl, base);
  for (const S of SECS) for (const k of S.keys) for (const a of ACTS.concat(['rate'])) tryit(`${S.id}/${k}/${a}`, () => { marks = blank(); act(a, S.id, k, 7, true); if (a === 'combine') { const o = S.keys.find(x => x !== k && can('combine', S, x)); if (o) act('combine', S.id, o, 0, true); closeOpen(); } roundTrip(`${S.id}/${k}/${a}`); });
  let seed = 11; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const NOTES = ['plain words', 'a "quoted" word', 'semi; colon', 'back\\slash', 'two\nlines', 'a dash — inside', 'plus + sign', '(brackets) too', 'Призрак «Воронка»'];
  for (let r = 0; r < 300; r++) tryit(`random ${r}`, () => {
    marks = starting();
    for (let j = 1 + rnd(12); j > 0; j--) {
      const S = SECS[rnd(SECS.length)], k = S.keys[rnd(S.keys.length)], w = rnd(15);
      if (w < 8) act(ACTS[w], S.id, k, 0, true);
      else if (w === 8) act('rate', S.id, k, 1 + rnd(10), true);
      else if (w === 9) { if (!S.its[k].ghost) { mk(S.id, k).note = NOTES[rnd(NOTES.length)]; const L = layersOf(S.its[k]); if (L.length) { const l = L[rnd(L.length)], v = ((mk(S.id, k).lay = mk(S.id, k).lay || {})[l.id] = {}); if (rnd(2)) v.rate = 1 + rnd(10); if (rnd(2) || !v.rate) v.note = NOTES[rnd(NOTES.length)]; } tidy(); } }
      else if (w === 10) { const it = S.its[k]; if (it.params) { const p = it.params[rnd(it.params.length)]; (marks.vals[S.id + '/' + k] = marks.vals[S.id + '/' + k] || {})[p.k] = +(p.min + p.step * rnd(Math.round((p.max - p.min) / p.step) + 1)).toFixed(3); tidy(); } }
      else if (w === 11) { marks.more[S.id] = rnd(4); marks.secNote[S.id] = rnd(2) ? NOTES[rnd(NOTES.length)] : ''; tidy(); }
      else if (w === 12) { marks.pageNote = rnd(2) ? NOTES[rnd(NOTES.length)] : ''; if (HAS_AUDIO) marks.tone = TONES[rnd(TONES.length)]; if (CX_PATHS.length) marks.cxNote[CX_PATHS[rnd(CX_PATHS.length)]] = rnd(2) ? NOTES[rnd(NOTES.length)] : ''; const og = marks.groups.find(g => g.id === marks.open); if (og) og.note = NOTES[rnd(NOTES.length)]; }
      else if (w === 13) { if (QUESTIONS.length) { const x = QUESTIONS[rnd(QUESTIONS.length)]; marks.ans[x.id] = x.o[rnd(x.o.length)][0]; tidy(); } }
      else if (rnd(2)) closeOpen(); else cancelOpen();
    }
    roundTrip(`random ${r}`);
  });
  tryit('a pick sets the rest aside', () => {
    const S = SECS.find(S => S.keys.filter(k => can('improve', S, k)).length >= 3); if (!S) return;
    const ks = S.keys.filter(k => can('improve', S, k));
    marks = blank(); act('improve', S.id, ks[0], 0, true); act('drop', S.id, ks[1], 0, true); act('rate', S.id, ks[0], 6, true);
    act('pick', S.id, ks[2], 0, true);
    const sec = lineOf().split('\n').find(L => L.startsWith(S.full + ' — '));
    ok(!/; (improve|drop) /.test(sec) && /^.+ — pick /.test(sec) && / rate /.test(sec), `a picked section should carry only its pick, ratings and notes: ${sec}`);
    act('pick', S.id, ks[2], 0, true); ok(/improve /.test(lineOf()), 'unpicking did not bring the requests back');
    roundTrip('pick sets aside');
  });
  tryit('a still beside a moving take', () => {
    for (const S of SECS) {
      if (complexSound(S)) continue;   // a part of a complex with sounds always plays as the complex
      const still = S.keys.find(k => !S.its[k].audio && !S.its[k].ghost && !moves(S, k)), mover = S.keys.find(k => !S.its[k].audio && moves(S, k));
      if (!still || !mover) continue;
      go(S.id, still); view.cmp = 'pin'; view.pin[S.id] = mover; renderPanel();
      ok(clipOf(S, still) === 'motion' && !!$('playBtn'), `${S.id}/${still}: beside ${mover} in Compare it should offer Play`);
      view.cmp = 'off'; renderPanel(); ok(!$('playBtn'), `${S.id}/${still}: alone it should offer no Play`);
      return;
    }
  });
  tryit('branch counts', () => {
    const S = SECS.find(S => S.keys.some(k => can('branch', S, k))); if (!S) return; const k = S.keys.find(k => can('branch', S, k));
    marks = blank(); for (let i = 0; i < BRANCH_MAX + 2; i++) act('branchMore', S.id, k, 0, true);
    ok(mget(S.id, k).branch === BRANCH_MAX, `+ pressed ${BRANCH_MAX + 2} times gave ×${mget(S.id, k).branch}, not ×${BRANCH_MAX}`); roundTrip('branch ×max');
    act('branchLess', S.id, k, 0, true); ok(mget(S.id, k).branch === BRANCH_MAX - 1, 'Shift+B did not take one off');
    act('branch', S.id, k, 0, true); ok(!mget(S.id, k).branch, `Branch off on a branch ×${BRANCH_MAX - 1} did not take it off in one click`); roundTrip('branch none');
    act('branch', S.id, k, 0, true); ok(mget(S.id, k).branch === 1, 'Branch off did not turn it back on at ×1');
  });
  tryit('auto-restart', () => {
    const ks = []; for (const S of SECS) for (const k of S.keys) if (!S.its[k].audio && !S.its[k].ghost && moves(S, k)) ks.push([S.id, k]);
    if (ks.length < 2) return;
    go(...ks[0]); view.auto = true; simT = 3.3; paused = true; go(...ks[1]); ok(simT === 0 && !paused, `auto-restart on: switching to ${ks[1][1]} left the clock at ${simT}${paused ? ', paused' : ''}`);
    view.auto = false; simT = 3.3; paused = true; go(...ks[0]); ok(simT === 3.3 && paused, 'auto-restart off: switching restarted the clock');
    view.auto = true; press('a'); ok(view.auto === false, 'A did not switch auto-restart off'); press('a'); ok(view.auto === true, 'A did not switch it back on');
    view.auto = false; setPaused(keepPaused);
  });
  if (HAS_AUDIO) tryit('tone variation', () => { for (const v of TONES) { marks = blank(); marks.tone = v; roundTrip(`tone ±${v}`); ok(v ? /\nTone variation ±/.test(lineOf()) : !/Tone variation/.test(lineOf()), `tone ±${v}: the line ${v ? 'lacks' : 'has'} it`); } });
  tryit('complexes', () => {
    // every complex has its lanes (author, 4.11 and 4.11 evening): a line for every part, and every part's sounds on it
    for (const C of CXS) {
      const parts = partsOf(C); if (parts.length < 2) continue;
      ok(!!C.lanes, `complex ${C.path}: no lanes (each part's sounds with their timings on the complex's clock)`);
      if (C.lanes) for (const P of parts) ok(C.lanes[P.id] !== undefined, `complex ${C.path}: ${P.full} has no lane`);
      if (C.lanes) for (const P of parts) ok(!P.keys.some(k => k !== 'now' && P.its[k].audio) || laneOf(C, P).length, `complex ${C.path}: ${P.full} has sounds but an empty lane`);
    }
    for (const p of CX_PATHS) { marks = blank(); marks.cxNote[p] = `a "note" on ${p}`; roundTrip(`complex note ${p}`); ok(lineOf().includes(`\n${p} — complex note `), `the line lacks the note on ${p}`); }
    for (const S of SECS) {
      go(S.id, view.cur[S.id]); const C = complexOf(S);
      ok($('cx').hidden === !(C && C.lanes), `${S.id}: the lanes ${C && C.lanes ? 'are missing' : 'show outside a complex'}`);
      { const w = wasPicks(S); ok(!S.one || w.length <= 1, `${S.id}: ${w.length} takes carry picked, a one-pick tab has one`);
        for (const k of S.keys) if (S.its[k].picked) ok(Number.isInteger(S.its[k].picked.round) && S.its[k].picked.round <= (STUDY.round || 1), `${S.id}/${k}: picked needs { round }, a round up to this one`);
        const tc = $('tabs').querySelector(`.tchip[data-sec="${S.id}"]`); if (w.length && tc && !/\b(was|done)\b/.test(tc.className)) ok(false, `${S.id}: picked earlier, but its tab chip does not show it (${tc.className})`); }
      ok(!!$('tabs').querySelector(`.tchip[data-sec="${S.id}"]`), `${S.id}: no chip among the tabs`);
      if (S.path.length && SECS.filter(T => T.name === S.name).length === 1) { let res; try { res = parseLine(`${STUDY.title} (round ${STUDY.round})\n${S.name} — none`); } catch (e) { res = { warn: [e.message] }; } ok(!res.warn.length, `${S.id}: an old line naming only “${S.name}” did not load: ${res.warn.join(' ')}`); }
    }
    for (const C of CXS) for (const w of C.waiting || []) ok(!!secOf(w.for), `${C.key}: ${w.name} waits for ${w.for}, which is not a tab`);
    ok($('tabs').querySelectorAll('.tchip.wait[data-sec]').length === 0, 'a waiting part can be opened');
    for (const S of SECS) if (S.under !== undefined || STUDY.under) for (const combo of combos) {
      const keep = Object.assign({}, view.ctl); Object.assign(view.ctl, combo);
      tryit(`under ${S.id} ${JSON.stringify(combo)}`, () => { const u = underOf(S); ok(u === null || typeof u === 'string', `${S.id}: under gave ${u}`); });
      Object.assign(view.ctl, keep);
    }
    for (const S of SECS) for (const k of S.keys) { const L = layersOf(S.its[k]); if (!L.length) continue; const ids = L.map(l => l.id); ok(ids.every(x => /^[\w.-]+$/.test(x)) && new Set(ids).size === ids.length && L.every(l => l.name), `${S.id}/${k}: layers need ids of letters, digits, . - _ (no repeats) and a name`); }
    { const S = SECS.find(S => S.keys.some(k => layersOf(S.its[k]).length && !S.its[k].ghost)); if (S) { const k = S.keys.find(k => layersOf(S.its[k]).length && !S.its[k].ghost); go(S.id, k); marks = blank(); const b = document.querySelector('#laybox .lay [data-lrate="7"]'); ok(!!b && !$('laybox').hidden, `${S.id}/${k}: its parts have no rating buttons`); if (b) { b.click(); ok(new RegExp(`\\nparts |; parts |— parts `).test(lineOf()), `${S.id}/${k}: rating a part left no «parts» clause in the line`); roundTrip(`${S.id}/${k} parts`); } marks = blank(); } }
    { const S = SECS.find(S => !complexOf(S) && underOf(S) && S.keys.some(k => S.its[k].audio)); if (S) { go(S.id, view.cur[S.id]); ok(!!$('soloBtn'), `${S.id}: plays over ${underOf(S)}, but has no Solo`); const s0 = !!view.solo; press('s'); ok(view.solo === !s0, `${S.id}: S did not switch Solo`); press('s'); ok(view.solo === s0, `${S.id}: S did not switch Solo back`); } }
    const S = SECS.find(S => complexOf(S)); if (S) { go(S.id, view.cur[S.id]); const s0 = !!view.solo; press('s'); ok(view.solo === !s0, 'S did not switch Solo'); press('s'); ok(view.solo === s0, 'S did not switch Solo back'); }
  });
  tryit('made for', () => {
    const S = SECS.find(S => S.base); if (!S) return;
    const B = secOf(S.base), k = S.keys.find(x => can('pick', S, x)), bk = B.keys.filter(x => can('pick', B, x)); if (!k || bk.length < 2) return;
    marks = blank(); view.cur[B.id] = bk[0]; act('pick', S.id, k, 0, true);
    ok(marks.base[S.id] === bk[0], 'a pick did not remember the take it was made for'); roundTrip('made for');
    act('pick', B.id, bk[1], 0, true); ok(!!checkAgain(S) && /check again\)/.test(lineOf()), 'a changed pick it was made for did not ask to check again'); roundTrip('check again');
  });
  tryit('zoom and the big view', () => {
    setZoom(3, .3, -.2); ok(zoom.z === 3 && Math.abs(zoom.x) <= .5 * (1 - 1 / 3) + 1e-9 && Math.abs(zoom.y) <= .5 * (1 - 1 / 3) + 1e-9, `zoom 3× went out of the picture: ${JSON.stringify(zoom)}`); drawFrame(1.1);
    setZoom(100); ok(zoom.z === ZMAX, `zoom went past ${ZMAX}×`); setZoom(.2); ok(zoom.z === 1 && !zoom.x && !zoom.y, 'zooming out did not come back to 1×');
    press('f'); ok(!$('big').hidden, 'F did not open the big view'); drawFrame(1.3); press('Escape'); ok($('big').hidden, 'Esc did not close the big view');
  });
  tryit('wrong page', () => { let threw = false; try { parseLine('Something else (round 1)\nX — none'); } catch (e) { threw = true; } ok(threw, 'a line for another page was accepted'); });
  if (QUESTIONS.length) tryit('questions stand out', () => { const keep = view.qseen; view.qseen = []; renderControls(); const b = $('qsBtn'); ok(!b.hidden && b.classList.contains('qnew') && /Questions/.test(b.textContent), 'a question not opened yet does not light the Questions button'); openQs(true); ok(!$('qs').hidden && !$('qsNag').hidden && !b.classList.contains('qnew') && qsUnseen().length === 0, 'opening the questions did not mark them opened'); $('qs').hidden = true; view.qseen = keep; saveView(); renderControls(); });
  tryit('undo', () => { const S = SECS[0], ks = S.keys.filter(k => can('drop', S, k)); if (ks.length < 2) return; marks = blank(); undoStack.length = 0; act('rate', S.id, ks[0], 5); act('drop', S.id, ks[1]); undo(); ok(!mget(S.id, ks[1]).drop && mget(S.id, ks[0]).rate === 5, 'undo did not step back one mark'); });
  marks = fixMarks(JSON.parse(keepMarks)); Object.assign(view, JSON.parse(keepView)); firstLook = keepFirst; undoStack.length = 0; simT = keepT; paused = keepPaused;
  store.off = false; strict = false; mute = false; renderAll(); $('hint').textContent = '';
  const text = `SELFTEST checks=${checks} errors=${errs.length} (${Math.round(performance.now() - t0)} ms)\n${errs.join('\n')}`;
  $('selftest').textContent = text; window.__selftest = text; console.log(text);
  return text;
}
window.__runSelftest = runSelftest;
// what a take builds while it draws (5.11): canvases made or resized off the page, and ImageData made; one count per draw
function countBuilds(made) {
  const D = Document.prototype, de = D.createElement, HP = HTMLCanvasElement.prototype, OC = window.OffscreenCanvas, CP = CanvasRenderingContext2D.prototype, cid = CP.createImageData;
  const wd = Object.getOwnPropertyDescriptor(HP, 'width'), hd = Object.getOwnPropertyDescriptor(HP, 'height');
  const set = d => ({ configurable: true, enumerable: d.enumerable, get: d.get, set(v) { if (!this.isConnected && +v !== d.get.call(this)) made.hit = true; d.set.call(this, v); } });
  D.createElement = function (n, ...a) { if (String(n).toLowerCase() === 'canvas') made.hit = true; return de.call(this, n, ...a); };
  Object.defineProperty(HP, 'width', set(wd)); Object.defineProperty(HP, 'height', set(hd));
  if (OC) window.OffscreenCanvas = function (...a) { made.hit = true; return new OC(...a); };
  CP.createImageData = function (...a) { made.hit = true; return cid.apply(this, a); };
  return () => { D.createElement = de; Object.defineProperty(HP, 'width', wd); Object.defineProperty(HP, 'height', hd); if (OC) window.OffscreenCanvas = OC; CP.createImageData = cid; };
}
// a phone's address bar changes the picture's height by up to 56 px as the page scrolls (31.10): a cache keyed by the exact size
// rebuilds on every step of it and freezes the phone. Draw at the shown height, then 1 px lower each draw for 8 draws: a cache
// keyed by buckets of size rebuilds at most once there, an exact-size cache on every draw.
function addressBar(S, k, ok) {
  const cv = $('cvA'), W0 = cv.clientWidth, H0 = cv.clientHeight; if (!W0 || H0 < 120) return;
  const vals = valsFor(S, k), made = { hit: false }, draws = (hs, t) => hs.reduce((n, hh, i) => { made.hit = false; paintTo(cv, S, k, t + i * .05, vals, W0, hh, false, null, false); return n + (made.hit ? 1 : 0); }, 0);
  paintTo(cv, S, k, .4, vals, W0, H0, false, null, false);
  const undo = countBuilds(made);
  let still, moving;
  try { still = draws(Array(8).fill(H0), .45); moving = draws([1, 2, 3, 4, 5, 6, 7, 8].map(d => H0 - d), .85); }
  finally { undo(); }
  ok(moving - still < 4, `${S.id}/${k}: builds a canvas on ${moving} of 8 draws while the height drops 1 px a draw (${still} of 8 at one height): a cache keyed by the exact size rebuilds on every step of a phone's address bar; key it by buckets of size`);
}
// for the checker (5.11): which tabs' sounds play over something, and whether that something goes into X.under (Solo can't reach it
// otherwise). Silent: the sound is started into a gain that reaches no speaker, in a context of its own, and stopped.
async function underCheck() {
  const out = [], keepCtl = Object.assign({}, view.ctl), base = Object.assign({}, view.ctl), keepMute = mute, keepSec = view.sec, keepK = cur();
  mute = true;   // showing each tab plays nothing
  const combos = [base, ...CTL.flatMap(c => c.options.map(o => Object.assign({}, base, { [c.key]: o[0] })))];
  const AN = AudioNode.prototype, conn = AN.connect;
  for (const S of SECS) {
    if (S.under === undefined && !STUDY.under) continue;
    const k = S.keys.find(x => x !== 'now' && typeof S.its[x].audio === 'function') || S.keys.find(x => typeof S.its[x].audio === 'function'); if (!k) continue;
    const combo = combos.find(c => { Object.assign(view.ctl, c); return !!underOf(S); }); if (!combo) { Object.assign(view.ctl, keepCtl); continue; }
    Object.assign(view.ctl, combo);
    go(S.id, k, true); drawFrame(simT);   // shown, as the author would have it (a page may play only the tab on show)
    const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createGain(), ug = ac.createGain(), seen = { under: 0, out: 0 }, name = underOf(S);
    AN.connect = function (d, ...a) { if (d === ug) seen.under++; else if (d === o) seen.out++; return conn.call(this, d, ...a); };
    let stop = null, err = '';
    try {
      const C = complexOf(S);
      stop = S.its[k].audio(ac, o, valsFor(S, k), view.ctl, { parts: C ? partsFor(C, S, k) : null, solo: false, under: ug, underCtx: ac });
      for (let w = 0; w < 25 && !seen.under; w++) await new Promise(r => setTimeout(r, 100));
    } catch (e) { err = String(e && e.message || e); }
    finally { try { if (typeof stop === 'function') stop(); } catch (e) { /* stopped */ } AN.connect = conn; ac.close().catch(() => {}); }
    out.push({ sec: S.id, take: k, under: name, ctl: combo, toUnder: seen.under, toOut: seen.out, err });
  }
  Object.assign(view.ctl, keepCtl); go(keepSec, keepK, true); mute = keepMute; renderPanel(); drawFrame(simT);
  return out;
}
// for the checker's fast pass (5.11): how long the drawing of take k itself takes at full speed, frame by frame over the clip, at
// the shown size, into a canvas of its own drawn on the CPU (so the time includes the painting, not only the calls)
function cost(sid, k) {
  const S = secOf(sid), shown = $('cvA'), w = shown.clientWidth || 360, h = shown.clientHeight || 240, vals = valsFor(S, k);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true }), N = 120, L = (STUDY.selftest && STUDY.selftest.seconds) || 6, ms = [];
  const one = t => { const a = performance.now(); paintTo(cv, S, k, t, vals, w, h, false, null, false); cx.getImageData(0, 0, 1, 1); return performance.now() - a; };
  const first = one(0);
  for (let i = 1; i <= N; i++) ms.push(one(i * L / N));
  ms.sort((a, b) => a - b);
  return { first, med: ms[N >> 1], p95: ms[Math.floor(N * .95)], worst: ms[N - 1] };
}
// for the checker's phone frame run: a fingerprint of what take k draws at a few fixed moments, into a canvas of its own,
// so takes that draw the same picture (a sound page's takes over one look) are timed once
function still(sid, k) {
  const S = secOf(sid), cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true }); let h = 2166136261;
  // text left out: a take's name or timings written over the same picture cost nothing and would split it
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, st = P.strokeText; P.fillText = P.strokeText = () => {};
  try { for (const t of [0.3, 1.1, 2.3, 3.7, 5.9]) {
    paintTo(cv, S, k, t, valsFor(S, k), 240, 150, false, null, false);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ (d[i] | d[i + 1] << 8 | d[i + 2] << 16), 16777619);
  } } finally { P.fillText = ft; P.strokeText = st; }
  return (h >>> 0).toString(36);
}
window.__study = { lineOf, parseLine, applyLine, marks: () => marks, go, takes: () => SECS.map(S => ({ sec: S.id, keys: S.keys.slice() })), still, cost, underCheck, clip: () => ({ kind: clipOf(curS(), cur()), paused, t: simT, sound: audioKey }) };

// ---------------------------------------------------------------- start
renderHead();
firstLook = !seen(curS(), cur()); go(view.sec, cur(), true);
measure(); renderAll();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
setPaused(reduce);
if (reduce) hint('Paused because your system asks for reduced motion. Press ▶ Play (or Space) to animate.', 15000);
requestAnimationFrame(tick);
if (SELF) setTimeout(runSelftest, 200);
})();
