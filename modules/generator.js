/* modules/generator.js
   1. Generate a random, fully-solved valid grid.
   2. Carve cells out one at a time (in random order), keeping a removal
      only if the puzzle still has exactly one solution — this is the
      standard technique for guaranteeing a unique-solution puzzle. */

import { cloneGrid, emptyGrid, candidatesFor } from './board.js';
import { countSolutions } from './solver.js';

function shuffled(arr) {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  return c;
}

/** Randomized backtracking fill — same algorithm as the solver, but
 *  candidates are shuffled so every call produces a different grid. */
function generateFullGrid() {
  const g = emptyGrid();
  function backtrack(pos) {
    if (pos === 81) return true;
    if (g[pos] !== 0) return backtrack(pos + 1);
    const cands = shuffled(candidatesFor(g, pos));
    for (const n of cands) {
      g[pos] = n;
      if (backtrack(pos + 1)) return true;
      g[pos] = 0;
    }
    return false;
  }
  backtrack(0);
  return g;
}

export const DIFFICULTY_GIVENS = {
  easy: 42,
  medium: 33,
  hard: 27,
  expert: 24, // deliberately not pushed to the theoretical 17-clue minimum, to keep generation fast in-browser
};

/** Returns { puzzle, solution, difficulty }. */
export function generatePuzzle(difficulty = 'medium', seed = null) {
  const solution = seed ? generateFullGridSeeded(seed) : generateFullGrid();
  const puzzle = cloneGrid(solution);
  const targetGivens = DIFFICULTY_GIVENS[difficulty] || DIFFICULTY_GIVENS.medium;
  const targetRemoved = 81 - targetGivens;

  const order = seed ? seededShuffleIndices(seed) : shuffled([...Array(81).keys()]);
  let removed = 0;
  for (const i of order) {
    if (removed >= targetRemoved) break;
    if (puzzle[i] === 0) continue;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      removed++;
    } else {
      puzzle[i] = backup; // removing this cell broke uniqueness — put it back
    }
  }
  return { puzzle, solution, difficulty };
}

/* ---- deterministic variants, used by the daily challenge ---- */
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function generateFullGridSeeded(seedStr) {
  const rng = seededRandom(seedStr);
  const g = emptyGrid();
  function backtrack(pos) {
    if (pos === 81) return true;
    if (g[pos] !== 0) return backtrack(pos + 1);
    const cands = candidatesFor(g, pos);
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    for (const n of cands) { g[pos] = n; if (backtrack(pos + 1)) return true; g[pos] = 0; }
    return false;
  }
  backtrack(0);
  return g;
}
function seededShuffleIndices(seedStr) {
  const rng = seededRandom(seedStr + '_order');
  const arr = [...Array(81).keys()];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
