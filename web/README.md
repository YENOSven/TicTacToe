# Tic Tac Shift (Java Swing → Web Port)

Tic Tac Shift is the original Swing assignment (3×3 default) where you first place pieces until a fixed number of empty cells remains, then slide tiles into adjacent empty cells. Three in a row wins; otherwise when no legal moves remain it’s a draw. This repo now contains both the Java sources and a browser-based port that preserves the same rules and AI.

## Project layout
- `java/` — original Java sources (Swing UI + game/AI logic).
- `web/` — browser port: `index.html`, `css/main.css`, `js/main.js`, and sprite assets in `assets/`.
- `vercel.json` — static deploy config pointing Vercel at `web/`.

## How the algorithm works
- **Game model**: board stored as a 2D grid of chars (`B` human, `R` computer, `E` empty). Win = full row/col/diag of the same symbol. Draw = no win and either zero empties or (when a minimum empty count is enforced) remaining empties have no adjacent tiles for the next mover.
- **Search**: depth-limited minimax with alpha–beta pruning. Scores mirror the assignment: `3` = computer win, `0` = human win, `2` = draw, `1` = undecided.
- **Memoization**: board states are flattened to strings and cached (Java uses `HashDictionary`; the web port uses a `Map`) to avoid re-evaluating repeated layouts.
- **Two phases**:  
  1) **Placement** until `emptySlots` is reached.  
  2) **Sliding**: a move is selecting your tile then an adjacent empty cell; AI mirrors this and also searches over shifts.

## Web port implementation
- **UI**: vanilla HTML/CSS; grid buttons that paint the same GIF sprites (`empty.gif`, `human.gif`, `computer.gif`, `marked.gif`).
- **Logic**: `web/js/main.js` is a direct translation of the Java rules/AI, keeping the same evaluation, memoization, and move/phase handling.
- **State**: in-memory `state` object tracks board, selection, empties, depth, and cached layouts each turn (reset per computer move as in the Java reference).

## Running locally
- Java: compile/run from `java/` if you want the Swing app (`javac *.java` then `java PlayGame` with adjusted args in `PlayGame.main`).
- Web: open `web/index.html` directly or serve `web/` with any static host, e.g. `python -m http.server` from repo root then visit `http://localhost:8000/web/`.

## Deploying to Vercel
`vercel.json` is set for a static deploy rooted at `web/`. From the repo root:
```bash
vercel        # first deploy (interactive)
vercel --prod # production deploy
```
All files under `web/` (including `assets/`) are served as-is; no build step required.
