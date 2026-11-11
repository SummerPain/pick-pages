# The page shell

Every pick page is the shared **shell** plus the page's own source. The shell (this skill's `shell/` folder) draws everything common: the header (compact, author's pick 4.11: title and round, icon buttons with tooltips for About, Since your last line, Questions, each control as a small drop-down, the pick line in one line with ▾ Copy Load Undo Clear; on a PC the tabs sit beside it as **cards**, one per complex), the crumbs, the **row of chips** above the panel (▲ the take it grew from, ◀ the takes of this row ▶, ▼ its branch; the shown take's chip always slides in whole), the **where-line** (once the crumbs scroll up out of sight, a slim bar under the header keeps the tab as a list, the take's id and name and its row of chips), the central panel with Compare (Now, Before, Pinned), **zoom** (Ctrl+wheel or pinch at the pointer, drag to look around, double-click 2.5×, + − keys) and the **big view** (F), the take's words as blocks (the caption, Why and Risk side by side, my ★, one line of versions), **complexes** (below) with their lanes and **Solo** (S), **tooltips** (hover, or a long press on a phone), the marks, the branch map and the whole tree, keys and swipes, the clock with its **clip buttons** (▶ Play / ❚❚ Pause or ■ Stop, and ↺ Restart; keys Space and R), **Auto-restart** (on by default, key A: switching to another take or tab starts its sound or motion from the beginning and plays it), **Loop** (on by default, key L, author 6.11: the shown take plays to its end and starts again, its picture from t = 0 and its sound with it, until ■ Stop; [below](#loop)), **Tone ±** on pages with sounds (each play tuned at random within ±½ to ±4 semitones; it rides in the pick line) and the self-test. A page holds only `STUDY` and its painters. Shell changes are made in the skill folder and reach every page at its next build.

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
  about: ['headline', '…'],     // lines (words.md): what the subject does, how often, what sits next to it; the first line is the headline
  since: ['headline', '…'],     // lines, from round 2 on: what changed, counted, in the headline; then what isn't on a take's version line
  oldWords: true,               // only on a rebuild that keeps words from before 7.11.2026 (words.md): the self-test tells, not fails
  controls: [{ key: 'stage', label: 'Stage', options: [['asteroid', 'I Asteroid'], ['moon', 'III Moon']], def: 'asteroid' }],
  questions: [{ id: 'Q1', t: 'Title', x: 'HTML explanation', o: [['a', 'short', 'HTML option text'], ['b', 'short', '…']] }],
  logical: { w: 640, h: 360 },  // optional: painters draw at this fixed size, scaled to fit (painters copied from older pages)
  ground: '#07080c',            // optional: canvas background, a colour or function(ctx, w, h); the default is a dark radial
  still: 0.8,                   // optional: the time drawn for each frame of the whole tree (a take's own `still` wins)
  moves: false,                 // optional: every take is a still picture (a take's own `moves` wins); left out, the shell finds out
  len: 3.2,                     // optional: every clip's length for Loop, in s (a take's, its complex's `loop` and its tab's `len` win)
  selftest: { seconds: 6, step: 0.23, ctl: [{ stage: 'moon' }] },   // optional: sim time per take, step, control settings to test
  sections: [ /* below */ ],
  complexes: [ /* below: how the parts of one thing play together */ ],
  example: () => ({ /* marks */ }),   // only for demo pages: marks the page starts with
};
```

- **Questions**: the first option is my default and is preselected; the author's answers ride in the pick line. They must never be missed (author, 6.11): the header's amber **Questions N** button (it opens the panel and, clicked again, closes it) is lit and pulses until the author opens them (remembered per page by id and words, so a new question lights it again), and Copy with a question still unopened copies, then opens them with a reminder; the panel has its own Copy. Short labels are a few words without commas or brackets.
- **Controls** cover the subject's real variations (stage, grade, crew size, tone mapping…). Their values reach painters as `V.ctl`; the self-test tries every option of every control. A control with `secs: ['font']` shows only on those tabs (a page whose tabs vary different things).

## Sections

```js
{ id: 'intro', name: 'The intro', n: 1, hook: 'how the ships take part',
  one: true,                    // optional, defaults by kind
  brief: ['headline', 'line', 'line', 'line'],   // above the panel (words.md): the headline is the fold's title, the lines under it;
                                // an enhance section's problem and its evidence. Older pages: HTML, with `briefTitle` for the fold
  start: '6A',                  // optional: the take shown first
  len: 2.4,                     // optional: this tab's clips' length for Loop, in s (a take's own `len` wins)
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
complexes: [{ path: 'Plasma rockets', about: 'how the parts connect', loop: 6,   // the complex's clock: the lanes' axis, and Loop's length on all its tabs
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
- A part that depends on another adapts when it can: its painter or sound reads `V.parts` (a sound made in code gets a 5th argument `{ parts, solo, under, underCtx }`).
- `whole: true` is for pages whose take's sound plays a whole scene (every part's clips on the fight's timetable): the shell then plays the take alone and draws the lanes, the take's sound builds the other parts from `X.parts` and leaves them out when `X.solo` is on, and `clock` keeps the playhead on the page's sound. When it can't be designed before the other is picked, it goes in `waiting` (a dashed chip with ⧗, not a tab) and gets its takes in the next round.
- `locked`: parts picked on another page; they play in the lanes and the scene, and take no marks.
- The skill decides which tabs form a complex (whenever they are parts of one thing in the game) and the About says how they connect. Each complex can get a note («Note on <complex>» in the notes panel; `<path> — complex note "…"` in the line).

## A sound's background

When a tab's sounds play over something (the fight, the wave music, a room, a hum), the author must be able to hear the sound alone (author, 5.11.2026: Solo did nothing on such pages). So:

- The tab names its background in `under`: a string, or `ctl => string | null` when a control picks it (`null`: nothing under it with these controls). `STUDY.under` gives every tab the same. The name is what the hint and the Solo tip say ("without the fight").
- Its sound sends the background into `X.under` (the 5th argument), never into `out`, and the take's own sounds into `out`. Make the background's sources from `X.underCtx`: the take's context without Tone ±, counted with the take's own sources, so the sound lasts as long as its background. Start it whatever Solo is: the shell keeps `X.under` silent in Solo and silences or restores it at once when S is pressed mid-play, then restarts the take with `X.solo` set. A background baked into one mix with the take goes into `X.under` whole, and in Solo (`X.solo`) the take plays its own clips instead.
- Solo shows on such a tab even outside a complex. In a complex it also leaves the other parts out, as before.
- Lanes: a part's line for its background is the key of its lanes object named exactly as `under` gives it (`{ 'the fight': [[0, 6, '']], Launch: … }`); in Solo it dims with the other parts. A painter that draws the background's line itself dims it when `V.solo` is on.
- The checker (desktop run) starts each such tab's first take silently, with a control setting that has a background, and fails it when nothing reaches `X.under` in 2.5 s.

## Takes

A take's key is its id without the version: key `'2'` with `v: 3` shows as **2.3**; key `'4B.2D'` is branch D, grown from 4B.2. The ids are explained in [pick-line.md](pick-line.md).

| field | what it is |
|---|---|
| `name` | text, a few words (6 at most) |
| `paint(ctx, w, h, t, p, V)` | draws one frame (below) |
| `cap`, `why` | HTML within [words.md](words.md)'s limits; the caption names an effect's source first; `why` = what it fixes or adds, then «Risk: …» (the page shows Why and Risk as two blocks; a take may give `risk` on its own); left out with `noxpln` |
| `star: 'HTML reason'` | my recommendation, shown as ★ ("My pick, because …") |
| `v`, `hist: [['2', 'Comet'], …, ['2.3', 'what changed']]`, `prev` | the version count, the version list, the painter of the version before (Compare → Before) |
| `kids: ['4A', '4B']` | the row of branches under this take |
| `fresh` / `changed` | new this round / a new version this round: a dot until the author opens it |
| `from: '2.1 + 5'` | for a combine |
| `ghost: true` | a dropped take kept as the stem of its branches; no painter |
| `last: { rate, note, layers }` | the last line's rating and note, shown faded; `layers: { id: { rate, note } }` its parts' |
| `layers: [{ id, name }]` | the parts of a compound sound (author, 5.11): one take, several parts in one (a wind-up, a slash, a tail). Each part gets its own row under the take's note: a tiny name over a 1–10 strip on the left, its note level with it on the right (author, 6.11); a key 1–0 over a part's row rates that part; the line writes `parts 3 · main 8, slash 4 "…"`. Ids: letters, digits, `.` `-` `_`; a page names the parts as its clips do |
| `picked: { round }` | picked in that round: the tab stays as it was, marked green («Picked in round N», tab chip ✓); [pick-line.md](pick-line.md#a-picked-tab-in-later-rounds) |
| `params: [{ k, label, min, max, step, def, unit }]`, `fig(p, ctl)` | sliders (labels are words) and HTML live figures (DPS, time to kill, value per cost…) next to Now's figure |
| `audio` | sound pages: a URL or data URI, or `function(actx, out, p, ctl, X)` that plays into `out` and returns a stop function; the panel shows ▶ Play / ■ Stop and ↺ Restart, and the header a master volume. `X = { parts, solo, under, underCtx }`: the complex's parts at their takes, Solo, and the output and context for the sound's background ([below](#a-sounds-background)). Tone variation (author, 5.11) gives every source the take starts its own random pitch, sources starting within 25 ms of each other sharing one (a sound's layers, a synth's partials); a sound built of notes in sequence keeps its intervals only as one buffer |
| `still` | the time for this take's frame in the whole tree |
| `len` | the clip's length in seconds (or `(ctl, p) => s`): where Loop starts it again. Give it to a one-shot that plays over motion that never stops (a burst over twinkling stars, a hit beside an idling ship), and to any take whose loop should not wait for its sound to end ([Loop](#loop)) |
| `moves` | `false` for a still picture, `true` for one that moves. Left out, the shell draws the take at a few times and compares the frames (once per take). A still gets no clip buttons, unless Compare puts a moving take beside it |

## Loop

The author, 6.11.2026: «some animations are looped, others are not, and the sound doesn't play while the animation does, so everything feels random». **Loop** (header button, key L, on by default) plays the shown take as one clip: from t = 0 with its sound, to its end, then again, until ■ Stop or another take. ▶ Play on a sound starts its picture from 0 with it, and ■ Stop stops both (Loop on or off). The clip's length is, first found:

1. the take's `len`, then its complex's `loop` (left out: the lanes' last end and a breath), its tab's `len`, `STUDY.len`;
2. a sound: a breath (0.8 s) after it stops sounding, or after its picture's motion ends if that is later;
3. a motion: the shell draws it ahead (every 0.1 s over 12 s, in idle time, at the shown size into a canvas of its own) and takes the last moment it changes more than the motion still left at the end (twinkling stars, an idle bob), plus a breath. Motion that goes on to the end (a spinner, a look that repeats itself) is left be.

A play still sounding when the next starts fades out in about 0.2 s (its background at once), so the next play opens at its own level and none of the last play's late hits sound in it (11.11; it used to ring on at full volume for 1.5 s). Beside the clip buttons the panel says what Loop does with the take («4.0 s», «at its end», «by itself»). A page whose painters loop on their own clock (`t % loop`) and a complex whose `loop` matches stay in step; a one-shot over endless motion needs `len`, since nothing ends there to be found.

## Painters

`paint(ctx, w, h, t, p, V)` draws one frame: `w`, `h` in CSS pixels (or `logical`), `t` in seconds (speed already applied), `p` the slider values, `V = { ctl, dpr, base, thumb, sec, take }`. The shell has set the transform and filled the ground.

- Lay out from `w` and `h`, so the frame fits the panel, Compare's half width, a phone and the big view.
- Zoom is a transform set before the painter runs (it is in `V.base`); draw as at 1×.
- Make it a pure function of its arguments: any `t` draws the same frame, so the whole tree, the self-test and Compare agree.
- Start the clip at `t = 0` (a loop's seam, or a one-shot's wind-up): ↺ Restart and R set `t` back to 0 and play. A one-shot holds its last frame after its end, and Loop starts it again from 0 ([Loop](#loop): give it `len` when something else on it moves forever). ❚❚ Pause and Space stop the clock. A sound take's buttons play and stop its sound instead, and Restart sets `t` to 0 as the sound starts again.
- Keep `save()` and `restore()` paired; to get the shell's transform back, `ctx.setTransform(V.base)`.
- Clamp every radius and size to ≥ 0 before drawing (a negative radius throws).
- `V.thumb` is true for the whole tree's small frames; skip fine detail there if it costs.
- Keep every frame cheap: a page runs on the author's phone too (31.10.2026, a take froze it again and again).
  - Never read the shown canvas back (`getImageData` on `ctx`). It stalls a phone's GPU every frame. To work on what is drawn, draw it again into a canvas of your own (`getContext('2d', { willReadFrequently: true })`).
  - Build costly things once and cache them by buckets of size, not the exact pixel size. A panel a few pixels taller (a phone's address bar) must not rebuild them.
  - Work done pixel by pixel each frame stays small, or is redone a few times a second at most.
  - The self-test fails a take that reads a shown canvas back, and one that builds a canvas on most draws while the height drops 1 px a draw (a cache keyed by the exact size: a phone's address bar rebuilds it on every step). Slow drawing with no bad call (heavy pixel work, too many shapes) only shows when timed: the phone frame check below.

## Checking a page

- **The checker** is this skill's `checker/` (6.11.2026; setup once per PC and every option in its `README.md`): `powershell -NoProfile -File <skill>\checker\check.ps1 <page.html> [--mobile] [--takes …]`. It opens the page in headless, muted Edge and drives the checks the shell carries: the scripts compile, no console errors, the self-test, no sideways scroll, the background check, screenshots, the phone frame check. A project's profile may add how this PC runs it (a lock for heavy jobs, where Node is).
- **A sound's background**: the desktop run of the checker starts each tab with `under` silently (into a gain that reaches no speaker) and fails it when its background does not go into `X.under` ([above](#a-sounds-background)).
- **The phone frame check** (the checker's frame-time run). It exists because takes froze the author's phone (31.10). The rules above, enforced by the self-test, prevent the known causes; this finds drawing that is simply too heavy, which no rule spots (the core page's disc: 145 ms a frame, every rule kept). Three steps (5.11): a **fast pass** times each take's drawing itself at full speed, at phone size, and clears it when ×6 it stays under half the budget; takes that **draw the same picture** share one run; the rest get the **slow run**, three browsers at a time (`--jobs`): each drawn 3 s with the CPU 6× slower, the address bar shrunk and given back, failing on a frame over 200 ms or 1 in 20 over 60 ms. Both budgets stretch with how busy the PC is while it times (6.11: ×1.6 at 40 % busy, at most ×2.5; the checker prints the load and the budgets it used). Running together only slows frames, so a fail is timed again alone before it counts. `--every` skips the fast pass and the sharing. Run it by what changed (author, 4.11):
  - **no drawing changed** (new sound takes over painters already checked, words, the pick line, marks): skip it;
  - **some painters new or changed** (a new look take, a scene, something drawn over the picture): only those takes, `--takes sec/key,…`;
  - **a new page of new painters**: `--takes all` (a 128-take page: about 2 minutes, most of it the screenshots).
  Say in the hand-over which takes it timed, or why it was skipped.
- `#selftest` in the address, or `window.__runSelftest()` from a script: every take drawn frame by frame in every control setting and every Compare mode, the clip buttons only where something moves or sounds (Space and R tried on each), Loop (L, a clip starting again at its length, a sound with its picture, ■ Stop ending it, how an end is found), the whole tree, every mark written to the pick line and read back, 300 random mark sets, Undo, and the words: every block within the limits of [words.md](words.md), with no code, dates or sound recipes in it (a tab whose take is `picked` keeps its words and is skipped). It must say `errors=0`.
- **The words alone**: the checker's `--words` lists every block over the limits in a few seconds, without the rest (`window.__study.words()` from a script). Use it while writing or rewriting a page's words.
- Then look at the page at desktop and phone width (the checker's screenshots, or a browser). On a PC (1100 px and wider) the marks and the map sit in a column left of the take; the «<tab> tab · whole page» button opens a panel beside that column (more takes, the tab note, the page note). At phone width: the row of chips scrolls, the marks sit in a 4 × 2 grid, the map opens as a sheet from the Map button.

### Publishing

- Sound: decode embedded clips with `atob` → `Uint8Array` → `decodeAudioData`. Never `fetch()` a `data:` URI: the claude.ai viewer blocks it (`connect-src 'self'`) and the page plays nothing, with no error. Show a visible message when a clip fails to load. Before publishing a sound page, serve it once with that policy and confirm, against a muted or fake audio context, that clips decode and that `AudioBufferSourceNode.start` fires on Play.
- Make every edit in the file first, then publish the file as it is. A publish that carries edits is refused when a file-edit hook is set.
- If a publish is refused because a newer or unviewed version is live, Read the saved live copy, bring in anything that isn't yours, then publish. Don't resend the same content; it is refused again.
- After a check that takes a list (`--takes a,b,c`), read its `N of N` line before saying what was covered.
