# 🧩 Sudoku Master

A fully-featured Sudoku game built with plain HTML, CSS, and JavaScript — no framework, no backend, no build step. Real backtracking solver, a puzzle generator that verifies unique solutions, five explainable solving techniques, notes/pencil marks, XP and achievements, a seeded daily challenge, and a Chart.js analytics dashboard.

**[Live demo →](#)** *(add your GitHub Pages link once deployed)*

## What's actually in here vs. what's out of scope

This came from a very long "semester project" feature list. A few items needed honest scoping:

| Requested | What's built |
|---|---|
| X-Wing / Swordfish hints | **Not included.** These are advanced techniques that are easy to get subtly wrong. The five that ship (Naked Single, Hidden Single, Naked Pair, Pointing Pair, Box-Line Reduction) are implemented carefully and verified against a real solver — see "How it was tested" below. |
| Global / friend leaderboard, cloud save, user profiles, real push notifications | **Not included** — all need a backend. Daily challenge streaks and history are tracked locally instead; reminders are opt-in local browser notifications, not server-triggered push. |
| Personalized recommendations / difficulty forecasting | **Simplified** to a transparent rule (`difficultyRecommendation` in `analytics.js`): if you've won ≥80% of your last few games at a difficulty, it suggests the next one up, with your actual average time shown. It's arithmetic over your own history, not a model. |
| Full interactive tutorial curriculum with example puzzles per technique | **Simplified** to a Learn tab covering all five techniques with real explanations, plus a pointer to the in-game "Explain next move" hint, which teaches the same five techniques live on whatever puzzle you're solving. |
| Everything else on the list | Built and working — see below. |

## Features

**Core gameplay** — 9×9 board, keyboard input, cell/row/column/box highlighting, same-number highlighting, error detection, auto-check or manual "Check" mode, reset, new game

**Solver engine** — real backtracking solver (minimum-remaining-values heuristic for speed), instant solve, and a step-by-step animated solve with a speed slider and pause/resume (neither counts toward your stats — they're demo tools)

**Puzzle generator** — generates a random full grid, then removes cells one at a time, using the solver to confirm the puzzle still has exactly one solution after each removal. Four difficulty tiers by given-count (Easy 42, Medium 33, Hard 27, Expert 24)

**Notes system** — pencil marks per cell, toggle notes mode, auto-strips a number from peer cells' notes once it's placed

**Hints** — a basic "reveal a number," plus "explain next move," which runs the five techniques in order of simplicity and shows you the actual cells and rule involved, with an "Apply this" button

**Timer, stats, achievements, XP/levels, streaks, themes (7), synthesized audio, daily challenge, Chart.js analytics dashboard, PDF export, PWA** — all implemented; see the feature table above for the couple of things that were scoped down.

## How it was tested

Sudoku is unforgiving of subtle bugs — a solver that's "almost right" produces boards with no solution or two solutions. Before building the UI, the solver + generator + hint engine were run standalone in Node across all four difficulties, checking:
- the generated puzzle has **exactly one** solution (`countSolutions`)
- the backtracking solver's output **matches** the generator's known solution
- generation time stays well under a second per puzzle

If you want to re-run that check yourself, see `modules/solver.js` and `modules/generator.js` — they're plain ES modules with no DOM dependency, so you can `import` and test them directly in Node.

## Project structure

```
sudoku-master/
├── index.html
├── style.css
├── app.js                  # orchestrator: DOM, navigation, game loop
├── sw.js
│
├── modules/
│   ├── board.js             # grid helpers: peers, candidates, conflicts
│   ├── solver.js             # backtracking solve, solution counting, animated step generator
│   ├── generator.js          # full-grid generation + puzzle carving with uniqueness checks
│   ├── hints.js               # basic reveal + 5 explainable solving techniques
│   ├── notes.js               # pencil marks
│   ├── timer.js
│   ├── achievements.js
│   ├── statistics.js
│   ├── analytics.js           # chart data + rule-based insights/recommendation
│   ├── streaks.js
│   ├── daily.js                # seeded daily puzzle + local streak/history
│   ├── levels.js               # XP and level curve
│   ├── themes.js
│   ├── sounds.js               # synthesized SFX, no audio files needed
│   └── storage.js              # localStorage, single source of truth for the data shape
│
├── pwa/
│   ├── manifest.json
│   ├── icon-192.svg
│   └── icon-512.svg
│
├── assets/          # kept empty on purpose — see each folder's .gitkeep
└── reports/         # PDF exports land here if you choose to save them into the repo
```

## Running locally

```bash
cd sudoku-master
python -m http.server 8000
# open http://localhost:8000
```

`app.js` uses ES module imports, which most browsers block on `file://` — serve it over `http://`.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo
2. **Settings → Pages** → source = your default branch, root folder
3. Live at `https://<username>.github.io/<repo-name>/`

## Honest next steps if you want to go further

- Add X-Wing/Swordfish to `hints.js` (there's a clean seam — `findSmartHint` just tries functions in order)
- Swap `localStorage` for a backend to unlock real leaderboards and cloud save
- Add a Web Worker around the generator so Expert-difficulty generation never blocks the main thread, even on slow devices
# sudoku
