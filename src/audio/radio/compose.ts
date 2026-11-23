import type { Station } from './catalog.ts';
import { styles, type Patch } from './styles.ts';

const major = [0, 2, 4, 5, 7, 9, 11];
const minor = [0, 2, 3, 5, 7, 8, 10];
const form = [
  ['intro', 2],
  ['verse', 4],
  ['chorus', 4],
  ['verse', 4],
  ['bridge', 2],
  ['chorus', 4],
  ['outro', 4],
] as const;

export interface Note {
  patch: Patch;
  start: number;
  duration: number;
  pitch: number;
  velocity: number;
}

interface Section {
  name: (typeof form)[number][0];
  bar: number;
  bars: number;
}

export interface Score {
  bpm: number;
  duration: number;
  notes: Note[];
  sections: Section[];
}

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function scoreWriter(bpm: number, beats: number) {
  const seconds = 60 / bpm;
  const duration = beats * seconds;
  const notes: Note[] = [];
  return {
    notes,
    duration,
    add(
      patch: Patch,
      start: number,
      length: number,
      pitch: number,
      velocity: number,
    ) {
      notes.push({
        patch,
        start: start * seconds,
        duration: Math.min(length, beats - start) * seconds,
        pitch,
        velocity,
      });
    },
  };
}

export function compose(station: Station, seed: number): Score {
  const style = styles[station];
  const random = seededRandom(seed);
  const integer = (count: number) => Math.floor(random() * count);
  const bpm = style.bpm + integer(13) - 6;
  const root = style.root + integer(8) - 3;
  const scale = style.minor ? minor : major;
  const pitch = (degree: number) =>
    root + scale[((degree % 7) + 7) % 7]! + 12 * Math.floor(degree / 7);
  const bars = form.reduce((count, [, length]) => count + length, 0);
  const { add, notes, duration } = scoreWriter(bpm, bars * 4);
  const sections: Section[] = [];
  const phrase = style.phrases[integer(style.phrases.length)]!;
  // The same contour returns at each chorus, with a distinct answer and cadence.
  const motif = phrase.map((_, i) => (i % 3 ? integer(5) - 2 : 0));
  const rotation = integer(4);
  const leadSwap = integer(2);
  const chordSize = style.seventh ? 4 : 3;
  const swing = (step: number) =>
    (step + (step % 4 >= 2 ? 2 * style.swing : 0)) / 4;
  let bar = 0;
  let verse = 0;
  let chorus = 0;

  for (const [name, length] of form) {
    sections.push({ name, bar, bars: length });
    const hook = name === 'chorus';
    const bridge = name === 'bridge';
    const intro = name === 'intro';
    const outro = name === 'outro';
    const sparse = intro || outro || bridge;
    const changes = style.changes[hook ? 1 : bridge ? 2 : 0]!;

    for (let measure = 0; measure < length; measure++, bar++) {
      const start = bar * 4;
      const closing = outro && measure === length - 1;
      const degree =
        closing || (intro && measure === 0)
          ? 0
          : changes[
              (measure + rotation + (name === 'verse' ? verse : 0)) %
                changes.length
            ]!;
      const chord = Array.from({ length: chordSize }, (_, i) =>
        pitch(degree + 2 * i),
      );
      const energy = closing ? 0.65 : hook ? 1 : sparse ? 0.64 : 0.83;
      const stabs = station === 'city' ? [0.5, 1.75, 2.5, 3.5] : [0, 2];
      const sustained =
        station === 'ambient' || (station === 'boulevards' && sparse);

      if (sustained || closing) {
        for (const tone of chord)
          add(style.harmony[1], start, 3.9, tone, energy * 0.24);
      } else if (hook || station === 'arcade') {
        const steps = station === 'arcade' ? 16 : 8;
        for (let i = 0; i < steps; i++) {
          const index = (i + (measure % 2)) % chord.length;
          const octave = i % 4 === 3 ? 12 : 0;
          add(
            style.harmony[1],
            start + swing(i * (16 / steps)),
            3.4 / steps,
            chord[index]! + octave,
            energy * (i % 4 ? 0.34 : 0.47),
          );
        }
      } else {
        for (const beat of stabs)
          for (const tone of chord)
            add(style.harmony[0], start + beat, 0.59, tone, energy * 0.25);
      }

      if (sparse) {
        add(style.bass, start, 3.52, pitch(degree) - 12, 0.49 * energy);
      } else {
        for (const [step, beats, tone] of style.bassLine) {
          const bassPitch =
            step >= 14 && measure % 2 && random() < 0.55
              ? pitch(degree + 1) - 12
              : chord[tone % chord.length]! - (tone > 1 ? 24 : 12);
          add(
            style.bass,
            start + swing(step),
            beats,
            bassPitch,
            energy * (step === 0 ? 0.88 : 0.64),
          );
        }
      }

      if (!closing && !(intro && measure === 0)) {
        for (const [drum, step, accent] of style.drums) {
          if (sparse && step % 8 !== 0) continue;
          add(
            drum,
            start + swing(step),
            0.46,
            0,
            energy * accent * (0.91 + random() * 0.18),
          );
        }
        if (hook && measure === length - 1 && station !== 'ambient')
          add('snare', start + swing(15), 0.22, 0, 0.58);
      }

      for (let i = 0; i < phrase.length; i++) {
        const step = phrase[i]!;
        if (Math.floor(step / 8) !== measure % 2 || (sparse && i % 2)) continue;
        const cadence = i === phrase.length - 1;
        const variation = bridge ? -3 : hook ? 2 : verse && i % 3 === 1 ? 1 : 0;
        const contour = cadence ? 0 : 2 + motif[i]! + variation;
        // Every accented attack lands on a chord tone. Other notes follow the scale.
        const strong = step % 4 === 0 || cadence;
        const noteDegree = strong
          ? degree + 2 * (Math.abs(contour) % chordSize)
          : degree + contour;
        const beat = swing((step % 8) * 2);
        const gap =
          (Math.min(8 * (1 + Math.floor(step / 8)), phrase[i + 1] ?? 16) -
            step) *
          0.5;
        const patch =
          style.lead[(leadSwap + Number(hook) + Number(bridge)) % 2]!;
        const register = bridge || station === 'ambient' ? 0 : 12;
        add(
          patch,
          start + beat,
          Math.max(0.17, gap * (sustained ? 0.92 : 0.76) - 0.07),
          pitch(noteDegree - (noteDegree > 10 ? 7 : 0)) + register,
          energy * (strong ? 0.81 : 0.65),
        );
        if (hook && chorus === 1 && strong && !cadence)
          add(
            style.lead[leadSwap]!,
            start + beat,
            0.36,
            pitch(noteDegree - 2),
            0.28,
          );
      }
      if (closing) add(style.lead[1], start + 2, 1.75, root + 12, 0.63);
    }
    if (name === 'verse') verse++;
    if (hook) chorus++;
  }
  return {
    bpm,
    duration,
    notes: notes.sort((a, b) => a.start - b.start),
    sections,
  };
}

export function stationJingle(station: Station): Score {
  const style = styles[station];
  const bpm = 144;
  const { add, notes, duration } = scoreWriter(bpm, 5);
  const scale = style.minor ? minor : major;
  const rhythm = [0, 0.5, 1.25, 1.75, 2.5, 3.25];
  for (const [i, degree] of style.jingle.entries()) {
    const tone =
      style.root +
      scale[(degree + 7) % 7]! +
      (degree < 0 ? 0 : 12 * (1 + Math.floor(degree / 7)));
    add(
      style.lead[0],
      rhythm[i]!,
      i === 5 ? 1.35 : 0.41,
      tone,
      i % 2 ? 0.7 : 0.92,
    );
  }
  add(style.bass, 0, 0.78, style.root - 12, 0.8);
  add(style.bass, 3.25, 1.3, style.root - 12, 0.64);
  add('kick', 0, 0.46, 0, 0.61);
  add('hat', 2.5, 0.4, 0, 0.58);
  return {
    bpm,
    duration,
    notes: notes.sort((a, b) => a.start - b.start),
    sections: [],
  };
}
