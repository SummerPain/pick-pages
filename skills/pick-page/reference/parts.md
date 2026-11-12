# Cutting a subject: tabs, parts and rows

The author can judge apart only what the page shows apart. A take that bundles pieces they judge apart fills its notes with «this part good, that part bad», or with requests to split the tab. The author's rule (12.11.2026): what can be divided gets tabs; what can't gets rating rows. Cut the subject before planning any take (SKILL.md A2), and again on every line.

## 1. List the pieces

Before any take, list the subject's pieces in a comment at the top of `src/study.js`, one line each with its home (below). A piece is anything a take changes that the author could like while disliking the rest:

- a **moment**: what starts on its own event (a press, a wind-up, a launch, the flight, a hit, a break, an idle loop, an entrance);
- a **place**: an object or region on screen (the avatar, a muzzle flash, a projectile, a hit, one corner of a sky and the rest of it, one HUD element);
- an **aspect** of one object: its shape, colour, motion or timing; a mechanic's rule, its warning, its numbers, its look.

Find them in the game's code and data (each clip or sound entry, effect, object, rule, HUD element), in the brief (each «then», each named moment), in the captions you are about to write (each «X: …», each «and its …»), and in every earlier note on the subject. Now's pieces count too.

## 2. One home for each piece

Ask in this order; the first yes decides.

1. **No take changes it** (the same in every take, picked, decided, or in the game): context. Draw or play it as it is; in a complex, a `locked` part. Not decided yet but the same in every take: it isn't designed yet, so it gets its own tab (4) or waits (`waiting`).
2. **Only an amount changes** (a size, speed, count, level, delay): a slider (`params`).
3. **The game itself varies it** (stage, grade, crew size, a setting the player picks): a control.
4. **It is separable: its own tab.** Separable means all three hold:
   - **Swap**: this piece of one take works with the rest of another take, both as they are. They meet at a seam: another moment, another object, another clip, effect or rule.
   - **Built apart**: the game plays or draws it on its own (its own clip or sound entry, effect, object, rule, HUD element, a colour applied as its own setting), or the port can make it so.
   - **Its own moment or place** (aspects skip this): it starts about 0.1 s or more from the pieces round it, or somewhere else on screen. Pieces that start together at one spot are layers of one thing: rows at most. Two game events at one moment (a catch and the next throw) get one sound and one tab.

   The separable pieces of one thing in the game are tabs of one complex ([shell.md](shell.md#complexes)). A piece designed for another's pick says `base`, or waits. A piece with nothing to choose (it plays the game's own hit, or another part's pick) is context: no tab.
5. **Judged apart, but it fails a test of 4**: a row (`layers`) on every take of the tab. Typical: one voice runs through it, one motion carries into it, one painter draws it with the rest, a warning that must match its rule, layers of one sound or one effect that start together.
6. **Anything else**: a word in the caption.

A caption that names two pieces or more with no tab or row for them is a plan error: fix the cut, not the caption.

## 3. Rows

- **2–5 a take.** One row is the take's own rating, so a take never has just one. Over 5, separable pieces hide in it: test 4 again.
- **The same rows on every take of the tab**: the same ids, names and order, so the author compares one piece across takes. Give them once, as the tab's `layers` ([shell.md](shell.md#sections)). A take leaves out a piece it doesn't have (its own `layers`; `layers: []` when that would leave one row); Now gets rows for the pieces it has; a branch keeps its parent's.
- **Order**: time order for moments; then places, nearest first; then shape, colour, motion.
- **Names**: the piece's own name, one or two words (Wind-up, Tail, Head, Shed gas, Corner, Warning). The caption names the pieces in the same words and order. Ids are one short word (`windup`, `tail`) and keep their meaning in every round.
- **Pieces, never criteria**: no «Overall», «Fit», «Readability» or «Fun». The take's own rating is the whole.

## 4. By kind of page

| Page | Tabs (or parts of a complex) | Rows |
|---|---|---|
| Look, an effect | each moment the game shows apart: the shot leaving, the flight, each hit | the layers of one effect, which start together (flash, reach, thrown pieces, trace: SKILL.md «Effects that last»); the muzzle flash and the projectile leaving it; the light on the avatar |
| Look, a still thing (a body, a sky, an emblem) | aspects the game sets apart: a picked body's place, light and motion; a colour applied as its own setting | regions of one picture (a star and its shed gas, a corner and the rest of the sky); shape and colour when one painter draws both |
| Sound | each event the game plays apart: a press, a launch, a flight loop, a hit, a break | the pieces of one clip, or of one voice through several moments (wind-up, body, tail) |
| Mechanic | each move or rule with its own trigger; its look and its sound, once the rule is picked (`base`) | its rule, its warning, and its look when drawn with it; numbers are sliders |
| UI | each element or moment the game builds apart: a title and its entrance; what a number shows and its font | one element's layout, text, colour and motion |
| Enhance | one tab per problem; a cause that can be fixed apart is its own tab. A fix that moves another tab's problem, worse or better, names that tab in its Risk or Why, and that tab's brief names the fix | a fix's pieces when it changes several at once (a rule, a cue on screen; its numbers are sliders) |
| Expand | one tab per subject or family; a mechanism that works with any idea of a tab is a tab of its own | an idea's mechanisms (its base rule, its twist, its ending), and its drawing when drawings are on |

## 5. The next rounds

[pick-line.md](pick-line.md#rows-and-parts-in-the-next-round) says what row ratings and notes ask for, when a row becomes a tab, and when two tabs become one.

## Examples

1. **A thrown blade, its look and sound.** Pieces: the throw, the flight, the hit going in, the hit coming out, the catch, the game's own hit sound. The catch is the next throw's moment: one piece with the throw. The game's hit plays as it is: context. The rest pass all three tests: one complex, the Blade, with tabs Throw (sound), Flight (look; rows Blade and Trail), Flight (sound), Hit in (look) and Hit out (look; rows Flash and Sparks). Not one Look tab and one Sound tab with every moment inside.
2. **A loading spinner.** Pieces: the moving mark and the track it leaves, how it turns over time, its size, a tick on each turn. Mark and track are drawn as one: rows Mark and Track on every take. How it turns works with any shape and the game keeps it apart: a Timing tab. Its size changes with where the game shows it: a control. The tick is its own clip: a Tick tab. Shape, Timing and Tick are one complex.
3. **A giant star in a background.** Pieces: the star's surface, the gas it sheds, the sky behind. Surface and gas are one painted body: rows Surface and Shed gas. The sky is picked: context. A row note on Surface («too flat») is Improve on that piece alone; the next takes keep the best-rated gas.
4. **A boss's sweeping ray, a mechanic.** Pieces: the warning, the sweep, its damage, a dash every take shares, the ray's look, its sound. The dash is decided and the same everywhere: context. Damage: a slider. The warning must match the sweep: rows Rule and Warning. The look and the sound are built apart and designed once the rule is picked: two more tabs of the boss's complex, `base` on the rule's tab.
5. **A shield's hit sound, next round.** Rows Impact, Ring and Fade start together in one clip. The line rates Impact 2 or less on every take, Ring 9 and Fade 8 on take 7, and a tab note asks for new hits. Every new take keeps 7's ring and fade as they are and has an impact of its own.
