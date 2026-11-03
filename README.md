# Pick pages for Claude Code

Three [Claude Code](https://claude.com/claude-code) skills for deciding on things by looking at them instead of reading about them.

Claude builds a **pick page**: one self-contained HTML file that shows the current state (**Now**) beside numbered **takes**. You browse the takes as a tree, mark them (Pick, Improve, Branch off, Combine, Retry, Drop, Rate, Note), and copy a one-line **pick line** back into the chat. Round by round the takes grow (2 → 2.1, 4 → 4A) until you pick. Nothing gets built before a pick.

| Skill | What it makes |
|---|---|
| `/pick-page` | A page of looks, effects, UI, sounds or mechanics: 4–8 really different takes per section, with sliders and controls. |
| `/pick-enhance` | What's wrong with something that exists: one section per problem, backed by evidence, with 2–5 fixes each. Ends in a handoff note. |
| `/pick-expand` | New ideas around something that exists: `vertical` deepens it, `horizontal` adds new siblings of its kind. Ends in a handoff note. |

Open [`skills/pick-page/shell/example/example.html`](skills/pick-page/shell/example/example.html) in a browser to see a finished page.

## Install

As a plugin, inside Claude Code:

```
/plugin marketplace add SummerPain/pick-pages
/plugin install pick-pages@pick-pages
```

Or by hand: copy the three folders under `skills/` into `~/.claude/skills/` (all projects) or `<project>/.claude/skills/` (one project).

Until 3 November 2026 the skills were `study-page`, `enhance-study` and `expand-study`, in the repo `study-skills`. If you copied those folders by hand, delete them when you copy the new ones.

## Use

Ask for designs, previews, looks or takes of something ("give me a few takes on the loading spinner"), or run `/pick-enhance <subject>` / `/pick-expand <subject> horizontal`. Add `noxpln` to leave out each take's Why.

### Project profile (optional)

Put a `.claude/pick-profile.md` in your project to tell the skills what to read about the project, where pages go, your look rules, how to check pages on your machine, and what follows a pick. Its rules win where they differ from the skills. The old name, `.claude/study-profile.md`, still works.

## How a page is built

A page is the shared shell (`skills/pick-page/shell/`: `head.html` + `shell.js`) plus the page's own source in `src/`, joined by `build.ps1` (Windows) or `build.sh` (elsewhere) into one HTML file. The format is documented in [`reference/shell.md`](skills/pick-page/reference/shell.md) and the pick line in [`reference/pick-line.md`](skills/pick-page/reference/pick-line.md).

## License

MIT
