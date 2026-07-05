/* modules/hints.js
   Tries techniques from simplest to most advanced and returns the
   first one that applies, with a plain-language explanation. Placing
   techniques (Naked/Hidden Single) hand back a value to fill in;
   elimination techniques (Naked Pair, Pointing Pair, Box-Line
   Reduction) hand back candidates to strip from other cells' notes —
   which is what real solving guides do, since those techniques don't
   directly reveal a number, they narrow things down toward one. */

import { UNITS, candidatesFor, rc, boxIndex } from './board.js';

function cellLabel(i) { const [r, c] = rc(i); return `R${r + 1}C${c + 1}`; }

export function findNakedSingle(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const cands = candidatesFor(grid, i);
    if (cands.length === 1) {
      return {
        technique: 'Naked Single', action: 'place', cells: [i], value: cands[0],
        message: `${cellLabel(i)} only has one legal candidate left (${cands[0]}) once its row, column, and box are accounted for.`
      };
    }
  }
  return null;
}

export function findHiddenSingle(grid) {
  for (const unit of UNITS) {
    for (let n = 1; n <= 9; n++) {
      const spots = unit.filter(i => grid[i] === 0 && candidatesFor(grid, i).includes(n));
      if (spots.length === 1) {
        return {
          technique: 'Hidden Single', action: 'place', cells: [spots[0]], value: n,
          message: `${cellLabel(spots[0])} is the only cell in its row, column, or box where ${n} can still go.`
        };
      }
    }
  }
  return null;
}

export function findNakedPair(grid) {
  for (const unit of UNITS) {
    const byKey = {};
    unit.forEach(i => {
      if (grid[i] !== 0) return;
      const cands = candidatesFor(grid, i);
      if (cands.length === 2) {
        const key = cands.join(',');
        (byKey[key] = byKey[key] || []).push(i);
      }
    });
    for (const key of Object.keys(byKey)) {
      if (byKey[key].length !== 2) continue;
      const [a, b] = byKey[key];
      const [n1, n2] = key.split(',').map(Number);
      const eliminateFrom = unit.filter(i => i !== a && i !== b && grid[i] === 0 &&
        (candidatesFor(grid, i).includes(n1) || candidatesFor(grid, i).includes(n2)));
      if (eliminateFrom.length) {
        return {
          technique: 'Naked Pair', action: 'eliminate', cells: [a, b], numbers: [n1, n2], eliminateFrom,
          message: `${cellLabel(a)} and ${cellLabel(b)} can only be ${n1} or ${n2} between them, so ${n1} and ${n2} can be crossed off as candidates everywhere else in that unit.`
        };
      }
    }
  }
  return null;
}

export function findPointingPair(grid) {
  const boxUnits = UNITS.slice(18, 27);
  for (const box of boxUnits) {
    for (let n = 1; n <= 9; n++) {
      const cells = box.filter(i => grid[i] === 0 && candidatesFor(grid, i).includes(n));
      if (cells.length < 2) continue;
      const rows = new Set(cells.map(i => rc(i)[0]));
      const cols = new Set(cells.map(i => rc(i)[1]));
      if (rows.size === 1) {
        const r = [...rows][0];
        const rowUnit = UNITS[r];
        const eliminateFrom = rowUnit.filter(i => !box.includes(i) && grid[i] === 0 && candidatesFor(grid, i).includes(n));
        if (eliminateFrom.length) return {
          technique: 'Pointing Pair', action: 'eliminate', cells, numbers: [n], eliminateFrom,
          message: `Inside this box, ${n} can only go in row ${r + 1}, so it can be ruled out from the rest of row ${r + 1} outside the box.`
        };
      }
      if (cols.size === 1) {
        const c = [...cols][0];
        const colUnit = UNITS[9 + c];
        const eliminateFrom = colUnit.filter(i => !box.includes(i) && grid[i] === 0 && candidatesFor(grid, i).includes(n));
        if (eliminateFrom.length) return {
          technique: 'Pointing Pair', action: 'eliminate', cells, numbers: [n], eliminateFrom,
          message: `Inside this box, ${n} can only go in column ${c + 1}, so it can be ruled out from the rest of column ${c + 1} outside the box.`
        };
      }
    }
  }
  return null;
}

export function findBoxLineReduction(grid) {
  const lines = UNITS.slice(0, 18);
  for (const line of lines) {
    for (let n = 1; n <= 9; n++) {
      const cells = line.filter(i => grid[i] === 0 && candidatesFor(grid, i).includes(n));
      if (cells.length < 2) continue;
      const boxes = new Set(cells.map(i => { const [r, c] = rc(i); return boxIndex(r, c); }));
      if (boxes.size === 1) {
        const b = [...boxes][0];
        const boxUnit = UNITS[18 + b];
        const eliminateFrom = boxUnit.filter(i => !line.includes(i) && grid[i] === 0 && candidatesFor(grid, i).includes(n));
        if (eliminateFrom.length) return {
          technique: 'Box-Line Reduction', action: 'eliminate', cells, numbers: [n], eliminateFrom,
          message: `${n} is confined to a single box within this line, so it can be ruled out everywhere else in that box.`
        };
      }
    }
  }
  return null;
}

/** Tries every technique in order of simplicity. */
export function findSmartHint(grid) {
  return findNakedSingle(grid) || findHiddenSingle(grid) || findNakedPair(grid) ||
         findPointingPair(grid) || findBoxLineReduction(grid) || null;
}

/** Basic hint — no technique explanation, just reveals a value. */
export function revealOne(grid, solution) {
  const empties = [];
  for (let i = 0; i < 81; i++) if (grid[i] === 0) empties.push(i);
  if (empties.length === 0) return null;
  const i = empties[Math.floor(Math.random() * empties.length)];
  return { technique: 'Reveal', action: 'place', cells: [i], value: solution[i], message: `${cellLabel(i)} is ${solution[i]}.` };
}

/** Highlights every empty cell where `n` could legally go right now. */
export function highlightPossibleCells(grid, n) {
  const cells = [];
  for (let i = 0; i < 81; i++) if (grid[i] === 0 && candidatesFor(grid, i).includes(n)) cells.push(i);
  return { technique: 'Highlight', action: 'highlight', cells, numbers: [n], message: `${n} could go in ${cells.length} remaining cell(s).` };
}
