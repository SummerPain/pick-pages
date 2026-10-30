---
name: expand-study
description: Expand studies, a study page of new ideas around an existing subject (a mechanic, design, look, system) for the author to pick from. Vertical deepens the subject itself; horizontal adds new siblings of its kind and leaves it as it is. A study only; nothing is implemented. Use for /expand-study or when the author asks for more depth or variety in something. Arguments `vertical` / `horizontal`; `noxpln` leaves out each idea's Why.
---

# Expand study

An expand study **adds to what exists**, in one direction. The author's picks end in a handoff note; the project itself stays unchanged.

**Page base:** the study-page skill (its SKILL.md, then reference/shell.md and reference/pick-line.md) and the project's study profile. Visual subjects follow the profile's look rules.

**Arguments:** the subject(s); the direction, `vertical` or `horizontal`; `noxpln` (ideas without their Why).

## 0. Questions before any work

Ask everything that applies in **one** AskUserQuestion, each with my default:
- no direction given: vertical or horizontal;
- horizontal, design subject: should the new designs differ in the idea, the style, or both;
- horizontal, mechanic subject: should the ideas come with drawings (icons, effect sketches, silhouettes).

When none applies, start right away.

## 1. Vertical: deepen the subject

Keep the subject's core idea and take it further.
- A mechanic gains layers: levels, rank-ups, merging or recycling, synergies, a mastery track, a choice at a level-up.
- A design develops into richer versions that stay recognisable, ordered from a close refinement to a bold development, with Now kept for comparison.
- Each idea says which part of the subject it deepens and what it adds to play (decisions, goals, a reason to come back).

## 2. Horizontal: new siblings

New things of the subject's kind; the existing ones stay as they are.
- A mechanic category gets new entries: each with a name, a one-line rule, its numbers as sliders with live figures, and the role it fills that none fills now. Check the full current list first and leave out near-duplicates.
- A design category gets new designs that differ from all existing ones, in idea, style or both, as the author answered.
- One specific subject gets different designs with different ideas.
- Drawings, if the author said yes, follow the profile's look rules.

## 3. The page

- `kind: 'expand'`: any number of picks per section, including none. File: where the profile says.
- 6–12 ideas for horizontal, 4–8 for vertical, in sections when there are several subjects or natural families. Variants of one idea are one take with a slider or a control.
- Each idea's Why (unless `noxpln`) says what it adds and its risk (complexity, balance, overlap).
- Hand over as in study-page A5.

## 4. When the pick line arrives

Study-page B, with this for picked sections: write `<subject>-expand-handoff.md` beside the page, containing
- the pick line as sent;
- each picked idea with its final values, marking which are the author's and which are study defaults (still open);
- open questions;
- what it would touch (files, classes, data), as the plan for a later "implement this".

Record the note where the profile says. The code, data and design docs stay as they are until the author asks for the implementation.
