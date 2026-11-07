# The pick line, and the next round

## The line

The page writes it, the author sends it, Load reads it back. One line per section, then the answers and the page note:

```
Spinner look (round 4)
Shape — pick 4B.2D · Twin split "keep the offset"; rate 1 6, 2.3 8; note 4A "too slow at ×½"
Timing — improve 1 (turn 1.4 s) "a softer start"; retry keep 3; retry new 5; branch 2 ×2 "one slower"; combine 1 + 3 "1's ease, 3's two speeds"; drop 4, 6; drop branch under 2 (2A, 2B); more takes 2; set 3 (idle 0.4 turns/s); rate 3 4; tab note "…"
Answers — defaults except Q2 b (percent)
Tone variation ±2 semitones
Page note "…"
```

- A section reads `<section> — <clauses>`, or `— none`. Clauses are split by `;`; notes are in double quotes, `\"` inside.
- `pick X · Name` picks a take; `keep Now` picks Now (look pages: leave it as it is).
- `(…)` after an id holds slider values the author changed; a take's note rides with its first clause.
- A tab inside a complex is named by its whole path: `The Schism › Gravity sphere › Sound — pick 3 · Hum`. Lines naming the tab alone (before 4.11) still load.
- `<complex> — complex note "…"` is a note on a whole complex (`The Schism — complex note "…"`).
- `made for Spinner › Timing 1` follows the pick of a part made for another tab (`base`): the take that tab was at. `(Timing is 2 now: check again)` means that tab's pick changed since: re-time or remake the part in the next round.
- `parts 3 · main 8, slash 4 "too sharp"` rates and notes the parts of a compound sound one by one (author, 5.11): each part by its id (the take's `layers`), its rating, its note, or both.
- `tab note` is a note on the whole tab (all its takes); `Page note` is on the whole page. Older lines say `Study note` (31.10 to 3.11) or `section note` (before 31.10); they still load.
- `branch X ×n` asks for n new takes under X (×1 to ×9: Branch off turns it on at ×1 and off in one click; + beside it and B add one, Shift+B takes one off).
- `Tone variation ±n semitones` (pages with sounds; ½, 1, 2 or 4): the author listened with every sound tuned at random within ±n, each shot and each hit its own (5.11; before, one tone held for a whole play), as games vary a sound. In a port, the picked sounds get that random pitch on every play; without the line, they play at their own pitch.
- Ids are the shown ids. An old id (2.1 after 2.3 exists) still finds its take; Load says so.

## Ids

- **Numbers** are takes on the top row: 1, 2, 3 … A number is never used twice, so 3 always means the same idea.
- **`.n`** counts versions. Improve and Retry · keep idea both make the next version in the same place (2 → 2.1 → 2.2); the version list says which was which.
- **Letters** start branches: the next free letter on the whole page (A, B … Z, then AA, AB …) after the id the branch grew from. 4 → 4A and 4B; 4B.2 → 4B.2D. A branch has versions too (4B → 4B.1).
- Retry · new idea and Combine make a new take with a new id: the next number on the top row, or the next free letter in a branch row.

## The author's two rules (30.10.2026)

1. **A pick is final.** A section with a pick is finished: a look page goes to its port, an enhance or expand page to its handoff note (the profile says how). The picked take's note and slider values go with it. The page sets the section's other marks aside and leaves them out of the line. In every later round that tab stays exactly as it was, with the pick marked on it: [A picked tab in later rounds](#a-picked-tab-in-later-rounds).
2. **Without a pick, act only on requests**: Improve, Retry · keep idea, Retry · new idea, Branch off, Combine, Drop, Drop branch, More takes. Ratings and notes on their own ask for nothing: carry them into the next round as `last` and change nothing for them.

## A picked tab in later rounds

The same outcome every time (author, 5.11.2026). When the line picks a take, the next round of the page:

- writes `picked: { round: N }` on that take, N being the round the line came from (`keep Now` puts it on Now); a pick's slider values and note stay in the take's `last`;
- sets the tab's `start` to the picked take;
- changes nothing else in the tab: every take, version, branch, ghost stem, Before and `last` stays as it was. No take leaves, none is added, none is redrawn, nothing is renumbered;
- keeps every `picked` from earlier rounds, round after round, on every tab.

The shell shows it as its own mark, apart from this round's Pick: a green «Picked in round N» on the take, a green ring on its chip and its node in the map, and a green tab chip with ✓. The self-test checks it is well formed (one per tab on a one-pick tab; a round up to this one).

Later lines: a new `pick` on the same tab moves `picked` to the new take (an any-number tab adds one). Requests on a picked tab (Improve, Branch off, …) are acted on as on any tab, and `picked` stays until a new pick replaces it. A complex part with `picked` plays at that take in the other tabs' previews.

## Making the next round

Work through every section that has requests; a section with `none`, or only ratings and notes, stays as it is. A section picked in this line gets `picked` and otherwise stays as it is ([above](#a-picked-tab-in-later-rounds)).

| mark | what the next round gets |
|---|---|
| improve X | X's next version in X's place: the note's change, or my own choice, named in the version list. The old painter stays as `prev` (Before). |
| retry keep X | the same idea drawn again in X's place, as X's next version; the version list says "retried". |
| retry new X | a different idea in X's place, with a new id; X leaves the page. |
| branch X ×n | n new takes in the row under X, each a clear development in the note's direction (or mine, said in its caption). If the same line improves X, they grow from the improved version. |
| combine X + Y | one new take in the row of the first one named, `from: 'X + Y'`, taking from each what the note says. |
| drop X | X leaves the page. If X has branches, X stays as a `ghost` stem for them. |
| drop branch under X | the row under X and everything under it leave the page. |
| more takes n | n new ideas at the end of the top row, each different from every take there. |
| answers | apply them, and record them where the profile keeps decisions. |

Then:
- bump `round`; set `fresh` on new takes and `changed` on new versions; move this round's ratings and notes into `last` (a compound sound's `parts` into `last.layers`, `{ id: { rate, note } }`): like the take's own, they ask for nothing;
- write `since` as lines ([words.md](words.md)): the headline counts what changed («4 improved, 3 new, 1 dropped»), the lines say what no take shows (answers applied, a page-wide change); each take's own change is its version note;
- on a page from before 7.11.2026, rewrite every block's words to [words.md](words.md) and drop `oldWords` (a picked tab keeps its words);
- keep each section to about 8 new or changed takes per round, and say so when a batch is bigger and spreads over rounds;
- rebuild, self-test to `errors=0`, look at desktop and phone width, publish to the same artifact.
