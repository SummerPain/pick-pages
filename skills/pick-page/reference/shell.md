# The page shell

Every pick page is the shared **shell** plus the page's own source. The shell (this skill's `shell/` folder) draws everything common: the header (compact, author's pick 4.11: title and round, icon buttons with tooltips for About, Since your last line, Questions, each control as a small drop-down, the pick line in one line with ▾ Copy Load Undo Clear; on a PC the tabs sit beside it as **cards**, one per complex), the crumbs, the **row of chips** above the panel (▲ the take it grew from, ◀ the takes of this row ▶, ▼ its branch; the shown take's chip always slides in whole), the **where-line** (once the crumbs scroll up out of sight, a slim bar under the header keeps the tab as a list, the take's id and name and its row of chips), the central panel with Compare (Now, Before, Pinned), **zoom** (Ctrl+wheel or pinch at the pointer, drag to look around, double-click 2.5×, + − keys) and the **big view** (F), the take's words as blocks (the caption, Why and Risk side by side, my ★, one line of versions), **complexes** (below) with their lanes and **Solo** (S), **tooltips** (hover, or a long press on a phone), the marks, the branch map and the whole tree, keys and swipes, the clock with its **clip buttons** (▶ Play / ❚❚ Pause or ■ Stop, and ↺ Restart; keys Space and R), **Auto-restart** (on by default, key A: switching to another take or tab starts its sound or motion from the beginning and plays it), **Tone ±** on pages with sounds (each play tuned at random within ±½ to ±4 semitones; it rides in the pick line) and the self-test. A page holds only `STUDY` and its painters. Shell changes are made in the skill folder and reach every page at its next build.

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
  moves: false,                 // optional: every take is a still picture (a take's own `moves` wins); left out, the shell finds out
  selftest: { seconds: 6, step: 0.23, ctl: [{ stage: 'moon' }] },   // optional: sim time per take, step, control settings to test
  sections: [ /* below */ ],
  complexes: [ /* below: how the parts of one thing play together */ ],
  example: () => ({ /* marks */ }),   // only for demo pages: marks the page starts with
};
```

- **Questions**: the first option is my default and is preselected; the author's answers ride in the pick line. Short labels are a few words without commas or brackets.
- **Controls** cover the subject's real variations (stage, grade, crew size, tone mapping…). Their values reach painters as `V.ctl`; the self-test tries every option of every control. A control with `secs: ['font']` shows only on those tabs (a page whose tabs vary different things).

## Sections

```js
{ id: 'intro', name: 'The intro', n: 1, hook: 'how the ships take part',
  one: true,                    // optional, defaults by kind
  brief: 'HTML', briefTitle: '…',   // shown above the panel; an enhance section's problem and its evidence
  start: '6A',                  // optional: the take shown first
  row: ['now', '1', '2'],       // the top row in order; 'now' (the current state) is optional
  its: { now: {}, '1': {}, '4A': {} } }
```

Section fields for complexes (author, 4.11):

- `in: 'The Schism › Gravity sphere'`: the complex the tab is a part of (a path; ` › ` between levels). Tabs of one complex stay next to each other in `sections`; `[ ]` step through every tab in that order. In the line the tab is its whole path: `The Schism › Gravity sphere › Sound — pick 3`.
- `icon`: `look`, `sound`, `mech` or `ui` (the chip's icon; left out, a tab with sounds is `sound`, else `look`).
- `part: 'HTML'`: one line on what this part changes, shown as «You're choosing …» above the lanes.
- `base: 'll'`: the tab this part is made for. Its pick remembers that tab's take; if that tab's pick changes later, the part asks to be **checked again** (a ! on its chip, the line says so).

## Complexes

The parts of one thing in the game (a rocket's launch, flight and hit sounds; a boss's body, each skill's look and sound) each keep their own tab and pick, and each tab shows the whole thing with its part lit (author, 4.11). The other parts play at their pick, or at the take last shown in their tab.

```js
complexes: [{ path: 'Plasma rockets', about: 'how the parts connect', loop: 6,
  lanes: { la: [[0.4, 0.75, 'launch']], fl: [[0.6, 2.9]], hi: [[2.9, 3.6, 'hit']],   // required: per tab, [start, end, label] on the complex's clock
           pod: { Launch: [[0.4, 0.5]], Rings: [[3.1, 3.3]], Spin: [[0.6, 3.4]] } },  // a tab with several sounds: one line per sound
  scene: (ctx, w, h, t, V) => { … V.parts.fl.paint(ctx, w, h, t, V) … },             // the one preview: draws the whole complex
  whole: false,         // true when each take's own sound already plays the whole complex (a page with its own scene player)
  clock: (t, key) => t, // optional: the time the lanes' playhead shows (a page with its own sound clock returns that)
  locked: [{ name: 'Rocket look', note: 'picked on the Plasma rocket page', spans: [[0.4, 3.4]] }],
  waiting: [{ name: 'Sound', in: 'The Schism › Sweeping laser', icon: 'sound', for: 'll', note: '…' }] }]
```

- **Every complex has `lanes` and one preview** (author, 4.11 evening; the self-test fails a complex without them). Grouping tabs with `in` and an About alone is not a complex: the author then sees separate tabs, each with its own picture, and no timings. When a page is rebuilt in a newer shell, its complexes get their lanes and preview then, not later. The preview is one `scene`, or each tab's painter already drawing every part at its take (the other parts at their pick, else the take last shown in their tab: `V.parts`, never a fixed ★); either way it names every part's take over the picture, this tab's lit. Each part's sounds are on the lanes with their real times, one line per sound where a tab plays several (a launch, a spin, a snap).
- `lanes` draw one lane per part (or per sound) under the picture, this part's lit, a playhead across them; a click on a lane opens that part. A complex's sounds start at their lane's first start: ▶ Play on any of its tabs plays them in step, **Solo** (S) only this part.
- `scene` replaces the take's own painter on every tab of the complex. `V.parts` holds each part at its take: `{ sec, key, id, it, vals, paint(ctx, w, h, t, V) }`, this tab's at the shown take; `V.sec` is this tab and `V.solo` is on in Solo (dim the other parts). Without a scene each tab shows its own take, with the lanes under it.
- A part that depends on another adapts when it can: its painter or sound reads `V.parts` (a sound made in code gets a 5th argument `{ parts, solo }`).
- `whole: true` is for pages whose take's sound plays a whole scene (every part's clips on the fight's timetable): the shell then plays the take alone and draws the lanes, the take's sound builds the other parts from `X.parts` and leaves them out when `X.solo` is on, and `clock` keeps the playhead on the page's sound. When it can't be designed before the other is picked, it goes in `waiting` (a dashed chip with ⧗, not a tab) and gets its takes in the next round.
- `locked`: parts picked on another page; they play in the lanes and the scene, and take no marks.
- The skill decides which tabs form a complex (whenever they are parts of one thing in the game) and the About says how they connect. Each complex can get a note («Note on <complex>» in the notes panel; `<path> — complex note "…"` in the line).

## Takes

A take's key is its id without the version: key `'2'` with `v: 3` shows as **2.3**; key `'4B.2D'` is branch D, grown from 4B.2. The ids are explained in [pick-line.md](pick-line.md).

| field | what it is |
|---|---|
| `name` | text, a few words |
| `paint(ctx, w, h, t, p, V)` | draws one frame (below) |
| `cap`, `why` | HTML; the caption names an effect's source first; `why` = what it fixes or adds, then «Risk: …» (the page shows Why and Risk as two blocks; a take may give `risk` on its own); left out with `noxpln` |
| `star: 'HTML reason'` | my recommendation, shown as ★ ("My pick, because …") |
| `v`, `hist: [['2', 'Comet'], …, ['2.3', 'what changed']]`, `prev` | the version count, the version list, the painter of the version before (Compare → Before) |
| `kids: ['4A', '4B']` | the row of branches under this take |
| `fresh` / `changed` | new this round / a new version this round: a dot until the author opens it |
| `from: '2.1 + 5'` | for a combine |
| `ghost: true` | a dropped take kept as the stem of its branches; no painter |
| `last: { rate, note }` | the last line's rating and note, shown faded |
| `params: [{ k, label, min, max, step, def, unit }]`, `fig(p, ctl)` | sliders (labels are words) and HTML live figures (DPS, time to kill, value per cost…) next to Now's figure |
| `audio` | sound pages: a URL or data URI, or `function(actx, out, p, ctl)` that plays into `out` and returns a stop function; the panel shows ▶ Play / ■ Stop and ↺ Restart, and the header a master volume |
| `still` | the time for this take's frame in the whole tree |
| `moves` | `false` for a still picture, `true` for one that moves. Left out, the shell draws the take at a few times and compares the frames (once per take). A still gets no clip buttons, unless Compare puts a moving take beside it |

## Painters

`paint(ctx, w, h, t, p, V)` draws one frame: `w`, `h` in CSS pixels (or `logical`), `t` in seconds (speed already applied), `p` the slider values, `V = { ctl, dpr, base, thumb, sec, take }`. The shell has set the transform and filled the ground.

- Lay out from `w` and `h`, so the frame fits the panel, Compare's half width, a phone and the big view.
- Zoom is a transform set before the painter runs (it is in `V.base`); draw as at 1×.
- Make it a pure function of its arguments: any `t` draws the same frame, so the whole tree, the self-test and Compare agree.
- Start the clip at `t = 0` (a loop's seam, or a one-shot's wind-up): ↺ Restart and R set `t` back to 0 and play. ❚❚ Pause and Space stop the clock. A sound take's buttons play and stop its sound instead, and Restart sets `t` to 0 as the sound starts again.
- Keep `save()` and `restore()` paired; to get the shell's transform back, `ctx.setTransform(V.base)`.
- Clamp every radius and size to ≥ 0 before drawing (a negative radius throws).
- `V.thumb` is true for the whole tree's small frames; skip fine detail there if it costs.
- Keep every frame cheap: a page runs on the author's phone too (31.10.2026, a take froze it again and again).
  - Never read the shown canvas back (`getImageData` on `ctx`). It stalls a phone's GPU every frame. To work on what is drawn, draw it again into a canvas of your own (`getContext('2d', { willReadFrequently: true })`).
  - Build costly things once and cache them by buckets of size, not the exact pixel size. A panel a few pixels taller (a phone's address bar) must not rebuild them.
  - Work done pixel by pixel each frame stays small, or is redone a few times a second at most.
  - The self-test fails a take that reads a shown canvas back. Slow drawing with no bad call (heavy pixel work, too many shapes) only shows when timed: the phone frame check below.

## Checking a page

- **The phone frame check** (the checker's frame-time run, see the profile): each chosen take drawn 3 s at phone size with the CPU 6× slower, the address bar shrunk and given back; a frame over 200 ms or 1 in 20 over 60 ms fails it. It exists because takes froze the author's phone (31.10). The rules above prevent the known causes; this finds drawing that is simply too heavy, which no rule spots (the core page's disc: 145 ms a frame, every rule kept). Run it by what changed (author, 4.11):
  - **no drawing changed** (new sound takes over painters already checked, words, the pick line, marks): skip it;
  - **some painters new or changed** (a new look take, a scene, something drawn over the picture): only those takes, `--takes sec/key,…`;
  - **a new page of new painters**: `--takes all`, which times each different picture once: takes whose drawings match at five moments (text left out, from the shell's `__study.still`) share one timing; `--every` times every take (minutes; one heavy job at a time).
  Say in the hand-over which takes it timed, or why it was skipped.
- `#selftest` in the address, or `window.__runSelftest()` from a script: every take drawn frame by frame in every control setting and every Compare mode, the clip buttons only where something moves or sounds (Space and R tried on each), the whole tree, every mark written to the pick line and read back, 300 random mark sets, Undo. It must say `errors=0`.
- Then look at the page at desktop and phone width (the profile says how on this machine). On a PC (1100 px and wider) the marks and the map sit in a column left of the take; the «<tab> tab · whole page» button opens a panel beside that column (more takes, the tab note, the page note). At phone width: the row of chips scrolls, the marks sit in a 4 × 2 grid, the map opens as a sheet from the Map button.
