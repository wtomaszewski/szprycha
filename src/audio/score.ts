import type { Station } from './settings';

type Step = number | null;
interface Track {
  wave: OscillatorType;
  stepBeats: number;
  gate: number;
  level: number;
  steps: readonly Step[];
}
interface Score {
  bpm: number;
  beats: number;
  tracks: readonly Track[];
}

// MIDI pitches with one row per measure in the eighth-note melodies.
const hits: Score = {
  bpm: 132,
  beats: 16,
  tracks: [
    {
      wave: 'square',
      stepBeats: 0.5,
      gate: 0.72,
      level: 0.037,
      // prettier-ignore
      steps: [
        74, null, 78, 81, 76, 74, null, 69,
        71, 74, null, 78, 76, 78, 83, null,
        76, 81, null, 85, 83, 81, 78, 76,
        79, 76, null, 73, 76, 69, 74, null,
      ],
    },
    {
      wave: 'triangle',
      stepBeats: 0.5,
      gate: 0.82,
      level: 0.075,
      // prettier-ignore
      steps: [
        50, null, 50, 57, 54, null, 57, null,
        47, null, 47, 54, 50, null, 54, null,
        54, null, 54, 61, 57, null, 61, null,
        45, null, 45, 52, 55, null, 57, 49,
      ],
    },
    {
      wave: 'sine',
      stepBeats: 0.5,
      gate: 0.24,
      level: 0.12,
      steps: [33, null, null, 31, 33, null, 31, null],
    },
  ],
};

const boulevards: Score = {
  bpm: 84,
  beats: 16,
  tracks: [
    {
      wave: 'triangle',
      stepBeats: 0.5,
      gate: 1.55,
      level: 0.052,
      // prettier-ignore
      steps: [
        71, null, null, 67, 69, null, 64, null,
        66, null, null, 69, 72, null, 71, null,
        67, null, 71, null, 74, null, null, 76,
        73, null, 69, null, 66, null, 64, null,
      ],
    },
    {
      wave: 'sine',
      stepBeats: 0.5,
      gate: 0.83,
      level: 0.1,
      // prettier-ignore
      steps: [
        45, null, 52, 55, 48, null, 55, null,
        50, null, 57, 60, 53, null, 57, null,
        48, null, 55, 59, 52, null, 55, null,
        47, null, 54, 57, 49, null, 52, null,
      ],
    },
  ],
};

const talk: Score = {
  bpm: 114,
  beats: 16,
  tracks: [
    {
      wave: 'square',
      stepBeats: 0.5,
      gate: 0.62,
      level: 0.032,
      // prettier-ignore
      steps: [
        72, 76, 81, null, 79, 74, null, null,
        76, null, null, null, 79, null, null, null,
        77, null, null, null, 72, null, null, null,
        74, null, 77, null, 81, 76, null, null,
      ],
    },
    {
      wave: 'triangle',
      stepBeats: 1,
      gate: 0.65,
      level: 0.065,
      steps: [53, 60, 52, 57, 48, 55, 52, 55, 50, 57, 53, 57, 55, 62, 52, 55],
    },
  ],
};

export interface TimedNote {
  wave: OscillatorType;
  hz: number;
  start: number;
  duration: number;
  level: number;
}

export function sequence(score: Score) {
  const secondsPerBeat = 60 / score.bpm;
  const notes: TimedNote[] = [];
  for (const { wave, stepBeats, gate, level, steps } of score.tracks) {
    const stepCount = Math.round(score.beats / stepBeats);
    for (let i = 0; i < stepCount; i++) {
      const midi = steps[i % steps.length];
      if (midi == null) continue;
      notes.push({
        wave,
        level,
        hz: 440 * 2 ** ((midi - 69) / 12),
        start: i * stepBeats * secondsPerBeat,
        duration: Math.min(gate, stepCount - i) * stepBeats * secondsPerBeat,
      });
    }
  }
  return {
    notes: notes.sort((a, b) => a.start - b.start),
    duration: score.beats * secondsPerBeat,
  };
}

export const scores: Record<Station, Score> = { hits, boulevards, talk };
