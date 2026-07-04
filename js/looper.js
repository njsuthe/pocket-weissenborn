/*
 * Event looper: records what you play as (time, string, fret, velocity)
 * events — not audio — and replays them through the engine. The loop clock
 * starts at your first note; closing the loop sets its length. Overdub
 * layers new notes into the running loop.
 *
 * Modes: idle → rec → play ⇄ overdub, play/overdub ⇄ stopped.
 */
export class Looper{
  constructor({play, onState}){
    this.play = play;
    this.onState = onState;
    this.events = [];
    this.length = 0;
    this.mode = "idle";
    this.recStart = 0;
    this.loopStart = 0;
    this.timer = null;
    this.emit();
  }

  emit(){
    this.onState?.(this.mode, this.length, this.events.length);
  }

  capture(si, fret, velocity){
    if(this.mode === "rec"){
      if(!this.recStart) this.recStart = performance.now();
      this.events.push({t: (performance.now() - this.recStart) / 1000, si, fret, velocity});
      this.emit();
    }else if(this.mode === "overdub" && this.length){
      const t = ((performance.now() - this.loopStart) / 1000) % this.length;
      this.events.push({t, si, fret, velocity});
      this.emit();
    }
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
    this.mode = "idle";
    this.emit();
  }

  #startLoop(){
    this.#stopLoop();
    const tick = () => {
      this.loopStart = performance.now();
      // snapshot: notes overdubbed mid-pass sound live now, replay next pass
      [...this.events].forEach(ev => this.play(ev.si, ev.fret, ev.velocity, ev.t));
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
