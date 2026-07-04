import { CHROMATIC, STRINGS } from "./notes.js";

export const SCALES = {
  "major": [0, 2, 4, 5, 7, 9, 11],
  "major pent.": [0, 2, 4, 7, 9],
  "minor pent.": [0, 3, 5, 7, 10],
  "blues": [0, 3, 5, 6, 7, 10],
  "mixolydian": [0, 2, 4, 5, 7, 9, 10],
  "natural minor": [0, 2, 3, 5, 7, 8, 10],
};

// Dim every pill outside the scale; outline the roots. Pass scaleName=null to clear.
export function applyScale(board, rootName, scaleName){
  const cells = board.querySelectorAll(".cell");
  if(!scaleName){
    cells.forEach(c => c.classList.remove("out", "scaleroot"));
    return;
  }
  const root = CHROMATIC.indexOf(rootName);
  const inScale = new Set(SCALES[scaleName].map(i => (root + i) % 12));
  cells.forEach(c => {
    const pc = (STRINGS[+c.dataset.string].midi + +c.dataset.fret) % 12;
    c.classList.toggle("out", !inScale.has(pc));
    c.classList.toggle("scaleroot", pc === root);
  });
}
