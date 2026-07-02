import { STRINGS, FRETS, midiAt } from "./notes.js";
import { KarplusStrongEngine } from "./engine.js";
import { buildBoard, attachPluckInteraction } from "./fretboard.js";

const engine = new KarplusStrongEngine();
const board = document.getElementById("board");
const audioChip = document.getElementById("audiostate");

buildBoard(board);

attachPluckInteraction(board, (si, fret, cell) => {
  engine.pluck(midiAt(STRINGS[si], fret));
  const pill = cell.querySelector(".pill");
  pill.classList.remove("ring");
  void pill.offsetWidth; // restart the animation
  pill.classList.add("ring");
});

let warmed = false;
window.addEventListener("pointerdown", () => {
  if(engine.running) return;
  engine.unlock();
  if(!warmed){
    warmed = true;
    const all = new Set();
    STRINGS.forEach(s => { for(let f = 0; f <= FRETS; f++) all.add(midiAt(s, f)); });
    engine.warm([...all]);
  }
  let tries = 0;
  const tick = () => {
    if(engine.running){
      audioChip.textContent = "● strings live";
      audioChip.classList.add("live");
    }else if(++tries < 20){
      setTimeout(tick, 150);
    }
  };
  tick();
}, {capture: true});

if("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}

window.__pw = { engine }; // console handle for on-device debugging
