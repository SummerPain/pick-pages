# The page shell

Every study page is the shared **shell** plus the page's own source. The shell (this skill's `shell/` folder) draws everything common: the header (title, round, About, Since your last line, Questions, the controls, the pick line with Copy, Load, Undo and Clear), the section tabs, the crumbs, the **row of chips** above the panel (▲ the take it grew from, ◀ the takes of this row ▶, ▼ its branch), the central panel with Compare (Now, Before, Pinned), the marks, the branch map and the whole tree, keys and swipes, the clock and the self-test. A page holds only `STUDY` and its painters. Shell changes are made in the skill folder and reach every page at its next build.

## Files and build

- Page source lives next to the page, in `src/`: `study.js`, plus painter files copied from earlier pages (each names its source at the top).
- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>\shell\build.ps1" -Title "<title>" -Out <page>.html -Src "src\study.js,src\painters.js"`
- Elsewhere: `sh "<skill>/shell/build.sh" "<title>" <page>.html src/study.js src/painters.js`
- `<skill>` is this skill's folder. The output is one self-contained HTML file; rebuild after every change to the source or the shell.
- The source files and the shell share one script: write `<\/script>` inside strings, and keep names that might clash with another source file inside your own functions.
- `shell/example/study.js` (built as `example.html`) uses every part of the format. Start a new page from a copy of it.

## STUDY

```js
const STUDY = {
  id: 'stage-intro-look',      // storage key, the same in every round
  title: 'Stage intro',         // the page's name and the first words of its pick line
  round: 3,
  kind: 'look',                 // 'look': one pick per section · 'enhance' / 'expand': any number
  subtitle: '…',                // optional, after the round in the header
  about: '<p>…</p>',            // HTML: the brief (what the subject does, how often, what sits next to it) and anything about the page
  since: '<p>…</p>',            // HTML, from round 2 on: what the last line asked and what changed for each mark
  controls: [{ key: 'stage', label: 'Stage', options: [['asteroid', 'I Asteroid'], ['moon', 'III Moon']], def: 'asteroid' }],
  questions: [{ id: 'Q1', t: 'Title', x: 'HTML explanation', o: [['a', 'short', 'HTML option text'], ['b', 'short', '…']] }],
  logical: { w: 640, h: 360 },  // optional: painters draw at this fixed size, scaled to fit (painters copied from older pages)
  ground: '#07080c',            // optional: canvas background, a colour or function(ctx, w, h); the default is a dark radial
  still: 0.8,                   // optional: the time drawn for each frame of the whole tree (a take's own `still` wins)
  selftest: { seconds: 6, step: 0.23, ctl: [{ stage: 'moon' }] },   // optional: sim time per take, step, control settings to test
  sections: [ /* below */ ],
  example: () => ({ /* marks */ }),   // only for demo pages: marks the page starts with
};
```

- **Questions**: the first option is my default and is preselected; the author's answers ride in the pick line. Short labels are a few words without commas or brackets.
- **Controls** cover the subject's real variations (stage, grade, crew size, tone mapping…). Their values reach painters as `V.ctl`; the self-test tries every option of every control.

## Sections

```js
{ id: 'intro', name: 'The intro', n: 1, hook: 'how the ships take part',
  one: true,                    // optional, defaults by kind
  brief: 'HTML', briefTitle: '…',   // shown above the panel; an enhance section's problem and its evidence
  start: '6A',                  // optional: the take shown first
  row: ['now', '1', '2'],       // the top row in order; 'now' (the current state) is optional
  its: { now: {}, '1': {}, '4A': {} } }
```

## Takes

A take's key is its id without the version: key `'2'` with `v: 3` shows as **2.3**; key `'4B.2D'` is branch D, grown from 4B.2. The ids are explained in [pick-line.md](pick-line.md).

| field | what it is |
|---|---|
| `name` | text, a few words |
| `paint(ctx, w, h, t, p, V)` | draws one frame (below) |
| `cap`, `why` | HTML; the caption names an effect's source first; `why` = what it fixes or adds and its risk (left out with `noxpln`) |
| `star: 'HTML reason'` | my recommendation, shown as ★ ("My pick, because …") |
| `v`, `hist: [['2', 'Comet'], …, ['2.3', 'what changed']]`, `prev` | the version count, the version list, the painter of the version before (Compare → Before) |
| `kids: ['4A', '4B']` | the row of branches under this take |
| `fresh` / `changed` | new this round / a new version this round: a dot until the author opens it |
| `from: '2.1 + 5'` | for a combine |
| `ghost: true` | a dropped take kept as the stem of its branches; no painter |
| `last: { rate, note }` | the last line's rating and note, shown faded |
| `params: [{ k, label, min, max, step, def, unit }]`, `fig(p, ctl)` | sliders (labels are words) and HTML live figures (DPS, time to kill, value per cost…) next to Now's figure |
| `audio` | sound studies: a URL or data URI, or `function(actx, out, p, ctl)` that plays into `out` and returns a stop function; the panel shows ▶ Play and the header a master volume |
| `still` | the time for this take's frame in the whole tree |

## Painters

`paint(ctx, w, h, t, p, V)` draws one frame: `w`, `h` in CSS pixels (or `logical`), `t` in seconds (speed already applied), `p` the slider values, `V = { ctl, dpr, base, thumb, sec, take }`. The shell has set the transform and filled the ground.

- Lay out from `w` and `h`, so the frame fits the panel, Compare's half width and a phone.
- Make it a pure function of its arguments: any `t` draws the same frame, so the whole tree, the self-test and Compare agree.
- Keep `save()` and `restore()` paired; to get the shell's transform back, `ctx.setTransform(V.base)`.
- Clamp every radius and size to ≥ 0 before drawing (a negative radius throws).
- `V.thumb` is true for the whole tree's small frames; skip fine detail there if it costs.
- Keep every frame cheap: a page runs on the author's phone too (31.10.2026, a take froze it again and again).
  - Never read the shown canvas back (`getImageData` on `ctx`). It stalls a phone's GPU every frame. To work on what is drawn, draw it again into a canvas of your own (`getContext('2d', { willReadFrequently: true })`).
  - Build costly things once and cache them by buckets of size, not the exact pixel size. A panel a few pixels taller (a phone's address bar) must not rebuild them.
  - Work done pixel by pixel each frame stays small, or is redone a few times a second at most.
  - The checker's frame-time run (profile) fails a take that breaks this.

## Checking a page

- `#selftest` in the address, or `window.__runSelftest()` from a script: every take drawn frame by frame in every control setting and every Compare mode, the whole tree, every mark written to the pick line and read back, 300 random mark sets, Undo. It must say `errors=0`.
- Then look at the page at desktop and phone width (the profile says how on this machine). On a PC (1100 px and wider) the marks and the map sit in a column left of the take; the «<tab> tab · whole study» button opens a panel beside that column (more takes, the tab note, the study note). At phone width: the row of chips scrolls, the marks sit in a 4 × 2 grid, the map opens as a sheet from the Map button.
