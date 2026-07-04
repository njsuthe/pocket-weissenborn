/*
 * Bar mode: a virtual steel bar laid across all six strings.
 * Tap a fret column to place the bar; swipe vertically across the strings
 * to strum the barred chord, velocity taken from swipe speed.
 * The bar element is a grid child of the board, so it tracks the layout
 * without any rect math.
 */
export function attachBarMode(board, {isActive, onStrum, onBarMove}){
  let fret = 0;

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.display = "none";
  board.appendChild(bar);

  const setFret = f => {
    fret = f;
    if(f === 0){
      bar.style.display = "none";
    }else{
      bar.style.display = "";
      bar.style.gridColumn = String(f + 2); // col 1 = labels, col 2 = open
    }
    onBarMove?.(fret);
  };

  const pointers = new Map(); // pointerId -> swipe state

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
      y0: e.clientY, strumming: false, lastRow: null,
      startRow: cell ? +cell.dataset.string : null,
      lastY: e.clientY, lastT: performance.now(),
    });
    e.preventDefault();
  });

  board.addEventListener("pointermove", e => {
    if(!isActive()) return;
    const st = pointers.get(e.pointerId);
    if(!st) return;

    if(!st.strumming && Math.abs(e.clientY - st.y0) > 12) st.strumming = true;
    if(!st.strumming) return;

    const row = rowAt(e.clientX, e.clientY);
    if(row === null) return;

    const now = performance.now();
    const speed = Math.abs(e.clientY - st.lastY) / Math.max(now - st.lastT, 1);
    const velocity = Math.min(1, 0.35 + speed / 3);
    st.lastY = e.clientY;
    st.lastT = now;

    if(st.lastRow === null){
      // anchor on the string the finger went down on, so a fast flick
      // that jumps rows before the first move event still hits it
      st.lastRow = st.startRow ?? row;
      onStrum(st.lastRow, fret, velocity, 0);
    }
    if(row !== st.lastRow){
      // fast swipes can jump rows between move events — sound the skipped
      // strings too, slightly staggered, so a flick always hits all six
      const dir = row > st.lastRow ? 1 : -1;
      const hits = [];
      for(let r = st.lastRow + dir; dir > 0 ? r <= row : r >= row; r += dir) hits.push(r);
      hits.forEach((r, i) => onStrum(r, fret, velocity, i * 0.008));
      st.lastRow = row;
    }
  });

  board.addEventListener("pointerup", e => {
    const st = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if(!isActive() || !st || st.strumming) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const withFret = t && t.closest("[data-fret]");
    if(withFret) setFret(+withFret.dataset.fret);
  });
  board.addEventListener("pointercancel", e => pointers.delete(e.pointerId));

  setFret(0);
  return { setFret, get fret(){ return fret; } };
}
