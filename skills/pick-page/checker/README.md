# The checker

Checks a built pick page in headless, muted Microsoft Edge, the way `reference/shell.md` («Checking a page») asks: the inline
scripts compile, no console errors, the shell's self-test reports `errors=0`, no sideways scroll, a tab that plays over a
background sends it into `X.under`, screenshots, and with `--takes` the phone frame check (each take drawn with the CPU slowed
6×, the address bar shrunk and given back). The checks themselves live in the shell; this drives them.

## Setup, once per PC

1. Node 18 or later. `check.ps1` finds it on the Path, in the folder named by `PICK_NODE`, or in `%USERPROFILE%\tools\node`.
2. In this folder: `npm install` (one package, `playwright-core`, about 14 MB; it drives the Edge already installed and
   downloads no browser). `node_modules/` stays out of git.
3. Microsoft Edge installed (Windows has it).

## Use

```
powershell -NoProfile -File <skill>\checker\check.ps1 <page.html> [--mobile] [--takes all|sec/key,...] [--out DIR]
node check.mjs <page.html> [--out DIR] [--mobile] [--takes ...] [--wait MS] [--no-selftest] [--perf | --no-perf]
               [--cpu N] [--every] [--jobs N] [--no-load | --load X] [--words]
```

- Without `--mobile`: the desktop run (1280 × 820). `--mobile`: a phone (375 × 812), and with `--takes` the frame check.
- `--words`: only the page's words against the limits in `reference/words.md`, every block over them on its own line, in a few seconds (7.11.2026). Use it while rewriting; the self-test runs the same check.
- Screenshots go to `%TEMP%\study-check\<page>\` (or `--out`). It ends with `CHECK ok` or `CHECK failed (n)`, exit code 0 / 1.
- Run it muted and below normal priority, one at a time on a busy PC: `check.ps1` does both.

## The frame check's budgets

A take fails on a frame over 200 ms or 1 frame in 20 over 60 ms. Both stretch with the PC's load (6.11.2026): the checker
measures how busy the whole PC is for 2 s before the timed runs and 1.5 s after, takes the higher, and multiplies the budgets
by 1 + 2 × (load − 10 %), at most 2.5 (×1.6 at 40 %, ×2 at 60 %; calibrated on one desktop, the same takes timed idle and
beside a busy program). It prints the load and the budgets it used. `--no-load` keeps them fixed; `--load 0.4` sets the load
by hand, to test the stretch. Above ×2.5 it says the PC was too busy for a fair timing.

## Also here

`frames.mjs`: draws chosen painters of a page's sources at chosen times on one PNG sheet, to look at key frames before
publishing (usage in its first lines).
