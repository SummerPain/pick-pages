---
name: pick-enhance
description: Enhance pages, a pick page that shows why an existing subject (a mechanic, design, look, UI, system) is weak, one section per problem, with fixes as takes for the author to pick. A page only; nothing is implemented. Use for /pick-enhance or when the author asks what's wrong with something and how to improve it. Argument `noxpln` leaves out each fix's Why.
---

# Enhance page

An enhance page **improves what exists**. Each section is one problem; its takes are fixes. The author's picks end in a handoff note; the project itself stays unchanged.

**Page base:** the pick-page skill (its SKILL.md, then reference/shell.md and reference/pick-line.md) and the project's profile. Visual subjects follow the profile's look rules.

**Arguments:** the subject(s), the author's complaint if any, and `noxpln` (fixes without their Why).

## 1. Find the problems

1. Read the subject as it is now (pick-page A1).
2. List the problems. The author's words come first, marked "you said"; then your own findings, marked "found": numbers that don't hold up (a dead option, a must-pick, a stat that never matters, bad scaling), clashes with other parts, readability, multiplayer, cost against value, feel, and for looks the profile's look rules.
3. Back every finding with evidence: a number from the data, a line of code, a measurement, or a side-by-side with Now. Keep only what you can back.

## 2. The page

- `kind: 'enhance'`: any number of picks per section, including none. File: where the profile says.
- One section per problem. Its `brief` is the problem: the label (you said / found), the evidence, and how much it hurts (small / real / breaks it). Now shows the problem with its real values.
- 2–5 fixes per problem, really different approaches; one fix with different numbers is one take with sliders.
- Mechanic fixes get sliders from the real data's scale and live figures next to Now's (DPS, time to kill, uptime, value per cost); a small simulation where watching it explains the idea. Visual fixes are drawn beside Now.
- Each fix's caption says what it costs elsewhere (what it touches, what it could break); its Why (unless `noxpln`) says how it fixes the problem and the risk.
- Fixes that solve several problems go in a last section, "Covers several", each naming the problems it covers.
- Hand over as in pick-page A5.

## 3. When the pick line arrives

Pick-page B, with this for picked sections: write `<subject>-enhance-handoff.md` beside the page, containing
- the pick line as sent;
- each picked fix with its final values, marking which are the author's and which are page defaults (still open);
- open questions;
- what it would touch (files, classes, data), as the plan for a later "implement this".

Record the note where the profile says. The code, data and design docs stay as they are until the author asks for the implementation.
