# The pick line, and the next round

## The line

The page writes it, the author sends it, Load reads it back. One line per section, then the answers and the study note:

```
Spinner look (round 4)
Shape — pick 4B.2D · Twin split "keep the offset"; rate 1 6, 2.3 8; note 4A "too slow at ×½"
Timing — improve 1 (turn 1.4 s) "a softer start"; retry keep 3; retry new 5; branch 2 ×2 "one slower"; combine 1 + 3 "1's ease, 3's two speeds"; drop 4, 6; drop branch under 2 (2A, 2B); more takes 2; set 3 (idle 0.4 turns/s); rate 3 4; tab note "…"
Answers — defaults except Q2 b (percent)
Study note "…"
```

- A section reads `<section> — <clauses>`, or `— none`. Clauses are split by `;`; notes are in double quotes, `\"` inside.
- `pick X · Name` picks a take; `keep Now` picks Now (look studies: leave it as it is).
- `(…)` after an id holds slider values the author changed; a take's note rides with its first clause.
- `tab note` is a note on the whole tab (all its takes); `Study note` is on the whole study. Lines from before 31.10 say `section note` and `Page note`; both still load.
- Ids are the shown ids. An old id (2.1 after 2.3 exists) still finds its take; Load says so.

## Ids

- **Numbers** are takes on the top row: 1, 2, 3 … A number is never used twice, so 3 always means the same idea.
- **`.n`** counts versions. Improve and Retry · keep idea both make the next version in the same place (2 → 2.1 → 2.2); the version list says which was which.
- **Letters** start branches: the next free letter in the whole study (A, B … Z, then AA, AB …) after the id the branch grew from. 4 → 4A and 4B; 4B.2 → 4B.2D. A branch has versions too (4B → 4B.1).
- Retry · new idea and Combine make a new take with a new id: the next number on the top row, or the next free letter in a branch row.

## The author's two rules (30.10.2026)

1. **A pick is final.** A section with a pick is finished: a look study goes to its port, an enhance or expand study to its handoff note (the profile says how). The picked take's note and slider values go with it. The page sets the section's other marks aside and leaves them out of the line.
2. **Without a pick, act only on requests**: Improve, Retry · keep idea, Retry · new idea, Branch off, Combine, Drop, Drop branch, More takes. Ratings and notes on their own ask for nothing: carry them into the next round as `last` and change nothing for them.

## Making the next round

Work through every section that has requests; a section with `none`, or only ratings and notes, stays as it is.

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
- bump `round`; set `fresh` on new takes and `changed` on new versions; move this round's ratings and notes into `last`;
- write `since`: each mark of the line and what I did for it;
- keep each section to about 8 new or changed takes per round, and say so when a batch is bigger and spreads over rounds;
- rebuild, self-test to `errors=0`, look at desktop and phone width, publish to the same artifact.
