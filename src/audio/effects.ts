type Wave = 'sine' | 'triangle' | 'noise';
type Voice = [
  wave: Wave,
  at: number,
  duration: number,
  startHz: number,
  endHz: number,
  level: number,
  decay?: number,
];

const bell = (hz: number, overtone: number): Voice[] => [
  ['sine', 0, 0.68, hz, hz, 0.53, 3],
  ['sine', 0, 0.46, overtone, overtone, 0.32, 4],
  ['noise', 0, 0.035, 0, 0, 0.12, 2],
];

export const bicycleBells = ['bell', 'bellBright', 'bellLow'] as const;
const effects = {
  bell: bell(1150, 1817),
  bellBright: bell(1490, 2374),
  bellLow: bell(890, 1428),
  brake: [
    ['noise', 0, 0.28, 0, 0, 0.23, 2],
    ['triangle', 0.01, 0.23, 515, 265, 0.17, 2],
  ],
  cobbles: [
    ['noise', 0, 0.08, 0, 0, 0.24],
    ['sine', 0, 0.11, 112, 54, 0.29, 2],
    ['noise', 0.09, 0.06, 0, 0, 0.16],
  ],
  tram: [
    ['sine', 0, 0.32, 690, 690, 0.39, 3],
    ['sine', 0, 0.27, 1076, 1076, 0.27, 4],
    ['sine', 0.22, 0.33, 690, 690, 0.38, 3],
    ['sine', 0.22, 0.27, 1076, 1076, 0.26, 4],
  ],
  rail: [
    ['triangle', 0, 0.25, 785, 785, 0.39, 3],
    ['sine', 0, 0.19, 1399, 1399, 0.24, 3],
    ['triangle', 0.31, 0.24, 785, 785, 0.37, 3],
    ['sine', 0.31, 0.19, 1399, 1399, 0.19, 3],
  ],
  crossing: [
    ['sine', 0, 0.065, 1200, 1250, 0.34],
    ['sine', 0.12, 0.065, 1200, 1250, 0.34],
    ['sine', 0.24, 0.065, 1200, 1250, 0.34],
  ],
  pigeon: [
    ['triangle', 0, 0.15, 251, 358, 0.23],
    ['sine', 0.12, 0.32, 391, 192, 0.43, 1.5],
    ['noise', 0.27, 0.09, 0, 0, 0.11, 2],
  ],
  peacock: [
    ['triangle', 0, 0.21, 558, 928, 0.25],
    ['sine', 0.05, 0.31, 976, 435, 0.29],
    ['triangle', 0.37, 0.26, 763, 520, 0.29],
  ],
  oops: [
    ['triangle', 0, 0.24, 640, 390, 0.39],
    ['sine', 0.18, 0.25, 298, 190, 0.33, 1.7],
  ],
  stars: [
    ['triangle', 0, 0.21, 523, 523, 0.32],
    ['triangle', 0.12, 0.23, 659, 659, 0.32],
    ['triangle', 0.24, 0.45, 784, 784, 0.31],
    ['sine', 0.24, 0.47, 1047, 1047, 0.28, 2],
  ],
  unlock: [
    ['sine', 0, 0.24, 622, 622, 0.36, 2],
    ['sine', 0.08, 0.29, 831, 831, 0.32, 2],
    ['sine', 0.2, 0.44, 1245, 1245, 0.34, 3],
  ],
  phone: [
    ['sine', 0, 0.15, 660, 660, 0.27, 1.3],
    ['sine', 0.22, 0.15, 880, 880, 0.27, 1.3],
  ],
} satisfies Record<string, Voice[]>;

export type Effect = keyof typeof effects | 'siren';
export const sampleRate = 22_050;
const tau = 2 * Math.PI;

// The siren's carrier and modulation complete a whole number of cycles in
// 1.5 seconds, so the buffer can loop continuously without a click.
function siren() {
  const samples = new Float32Array(1.5 * sampleRate);
  for (let i = 0; i < samples.length; i++) {
    const phase = (tau * i) / samples.length;
    samples[i] = 0.6 * Math.sin(842 * phase + 35 * Math.sin(phase));
  }
  return samples;
}

export function synthesize(
  effect: Effect,
  seed: number,
): Float32Array<ArrayBuffer> {
  if (effect === 'siren') return siren();
  const voices = effects[effect];
  const duration = Math.max(...voices.map(([, at, length]) => at + length));
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let random = seed >>> 0;
  for (const [wave, at, length, startHz, endHz, level, decay = 1] of voices) {
    const offset = Math.round(at * sampleRate);
    const size = Math.min(
      samples.length - offset,
      Math.floor(length * sampleRate),
    );
    let phase = 0;
    let noise = 0;
    for (let i = 0; i < size; i++) {
      const progress = i / size;
      phase += (startHz + (endHz - startHz) * progress) / sampleRate;
      let value: number;
      if (wave === 'noise') {
        random = (Math.imul(1664525, random) + 1013904223) >>> 0;
        noise += 0.34 * (random / 0x80000000 - 1 - noise);
        value = noise;
      } else if (wave === 'triangle') {
        value = 1 - 4 * Math.abs((phase % 1) - 0.5);
      } else value = Math.sin(tau * phase);
      const attack = Math.min(1, i / (0.007 * sampleRate));
      samples[offset + i]! += value * level * attack * (1 - progress) ** decay;
    }
  }
  return samples;
}
