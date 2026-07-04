import { CHROMATIC, STRINGS, FRETS, midiAt, noteAt, pretty } from "./notes.js";
import { KarplusStrongEngine } from "./engine.js";
import { buildBoard, attachPluckInteraction } from "./fretboard.js";
import { attachBarMode } from "./bar.js";
import { SCALES, applyScale } from "./scales.js";
import { attachChordLabels } from "./chords.js";
import { Looper } from "./looper.js";

const engine = new KarplusStrongEngine();
const board = document.getElementById("board");
const audioChip = document.getElementById("audiostate");

buildBoard(board);

const flash = (si, fret) => {
  const pill = board.querySelector(`.cell[data-string="${si}"][data-fret="${fret}"] .pill`);
  if(!pill) return;
  pill.classList.remove("ring");
  void pill.offsetWidth; // restart the animation
  pill.classList.add("ring");
};

// --- looper transport ---
const recBtn = document.getElementById("recbtn");
const playBtn = document.getElementById("playbtn");
const clearBtn = document.getElementById("clearbtn");

function reflectLoopState(state, length, count){
  recBtn.classList.toggle("on", state === "rec" || state === "overdub");
  recBtn.textContent =
    state === "rec" ? "■ set loop" :
    state === "play" || state === "overdub" || state === "stopped" ? "● odub" :
    "● rec";
  playBtn.classList.toggle("on", state === "play" || state === "overdub");
  playBtn.textContent = state === "play" || state === "overdub" ? "■" : "▶";
  playBtn.disabled = !(length > 0 && count > 0);
  clearBtn.disabled = state === "idle";
}

const looper = new Looper({
  play: (si, fret, velocity, t) => sound(si, fret, velocity, t, true),
  onState: reflectLoopState,
});

recBtn.addEventListener("click", () => looper.toggleRecord());
playBtn.addEventListener("click", () => looper.togglePlay());
clearBtn.addEventListener("click", () => looper.clear());

// --- one gate for every note: audio + pill flash + loop capture ---
function sound(si, fret, velocity = 1, when = 0, fromLoop = false){
  engine.pluck(midiAt(STRINGS[si], fret), {velocity, when});
  if(when * 1000 < 20) flash(si, fret);
  else setTimeout(() => flash(si, fret), when * 1000);
  if(!fromLoop) looper.capture(si, fret, velocity);
}

// --- playing modes ---
let mode = "pluck";

attachPluckInteraction(board, (si, fret) => sound(si, fret), () => mode === "pluck");

const barhint = document.getElementById("barhint");
const barCtl = attachBarMode(board, {
  isActive: () => mode === "bar",
  onStrum: (si, fret, velocity, delay) => sound(si, fret, velocity, delay),
  onBarMove: () => updateBarHint(),
});

function updateBarHint(){
  barhint.hidden = mode !== "bar";
  if(mode !== "bar") return;
  const f = barCtl.fret;
  barhint.textContent = f === 0
    ? "open — D major · tap a fret to set the bar"
    : `bar @ ${f} — ${pretty(noteAt("D", f))} major · swipe the strings to strum`;
}

document.querySelectorAll(".segbtn").forEach(b => {
  b.addEventListener("click", () => {
    mode = b.dataset.mode;
    document.querySelectorAll(".segbtn").forEach(x => x.classList.toggle("active", x === b));
    board.classList.toggle("barmode", mode === "bar");
    updateBarHint();
  });
});

// --- scale highlighting ---
const rootSel = document.getElementById("scaleroot");
const typeSel = document.getElementById("scaletype");
CHROMATIC.forEach(n => rootSel.add(new Option(pretty(n), n, n === "D", n === "D")));
typeSel.add(new Option("scale: off", ""));
Object.keys(SCALES).forEach(s => typeSel.add(new Option(s, s)));
const reScale = () => applyScale(board, rootSel.value, typeSel.value || null);
rootSel.addEventListener("change", reScale);
typeSel.addEventListener("change", reScale);

// --- chord labels on fret headers ---
attachChordLabels(board, document.getElementById("chordsbtn"));

// --- audio unlock + buffer warm on first interaction ---
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

// cache-first SW would serve stale files during local dev — only register in production
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
if("serviceWorker" in navigator && !isLocal){
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}

window.__pw = { engine, looper }; // console handle for on-device debugging
