import { noteAt, pretty } from "./notes.js";

/*
 * Open D's superpower: a straight bar across any fret is a major chord.
 * Label each fret header with the chord you get there (0 = D, 5 = G, 7 = A…).
 */
export function attachChordLabels(board, button){
  board.querySelectorAll(".fretnum").forEach(el => {
    const span = document.createElement("span");
    span.className = "chordname";
    span.textContent = pretty(noteAt("D", +el.dataset.fret));
    el.appendChild(span);
  });
  button.addEventListener("click", () => {
    const on = board.classList.toggle("show-chords");
    button.classList.toggle("on", on);
  });
}
