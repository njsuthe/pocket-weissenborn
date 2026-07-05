export const CHROMATIC = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

export const FRETS = 12;
export const MARKERS = {3:"single",5:"single",7:"single",9:"single",12:"double"};

// preset tunings, midi low string → high string
export const TUNINGS = {
  "Open D":       [38, 45, 50, 54, 57, 62], // D A D F# A D
  "Open D minor": [38, 45, 50, 53, 57, 62], // D A D F  A D
  "Open D maj7":  [38, 45, 50, 54, 57, 61], // D A D F# A C#
  "Open G":       [38, 43, 50, 55, 59, 62], // D G D G B D (taro patch)
  "Open C":       [36, 43, 48, 55, 60, 64], // C G C G C E
  "C6":           [48, 52, 55, 57, 60, 64], // C E G A C E
};

const GAUGES = [1.2, 1.6, 2.2, 2.8, 3.4, 4.0]; // display thickness, high → low

// strings 1..6 (high to low) for top-to-bottom, tab-style display.
// Mutated in place by setTuning so every module reads the live tuning.
export const STRINGS = [];

export function setTuning(midisLowToHigh){
  const highToLow = [...midisLowToHigh].reverse();
  STRINGS.length = 0;
  highToLow.forEach((midi, i) => STRINGS.push({
    n: i + 1,
    midi,
    open: CHROMATIC[midi % 12],
    gauge: GAUGES[i],
  }));
}
setTuning(TUNINGS["Open D"]);

export const pretty = s => s.replace("#","♯");
export const noteAt = (open, fret) =>
  CHROMATIC[(CHROMATIC.indexOf(open) + fret) % 12];
export const midiAt = (string, fret) => string.midi + fret;
export const freqOf = midi => 440 * Math.pow(2, (midi - 69) / 12);
export const nameWithOctave = midi => `${CHROMATIC[midi % 12]}${Math.floor(midi / 12) - 1}`;
