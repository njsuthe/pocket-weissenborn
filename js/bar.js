import { STRINGS, FRETS } from "./notes.js";

/*
 * Bar mode: a virtual steel bar, always one full six-string length.
 * Tap a fret column to place it. Drag anywhere to slide it along the neck
 * (every string still ringing under it glides along). Grab the bar itself and
 * drag clearly up or down and it moves over the strings instead: part of the
 * bar that would hang off the fretboard is cut away, so dragging down leaves
 * it covering only the low strings, dragging up only the high ones. Strings
 * outside the bar ring open. Each gesture does one or the other, decided in
 * its first few pixels. Release (or a system cancel) snaps to the nearest fret.
 * Strumming happens in the strum lane (strum.js), so a second finger can
 * play while this one moves the steel.
 */
export function attachBarMode(board, {isActive, onGlide, onBarMove}){
  let fret = 0;      // snapped fret the bar sits on
  let pos = 0;       // continuous position while dragging
  let offset = 0;    // rows the bar is shifted from home (+ down, - up)
  const voices = []; // {voice, baseFret} launched under the bar, bent by drags

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.display = "none";

  const span = () => {
    const last = STRINGS.length - 1;
    return {top: Math.max(0, offset), bottom: Math.min(last, last + offset)};
  };
  const covers = si => {
    const {top, bottom} = span();
    return si >= top && si <= bottom;
  };
  const fretFor = si => covers(si) ? Math.round(pos) : 0;

  const applySpan = () => {
    const {top, bottom} = span();
    bar.style.gridRow = `${top + 2} / ${bottom + 3}`; // row 1 = fret numbers
    const on = bar.style.display !== "none";
    board.querySelectorAll(".lane").forEach(l =>
      l.classList.toggle("barred", on && covers(+l.dataset.string)));
  };

  // buildBoard() wipes the board's children on retune — re-append the bar
  const mount = () => { board.appendChild(bar); applySpan(); };

  const metrics = () => {
    const b = board.getBoundingClientRect();
    const r0 = board.querySelector('.cell[data-fret="0"]').getBoundingClientRect();
    const r1 = board.querySelector('.cell[data-fret="1"]').getBoundingClientRect();
    return { x0: r0.left + r0.width / 2 - b.left, w: r1.left - r0.left, rowH: r0.height };
  };

  const place = p => {
    const m = metrics();
    bar.style.left = `${m.x0 + p * m.w}px`;
  };

  const bendAll = final => {
    for(let i = voices.length - 1; i >= 0; i--){
      if(!voices[i].voice.live){ voices.splice(i, 1); continue; }
      const {voice, baseFret} = voices[i];
      const semis = pos - baseFret;
      voice.bend(semis, final ? {tau: 0.05} : undefined);
      onGlide?.(voice, semis, final);
    }
  };

  const show = () => { bar.style.display = ""; };

  const setFret = f => {
    fret = f;
    pos = f;
    if(f === 0){
      bar.style.display = "none";
    }else{
      show();
      place(f);
    }
    applySpan();
    onBarMove?.(fret);
  };

  // is this point on the bar? Any point along its (possibly shortened) length,
  // within half a fret either side of it — a thumb-sized target
  const onBar = (x, y) => {
    if(bar.style.display === "none") return false;
    const r = bar.getBoundingClientRect();
    const half = metrics().w / 2;
    return Math.abs(x - (r.left + r.width / 2)) <= half && y >= r.top && y <= r.bottom;
  };

  const pointers = new Map();

  board.addEventListener("pointerdown", e => {
    if(!isActive()) return;
    if(e.target.closest?.(".lane")) return; // the strum lane has its own handler
    try{ board.setPointerCapture(e.pointerId); }catch(_e){}
    const cell = e.target.closest?.(".cell");
    pointers.set(e.pointerId, {
      x0: e.clientX, y0: e.clientY, mode: null, moved: false,
      grab: onBar(e.clientX, e.clientY),
      rowH: cell ? cell.offsetHeight : 36,
      pos0: pos, offset0: offset, m: null,
    });
    e.preventDefault();
  });

  board.addEventListener("pointermove", e => {
    if(!isActive()) return;
    const st = pointers.get(e.pointerId);
    if(!st) return;

    if(!st.mode){
      const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
      if(Math.max(dx, dy) > 12) st.moved = true;
      // A thumb arcs, so the first few pixels of a slide can be mostly
      // vertical. So: sideways travel past 12px means slide, and only a long,
      // straight run up or down (most of a string row, with almost no
      // sideways drift) on the bar itself shifts it over the strings. Until
      // one of those happens the gesture stays undecided, and once decided it
      // is locked, so a drifting finger can't change which strings are covered.
      if(dx > 12) st.mode = "slide";
      else if(st.grab && dy > st.rowH * 0.7) st.mode = "shift";
      if(!st.mode) return;
      st.m = metrics();
    }

    if(st.mode === "slide"){
      pos = Math.min(FRETS, Math.max(0, st.pos0 + (e.clientX - st.x0) / st.m.w));
      bar.style.display = pos > 0.01 ? "" : "none";
      place(pos);
      bendAll(false);
    }else{
      const last = STRINGS.length - 1;
      // whole string rows
      offset = Math.min(last, Math.max(-last, Math.round(st.offset0 + (e.clientY - st.y0) / st.m.rowH)));
    }
    applySpan();
    onBarMove?.(Math.round(pos));
  });

  // snap the steel to the nearest fret when a gesture ends — including when
  // the system cancels it (iOS does this for edge swipes and alerts), so the
  // bar can never be left stranded between frets
  const settle = () => {
    setFret(Math.round(pos));
    bendAll(true);
  };

  board.addEventListener("pointerup", e => {
    const st = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(!isActive() || !st) return;
    if(st.mode){ settle(); return; }
    if(st.moved) return; // a swipe that never became a slide isn't a tap
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const withFret = t && t.closest("[data-fret]");
    if(withFret) setFret(+withFret.dataset.fret);
  });
  board.addEventListener("pointercancel", e => {
    const st = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(isActive() && st?.mode) settle();
  });

  mount();
  setFret(0);
  return {
    setFret, mount, covers, fretFor,
    registerVoice: (voice, baseFret) => voices.push({voice, baseFret}),
    get fret(){ return fret; },
    get span(){ return span(); },
  };
}
