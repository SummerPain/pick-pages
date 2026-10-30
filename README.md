# Study skills for Claude Code

Three [Claude Code](https://claude.com/claude-code) skills for deciding on things by looking at them instead of reading about them.

Claude builds a **study page**: one self-contained HTML file that shows the current state (**Now**) beside numbered **takes**. You browse the takes as a tree, mark them (Pick, Improve, Branch off, Combine, Retry, Drop, Rate, Note), and copy a one-line **pick line** back into the chat. Round by round the takes grow (2 → 2.1, 4 → 4A) until you pick. Nothing gets built before a pick.

| Skill | What it makes |
|---|---|
| `/study-page` | A study of looks, effects, UI, sounds or mechanics: 4–8 really different takes per section, with sliders and controls. |
| `/enhance-study` | What's wrong with something that exists: one section per problem, backed by evidence, with 2–5 fixes each. Ends in a handoff note. |
| `/expand-study` | New ideas around something that exists: `vertical` deepens it, `horizontal` adds new siblings of its kind. Ends in a handoff note. |

Open [`skills/study-page/shell/example/example.html`](skills/study-page/shell/example/example.html) in a browser to see a finished page.

## Install

As a plugin, inside Claude Code:

```
/plugin marketplace add SummerPain/study-skills
/plugin install study-skills@study-skills
```

Or by hand: copy the three folders under `skills/` into `~/.claude/skills/` (all projects) or `<project>/.claude/skills/` (one project).

## Use

Ask for designs, previews, looks or takes of something ("give me a few takes on the loading spinner"), or run `/enhance-study <subject>` / `/expand-study <subject> horizontal`. Add `noxpln` to leave out each take's Why.

### Project profile (optional)

Put a `.claude/study-profile.md` in your project to tell the skills what to read about the project, where pages go, your look rules, how to check pages on your machine, and what follows a pick. Its rules win where they differ from the skills.

## How a page is built

A page is the shared shell (`skills/study-page/shell/`: `head.html` + `shell.js`) plus the page's own `src/study.js`, joined by `build.ps1` (Windows) or `build.sh` (elsewhere) into one HTML file. The format is documented in [`reference/shell.md`](skills/study-page/reference/shell.md) and the pick line in [`reference/pick-line.md`](skills/study-page/reference/pick-line.md).

## License

MIT
