import { CHROMATIC, STRINGS, pretty } from "./notes.js";

/*
 * Name the chord a set of sounding notes makes. A straight bar across any
 * fret plays the open-string chord transposed up; a bar that covers only some
 * strings leaves the rest ringing open, which is a different chord. Either
 * way: match the sounding pitch classes against common chord templates,
 * preferring the bass note as root and the tightest covering template.
 */
const QUALITIES = [
  {suffix: "",     pcs: [0, 4, 7]},
  {suffix: "m",    pcs: [0, 3, 7]},
  {suffix: "maj7", pcs: [0, 4, 7, 11]},
  {suffix: "7",    pcs: [0, 4, 7, 10]},
  {suffix: "m7",   pcs: [0, 3, 7, 10]},
  {suffix: "6",    pcs: [0, 4, 7, 9]},
  {suffix: "m6",   pcs: [0, 3, 7, 9]},
  {suffix: "add9", pcs: [0, 2, 4, 7]},
  {suffix: "sus4", pcs: [0, 5, 7]},
  {suffix: "sus2", pcs: [0, 2, 7]},
  {suffix: "5",    pcs: [0, 7]},
  // fuller / odder shapes that partial bars can produce — appended last so
  // they never displace the names above
  {suffix: "maj9", pcs: [0, 2, 4, 7, 11]},
  {suffix: "9",    pcs: [0, 2, 4, 7, 10]},
  {suffix: "m9",   pcs: [0, 2, 3, 7, 10]},
  {suffix: "madd9", pcs: [0, 2, 3, 7]},
  {suffix: "6/9",  pcs: [0, 2, 4, 7, 9]},
  {suffix: "add11", pcs: [0, 4, 5, 7]},
  {suffix: "madd11", pcs: [0, 3, 5, 7]},
  {suffix: "7sus4", pcs: [0, 5, 7, 10]},
  {suffix: "m7♭5", pcs: [0, 3, 6, 10]},
  {suffix: "dim",  pcs: [0, 3, 6]},
  {suffix: "aug",  pcs: [0, 4, 8]},
];

// -> {rootPc, suffix, score} or null when no template covers every note
export function nameChordFromMidis(midis){
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
  return best;
}

export const analyzeOpenChord = () => nameChordFromMidis(STRINGS.map(s => s.midi));

export const currentRootPc = () =>
  analyzeOpenChord()?.rootPc ?? Math.min(...STRINGS.map(s => s.midi)) % 12;

/*
 * The chord you get with the bar at `fret` covering the strings in `span`
 * ({top, bottom} string indices; omitted = all strings). Strings outside the
 * span ring open. A full bar is named like the open-string chord (no slash);
 * a partial bar names its real voicing, with a slash bass if it isn't the root.
 */
export function barChordName(fret, span){
  const last = STRINGS.length - 1;
  const top = span?.top ?? 0, bottom = span?.bottom ?? last;
  const full = top <= 0 && bottom >= last;
  const midis = STRINGS.map((s, si) => s.midi + (si >= top && si <= bottom ? fret : 0));
  const bassPc = Math.min(...midis) % 12;
  const c = nameChordFromMidis(midis);
  if(!c) return pretty(CHROMATIC[bassPc]) + "?";
  let name = pretty(CHROMATIC[c.rootPc]) + c.suffix;
  if(!full && c.rootPc !== bassPc) name += "/" + pretty(CHROMATIC[bassPc]);
  return name;
}

export function attachChordLabels(board, button){
  // activeFret = where the steel sits (highlighted); -1 = none
  const relabel = (span, activeFret = -1) => {
    board.querySelectorAll(".fretnum").forEach(el => {
      const f = +el.dataset.fret;
      let label = el.querySelector(".chordname");
      if(!label){
        label = document.createElement("span");
        label.className = "chordname";
        el.appendChild(label);
      }
      const name = barChordName(f, span);
      label.textContent = name;
      label.classList.toggle("unnamed", name.endsWith("?")); // a cluster with no chord name

      el.classList.toggle("barfret", f === activeFret);
    });
  };
  button.addEventListener("click", () => {
    const on = board.classList.toggle("show-chords");
    button.classList.toggle("on", on);
  });
  relabel();
  return { relabel };
}
