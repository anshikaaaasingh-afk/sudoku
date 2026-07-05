/* modules/board.js
   Pure grid helpers shared by the solver, generator, and hint engine.
   A grid is a flat 81-length array (index = row*9+col), 0 = empty. */

export function idx(r, c) { return r * 9 + c; }
export function rc(i) { return [Math.floor(i / 9), i % 9]; }
export function boxIndex(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }

export function cloneGrid(grid) { return grid.slice(); }
export function emptyGrid() { return new Array(81).fill(0); }

/** All 27 units (9 rows, 9 cols, 9 boxes), each an array of 9 cell indices. */
export const UNITS = (() => {
  const units = [];
  for (let r = 0; r < 9; r++) units.push([...Array(9).keys()].map(c => idx(r, c)));
  for (let c = 0; c < 9; c++) units.push([...Array(9).keys()].map(r => idx(r, c)));
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    const cells = [];
    for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) cells.push(idx(r, c));
    units.push(cells);
  }
  return units;
})();

/** Map from cell index -> the 3 units it belongs to (row, col, box). */
export const UNITS_OF = (() => {
  const map = Array.from({ length: 81 }, () => []);
  UNITS.forEach(u => u.forEach(i => map[i].push(u)));
  return map;
})();

/** Map from cell index -> set of the 20 peer cell indices (same row/col/box, excluding itself). */
export const PEERS_OF = (() => {
  const map = Array.from({ length: 81 }, () => new Set());
  UNITS_OF.forEach((units, i) => units.forEach(u => u.forEach(j => { if (j !== i) map[i].add(j); })));
  return map;
})();

export function isValidPlacement(grid, i, value) {
  if (value === 0) return true;
  for (const p of PEERS_OF[i]) if (grid[p] === value) return false;
  return true;
}

/** Legal candidate numbers (1-9) for an empty cell given the current grid. */
export function candidatesFor(grid, i) {
  if (grid[i] !== 0) return [];
  const used = new Set();
  for (const p of PEERS_OF[i]) if (grid[p] !== 0) used.add(grid[p]);
  const out = [];
  for (let n = 1; n <= 9; n++) if (!used.has(n)) out.push(n);
  return out;
}

/** All cells currently in conflict with a peer holding the same value — used for error highlighting. */
export function findConflicts(grid) {
  const conflicts = new Set();
  UNITS.forEach(unit => {
    const seen = {};
    unit.forEach(i => {
      const v = grid[i];
      if (v === 0) return;
      if (seen[v] !== undefined) { conflicts.add(seen[v]); conflicts.add(i); }
      else seen[v] = i;
    });
  });
  return conflicts;
}

export function isComplete(grid) { return grid.every(v => v !== 0); }
export function isSolved(grid) { return isComplete(grid) && findConflicts(grid).size === 0; }
