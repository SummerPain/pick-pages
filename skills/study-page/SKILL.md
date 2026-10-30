---
name: study-page
description: Study pages, self-contained HTML previews where the author browses numbered takes (looks, effects, UI, sounds, mechanics) as a tree, marks them (Pick, Improve, Branch off, Combine, Retry, Drop, Rate, Note) and sends back a pick line. Use when the author asks for designs, previews, looks, takes or a study of something; for a study's next round; and when a pick line arrives. /enhance-study and /expand-study use its page base.
---

# Study pages

The author decides on previews. A study page shows the current state (**Now**) beside numbered **takes**; the author marks them and sends a **pick line**; nothing gets built before a pick. Round by round the takes grow into a tree: a take improves into its next version (2 → 2.1), branches off into new ones (4 → 4A), combines with others, or drops out.

**Profile first.** If the project has `.claude/study-profile.md`, read it before anything else: what to read about the project, where pages go, the project's look rules, how to check pages on this machine, and what follows a pick. Its rules add to this skill and win where they differ.

## A. Making a page (a new study, or its next round)

1. **Read what exists now.** The subject's docs, code and data, its earlier studies, and whatever shares the screen or the system with it, so the takes fit beside it. Take every number (colours, sizes, rates, costs, timings) from those files. Fix any stale doc line you find. The brief that opens the page's About says what the subject does, how often, and what sits next to it.
2. **Plan the takes.** Each take is really different: another design, shape or approach. Variants of one idea are one take with a slider. Order them from close to bold, put Now first, and star (★) the one I'd pick with its reason. Write each caption from the take's visible source first: what it starts from, then what it does.
3. **Write the source** in `src/study.js` beside the page, following [reference/shell.md](reference/shell.md) (the STUDY format, painters, controls, sliders, sounds). For a next round, follow [reference/pick-line.md](reference/pick-line.md) "Making the next round".
4. **Build and check.** Build with the shell's build script; run the self-test to `errors=0`; look at the page at desktop and phone width. A page passes when the self-test is clean and every take draws at both widths.
5. **Hand it over.** Publish the page as a private artifact (a next round republishes to the same one). Give the author the link and the file path, and in 3–6 lines what is on the page and what is still open. Stop there: the next move is the author's pick line.

## B. When a pick line arrives

Read [reference/pick-line.md](reference/pick-line.md), then take each section in turn:
- **A pick is final**: that section is finished. Do what the profile says follows a pick (a port for a look study; a handoff note for /enhance-study and /expand-study), with the picked take's note and slider values.
- **Requests without a pick** (Improve, Retry, Branch off, Combine, Drop, Drop branch, More takes) make the next round: steps A1–A5, with the line as the brief.
- **Ratings and notes alone** ask for nothing: carry them into the next round, and tell the author in one line that there was nothing to act on.

## Look studies (/study-page)

- `kind: 'look'`: one pick per section. 4–8 takes after Now.
- Show the subject at the size and framing it really has, with what surrounds it, and add a close-up where detail matters. Controls cover its real variations.
- For anything already picked in an earlier study, reuse that study's painter code as it is (copy it into `src/`, naming its source).
- **Sounds** use the same page: each take plays from the panel (`audio`), at one master volume. Each variant is a different sound (another source or design), not one sound repitched or filtered. Check sounds with numbers and spectrograms, because the author judges by ear.
