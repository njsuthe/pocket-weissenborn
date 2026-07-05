import { CHROMATIC, STRINGS, FRETS, midiAt, pretty } from "./notes.js";
import { KarplusStrongEngine } from "./engine.js";
import { buildBoard, attachPluckInteraction } from "./fretboard.js";
import { attachBarMode } from "./bar.js";
import { SCALES, applyScale } from "./scales.js";
import { attachChordLabels, barChordName, currentRootPc } from "./chords.js";
import { Looper } from "./looper.js";
import { initTuning } from "./tuning.js";

const engine = new KarplusStrongEngine();
const board = document.getElementById("board");
const audioChip = document.getElementById("audiostate");

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
  const voice = engine.pluck(midiAt(STRINGS[si], fret), {velocity, when});
  if(when * 1000 < 20) flash(si, fret);
  else setTimeout(() => flash(si, fret), when * 1000);
  voice.evId = fromLoop ? null : looper.capture(si, fret, velocity);
  return voice;
}
// …and one gate for every slide, so loops capture those too
function glide(voice, semis, final){
  looper.captureGlide(voice?.evId, semis, final);
}

// --- playing modes ---
let mode = "pluck";

attachPluckInteraction(board, {
  isActive: () => mode === "pluck",
  onPluck: (si, fret) => sound(si, fret),
  onGlide: glide,
});

const barhint = document.getElementById("barhint");
const barCtl = attachBarMode(board, {
  isActive: () => mode === "bar",
  onStrum: (si, fret, velocity, delay) => sound(si, fret, velocity, delay),
  onGlide: glide,
  onBarMove: () => updateBarHint(),
});

function updateBarHint(){
  barhint.hidden = mode !== "bar";
  if(mode !== "bar") return;
  const f = barCtl.fret;
  barhint.textContent = f === 0
    ? `open — ${barChordName(0)} · tap a fret to set the bar`
    : `bar @ ${f} — ${barChordName(f)} · swipe to strum, drag to slide`;
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
const chordCtl = attachChordLabels(board, document.getElementById("chordsbtn"));
const legendRoot = document.getElementById("legendroot");

// --- tuning: everything below derives from it, rebuilt on change ---
function warmAll(){
  const all = new Set();
  STRINGS.forEach(s => { for(let f = 0; f <= FRETS; f++) all.add(midiAt(s, f)); });
  engine.warm([...all]);
}

function retune(){
  buildBoard(board);
  barCtl.mount();               // buildBoard wiped the bar element
  barCtl.setFret(barCtl.fret);
  chordCtl.relabel();
  reScale();
  updateBarHint();
  legendRoot.textContent = `${pretty(CHROMATIC[currentRootPc()])} — the root note`;
  warmAll();
}

initTuning({
  select: document.getElementById("tuningsel"),
  panelBtn: document.getElementById("tunebtn"),
  panel: document.getElementById("tunepanel"),
  chips: document.getElementById("tuningchips"),
  onChange: retune, // fires once at init → first board build
});

// --- compact play layout: real landscape, or portrait rotated 90° by CSS ---
const compactQs = [
  matchMedia("(max-height: 560px)"),
  matchMedia("(orientation: portrait) and (max-width: 760px)"),
];
const setCompact = () =>
  document.body.classList.toggle("compact", compactQs.some(q => q.matches));
compactQs.forEach(q => q.addEventListener("change", setCompact));
setCompact();

// --- audio unlock + buffer warm on first interaction ---
window.addEventListener("pointerdown", () => {
  // real orientation lock where supported (Android standalone); no-op on iOS
  try{ screen.orientation?.lock?.("landscape")?.catch(() => {}); }catch(_e){}
  if(engine.running) return;
  engine.unlock();
  warmAll();
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

window.__pw = { engine, looper, barCtl }; // console handle for on-device debugging
