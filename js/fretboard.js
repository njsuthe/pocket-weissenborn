import { STRINGS, FRETS, MARKERS, noteAt, pretty } from "./notes.js";

export function buildBoard(el){
  el.style.setProperty("--frets", FRETS + 1);

  let html = '<div class="corner"></div>';
  for(let f = 0; f <= FRETS; f++){
    let marker = "";
    if(MARKERS[f] === "single") marker = '<span class="dot"></span>';
    if(MARKERS[f] === "double") marker = '<span class="dot dbl">● ●</span>';
    html += `<div class="fretnum ${f === 0 ? "open" : ""}">${f === 0 ? "Open" : f}${marker}</div>`;
  }

  STRINGS.forEach((s, si) => {
    html += `<div class="strlabel"><span class="open">${pretty(s.open)}</span> <span class="num">str ${s.n}</span></div>`;
    for(let f = 0; f <= FRETS; f++){
      const note = noteAt(s.open, f);
      const isRoot = note === "D";
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
 * Pluck mode: pointerdown sounds the cell under the finger; dragging into a
 * new cell sounds that one too, so sweeping across the strings strums.
 * Each pointer is tracked separately, so multi-touch chords work.
 */
export function attachPluckInteraction(el, onPluck){
  const pointers = new Map(); // pointerId -> {key, t}

  const cellAt = (x, y) => {
    const t = document.elementFromPoint(x, y);
    return t ? t.closest(".cell") : null;
  };

  const fire = (cell, st) => {
    if(!cell) return;
    const key = cell.dataset.string + ":" + cell.dataset.fret;
    const now = performance.now();
    if(st.key === key) return;
    if(now - st.t < 25) return; // no machine-gunning on cell boundaries
    st.key = key;
    st.t = now;
    onPluck(+cell.dataset.string, +cell.dataset.fret, cell);
  };

  el.addEventListener("pointerdown", e => {
    try{ el.setPointerCapture(e.pointerId); }catch(_e){ /* inactive pointer (e.g. synthetic events) */ }
    const st = {key: null, t: 0};
    pointers.set(e.pointerId, st);
    fire(e.target.closest?.(".cell"), st);
    e.preventDefault();
  });

  el.addEventListener("pointermove", e => {
    const st = pointers.get(e.pointerId);
    if(!st) return;
    fire(cellAt(e.clientX, e.clientY), st);
  });

  const end = e => pointers.delete(e.pointerId);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("contextmenu", e => e.preventDefault());
}
