/*
 * Strum lane: a column of six pads down the right edge of the board, one per
 * string. Tap a pad to pluck that string; sweep up or down to strum. It is
 * its own pointer, so the right thumb can strum while the left hand drags
 * the steel. Rows are found from the finger's y alone, so a thumb that drifts
 * sideways off the lane keeps strumming. onStrum(si, velocity, delay) decides
 * what each string actually plays (open, or fretted under the bar).
 */
export function attachStrumLane(board, {onStrum}){
  const pointers = new Map(); // pointerId -> {lastRow, lastY, lastT}

  const pads = () => board.querySelectorAll(".lane");

  const rowAt = y => {
    const list = pads();
    for(const p of list){
      const r = p.getBoundingClientRect();
      if(y >= r.top && y < r.bottom) return +p.dataset.string;
    }
    return y < list[0].getBoundingClientRect().top ? 0 : list.length - 1;
  };

  const flash = si => {
    const pad = board.querySelector(`.lane[data-string="${si}"]`);
    if(!pad) return;
    pad.classList.add("hit");
    setTimeout(() => pad.classList.remove("hit"), 140);
  };

  const hit = (si, velocity, delay) => {
    onStrum(si, velocity, delay);
    if(delay === 0) flash(si);
    else setTimeout(() => flash(si), delay * 1000);
  };

  board.addEventListener("pointerdown", e => {
    if(!e.target.closest?.(".lane")) return;
    try{ board.setPointerCapture(e.pointerId); }catch(_e){}
    const row = rowAt(e.clientY);
    pointers.set(e.pointerId, {lastRow: row, lastY: e.clientY, lastT: performance.now()});
    hit(row, 0.85, 0);
    e.preventDefault();
  });

  board.addEventListener("pointermove", e => {
    const st = pointers.get(e.pointerId);
    if(!st) return;
    const row = rowAt(e.clientY);
    if(row === st.lastRow) return;

    const now = performance.now();
    const speed = Math.abs(e.clientY - st.lastY) / Math.max(now - st.lastT, 1);
    const velocity = Math.min(1, 0.35 + speed / 3);
    st.lastY = e.clientY;
    st.lastT = now;

    // fast sweeps can jump rows between move events — sound the skipped
    // strings too, slightly staggered, so a flick always hits every string
    const dir = row > st.lastRow ? 1 : -1;
    const rows = [];
    for(let r = st.lastRow + dir; dir > 0 ? r <= row : r >= row; r += dir) rows.push(r);
    rows.forEach((r, i) => hit(r, velocity, i * 0.008));
    st.lastRow = row;
  });

  const end = e => pointers.delete(e.pointerId);
  board.addEventListener("pointerup", end);
  board.addEventListener("pointercancel", end);
}
