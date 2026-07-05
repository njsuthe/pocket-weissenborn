import { FRETS } from "./notes.js";

/*
 * Bar mode: a virtual steel bar laid across all six strings.
 * Tap a fret column to place the bar; swipe vertically across the strings
 * to strum the barred chord (velocity from swipe speed); drag horizontally
 * and the steel SLIDES — every string still ringing from the strum glides
 * with it. Release snaps the bar to the nearest fret.
 */
export function attachBarMode(board, {isActive, onStrum, onGlide, onBarMove}){
  let fret = 0;      // snapped fret the bar sits on
  let pos = 0;       // continuous position while dragging
  const voices = []; // {voice, baseFret} launched by strums, bent by drags

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.display = "none";

  // buildBoard() wipes the board's children on retune — re-append the bar
  const mount = () => board.appendChild(bar);

  const metrics = () => {
    const b = board.getBoundingClientRect();
    const r0 = board.querySelector('.cell[data-fret="0"]').getBoundingClientRect();
    const r1 = board.querySelector('.cell[data-fret="1"]').getBoundingClientRect();
    return { x0: r0.left + r0.width / 2 - b.left, w: r1.left - r0.left };
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

  const setFret = f => {
    fret = f;
    pos = f;
    if(f === 0){
      bar.style.display = "none";
    }else{
      bar.style.display = "";
      place(f);
    }
    onBarMove?.(fret);
  };

  const pointers = new Map();

  const rowAt = (x, y) => {
    const t = document.elementFromPoint(x, y);
    const cell = t && t.closest(".cell");
    return cell ? +cell.dataset.string : null;
  };

  board.addEventListener("pointerdown", e => {
    if(!isActive()) return;
    try{ board.setPointerCapture(e.pointerId); }catch(_e){}
    const cell = e.target.closest?.(".cell");
    pointers.set(e.pointerId, {
      x0: e.clientX, y0: e.clientY, mode: null, lastRow: null,
      startRow: cell ? +cell.dataset.string : null,
      lastY: e.clientY, lastT: performance.now(),
      pos0: pos, m: null,
    });
    e.preventDefault();
  });

  board.addEventListener("pointermove", e => {
    if(!isActive()) return;
    const st = pointers.get(e.pointerId);
    if(!st) return;

    if(!st.mode){
      const dx = Math.abs(e.clientX - st.x0), dy = Math.abs(e.clientY - st.y0);
      if(Math.max(dx, dy) > 12) st.mode = dx > dy ? "drag" : "strum";
      if(st.mode === "drag") st.m = metrics();
    }

    if(st.mode === "drag"){
      pos = Math.min(FRETS, Math.max(0, st.pos0 + (e.clientX - st.x0) / st.m.w));
      bar.style.display = "";
      place(pos);
      bendAll(false);
      onBarMove?.(Math.round(pos));
      return;
    }
    if(st.mode !== "strum") return;

    const row = rowAt(e.clientX, e.clientY);
    if(row === null) return;

    const now = performance.now();
    const speed = Math.abs(e.clientY - st.lastY) / Math.max(now - st.lastT, 1);
    const velocity = Math.min(1, 0.35 + speed / 3);
    st.lastY = e.clientY;
    st.lastT = now;

    const hit = (r, delay) => {
      const f = Math.round(pos); // strum at wherever the steel currently sits
      const voice = onStrum(r, f, velocity, delay);
      if(voice) voices.push({voice, baseFret: f});
    };
    if(st.lastRow === null){
      // anchor on the string the finger went down on, so a fast flick
      // that jumps rows before the first move event still hits it
      st.lastRow = st.startRow ?? row;
      hit(st.lastRow, 0);
    }
    if(row !== st.lastRow){
      // fast swipes can jump rows between move events — sound the skipped
      // strings too, slightly staggered, so a flick always hits all six
      const dir = row > st.lastRow ? 1 : -1;
      const hits = [];
      for(let r = st.lastRow + dir; dir > 0 ? r <= row : r >= row; r += dir) hits.push(r);
      hits.forEach((r, i) => hit(r, i * 0.008));
      st.lastRow = row;
    }
  });

  board.addEventListener("pointerup", e => {
    const st = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(!isActive() || !st) return;
    if(st.mode === "drag"){
      setFret(Math.round(pos)); // snap the steel to the nearest fret
      bendAll(true);
      return;
    }
    if(st.mode === "strum") return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const withFret = t && t.closest("[data-fret]");
    if(withFret) setFret(+withFret.dataset.fret);
  });
  board.addEventListener("pointercancel", e => pointers.delete(e.pointerId));

  mount();
  setFret(0);
  return { setFret, mount, get fret(){ return fret; } };
}
