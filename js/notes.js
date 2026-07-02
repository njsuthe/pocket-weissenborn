export const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// strings 1..6 (high to low) for top-to-bottom, tab-style display.
// midi = open-string pitch; Open D tuning: D4 A3 F#3 D3 A2 D2.
export const STRINGS = [
  {n:1, open:"D",  midi:62, gauge:1.2},
  {n:2, open:"A",  midi:57, gauge:1.6},
  {n:3, open:"F#", midi:54, gauge:2.2},
  {n:4, open:"D",  midi:50, gauge:2.8},
  {n:5, open:"A",  midi:45, gauge:3.4},
  {n:6, open:"D",  midi:38, gauge:4.0},
];

export const FRETS = 12;
export const MARKERS = {3:"single",5:"single",7:"single",9:"single",12:"double"};

export const pretty = s => s.replace("#","♯");
export const noteAt = (open, fret) =>
  CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
export const midiAt = (string, fret) => string.midi + fret;
export const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);
