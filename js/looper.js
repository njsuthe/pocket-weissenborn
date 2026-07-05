/*
 * Event looper: records what you play as events — not audio — and replays
 * them through the engine. Pluck events are {t, si, fret, velocity}; slides
 * are captured as glide events {t, glide: semis, ref} where ref indexes the
 * originating pluck, so replayed voices bend just like the live ones did.
 * The loop clock starts at your first note; closing the loop sets its
 * length. Overdub layers new notes into the running loop.
 *
 * Modes: idle → rec → play ⇄ overdub, play/overdub ⇄ stopped.
 */
export class Looper{
  constructor({play, onState}){
    this.play = play; // (si, fret, velocity, when) -> voice handle
    this.onState = onState;
    this.events = [];
    this.length = 0;
    this.mode = "idle";
    this.recStart = 0;
    this.loopStart = 0;
    this.timer = null;
    this.lastGlide = new Map(); // ref -> last capture time (throttle)
    this.emit();
  }

  emit(){
    this.onState?.(this.mode, this.length, this.events.length);
  }

  #now(){
    if(this.mode === "rec"){
      if(!this.recStart) this.recStart = performance.now();
      return (performance.now() - this.recStart) / 1000;
    }
    return ((performance.now() - this.loopStart) / 1000) % this.length;
  }

  get #recording(){
    return this.mode === "rec" || (this.mode === "overdub" && this.length > 0);
  }

  // returns the event index so glides can reference their pluck, or null
  capture(si, fret, velocity){
    if(!this.#recording) return null;
    this.events.push({t: this.#now(), si, fret, velocity});
    this.emit();
    return this.events.length - 1;
  }

  captureGlide(ref, semis, force = false){
    if(ref == null || !this.#recording) return;
    const now = performance.now();
    if(!force && (this.lastGlide.get(ref) ?? 0) > now - 50) return;
    this.lastGlide.set(ref, now);
    this.events.push({t: this.#now(), glide: semis, ref});
  }

  toggleRecord(){
    if(this.mode === "idle"){
      this.events = [];
      this.recStart = 0;
      this.mode = "rec";
    }else if(this.mode === "rec"){
      if(!this.recStart || !this.events.length){
        this.mode = "idle";
      }else{
        this.length = Math.max((performance.now() - this.recStart) / 1000, 0.5);
        this.mode = "play";
        this.#startLoop();
      }
    }else if(this.mode === "play"){
      this.mode = "overdub";
    }else if(this.mode === "overdub"){
      this.mode = "play";
    }else if(this.mode === "stopped"){
      this.mode = "overdub";
      this.#startLoop();
    }
    this.emit();
  }

  togglePlay(){
    if(this.mode === "play" || this.mode === "overdub"){
      this.#stopLoop();
      this.mode = "stopped";
    }else if(this.mode === "stopped"){
      this.mode = "play";
      this.#startLoop();
    }
    this.emit();
  }

  clear(){
    this.#stopLoop();
    this.events = [];
    this.length = 0;
    this.recStart = 0;
    this.lastGlide.clear();
    this.mode = "idle";
    this.emit();
  }

  #startLoop(){
    this.#stopLoop();
    const tick = () => {
      this.loopStart = performance.now();
      // snapshot: notes overdubbed mid-pass sound live now, replay next pass
      const snapshot = [...this.events];
      const voices = [];
      snapshot.forEach((ev, i) => {
        if(ev.glide === undefined) voices[i] = this.play(ev.si, ev.fret, ev.velocity, ev.t);
      });
      snapshot.forEach(ev => {
        if(ev.glide !== undefined) voices[ev.ref]?.bend(ev.glide, {when: ev.t});
      });
      this.timer = setTimeout(tick, this.length * 1000);
    };
    tick();
  }

  #stopLoop(){
    if(this.timer){
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
