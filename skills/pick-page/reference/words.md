# Words on a page

The author reads a block's headline, maybe one line more, and doesn't reread (7.11.2026: «I am NOT reading all of this… The best info I could get quickly is the header»). So every block leads with its point, stays short, and holds nothing the author would have to decode. The self-test counts the limits below; the checker's `--words` lists every block over them in a few seconds.

## A headline, then up to three lines

- **The headline is the point, not the topic**: «Waves rarely hurt it; then one kills it», not «Core health».
- **Under it, one fact a line**: what happens, how much, what changes.
- **Nothing more on the page.** What doesn't fit goes in a comment beside the take in `src/`, where the port and the next round read it.

A tab's headline is its name, a take's is its name, a question's is its title. The About, Since your last line and a tab's brief are written as lines, the first one the headline (a brief's shows as its fold's title):

```js
brief: ['Waves rarely hurt it; then one kills it',
        'Each wave’s end heals half the damage; repairs buy the rest.',
        'A 99-wave test: 5 boss waves hurt it, each healed by the next.',
        'Wave 99 took all 700 at once.'],
```

A brief's headline says what the tab is about in the game; the tab's name is on screen already.

## Limits

| Block | At most |
|---|---|
| A headline: a first line, a question's title, a tab's name | 8 words |
| Any sentence | 16 words |
| About | 45 words: the headline and 3 lines |
| A tab's brief | 40 words: the headline and 3 lines |
| Since your last line | 60 words: the headline and 6 lines |
| A caption | 40 words; aim for 20 |
| Why, Risk, the ★ reason | 15 words each |
| A question's explanation · an option · its short label | 20 · 10 · 4 words |
| A complex's about · a part's line · a locked or waiting part's note | 20 · 12 · 15 words |
| A take's name · a version's note | 6 · 8 words |

The limits are ceilings, not targets. Live figures (`fig`) are a small table: the two to four numbers that decide.

## Plain words

- **Say what the author will see or hear**, not how it is made: «a low knock with a short hiss on top», not «0.8–3 kHz noise over a 150 → 120 Hz knock».
- **Numbers that decide**: how much, how often, how long. Round them: 700, half, every 4 s. Times in seconds: 0.4 s, not 400 ms.
- **Today only.** Not how it got here («until 27.10», «since B1», «the old page's»). What changed since the last line goes in Since, once.
- **Don't narrate the picture or the page.** Label the picture instead: a legend on a chart, a name over a part. The shell's tooltips explain its buttons and marks.
- **Don't repeat what is on screen**: the tab's name, its tag («found · breaks it»), the take's name.
- **One name for each thing**, its real one. Compare takes by id: «like 4A, but slower».
- **One idea a sentence.** At most one bracket in a sentence, never one inside another; no chains of «;» asides.

## Never on a page

The self-test fails these. They go in a comment beside the take in `src/`, or where the project's profile says (a round's README for sound measures):

- code: file names, paths, line numbers, class and field names, `<code>`;
- dates, and the page's history;
- sound recipes: Hz, ms, dB, filters, which takes a sound is mixed from.

## Before and after

**A tab's brief**, 212 words → 39.
Before: «Found · breaks it. Until 27.10.2026 the end-of-wave pulse set `Core.Health = Core.MaxHealth`…», then a test log and how to read the charts.
After: the brief above. The code lines and the log go in a comment in `src/`; the chart gets a legend.

**A sound's caption**, 22 words → 9.
Before: «A short band of noise (0.8–3 kHz, a 4 ms start, a 15 ms fade) over a 150 → 120 Hz knock.»
After: «A low knock with a short hiss on top.»

**A boss move's caption**, 172 words → 38.
Before: «Moves. Every 10 s it reaches a tentacle of its field to a turret. The tentacle leaves its rim…»
After: «Every 10 s a tentacle grabs a turret. For 6 s it fires on our nearest building. 500 damage, or a ship flying through, breaks the tentacle. The boss dashes 3.5 cells round the base every 5 s.»

## Before handing over

1. Read only the headlines and the take names: could the author pick?
2. Read one line more: do they know what changes?
3. Would they have to ask what a word means? Change the word.

## Pages from before 7.11.2026

They keep their words until their next round, which rewrites every block to these rules; a picked tab keeps its words, as it keeps everything else. A rebuild that leaves the words as they were (a shell change only) sets `oldWords: true` in STUDY: the self-test then says how many blocks are over (`WORDS old: n`) instead of failing. Never set it in a round that wrote words.
