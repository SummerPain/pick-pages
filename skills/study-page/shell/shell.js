// ================================================================== study-page shell (the study-page skill; edit it there, never per page)
// The page's own source defines STUDY (and its painters) before this runs; reference/shell.md in the skill describes STUDY.
// Everything here is generic: the header, the pick line and Load, the tree of takes, the row of chips, the panel and Compare,
// the marks, the corner map and the whole tree, keys and swipes, the clock and the self-test.
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

// ---------------------------------------------------------------- the study, checked and indexed
function fail(msg) { document.body.insertAdjacentHTML('afterbegin', `<pre style="color:#f08f9d;padding:16px;white-space:pre-wrap">study page: ${esc(msg)}</pre>`); throw new Error(msg); }
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

// ---------------------------------------------------------------- marks
const MKEY = `${STUDY.id}-marks-r${STUDY.round}`, VKEY = `${STUDY.id}-view`;
const blank = () => ({ m: {}, rows: {}, groups: [], open: null, more: {}, secNote: {}, pageNote: '', vals: {}, ans: {}, gid: 0 });
const fixMarks = x => { const b = Object.assign(blank(), x && typeof x === 'object' ? x : {}); for (const k of ['m', 'rows', 'more', 'secNote', 'vals', 'ans']) if (!b[k] || typeof b[k] !== 'object' || Array.isArray(b[k])) b[k] = {}; if (!Array.isArray(b.groups)) b.groups = []; if (typeof b.pageNote !== 'string') b.pageNote = ''; return b; };
const starting = () => fixMarks(typeof STUDY.example === 'function' ? STUDY.example() : blank());
let marks = fixMarks(store.get(MKEY, null) || starting());
const mk = (sid, k) => (marks.m[sid + '/' + k] = marks.m[sid + '/' + k] || {});
const mget = (sid, k) => marks.m[sid + '/' + k] || {};
const groupOf = (sid, k) => marks.groups.find(g => g.sid === sid && g.keys.includes(k));
function dropRowOf(X, S, k) { let p = S.parent[k]; while (p) { if (X.rows[S.id + '/' + p]) return p; p = S.parent[p]; } return null; }
const inDropRow = (S, k) => dropRowOf(marks, S, k);
// the author's rule: a pick is final. A section with a pick is finished; its other marks (but ratings and notes) are set aside.
const livePicksOf = (X, S) => S.keys.filter(k => X.m[S.id + '/' + k] && X.m[S.id + '/' + k].pick && !dropRowOf(X, S, k));
const finishedOf = (X, S) => livePicksOf(X, S).length > 0;
const finished = S => finishedOf(marks, S);
const dropLive = (S, k) => !finished(S) && (!!mget(S.id, k).drop || !!inDropRow(S, k));
const splitKey = key => { const i = key.indexOf('/'); return [key.slice(0, i), key.slice(i + 1)]; };
function tidy() {
  for (const [key, m] of Object.entries(marks.m)) { for (const f of ['pick', 'req', 'branch', 'drop', 'rate', 'note']) if (!m[f]) delete m[f]; if (!Object.keys(m).length) delete marks.m[key]; }
  for (const k of Object.keys(marks.rows)) if (!marks.rows[k]) delete marks.rows[k];
  marks.groups = marks.groups.filter(g => g.id === marks.open ? g.keys.length > 0 : g.keys.length >= 2);
  if (marks.open && !marks.groups.some(g => g.id === marks.open)) marks.open = null;
  for (const k of Object.keys(marks.more)) if (!marks.more[k]) delete marks.more[k];
  for (const k of Object.keys(marks.secNote)) if (!marks.secNote[k]) delete marks.secNote[k];
  for (const [key, v] of Object.entries(marks.vals)) { const [sid, k] = splitKey(key), S = secOf(sid), it = S && S.its[k]; if (!it || !it.params) { delete marks.vals[key]; continue; } for (const p of it.params) if (v[p.k] === undefined || v[p.k] === p.def) delete v[p.k]; if (!Object.keys(v).length) delete marks.vals[key]; }
  for (const q of QUESTIONS) if (marks.ans[q.id] === q.o[0][0]) delete marks.ans[q.id];
}
const ACTS = ['pick', 'improve', 'branch', 'drop', 'combine', 'retryKeep', 'retryNew', 'dropBranch'];
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
function act(a, sid, k, arg, quiet) {
  const S = secOf(sid);
  if (S.its[k].ghost || (a !== 'rate' && !can(a, S, k))) return;
  if (!quiet) pushUndo();
  const m = mk(sid, k), wasFinished = finished(S);
  switch (a) {
    case 'pick': if (m.pick) m.pick = false; else { if (S.one) for (const kk of S.keys) { const o = marks.m[sid + '/' + kk]; if (o) o.pick = false; } m.pick = true; m.drop = false; } break;
    case 'improve': case 'retryKeep': case 'retryNew': m.req = m.req === a ? null : a; if (m.req) m.drop = false; break;
    case 'branch': m.branch = ((m.branch || 0) + 1) % 4; if (m.branch) m.drop = false; break;
    case 'drop': m.drop = !m.drop; if (m.drop) { m.pick = false; m.req = null; m.branch = 0; leave(sid, k); } break;
    case 'dropBranch': { const p = inDropRow(S, k) || S.parent[k], rk = sid + '/' + p; if (marks.rows[rk]) delete marks.rows[rk]; else marks.rows[rk] = true; break; }
    case 'combine': combine(sid, k); m.drop = false; break;
    case 'rate': m.rate = m.rate === arg ? 0 : arg; break;
  }
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
  if (!finished(S)) out.push(...requestClauses(S, cx));
  for (const k of K) if (!cx.usedV.has(k) && valsText(S, k)) out.push(`set ${id(k)}${valsOnce(S, k, cx)}`);
  const r = K.filter(k => M(k).rate); if (r.length) out.push(`rate ${r.map(k => `${id(k)} ${M(k).rate}`).join(', ')}`);
  for (const k of K) if (M(k).note && !cx.usedN.has(k)) out.push(`note ${id(k)}${noteOnce(S, k, cx)}`);
  if (marks.secNote[S.id]) out.push(`section note ${q(marks.secNote[S.id])}`);
  return out;
}
function answersText() {
  const ch = QUESTIONS.filter(x => marks.ans[x.id] && marks.ans[x.id] !== x.o[0][0]).map(x => { const o = x.o.find(o => o[0] === marks.ans[x.id]); return `${x.id} ${o[0]} (${o[1]})`; });
  return ch.length ? 'defaults except ' + ch.join(', ') : 'all defaults';
}
function lineOf() {
  const L = [`${STUDY.title} (round ${STUDY.round})`];
  for (const S of SECS) { const c = secClauses(S); L.push(`${S.name} — ${c.length ? c.join('; ') : 'none'}`); }
  if (QUESTIONS.length) L.push(`Answers — ${answersText()}`);
  if (marks.pageNote) L.push(`Page note ${q(marks.pageNote)}`);
  return L.join('\n');
}
const countMarks = () => SECS.reduce((n, S) => n + secClauses(S).length, 0) + (marks.pageNote ? 1 : 0) + Object.keys(marks.ans).length;
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
  if ((m = c.match(new RegExp('^branch (\\S+)(?: ×(\\d+))?' + V + N)))) { const k = key(m[1]); if (k) { mm(k).branch = Math.max(1, Math.min(3, +(m[2] || 1))); vals(k, m[3]); note(k, m[4]); } return; }
  if ((m = c.match(new RegExp('^combine (.+?)' + N)))) { const ks = m[1].split(' + ').map(s => key(s.trim())).filter(Boolean); if (ks.length >= 2) X.groups.push({ id: ++X.gid, sid, keys: ks, note: m[2] !== undefined ? unq(m[2]) : '' }); return; }
  if ((m = c.match(/^drop branch under (\S+)(?: \(.*\))?$/))) { const k = key(m[1]); if (k) X.rows[sid + '/' + k] = true; return; }
  if ((m = c.match(/^drop (.+)$/))) { for (const id of m[1].split(', ')) { const k = key(id.trim()); if (k) mm(k).drop = true; } return; }
  if ((m = c.match(/^more takes (\d+)$/))) { X.more[sid] = Math.min(9, +m[1]); return; }
  if ((m = c.match(/^set (\S+) \(([^)]*)\)$/))) { const k = key(m[1]); if (k) vals(k, m[2]); return; }
  if ((m = c.match(/^rate (.+)$/))) { for (const part of m[1].split(', ')) { const pm = part.match(/^(\S+) (\d+)$/), k = pm && key(pm[1]); if (k) mm(k).rate = Math.max(1, Math.min(10, +pm[2])); } return; }
  if ((m = c.match(new RegExp('^note (\\S+) ' + QSRC + '$')))) { const k = key(m[1]); if (k) mm(k).note = unq(m[2]); return; }
  if ((m = c.match(new RegExp('^section note ' + QSRC + '$')))) { X.secNote[sid] = unq(m[1]); return; }
  res.warn.push(`${S.name}: skipped “${c}”.`);
}
function parseLine(text) {
  const res = { marks: blank(), warn: [], title: '', round: 0 };
  const lines = String(text).replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean);
  const hm = lines.length ? lines[0].match(/^(.*?) \(round (\d+)\)$/) : null;
  if (!hm) throw new Error(`The first line should name the study and its round, like “${STUDY.title} (round ${STUDY.round})”.`);
  res.title = hm[1]; res.round = +hm[2];
  if (res.title !== STUDY.title) throw new Error(`That line is for “${res.title}”, not for “${STUDY.title}”.`);
  if (res.round !== STUDY.round) res.warn.push(`It is from round ${res.round}; this page is round ${STUDY.round}.`);
  for (const L of lines.slice(1)) {
    let m = L.match(new RegExp('^Page note ' + QSRC + '$'));
    if (m) { res.marks.pageNote = unq(m[1]); continue; }
    m = L.match(/^Answers — (?:all defaults|defaults except (.+))$/);
    if (m) { for (const part of (m[1] || '').split(', ').filter(Boolean)) { const am = part.match(/^(\S+) (\S+)/), x = am && QUESTIONS.find(x => x.id === am[1]); if (x && x.o.some(o => o[0] === am[2])) res.marks.ans[x.id] = am[2]; else res.warn.push(`Skipped the answer “${part}”.`); } continue; }
    m = L.match(/^(.+?) — (.*)$/);
    if (!m) { res.warn.push(`Skipped “${L}”.`); continue; }
    const S = SECS.find(s => s.name.toLowerCase() === m[1].trim().toLowerCase());
    if (!S) { res.warn.push(`There is no section “${m[1]}” here.`); continue; }
    for (const c of splitClauses(m[2])) clause(S, c, res);
  }
  return res;
}
// what the line carries, as one comparable string: marks inside a dropped branch and requests in a section with a pick don't travel (ratings and notes do)
function norm(X) {
  const flat = s => String(s).replace(/\s*\n\s*/g, ' ');
  const out = { m: {}, rows: [], groups: [], more: {}, secNote: {}, pageNote: flat(X.pageNote || ''), vals: {}, ans: {} };
  for (const S of SECS) {
    const live = k => !dropRowOf(X, S, k), fin = finishedOf(X, S);
    for (const k of S.keys) {
      const m = X.m[S.id + '/' + k], e = {};
      if (m) { if (live(k)) { if (m.pick) e.pick = 1; if (!fin) { if (m.req) e.req = m.req; if (m.branch) e.branch = m.branch; if (m.drop) e.drop = 1; } } if (m.rate) e.rate = m.rate; if (m.note) e.note = flat(m.note); }
      if (Object.keys(e).length) out.m[S.id + '/' + k] = e;
      if (!fin && X.rows[S.id + '/' + k] && live(k)) out.rows.push(S.id + '/' + k);
      const v = X.vals[S.id + '/' + k], vv = {};
      if (v) for (const p of S.its[k].params || []) if (v[p.k] !== undefined && v[p.k] !== p.def) vv[p.k] = num(v[p.k]);
      if (Object.keys(vv).length) out.vals[S.id + '/' + k] = vv;
    }
    if (!fin) for (const g of X.groups) if (g.sid === S.id) { const ks = g.keys.filter(live); if (ks.length >= 2) out.groups.push(`${S.id}:${ks.join('+')}:${flat(g.note || '')}`); }
    if (!fin && X.more[S.id]) out.more[S.id] = X.more[S.id];
    if (X.secNote[S.id]) out.secNote[S.id] = flat(X.secNote[S.id]);
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
const view = Object.assign({ sec: SECS[0].id, cur: {}, last: {}, cmp: 'off', pin: {}, starsHidden: false, speed: 1, seen: [], ctl: {}, vol: .8 }, store.get(VKEY, {}));
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
  if (sid !== view.sec || k !== view.cur[sid]) { firstLook = !seen(S, k); stopAudio(); }
  view.sec = sid; view.cur[sid] = k;
  if (S.parent[k]) view.last[sid + '/' + S.parent[k]] = k;
  if (!seen(S, k)) view.seen.push(sid + '/' + k);
  if (!quiet) { saveView(); renderAll(); }
}
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
function paintTo(cv, S, k, t, vals, w, h, thumb, painter) {
  w = w || cv.clientWidth; h = h || cv.clientHeight; if (!w || !h) return;
  const W = Math.round(w * DPR), H = Math.round(h * DPR); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d'), it = S.its[k];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ground(ctx, w, h);
  if (it.ghost && !painter) { ctx.fillStyle = 'rgba(139,148,167,.8)'; ctx.font = `${thumb ? 11 : 13}px ${FONT}`; ctx.textAlign = 'center'; if (thumb) ctx.fillText('Dropped', w / 2, h / 2); else { ctx.fillText('Dropped in an earlier round,', w / 2, h / 2 - 9); ctx.fillText('kept as the stem of its branches.', w / 2, h / 2 + 11); } return; }
  const fn = painter || it.paint || ((c, W2, H2, tt, pp, V) => soundCard(c, W2, H2, tt, pp, V, it));
  ctx.save();
  let LW = w, LH = h;
  if (STUDY.logical) { LW = STUDY.logical.w; LH = STUDY.logical.h; const s = Math.min(w / LW, h / LH); ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * (w - LW * s) / 2, DPR * (h - LH * s) / 2); ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip(); }
  const V = { ctl: view.ctl, dpr: DPR, base: ctx.getTransform(), thumb: !!thumb, key: S.id + '/' + k, sec: S.id, take: k };
  try { fn(ctx, LW, LH, t, vals, V); }
  catch (e) { if (strict) throw e; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#f08f9d'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('This drawing failed: ' + e.message, 12, 22); if (!paintTo.err) { paintTo.err = 1; console.error(e); } }
  finally { ctx.restore(); }
}
function cmpMode(S, k) { const c = view.cmp, p = view.pin[S.id]; if (c === 'now' && k !== 'now' && S.its.now) return c; if (c === 'before' && S.its[k].prev) return c; if (c === 'pin' && p && p !== k && S.its[p]) return c; return 'off'; }
function drawFrame(t) {
  const S = curS(), k = cur();
  paintTo($('cvA'), S, k, t, valsFor(S, k));
  const c = cmpMode(S, k);
  if (c === 'now') paintTo($('cvB'), S, 'now', t, valsFor(S, 'now'));
  else if (c === 'before') paintTo($('cvB'), S, k, t, valsFor(S, k), 0, 0, false, S.its[k].prev);
  else if (c === 'pin') { const p = view.pin[S.id]; paintTo($('cvB'), S, p, t, valsFor(S, p)); }
}

// ---------------------------------------------------------------- sound: an audio take plays from the panel's Play button, at the header's volume
let audioEl = null, audioKey = null, audioStop = null, actx = null;
function stopAudio() { if (audioEl) { audioEl.pause(); audioEl = null; } if (audioStop) { try { audioStop(); } catch (e) { /* already stopped */ } audioStop = null; } audioKey = null; }
function playTake(S, k) {
  const it = S.its[k]; stopAudio(); if (!it.audio) return;
  audioKey = S.id + '/' + k;
  if (typeof it.audio === 'function') {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const gain = actx.createGain(); gain.gain.value = view.vol; gain.connect(actx.destination); const stop = it.audio(actx, gain, valsFor(S, k), view.ctl); audioStop = () => { if (typeof stop === 'function') stop(); gain.disconnect(); }; } catch (e) { hint('This sound could not play: ' + e.message); audioKey = null; }
  } else {
    audioEl = new Audio(it.audio); audioEl.volume = view.vol;
    audioEl.addEventListener('ended', () => { audioEl = null; audioKey = null; renderPanel(); });
    audioEl.play().catch(e => { hint('This sound could not play: ' + e.message); audioEl = null; audioKey = null; renderPanel(); });
  }
  renderPanel();
}

// ---------------------------------------------------------------- render
const REQ = { improve: 'Improve asked', retryKeep: 'Retry · keep idea asked', retryNew: 'Retry · new idea asked' };
function hint(s, ms) { const h = $('hint'); h.textContent = s; clearTimeout(hint.t); hint.t = setTimeout(() => { h.textContent = ''; }, ms || 6000); }
function renderHead() {
  document.title = STUDY.title;
  $('title').innerHTML = `${esc(STUDY.title)} <small>· round ${STUDY.round}${STUDY.subtitle ? ' · ' + esc(STUDY.subtitle) : ''}</small>`;
  $('about').innerHTML = STUDY.about || '';
  $('aboutFold').hidden = !STUDY.about;
  $('sinceFold').hidden = !STUDY.since;
  if (STUDY.since) { $('since').innerHTML = STUDY.since; $('sinceSum').textContent = `Since your last line (round ${STUDY.round - 1})`; }
  let h = CTL.map(c => `<div class="seg" data-ctl="${esc(c.key)}"><span>${esc(c.label)}</span>${c.options.map(([v, l]) => `<button type="button" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`).join('');
  h += '<div class="seg" id="speedSeg"><span>Speed</span><button type="button" data-v="1">×1</button><button type="button" data-v="0.5">×½</button><button type="button" data-v="0.25">×¼</button></div><button type="button" class="btn" id="pause">Pause</button>';
  if (SECS.some(S => S.keys.some(k => S.its[k].star))) h += '<button type="button" class="btn" id="stars">Hide stars</button>';
  h += '<button type="button" class="btn" id="ovBtn">Whole tree ⤢</button>';
  if (HAS_AUDIO) h += `<label class="vol" for="vol">Volume <input type="range" id="vol" min="0" max="1" step="0.05" value="${view.vol}"></label>`;
  h += '<span class="keys">Keys: arrows move · [ ] sections · P pick · I improve · B branch · C combine · K, N retry · D drop · Shift+D drop branch · 1–0 rate · U undo · O whole tree</span>';
  $('controls').innerHTML = h;
  if (QUESTIONS.length) buildQs();
}
function renderControls() {
  for (const sg of document.querySelectorAll('#controls .seg[data-ctl]')) for (const b of sg.querySelectorAll('button')) b.classList.toggle('on', String(view.ctl[sg.dataset.ctl]) === b.dataset.v);
  for (const b of document.querySelectorAll('#speedSeg button')) b.classList.toggle('on', +b.dataset.v === +view.speed);
  if ($('stars')) $('stars').textContent = view.starsHidden ? 'Show stars' : 'Hide stars';
  if (QUESTIONS.length) { const n = Object.keys(marks.ans).length; $('qsBtn').hidden = false; $('qsBtn').textContent = `Questions (${QUESTIONS.length}) · ${n ? n + ' changed' : 'all defaults'}`; }
}
function renderTabs() {
  $('tabs').innerHTML = SECS.map(S => {
    const picked = livePicksOf(marks, S), n = secClauses(S).length;
    return `<button type="button" role="tab" class="tab${view.sec === S.id ? ' on' : ''}" data-sec="${esc(S.id)}" aria-selected="${view.sec === S.id}">${S.n !== undefined ? esc(S.n) + ' · ' : ''}${esc(S.name)}${S.hook ? ` <span class="dim">(${esc(S.hook)})</span>` : ''}${picked.length ? ` <span class="tk">✓ ${picked.map(k => esc(S.ids[k])).join(', ')} · final</span>` : n ? ` <span class="tn">${n} mark${n === 1 ? '' : 's'}</span>` : ''}</button>`;
  }).join('');
}
let briefFor = null;
function renderWhere() {
  const S = curS(), k = cur(), chain = []; let p = k; while (p) { chain.unshift(p); p = S.parent[p]; }
  $('crumbs').innerHTML = `<span>${esc(S.name)}</span>` + chain.map(c => `<span class="dim">›</span><button type="button" data-go="${esc(c)}" class="${c === k ? 'here' : ''}">${esc(S.ids[c])}</button>`).join('') + `<span class="pos">${posText(S, k)}</span>`;
  const sb = $('sbrief'); sb.hidden = !S.brief;
  if (S.brief && briefFor !== S.id) { briefFor = S.id; $('sbriefSum').textContent = S.briefTitle || `About ${S.name}`; $('sbriefText').innerHTML = S.brief; sb.open = !matchMedia('(max-width: 700px)').matches; }
  // the row of chips: ▲ the take this grew from, ◀ every take of this row ▶, ▼ its branch
  const chip = x => { const m = mget(S.id, x), it = S.its[x], cls = ['chip', x === k ? 'cur' : '', it.ghost ? 'ghost' : '', m.pick && !inDropRow(S, x) ? 'pick' : '', dropLive(S, x) ? 'drop' : ''].filter(Boolean).join(' '); return `<button type="button" class="${cls}" data-go="${esc(x)}" title="${esc(S.ids[x] + ' · ' + it.name)}">${esc(S.ids[x])}${it.star && !view.starsHidden ? '<span class="cs">★</span>' : ''}${(it.fresh || it.changed) && !seen(S, x) ? '<span class="cn"></span>' : ''}</button>`; };
  const rb = $('rowbar'), keep = rb.querySelector('.rbrow') ? rb.querySelector('.rbrow').scrollLeft : 0;
  rb.innerHTML = `<button type="button" class="rb" data-nav="u" aria-label="Up to the take this grew from"><span>▲</span><span class="nid"></span></button><button type="button" class="rb" data-nav="l" aria-label="Previous in this row">◀</button><div class="rbrow">${rowOf(S, k).map(chip).join('')}</div><button type="button" class="rb" data-nav="r" aria-label="Next in this row">▶</button><button type="button" class="rb" data-nav="d" aria-label="Down into its branch"><span>▼</span><span class="nid"></span></button>`;
  const row = rb.querySelector('.rbrow'), c = row.querySelector('.cur'); row.scrollLeft = keep;
  if (c && (c.offsetLeft < row.scrollLeft || c.offsetLeft + c.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = c.offsetLeft - row.clientWidth / 2 + c.offsetWidth / 2;
  for (const b of rb.querySelectorAll('[data-nav]')) { const d = b.dataset.nav, t = navTarget(d), n = b.querySelector('.nid'), more = d === 'd' && t ? S.its[k].kids.length : 0; b.disabled = !t; if (n) n.textContent = t ? S.ids[t] + (more > 1 ? ` · ${more}` : '') : ''; }
}
function renderPanel() {
  const S = curS(), k = cur(), it = S.its[k], m = mget(S.id, k), fin = finished(S), rowDrop = inDropRow(S, k), drop = dropLive(S, k);
  $('stage').classList.toggle('is-pick', !!m.pick && !rowDrop);
  $('stage').classList.toggle('is-drop', drop);
  $('stage').classList.toggle('is-ghost', !!it.ghost);
  const ribs = [], off = t => `<span class="rib off">${t} · set aside</span>`;
  if (it.ghost) ribs.push('<span class="rib off">Dropped · stem of its branches</span>');
  if (m.pick && !rowDrop) ribs.push(`<span class="rib pick">${k === 'now' ? 'Kept as it is' : 'Picked'} · final</span>`);
  if (m.drop) ribs.push(fin ? off('Drop') : '<span class="rib drop">Marked to drop</span>');
  else if (rowDrop) ribs.push(fin ? off('In a dropped branch') : `<span class="rib drop">In the branch under ${esc(S.ids[rowDrop])}, marked to drop</span>`);
  if (!rowDrop) {
    if (m.req) ribs.push(fin ? off(REQ[m.req]) : `<span class="rib req">${REQ[m.req]}</span>`);
    if (m.branch) { const t = `Branch off${m.branch > 1 ? ' ×' + m.branch : ''}`; ribs.push(fin ? off(t) : `<span class="rib req">${t}</span>`); }
    const g = groupOf(S.id, k);
    if (g) { const t = `Combine ${g.keys.map(x => esc(S.ids[x])).join(' + ')}`; ribs.push(fin ? off(t) : `<button type="button" class="rib comb" data-reopen="${g.id}" title="${g.id === marks.open ? 'Open: add takes with Combine' : 'Click to add more to it'}">${t}${g.id === marks.open ? ' · open' : ''}</button>`); }
  }
  if (m.rate) ribs.push(`<span class="rib">Rated ${m.rate}</span>`);
  if (m.note) ribs.push('<span class="rib">Note</span>');
  if ((it.fresh || it.changed) && firstLook) ribs.push(`<span class="rib new">${it.fresh ? 'New' : 'Changed'} this round</span>`);
  const c = cmpMode(S, k), pin = view.pin[S.id];
  const play = it.audio ? `<button type="button" class="btn${audioKey === S.id + '/' + k ? ' on' : ''}" id="playBtn">${audioKey === S.id + '/' + k ? '■ Stop' : '▶ Play'}</button>` : '';
  const seg = `<div class="seg" id="cmpSeg"><span>Compare</span><button type="button" data-cmp="off" class="${c === 'off' ? 'on' : ''}">Off</button>${S.its.now ? `<button type="button" data-cmp="now" class="${c === 'now' ? 'on' : ''}"${k === 'now' ? ' disabled' : ''}>Now</button>` : ''}<button type="button" data-cmp="before" class="${c === 'before' ? 'on' : ''}"${it.prev ? '' : ' disabled'}>Before</button><button type="button" data-cmp="pin" class="${c === 'pin' ? 'on' : ''}"${pin && pin !== k ? '' : ' disabled'}>${pin && pin !== k ? 'Pinned ' + esc(S.ids[pin]) : 'Pinned'}</button></div>`;
  const star = it.star && !view.starsHidden ? '<span class="star" title="My pick">★</span>' : '';
  $('ptitle').innerHTML = `<span class="pid">${esc(S.ids[k])}</span><span class="pname">${esc(it.name)}</span>${star}${ribs.join('')}<span class="ptools">${play}${seg}<button type="button" class="btn" id="pinBtn">${pin === k ? 'Unpin' : 'Pin to compare'}</button></span>`;
  $('vB').hidden = c === 'off';
  $('views').classList.toggle('two', c !== 'off');
  const beforeId = it.hist && it.hist.length > 1 ? it.hist[it.hist.length - 2][0] : 'the last version';
  $('labA').textContent = c === 'off' ? S.ids[k] : `${S.ids[k]} · shown`;
  $('labB').textContent = c === 'now' ? 'Now' : c === 'before' ? `Before · ${beforeId}` : c === 'pin' ? `Pinned · ${S.ids[pin]}` : '';
  const parts = [];
  if (it.cap) parts.push(`<div class="cap">${it.cap}</div>`);
  if (it.from) parts.push(`<div><b>Combined from</b> ${esc(it.from)}</div>`);
  if (it.why) parts.push(`<div><b>Why:</b> ${it.why}</div>`);
  if (it.star && !view.starsHidden) parts.push(`<div class="starwhy"><b>★ My pick</b>, because ${it.star}</div>`);
  if (it.hist) parts.push(`<div class="hist"><b>Versions</b>${it.hist.map(([id, t], i) => `<span class="v${i === it.hist.length - 1 ? ' cur' : ''}"><span class="mono">${esc(id)}</span> ${esc(t)}</span>`).join('<span class="dim">→</span>')}</div>`);
  if (it.last) parts.push(`<div class="last">Last round: ${[it.last.rate ? `rated ${it.last.rate}` : '', it.last.note ? `“${esc(it.last.note)}”` : ''].filter(Boolean).join(', ')}</div>`);
  if (it.params) { const vals = valsFor(S, k); for (const p of it.params) parts.push(`<div class="prm"><label for="prm-${esc(p.k)}">${esc(p.label)}</label><input type="range" id="prm-${esc(p.k)}" data-k="${esc(p.k)}" min="${p.min}" max="${p.max}" step="${p.step}" value="${vals[p.k]}"><span class="pv" id="pv-${esc(p.k)}">${num(vals[p.k])}${p.unit ? ' ' + esc(p.unit) : ''}</span></div>`); }
  if (it.fig) parts.push(`<div class="fig" id="fig">${figHtml(S, k)}</div>`);
  $('ptext').innerHTML = parts.join('');
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
    if (a === 'branch') { L.textContent = on ? `Branch off ×${m.branch}` : 'Branch off'; Sh.textContent = on ? `Branch ×${m.branch}` : 'Branch'; }
    if (a !== 'dropBranch') b.title = L.textContent;
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
  $('secName').textContent = S.name; $('moreN').textContent = marks.more[S.id] || 0;
  if (document.activeElement !== $('secNote')) $('secNote').value = marks.secNote[S.id] || '';
  if (document.activeElement !== $('pageNote')) $('pageNote').value = marks.pageNote || '';
}
function renderLine() {
  const n = countMarks(), t = $('pickText');
  if (!n) { t.textContent = 'No marks yet.'; return; }
  t.innerHTML = lineOf().split('\n').map((L, i) => { if (!i) return `<span class="h">${esc(L)}</span>`; const j = L.indexOf(' — '); return j < 0 ? esc(L) : `<span class="s">${esc(L.slice(0, j))}</span>${esc(L.slice(j))}`; }).join('\n');
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
function combinePaths(S, L, pad, cx) {
  let s = '';
  const off = finished(S) ? ' off' : '';
  for (const g of marks.groups) { if (g.sid !== S.id) continue; for (let i = 1; i < g.keys.length; i++) { const a = L.nodes[g.keys[i - 1]], b = L.nodes[g.keys[i]]; if (!a || !b) continue; const x1 = pad + cx(a), y1 = pad + a.y, x2 = pad + cx(b), y2 = pad + b.y, lift = 12 + Math.min(26, Math.abs(x2 - x1) * .12); s += `<path class="cbk${off}" d="M${x1},${y1}C${x1},${y1 - lift} ${x2},${y2 - lift} ${x2},${y2}"/>`; } }
  return s;
}
function renderMap() {
  const S = curS(), k = cur(), nh = 22, rowH = 48, pad = 12, F = `600 11px ${MONO}`, fin = finished(S);
  const L = treeLayout(S, kk => Math.ceil(textW(S.ids[kk], F)) + 14, 8, rowH), cx = n => n.x + n.w / 2;
  const Wt = Math.ceil(L.W + pad * 2), Ht = L.D * rowH + nh + pad * 2;
  let s = `<svg width="${Wt}" height="${Ht}" viewBox="0 0 ${Wt} ${Ht}"><defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#2b1219"/><rect width="1.6" height="5" fill="#f08f9d" opacity=".55"/></pattern></defs>`;
  s += linkPaths(S, L, pad, nh, cx) + combinePaths(S, L, pad, cx);
  let seenN = 0;
  for (const kk of S.keys) {
    const n = L.nodes[kk], x = pad + n.x, y = pad + n.y, it = S.its[kk], m = mget(S.id, kk), rowDrop = inDropRow(S, kk), drop = dropLive(S, kk), sn = seen(S, kk), asks = !rowDrop && (m.req || m.branch || (m.drop && fin) || groupOf(S.id, kk));
    if (sn) seenN++;
    const cls = ['nd', kk === 'now' ? 'now' : '', it.ghost ? 'ghost' : '', m.pick && !rowDrop ? 'pick' : '', drop ? 'drop' : '', groupOf(S.id, kk) && !rowDrop && !fin ? 'comb' : ''].filter(Boolean).join(' ');
    const status = [it.ghost ? 'dropped, the stem of its branches' : '', m.pick && !rowDrop ? 'picked, final' : '', drop ? 'to drop' : '', asks ? (fin ? 'set aside' : 'change asked') : '', m.rate ? 'rated ' + m.rate : '', it.star && !view.starsHidden ? 'my pick' : ''].filter(Boolean).join(', ');
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
  const n = L.nodes[k], nx = pad + n.x, ny = pad + n.y;
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
    html += `<button type="button" class="oc${it.ghost ? ' ghost' : ''}${m.pick && !inDropRow(S, kk) ? ' pick' : ''}${drop ? ' drop' : ''}${kk === k ? ' cur' : ''}" style="left:${pad + n.x}px;top:${top + n.y}px" data-go="${esc(kk)}" title="${esc(S.ids[kk] + ' · ' + it.name)}"><canvas data-k="${esc(kk)}"></canvas><span class="ol"><b>${esc(S.ids[kk])}</b><span>${esc(it.name)}</span>${it.star && !view.starsHidden ? '<span class="star">★</span>' : ''}${m.rate ? `<span>${m.rate}</span>` : ''}</span></button>`;
  }
  const tree = $('ovTree'); tree.style.width = W + 'px'; tree.style.height = H + 'px'; tree.innerHTML = html;
  $('ovTitle').textContent = `${S.name} · the whole tree`;
  for (const cv of tree.querySelectorAll('canvas')) { const kk = cv.dataset.k; paintTo(cv, S, kk, S.its[kk].still !== undefined ? S.its[kk].still : (STUDY.still !== undefined ? STUDY.still : .8), valsFor(S, kk), cw, chv, true); }
}
function openOverview() { $('overview').hidden = false; renderOverview(); $('ovClose').focus({ preventScroll: true }); }
function closeOverview() { $('overview').hidden = true; }
function renderAll() {
  renderControls(); renderTabs(); renderWhere(); renderPanel(); renderActs(); renderMap(); renderLine();
  if (!$('overview').hidden) renderOverview();
  if (!$('qs').hidden) renderQs();
  drawFrame(simT);
}

// ---------------------------------------------------------------- questions: options with my default chosen; the answers ride in the pick line
function buildQs() {
  $('qs').innerHTML = `<div class="qhead"><div><h2>Questions</h2><div class="dim">My default is chosen on each. Change only what you disagree with; your answers go into the pick line.</div></div><button type="button" class="btn" id="qsClose">Close</button></div>${QUESTIONS.map(x => `<div class="q"><div class="qt"><span class="qn">${esc(x.id)}</span>${esc(x.t || '')}</div>${x.x ? `<div class="qx">${x.x}</div>` : ''}<div class="opts">${x.o.map((o, i) => `<button type="button" class="opt" data-q="${esc(x.id)}" data-o="${esc(o[0])}"><b>${esc(o[0])}</b>${o[2] || esc(o[1])}${i ? '' : '<span class="def">default</span>'}</button>`).join('')}</div></div>`).join('')}`;
}
function renderQs() { for (const b of $('qs').querySelectorAll('[data-q]')) { const x = QUESTIONS.find(x => x.id === b.dataset.q); b.classList.toggle('on', (marks.ans[x.id] || x.o[0][0]) === b.dataset.o); } }

// ---------------------------------------------------------------- the map's popover below 1100 px
const midW = () => matchMedia('(max-width: 1099px)').matches;
function closeSheets() { $('map').classList.remove('open'); }
function toggleMap() { if (midW()) { $('map').classList.toggle('open'); renderMap(); } else openOverview(); }
function measure() { const head = $('head'); $('app').style.setProperty('--headH', (getComputedStyle(head).position === 'sticky' ? head.getBoundingClientRect().height : 0) + 'px'); }

// ---------------------------------------------------------------- events
document.addEventListener('click', e => {
  const t = e.target;
  const nb = t.closest('[data-nav]'); if (nb && !nb.disabled) { nav(nb.dataset.nav); return; }
  const ab = t.closest('[data-act]'); if (ab && !ab.disabled) { act(ab.dataset.act, view.sec, cur()); if (ab.dataset.act === 'combine' && marks.open) $('combNote').focus({ preventScroll: true }); return; }
  const rb = t.closest('[data-rate]'); if (rb && !rb.disabled) { act('rate', view.sec, cur(), +rb.dataset.rate); return; }
  const sb = t.closest('[data-sec]'); if (sb) { go(sb.dataset.sec, view.cur[sb.dataset.sec]); return; }
  const gb = t.closest('[data-go]');
  if (gb) { go(view.sec, gb.dataset.go); if (gb.closest('#overview')) closeOverview(); else if (gb.closest('#map') && midW()) closeSheets(); return; }
  const cb = t.closest('[data-cmp]'); if (cb && !cb.disabled) { view.cmp = cb.dataset.cmp; saveView(); renderPanel(); drawFrame(simT); return; }
  const rr = t.closest('[data-reopen]'); if (rr) { pushUndo(); marks.open = +rr.dataset.reopen; save(); renderAll(); return; }
  const cs = t.closest('#controls .seg[data-ctl] [data-v]'); if (cs) { const key = cs.closest('.seg').dataset.ctl, c = CTL.find(c => c.key === key), o = c.options.find(o => String(o[0]) === cs.dataset.v); if (o) { view.ctl[key] = o[0]; saveView(); renderAll(); } return; }
  const sp = t.closest('#speedSeg [data-v]'); if (sp) { view.speed = +sp.dataset.v; saveView(); renderControls(); return; }
  const qo = t.closest('#qs [data-q]'); if (qo) { pushUndo(); marks.ans[qo.dataset.q] = qo.dataset.o; tidy(); save(); renderQs(); renderControls(); renderLine(); return; }
  switch (t.closest('button') && t.closest('button').id) {
    case 'pinBtn': { const S = curS(), k = cur(); if (view.pin[S.id] === k) delete view.pin[S.id]; else view.pin[S.id] = k; saveView(); renderPanel(); break; }
    case 'playBtn': { const S = curS(), k = cur(); if (audioKey === S.id + '/' + k) { stopAudio(); renderPanel(); } else playTake(S, k); break; }
    case 'combDone': pushUndo(); closeOpen(); tidy(); save(); renderAll(); break;
    case 'combCancel': pushUndo(); cancelOpen(); tidy(); save(); renderAll(); break;
    case 'moreMinus': case 'morePlus': { pushUndo(); const sid = view.sec; marks.more[sid] = Math.max(0, Math.min(5, (marks.more[sid] || 0) + (t.closest('button').id === 'morePlus' ? 1 : -1))); tidy(); save(); renderAll(); break; }
    case 'pause': setPaused(!paused); break;
    case 'stars': view.starsHidden = !view.starsHidden; saveView(); renderAll(); break;
    case 'ovBtn': case 'mExpand': openOverview(); break;
    case 'ovClose': closeOverview(); break;
    case 'fabMap': toggleMap(); break;
    case 'mClose': closeSheets(); break;
    case 'qsBtn': $('qs').hidden = false; renderQs(); $('qsClose').focus({ preventScroll: true }); break;
    case 'qsClose': $('qs').hidden = true; break;
    case 'copy': copyText(lineOf(), $('pickText')); break;
    case 'load': loadLine(); break;
    case 'pasteGo': if (applyLine($('pasteIn').value)) closePaste(); break;
    case 'pasteNo': closePaste(); break;
    case 'undo': undo(); break;
    case 'clear': pushUndo(); marks = blank(); save(); renderAll(); hint('Cleared every mark. Undo brings them back.'); break;
  }
});
document.addEventListener('keydown', e => {
  const g = e.target.closest && e.target.closest('.nd');
  if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(view.sec, g.dataset.go); return; }
  if (e.target.closest && e.target.closest('textarea, input, select')) { if (e.key === 'Escape') e.target.blur(); return; }
  if (e.altKey || e.metaKey) return;
  if (e.ctrlKey) { if (e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } return; }
  if (e.key === 'Escape') { closeOverview(); closeSheets(); closePaste(); $('qs').hidden = true; return; }
  const arrows = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' };
  if (arrows[e.key]) { e.preventDefault(); nav(arrows[e.key]); return; }
  if (e.key === '[' || e.key === ']') { const i = SECS.indexOf(curS()), S = SECS[(i + (e.key === ']' ? 1 : SECS.length - 1)) % SECS.length]; go(S.id, view.cur[S.id]); return; }
  const L = e.key.toLowerCase(), A = { p: 'pick', i: 'improve', b: 'branch', c: 'combine', k: 'retryKeep', n: 'retryNew', d: e.shiftKey ? 'dropBranch' : 'drop' };
  if (A[L]) { e.preventDefault(); act(A[L], view.sec, cur()); return; }
  if (/^[0-9]$/.test(e.key)) { act('rate', view.sec, cur(), e.key === '0' ? 10 : +e.key); return; }
  if (L === 'u') undo(); else if (L === 'o') { if ($('overview').hidden) openOverview(); else closeOverview(); } else if (L === 'm') toggleMap();
});
$('note').addEventListener('focus', () => pushUndo());
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
document.addEventListener('input', e => { if (e.target.id === 'vol') { view.vol = +e.target.value; saveView(); if (audioEl) audioEl.volume = view.vol; } });
let swipe = null;
$('views').addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' && !e.target.closest('button')) swipe = { x: e.clientX, y: e.clientY }; });
$('views').addEventListener('pointerup', e => { if (!swipe) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.8) nav(dx < 0 ? 'r' : 'l'); });
$('views').addEventListener('pointercancel', () => { swipe = null; });
function copyText(text, sel) {
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); hint('The page may not write to the clipboard here: the line is selected, so press Ctrl+C (or long-press → Copy).', 12000); };
  try { navigator.clipboard.writeText(text).then(() => hint('Copied the pick line.'), fallback); } catch (e) { fallback(); }
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
addEventListener('resize', () => { measure(); renderMap(); renderWhere(); });
if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe($('head'));

// ---------------------------------------------------------------- the clock (rAF, with a timer behind it for a hidden pane)
let simT = 0, last = performance.now(), paused = false, raf = 0, backup = 0;
function setPaused(p) { paused = p; if ($('pause')) $('pause').textContent = p ? 'Play' : 'Pause'; }
function tick(now) {
  raf = requestAnimationFrame(tick); clearTimeout(backup); backup = setTimeout(() => { cancelAnimationFrame(raf); tick(performance.now()); }, 150);
  const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
  if (!paused) simT += dt * (+view.speed || 1);
  try { drawFrame(simT); } catch (e) { if (!tick.err) { tick.err = 1; console.error(e); } }
}

// ---------------------------------------------------------------- self-test: every take drawn frame by frame in every control setting; every mark written and read back
function runSelftest() {
  const t0 = performance.now(), errs = [], keepMarks = JSON.stringify(marks), keepView = JSON.stringify(view), keepFirst = firstLook;
  const ST = STUDY.selftest || {}, SECONDS = ST.seconds || 6, STEP = ST.step || .23;
  let checks = 0; store.off = true; strict = true;
  const ok = (c, msg) => { checks++; if (!c && errs.length < 60) errs.push(msg); };
  const tryit = (label, f) => { try { f(); } catch (e) { checks++; if (errs.length < 60) errs.push(`${label}: ${String(e && (e.stack || e.message)).split('\n').slice(0, 2).join(' | ')}`); } };
  const roundTrip = label => { const line = lineOf(); let res = null; try { res = parseLine(line); } catch (e) { ok(false, `${label}: ${e.message}`); return; } ok(norm(res.marks) === norm(marks), `${label}: the line did not load back the same.\n   line ${line.replace(/\n/g, ' ⏎ ')}\n   had  ${norm(marks)}\n   got  ${norm(res.marks)}`); ok(!res.warn.length, `${label}: warnings ${res.warn.join(' ')}`); };
  // control settings: each option of each control once (the others at their defaults), or the study's own list
  const base = Object.assign({}, view.ctl), combos = ST.ctl || (CTL.length ? CTL.flatMap(c => c.options.map(o => Object.assign({}, base, { [c.key]: o[0] }))) : [base]);
  for (const combo of combos) {
    Object.assign(view.ctl, combo);
    for (const S of SECS) {
      for (const k of S.keys) tryit(`show ${S.id}/${k} ${JSON.stringify(combo)}`, () => {
        go(S.id, k);
        for (let t = 0; t < SECONDS; t += STEP) drawFrame(t);
        for (const c of ['now', 'before', 'pin', 'off']) { view.cmp = c; if (c === 'pin') view.pin[S.id] = S.keys.find(x => x !== k) || k; renderPanel(); drawFrame(1.37); }
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
      else if (w === 9) { if (!S.its[k].ghost) { mk(S.id, k).note = NOTES[rnd(NOTES.length)]; tidy(); } }
      else if (w === 10) { const it = S.its[k]; if (it.params) { const p = it.params[rnd(it.params.length)]; (marks.vals[S.id + '/' + k] = marks.vals[S.id + '/' + k] || {})[p.k] = +(p.min + p.step * rnd(Math.round((p.max - p.min) / p.step) + 1)).toFixed(3); tidy(); } }
      else if (w === 11) { marks.more[S.id] = rnd(4); marks.secNote[S.id] = rnd(2) ? NOTES[rnd(NOTES.length)] : ''; tidy(); }
      else if (w === 12) { marks.pageNote = rnd(2) ? NOTES[rnd(NOTES.length)] : ''; const og = marks.groups.find(g => g.id === marks.open); if (og) og.note = NOTES[rnd(NOTES.length)]; }
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
    const sec = lineOf().split('\n').find(L => L.startsWith(S.name + ' — '));
    ok(!/; (improve|drop) /.test(sec) && /^.+ — pick /.test(sec) && / rate /.test(sec), `a picked section should carry only its pick, ratings and notes: ${sec}`);
    act('pick', S.id, ks[2], 0, true); ok(/improve /.test(lineOf()), 'unpicking did not bring the requests back');
    roundTrip('pick sets aside');
  });
  tryit('wrong study', () => { let threw = false; try { parseLine('Something else (round 1)\nX — none'); } catch (e) { threw = true; } ok(threw, 'a line for another study was accepted'); });
  tryit('undo', () => { const S = SECS[0], ks = S.keys.filter(k => can('drop', S, k)); if (ks.length < 2) return; marks = blank(); undoStack.length = 0; act('rate', S.id, ks[0], 5); act('drop', S.id, ks[1]); undo(); ok(!mget(S.id, ks[1]).drop && mget(S.id, ks[0]).rate === 5, 'undo did not step back one mark'); });
  marks = fixMarks(JSON.parse(keepMarks)); Object.assign(view, JSON.parse(keepView)); firstLook = keepFirst; undoStack.length = 0;
  store.off = false; strict = false; renderAll(); $('hint').textContent = '';
  const text = `SELFTEST checks=${checks} errors=${errs.length} (${Math.round(performance.now() - t0)} ms)\n${errs.join('\n')}`;
  $('selftest').textContent = text; window.__selftest = text; console.log(text);
  return text;
}
window.__runSelftest = runSelftest;
window.__study = { lineOf, parseLine, applyLine, marks: () => marks };

// ---------------------------------------------------------------- start
renderHead();
firstLook = !seen(curS(), cur()); go(view.sec, cur(), true);
measure(); renderAll();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
setPaused(reduce);
if (reduce) hint('Paused because your system asks for reduced motion. Press Play to animate.', 15000);
requestAnimationFrame(tick);
if (SELF) setTimeout(runSelftest, 200);
})();
