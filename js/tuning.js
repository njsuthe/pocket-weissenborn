import { STRINGS, TUNINGS, setTuning, pretty, nameWithOctave } from "./notes.js";

const KEY = "pw.tuning";
const MIDI_MIN = 31, MIDI_MAX = 69; // G1 … A4 — sane string range

const lowToHigh = () => STRINGS.map(s => s.midi).reverse();

/*
 * Tuning UI: a preset <select>, live header chips, and a per-string ▲▼
 * stepper panel. Any manual step turns the preset into "custom". The
 * current tuning persists in localStorage; onChange lets the app rebuild
 * everything that derives from the tuning.
 */
export function initTuning({select, panelBtn, panel, chips, onChange}){
  try{
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if(Array.isArray(saved?.midis) && saved.midis.length === STRINGS.length){
      setTuning(saved.midis);
    }
  }catch(_e){ /* first run or blocked storage */ }

  Object.keys(TUNINGS).forEach(n => select.add(new Option(n, n)));
  select.add(new Option("custom", "custom"));

  const currentName = () =>
    Object.keys(TUNINGS).find(n => TUNINGS[n].join() === lowToHigh().join()) || "custom";

  const render = () => {
    select.value = currentName();
    // header chips, low string (6) on the left like a headstock read-out
    chips.innerHTML = [...STRINGS].reverse()
      .map(s => `<span class="chip">${s.n} <b>${pretty(s.open)}</b></span>`)
      .join("");
    panel.innerHTML = [...STRINGS].reverse().map(s => `
      <span class="tstr">${s.n}
        <button class="ctl" data-n="${s.n}" data-d="-1" title="Down a semitone">−</button>
        <b>${pretty(nameWithOctave(s.midi))}</b>
        <button class="ctl" data-n="${s.n}" data-d="1" title="Up a semitone">+</button>
      </span>`).join("");
    try{ localStorage.setItem(KEY, JSON.stringify({name: currentName(), midis: lowToHigh()})); }catch(_e){}
    onChange();
  };

  select.addEventListener("change", () => {
    if(TUNINGS[select.value]){
      setTuning(TUNINGS[select.value]);
      render();
    }
  });

  panelBtn.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    panelBtn.classList.toggle("on", !panel.hidden);
  });

  panel.addEventListener("click", e => {
    const b = e.target.closest("button[data-n]");
    if(!b) return;
    const s = STRINGS.find(x => x.n === +b.dataset.n);
    const next = Math.min(MIDI_MAX, Math.max(MIDI_MIN, s.midi + +b.dataset.d));
    if(next === s.midi) return;
    const midis = lowToHigh();
    midis[STRINGS.length - s.n] = next; // string n counts down from the high side
    setTuning(midis);
    render();
  });

  render();
}
