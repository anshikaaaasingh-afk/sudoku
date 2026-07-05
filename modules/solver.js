/* modules/solver.js
   Classic constrained backtracking. Two entry points:
   - solve(grid): returns a solved grid or null if unsolvable
   - countSolutions(grid, limit): counts up to `limit` solutions (used
     by the generator to verify a puzzle has exactly one solution)
   - stepSolver(grid): a JS generator that yields after every placement
     and backtrack, so the UI can animate it and control speed/pause. */

import { idx, candidatesFor, cloneGrid, isComplete } from './board.js';

const MAX_STEPS_SAFETY = 500000; // guards against pathological inputs freezing the tab

function findMostConstrainedCell(grid) {
  // Minimum-remaining-values heuristic: pick the empty cell with fewest
  // candidates first — dramatically faster than scanning left-to-right.
  let best = -1, bestCands = null, bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const cands = candidatesFor(grid, i);
    if (cands.length < bestCount) { best = i; bestCands = cands; bestCount = cands.length; }
    if (bestCount === 0) break; // dead end, bail immediately
  }
  return best === -1 ? null : { cell: best, cands: bestCands };
}

export function solve(grid) {
  const g = cloneGrid(grid);
  let steps = 0;
  function backtrack() {
    if (++steps > MAX_STEPS_SAFETY) return false;
    const next = findMostConstrainedCell(g);
    if (!next) return isComplete(g);
    if (next.cands.length === 0) return false;
    for (const n of next.cands) {
      g[next.cell] = n;
      if (backtrack()) return true;
      g[next.cell] = 0;
    }
    return false;
  }
  return backtrack() ? g : null;
}

/** Counts solutions up to `limit` (default 2, which is all the generator needs to confirm uniqueness). */
export function countSolutions(grid, limit = 2) {
  const g = cloneGrid(grid);
  let count = 0, steps = 0;
  function backtrack() {
    if (count >= limit) return;
    if (++steps > MAX_STEPS_SAFETY) return;
    const next = findMostConstrainedCell(g);
    if (!next) { count++; return; }
    if (next.cands.length === 0) return;
    for (const n of next.cands) {
      g[next.cell] = n;
      backtrack();
      g[next.cell] = 0;
      if (count >= limit) return;
    }
  }
  backtrack();
  return count;
}

/** Generator version for animated step-by-step solving. Yields
 *  { grid, cell, value, type: 'place'|'backtrack' } after every move. */
export function* stepSolver(grid) {
  const g = cloneGrid(grid);
  function* backtrack() {
    const next = findMostConstrainedCell(g);
    if (!next) return isComplete(g);
    if (next.cands.length === 0) return false;
    for (const n of next.cands) {
      g[next.cell] = n;
      yield { grid: cloneGrid(g), cell: next.cell, value: n, type: 'place' };
      const solved = yield* backtrack();
      if (solved) return true;
      g[next.cell] = 0;
      yield { grid: cloneGrid(g), cell: next.cell, value: 0, type: 'backtrack' };
    }
    return false;
  }
  yield* backtrack();
}
