import { freqOf } from "./notes.js";

/*
 * Audio engines implement: unlock(), pluck(midi, {velocity}), warm(midis), running.
 * KarplusStrongEngine synthesizes plucked strings; a future SampleEngine can
 * implement the same surface and drop in without touching the UI code.
 */
export class KarplusStrongEngine {
  constructor(){
    this.ctx = null;
    this.master = null;
    this.cache = new Map(); // midi -> AudioBuffer
    this.silent = null;
  }

  get running(){
    return !!this.ctx && this.ctx.state === "running";
  }

  // Must be called from a user gesture on iOS.
  unlock(){
    if(!this.ctx){
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 6;
      comp.attack.value = 0.002;
      comp.release.value = 0.2;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp);
      this.#startSilentLoop();
    }
    if(this.ctx.state !== "running") this.ctx.resume();
  }

  // iOS Safari mutes Web Audio when the ring/silent switch is on; a looping
  // HTML media element moves the session to the "playback" category so notes
  // still sound. The wav data is pure zeros.
  #startSilentLoop(){
    try{
      const a = new Audio(silentWavURL(2));
      a.loop = true;
      a.playsInline = true;
      a.play().catch(() => {});
      this.silent = a;
    }catch(_e){ /* non-fatal — audio just obeys the silent switch */ }
  }

  pluck(midi, {velocity = 1, when = 0} = {}){
    this.unlock();
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.#buffer(midi);
    const g = ctx.createGain();
    g.gain.value = Math.min(Math.max(velocity, 0.05), 1);
    src.connect(g);
    g.connect(this.master);
    src.start(ctx.currentTime + when);
    src.onended = () => { src.disconnect(); g.disconnect(); };
  }

  // Pre-render buffers in the background so the first press of each note
  // has zero synth cost.
  warm(midis){
    if(!this.ctx) return;
    const queue = midis.filter(m => !this.cache.has(m));
    const step = () => {
      const m = queue.shift();
      if(m === undefined) return;
      this.#buffer(m);
      setTimeout(step, 20);
    };
    setTimeout(step, 250);
  }

  #buffer(midi){
    let b = this.cache.get(midi);
    if(!b){
      b = renderPluck(this.ctx, freqOf(midi));
      this.cache.set(midi, b);
    }
    return b;
  }
}

// Karplus-Strong: noise burst through an averaging delay line, rendered
// offline into a buffer. `damp` is chosen so the note reaches -60 dB at t60,
// with low strings ringing longer than high ones.
function renderPluck(ctx, freq){
  const sr = ctx.sampleRate;
  const t60 = Math.min(5, 1.6 + 220 / freq);
  const len = Math.floor(sr * t60);
  const N = Math.max(2, Math.round(sr / freq));
  const damp = Math.pow(0.001, 1 / (t60 * freq));

  const delay = new Float32Array(N);
  let prev = 0;
  for(let i = 0; i < N; i++){
    const r = Math.random() * 2 - 1;
    delay[i] = (r + prev) / 2; // pre-smoothed noise = mellower pick attack
    prev = r;
  }

  const out = new Float32Array(len);
  let idx = 0;
  for(let i = 0; i < len; i++){
    const cur = delay[idx];
    const nxt = delay[(idx + 1) % N];
    delay[idx] = damp * 0.5 * (cur + nxt);
    out[i] = cur;
    idx = (idx + 1) % N;
  }

  let peak = 0;
  for(let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  const k = peak > 0 ? 0.9 / peak : 1;
  const fade = Math.floor(sr * 0.08);
  for(let i = 0; i < len; i++){
    let s = out[i] * k;
    if(i > len - fade) s *= (len - i) / fade;
    out[i] = s;
  }

  const buf = ctx.createBuffer(1, len, sr);
  buf.copyToChannel(out, 0);
  return buf;
}

function silentWavURL(seconds){
  const sr = 8000, n = sr * seconds;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o, s) => { for(let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], {type: "audio/wav"}));
}
