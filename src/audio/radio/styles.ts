import type { Station } from './catalog.ts';

export type Patch =
  | 'pulse'
  | 'chip'
  | 'soft'
  | 'keys'
  | 'bell'
  | 'pad'
  | 'pluck'
  | 'reed'
  | 'sub'
  | 'bass'
  | 'kick'
  | 'snare'
  | 'hat';

export type Rhythm = readonly (readonly [
  step: number,
  beats: number,
  tone: number,
])[];

export interface Style {
  bpm: number;
  root: number;
  minor?: boolean;
  seventh?: boolean;
  swing: number;
  lead: readonly [Patch, Patch];
  bass: Patch;
  harmony: readonly [Patch, Patch];
  // Chord degrees in verse, chorus and bridge respectively.
  changes: readonly (readonly number[])[];
  // Eighth-note positions in a two-bar call and answer.
  phrases: readonly (readonly number[])[];
  bassLine: Rhythm;
  // Sixteenth-note steps within a bar, with velocity accents.
  drums: readonly (readonly [Patch, number, number])[];
  jingle: readonly number[];
}

export const styles: Record<Station, Style> = {
  hits: {
    bpm: 128,
    root: 60,
    swing: 0.05,
    lead: ['pulse', 'bell'],
    bass: 'bass',
    harmony: ['pluck', 'chip'],
    changes: [
      [0, 4, 5, 3],
      [3, 4, 2, 5],
      [1, 3, 5, 4],
    ],
    phrases: [
      [0, 2, 3, 5, 7, 8, 10, 12, 14],
      [0, 1, 3, 5, 8, 11, 12, 15],
    ],
    bassLine: [
      [0, 0.72, 0],
      [4, 0.46, 0],
      [7, 0.24, 2],
      [8, 0.61, 0],
      [12, 0.45, 2],
    ],
    drums: [
      ['kick', 0, 1],
      ['kick', 8, 0.83],
      ['snare', 4, 0.8],
      ['snare', 12, 0.93],
      ['hat', 2, 0.5],
      ['hat', 6, 0.62],
      ['hat', 10, 0.45],
      ['hat', 14, 0.75],
    ],
    jingle: [0, 2, 4, 7, 4, 7],
  },
  boulevards: {
    bpm: 82,
    root: 57,
    minor: true,
    seventh: true,
    swing: 0.23,
    lead: ['keys', 'soft'],
    bass: 'sub',
    harmony: ['keys', 'pad'],
    changes: [
      [0, 3, 5, 2],
      [5, 6, 0, 0],
      [3, 2, 1, 4],
    ],
    phrases: [
      [1, 4, 6, 9, 12, 13],
      [0, 3, 6, 10, 11, 14],
    ],
    bassLine: [
      [0, 1.2, 0],
      [6, 0.8, 2],
      [10, 1, 0],
      [15, 0.23, 1],
    ],
    drums: [
      ['kick', 0, 0.87],
      ['kick', 10, 0.75],
      ['snare', 4, 0.68],
      ['snare', 12, 0.88],
      ['hat', 2, 0.35],
      ['hat', 7, 0.18],
      ['hat', 8, 0.38],
      ['hat', 14, 0.48],
      ['hat', 15, 0.22],
    ],
    jingle: [4, 2, 0, -1, 1, 0],
  },
  talk: {
    bpm: 108,
    root: 62,
    seventh: true,
    swing: 0.12,
    lead: ['bell', 'pluck'],
    bass: 'sub',
    harmony: ['keys', 'soft'],
    changes: [
      [0, 2, 1, 4],
      [3, 0, 1, 4],
      [5, 2, 3, 4],
    ],
    phrases: [
      [0, 3, 5, 8, 12],
      [2, 4, 7, 10, 14],
    ],
    bassLine: [
      [0, 0.9, 0],
      [6, 0.42, 2],
      [8, 0.8, 0],
      [14, 0.4, 2],
    ],
    drums: [
      ['kick', 0, 0.8],
      ['snare', 4, 0.53],
      ['snare', 12, 0.66],
      ['hat', 2, 0.38],
      ['hat', 6, 0.48],
      ['hat', 10, 0.34],
      ['hat', 14, 0.44],
    ],
    jingle: [7, 4, 6, 2, 4, 0],
  },
  arcade: {
    bpm: 151,
    root: 60,
    minor: true,
    swing: 0,
    lead: ['chip', 'pulse'],
    bass: 'bass',
    harmony: ['pulse', 'pluck'],
    changes: [
      [0, 5, 2, 6],
      [5, 6, 0, 4],
      [3, 1, 5, 4],
    ],
    phrases: [
      [0, 1, 2, 4, 6, 7, 8, 9, 10, 11, 12, 14],
      [0, 2, 3, 4, 5, 7, 8, 10, 12, 13, 15],
    ],
    bassLine: [
      [0, 0.38, 0],
      [2, 0.36, 0],
      [4, 0.38, 2],
      [6, 0.37, 0],
      [8, 0.38, 0],
      [10, 0.36, 3],
      [12, 0.38, 2],
      [14, 0.38, 0],
    ],
    drums: [
      ['kick', 0, 1],
      ['kick', 6, 0.58],
      ['kick', 8, 0.9],
      ['kick', 14, 0.68],
      ['snare', 4, 0.87],
      ['snare', 12, 0.9],
      ['hat', 2, 0.45],
      ['hat', 5, 0.27],
      ['hat', 7, 0.45],
      ['hat', 10, 0.47],
      ['hat', 13, 0.28],
      ['hat', 15, 0.55],
    ],
    jingle: [0, 4, 2, 6, 3, 7],
  },
  ambient: {
    bpm: 66,
    root: 55,
    seventh: true,
    swing: 0.04,
    lead: ['soft', 'bell'],
    bass: 'sub',
    harmony: ['pad', 'soft'],
    changes: [
      [0, 2, 3, 3],
      [5, 4, 3, 0],
      [1, 5, 2, 3],
    ],
    phrases: [
      [0, 4, 10, 14],
      [2, 7, 8, 13],
    ],
    bassLine: [[0, 3.7, 0]],
    drums: [
      ['kick', 0, 0.24],
      ['hat', 10, 0.23],
    ],
    jingle: [0, 4, 2, 6, 4, 2],
  },
  city: {
    bpm: 117,
    root: 58,
    minor: true,
    seventh: true,
    swing: 0.14,
    lead: ['reed', 'keys'],
    bass: 'bass',
    harmony: ['pluck', 'reed'],
    changes: [
      [0, 0, 3, 4],
      [5, 4, 0, 3],
      [2, 5, 1, 4],
    ],
    phrases: [
      [1, 2, 4, 7, 8, 11, 13, 14],
      [0, 2, 5, 6, 8, 9, 12, 15],
    ],
    bassLine: [
      [0, 0.42, 0],
      [3, 0.25, 1],
      [6, 0.4, 2],
      [8, 0.64, 3],
      [12, 0.32, 0],
      [15, 0.2, 2],
    ],
    drums: [
      ['kick', 0, 1],
      ['kick', 4, 0.77],
      ['kick', 8, 0.94],
      ['kick', 12, 0.79],
      ['snare', 4, 0.7],
      ['snare', 12, 0.88],
      ['hat', 2, 0.58],
      ['hat', 6, 0.65],
      ['hat', 10, 0.52],
      ['hat', 14, 0.77],
      ['hat', 15, 0.25],
    ],
    jingle: [0, 3, 6, 5, 3, 7],
  },
};
