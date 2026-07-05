/* modules/notes.js
   Pencil marks: notes[i] is a Set of candidate numbers the player has
   jotted down for cell i. Kept separate from the grid itself. */

import { PEERS_OF } from './board.js';

export function emptyNotes() { return Array.from({ length: 81 }, () => new Set()); }

export function toggleNote(notes, i, value) {
  if (notes[i].has(value)) notes[i].delete(value); else notes[i].add(value);
}

/** When a definite value is placed in a cell, real Sudoku etiquette is
 *  to strip that number from the pencil marks of its peers — this is
 *  the "auto-remove invalid candidates" feature. */
export function autoStripPeerNotes(notes, i, value) {
  notes[i].clear();
  for (const p of PEERS_OF[i]) notes[p].delete(value);
}

export function clearNotesAt(notes, i) { notes[i].clear(); }
