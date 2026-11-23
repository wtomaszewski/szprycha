import { radioSampleRate as sampleRate } from '../../src/audio/radio/catalog.ts';
import {
  seededRandom,
  type Note,
  type Score,
} from '../../src/audio/radio/compose.ts';
import type { Patch } from '../../src/audio/radio/styles.ts';

export { sampleRate };

type Percussion = 'kick' | 'snare' | 'hat';
type Instrument = Exclude<Patch, Percussion>;
type Voice = {
  harmonics: number[];
  adsr: [attack: number, decay: number, sustain: number, release: number];
  depth: number;
  gain: number;
};

const voices: Record<Instrument, Voice> = {
  pulse: {
    harmonics: [1, 0.55, 0.14, -0.16, -0.16, -0.06, 0.08],
    adsr: [0.006, 0.08, 0.58, 0.06],
    depth: 0.0028,
    gain: 0.24,
  },
  chip: {
    harmonics: [1, 0, 0.4, 0, 0.21, 0, 0.11, 0, 0.07],
    adsr: [0.004, 0.04, 0.67, 0.045],
    depth: 0.0019,
    gain: 0.23,
  },
  soft: {
    harmonics: [1, 0, -0.1, 0, 0.03],
    adsr: [0.036, 0.24, 0.73, 0.42],
    depth: 0.0042,
    gain: 0.25,
  },
  keys: {
    harmonics: [1, 0.19, 0.17, -0.06, 0.18],
    adsr: [0.014, 0.36, 0.3, 0.26],
    depth: 0.0032,
    gain: 0.29,
  },
  bell: {
    harmonics: [1, 0.09, 0.55, 0.14, 0.27, 0, 0.1],
    adsr: [0.005, 0.18, 0.27, 0.29],
    depth: 0.0014,
    gain: 0.25,
  },
  pad: {
    harmonics: [1, 0.18, 0.06, 0.06],
    adsr: [0.24, 0.46, 0.77, 0.6],
    depth: 0.0052,
    gain: 0.22,
  },
  pluck: {
    harmonics: [1, 0.41, 0.3, 0.26, 0.12, 0.08],
    adsr: [0.009, 0.11, 0.27, 0.085],
    depth: 0.0013,
    gain: 0.25,
  },
  reed: {
    harmonics: [1, 0.11, 0.62, 0.12, 0.29, 0.05, 0.1],
    adsr: [0.016, 0.14, 0.56, 0.1],
    depth: 0.0047,
    gain: 0.23,
  },
  sub: {
    harmonics: [1, 0.045, 0.08],
    adsr: [0.016, 0.18, 0.7, 0.11],
    depth: 0,
    gain: 0.29,
  },
  bass: {
    harmonics: [1, 0.34, 0.2, 0.12, 0.09],
    adsr: [0.005, 0.09, 0.62, 0.07],
    depth: 0,
    gain: 0.29,
  },
};

const tableSize = 1024;
const tau = Math.PI * 2;
function table(harmonics: number[], count: number) {
  const values = new Float32Array(tableSize);
  for (let harmonic = 0; harmonic < count; harmonic++)
    for (let i = 0; i < tableSize; i++)
      values[i]! +=
        harmonics[harmonic]! * Math.sin(((harmonic + 1) * i * tau) / tableSize);
  return values;
}

const sine = table([1], 1);
const waveTables = new Map<Instrument, Float32Array[]>();
function wave(patch: Instrument, frequency: number) {
  const { harmonics } = voices[patch];
  let tables = waveTables.get(patch);
  if (!tables) {
    tables = harmonics.map((_, index) => table(harmonics, index + 1));
    waveTables.set(patch, tables);
  }
  const count = Math.max(
    1,
    Math.min(tables.length, Math.floor((sampleRate * 0.46) / frequency)),
  );
  return tables[count - 1]!;
}

function lookup(values: Float32Array, phase: number) {
  const base = Math.floor(phase);
  const index = base & (tableSize - 1);
  const next = (index + 1) & (tableSize - 1);
  return values[index]! + (values[next]! - values[index]!) * (phase - base);
}

function tone(pcm: Float32Array, note: Note, patch: Instrument) {
  const {
    adsr: [attack, decay, sustain, release],
    depth,
    gain,
  } = voices[patch];
  const frequency = 440 * 2 ** ((note.pitch - 69) / 12);
  const table = wave(patch, frequency);
  const attackEnd = Math.min(attack, note.duration);
  const levelAt = (t: number) =>
    t < attackEnd
      ? t / attackEnd
      : 1 - (1 - sustain) * Math.min(1, (t - attackEnd) / decay);
  const releaseLevel = levelAt(note.duration);
  const start = Math.round(note.start * sampleRate);
  const count = Math.min(
    pcm.length - start,
    Math.ceil((note.duration + release) * sampleRate),
  );
  const step = (frequency * tableSize) / sampleRate;
  let phase = 0;
  for (let i = 0; i < count; i++) {
    const time = i / sampleRate;
    const level =
      time < note.duration
        ? levelAt(time)
        : releaseLevel * (1 - (time - note.duration) / release) ** 2;
    pcm[start + i]! += lookup(table, phase) * level * note.velocity * gain;
    const vibrato = depth
      ? lookup(sine, time * tableSize * 5.1) * Math.min(1, time * 5)
      : 0;
    phase += step * (1 + depth * vibrato);
  }
}

function drum(pcm: Float32Array, note: Note, patch: Percussion, seed: number) {
  const random = seededRandom(seed);
  const start = Math.round(note.start * sampleRate);
  const length = patch === 'kick' ? 0.22 : patch === 'snare' ? 0.165 : 0.085;
  const end = Math.min(pcm.length - start, Math.ceil(length * sampleRate));
  let phase = 0;
  let smooth = 0;
  for (let i = 0; i < end; i++) {
    const time = i / sampleRate;
    const noise = random() * 2 - 1;
    smooth += (noise - smooth) * (patch === 'snare' ? 0.16 : 0.26);
    let sound: number;
    switch (patch) {
      case 'kick':
        phase += ((48 + 102 * Math.exp(-time * 55)) * tableSize) / sampleRate;
        sound =
          (lookup(sine, phase) + noise * 0.12 * Math.exp(-time * 230)) *
          Math.exp(-time * 23) *
          0.44;
        break;
      case 'snare':
        sound =
          ((noise - smooth) * 0.61 +
            lookup(sine, time * 167 * tableSize) *
              Math.exp(-time * 30) *
              0.39) *
          Math.exp(-time * 32) *
          0.37;
        break;
      case 'hat':
        sound = (noise - smooth) * Math.exp(-time * 63) * 0.26;
        break;
    }
    pcm[start + i]! +=
      sound * note.velocity * Math.min(1, time * 1500, (end - i) / 180);
  }
}

export function synthesizeScore(score: Score, seed: number) {
  const pcm = new Float32Array(Math.ceil(score.duration * sampleRate));
  for (const [i, note] of score.notes.entries()) {
    const { patch } = note;
    if (patch === 'kick' || patch === 'snare' || patch === 'hat')
      drum(pcm, note, patch, seed + i * 179);
    else tone(pcm, note, patch);
  }

  const fade = Math.round(sampleRate * 0.075);
  for (let i = 0; i < fade; i++) {
    const index = pcm.length - 1 - i;
    pcm[index]! *= i / fade;
  }
  return pcm;
}
