import { CHROMATIC, STRINGS, pretty } from "./notes.js";

/*
 * A straight bar across any fret plays the open-string chord transposed up.
 * Name that chord for any tuning: match the open pitch classes against
 * common chord templates, preferring the bass note as root and the tightest
 * covering template.
 */
const QUALITIES = [
  {suffix: "",     pcs: [0, 4, 7]},
  {suffix: "m",    pcs: [0, 3, 7]},
  {suffix: "maj7", pcs: [0, 4, 7, 11]},
  {suffix: "7",    pcs: [0, 4, 7, 10]},
  {suffix: "m7",   pcs: [0, 3, 7, 10]},
  {suffix: "6",    pcs: [0, 4, 7, 9]},
  {suffix: "m6",   pcs: [0, 3, 7, 9]},
  {suffix: "sus4", pcs: [0, 5, 7]},
  {suffix: "sus2", pcs: [0, 2, 7]},
  {suffix: "5",    pcs: [0, 7]},
];

export function analyzeOpenChord(){
  const midis = STRINGS.map(s => s.midi);
  const pcs = new Set(midis.map(m => m % 12));
  const bass = Math.min(...midis) % 12;
  let best = null;
  for(const root of new Set([bass, ...pcs])){
    QUALITIES.forEach((q, qi) => {
      const set = new Set(q.pcs.map(i => (root + i) % 12));
      if(![...pcs].every(pc => set.has(pc))) return; // template must cover every sounded note
      const score = (root === bass ? 0 : 10)        // strongly prefer the bass as root
                  + (set.size - pcs.size) * 2       // prefer exact matches over incomplete chords
                  + qi * 0.1;                       // then simpler qualities
      if(!best || score < best.score) best = {rootPc: root, suffix: q.suffix, score};
    });
  }
  return best; // null for exotic custom tunings
}

export const currentRootPc = () =>
  analyzeOpenChord()?.rootPc ?? Math.min(...STRINGS.map(s => s.midi)) % 12;

export function barChordName(fret){
  const c = analyzeOpenChord();
  const rootPc = c ? c.rootPc : currentRootPc();
  const name = pretty(CHROMATIC[(rootPc + fret) % 12]);
  return c ? name + c.suffix : name + "?";
}

export function attachChordLabels(board, button){
  const relabel = () => {
    board.querySelectorAll(".fretnum").forEach(el => {
      let span = el.querySelector(".chordname");
      if(!span){
        span = document.createElement("span");
        span.className = "chordname";
        el.appendChild(span);
      }
      span.textContent = barChordName(+el.dataset.fret);
    });
  };
  button.addEventListener("click", () => {
    const on = board.classList.toggle("show-chords");
    button.classList.toggle("on", on);
  });
  relabel();
  return { relabel };
}
