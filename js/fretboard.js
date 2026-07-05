import { STRINGS, FRETS, MARKERS, CHROMATIC, midiAt, pretty } from "./notes.js";
import { currentRootPc } from "./chords.js";

export function buildBoard(el){
  el.style.setProperty("--frets", FRETS + 1);
  const rootPc = currentRootPc();

  let html = '<div class="corner"></div>';
  for(let f = 0; f <= FRETS; f++){
    let marker = "";
    if(MARKERS[f] === "single") marker = '<span class="dot"></span>';
    if(MARKERS[f] === "double") marker = '<span class="dot dbl">● ●</span>';
    html += `<div class="fretnum ${f === 0 ? "open" : ""}" data-fret="${f}">${f === 0 ? "Open" : f}${marker}</div>`;
  }

  STRINGS.forEach((s, si) => {
    html += `<div class="strlabel"><span class="open">${pretty(s.open)}</span> <span class="num">str ${s.n}</span></div>`;
    for(let f = 0; f <= FRETS; f++){
      const midi = midiAt(s, f);
      const note = CHROMATIC[midi % 12];
      const isRoot = midi % 12 === rootPc;
      const isSharp = note.includes("#");
      let cls = "pill";
      if(f === 0) cls += " openpill";
      else if(isRoot) cls += " root";
      else if(isSharp) cls += " sharp";
      html += `<div class="cell${f === 0 ? " open-col" : ""}" data-string="${si}" data-fret="${f}" style="--gauge:${s.gauge}px">
                 <span class="${cls}">${pretty(note)}</span>
               </div>`;
    }
  });

  el.innerHTML = html;
}

/*
 * Pluck mode: pointerdown sounds the cell under the finger. Dragging
 * vertically onto another string plucks it (finger strums); dragging
 * horizontally along the same string GLIDES the ringing note — fractional
 * frets and all, like moving the steel. Release soft-snaps to the nearest
 * fret. Each pointer is tracked separately, so multi-touch chords work.
 */
export function attachPluckInteraction(el, {onPluck, onGlide, isActive = () => true}){
  const pointers = new Map(); // pointerId -> slide state

  const cellAt = (x, y) => {
    const t = document.elementFromPoint(x, y);
    return t ? t.closest(".cell") : null;
  };

  const setTarget = (st, cell) => {
    if(st.target === cell) return;
    st.target?.classList.remove("slide-target");
    st.target = cell;
    cell?.classList.add("slide-target");
  };

  const begin = (st, cell) => {
    const r = cell.getBoundingClientRect();
    st.si = +cell.dataset.string;
    st.baseFret = +cell.dataset.fret;
    st.cellW = r.width;
    st.originX = r.left + r.width / 2;
    st.semis = 0;
    st.voice = onPluck(st.si, st.baseFret, cell) ?? null;
    setTarget(st, cell);
  };

  el.addEventListener("pointerdown", e => {
    if(!isActive()) return;
    try{ el.setPointerCapture(e.pointerId); }catch(_e){ /* inactive pointer (e.g. synthetic events) */ }
    const st = {};
    pointers.set(e.pointerId, st);
    const cell = e.target.closest?.(".cell");
    if(cell) begin(st, cell);
    e.preventDefault();
  });

  el.addEventListener("pointermove", e => {
    if(!isActive()) return;
    const st = pointers.get(e.pointerId);
    if(!st) return;
    const cell = cellAt(e.clientX, e.clientY);
    if(!cell) return;
    if(st.si === undefined || +cell.dataset.string !== st.si){
      begin(st, cell); // first cell reached, or crossed strings: pluck (strum)
    }else if(st.voice){
      const raw = (e.clientX - st.originX) / st.cellW; // cell width = one semitone
      st.semis = Math.min(Math.max(raw, -st.baseFret), FRETS - st.baseFret);
      st.voice.bend(st.semis);
      onGlide?.(st.voice, st.semis, false);
      setTarget(st, cell);
    }
  });

  const end = e => {
    const st = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(!st) return;
    setTarget(st, null);
    if(st.voice && st.semis){
      const snapped = Math.round(st.semis); // land in tune
      st.voice.bend(snapped, {tau: 0.05});
      onGlide?.(st.voice, snapped, true);
    }
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("contextmenu", e => e.preventDefault());
}
