export const radioSampleRate = 24_000;

export const stations = [
  'hits',
  'boulevards',
  'talk',
  'arcade',
  'ambient',
  'city',
] as const;
export type Station = (typeof stations)[number];

export const radioCatalog = {
  hits: { seeds: [51, 204, 963, 1078, 1821, 5894], echo: 0.11, room: 0.1 },
  boulevards: {
    seeds: [88, 129, 921, 1085, 4007, 7018],
    echo: 0.18,
    room: 0.19,
  },
  talk: { seeds: [31, 440, 662, 1491, 3107, 9566], echo: 0.06, room: 0.08 },
  arcade: { seeds: [64, 256, 865, 1103, 1377, 8192], echo: 0.12, room: 0.07 },
  ambient: { seeds: [97, 148, 267, 544, 1268, 4054], echo: 0.25, room: 0.3 },
  city: { seeds: [74, 373, 731, 1071, 2583, 7073], echo: 0.09, room: 0.11 },
} as const satisfies Record<
  Station,
  { seeds: readonly number[]; echo: number; room: number }
>;

export function radioPath(station: Station, seed: number | 'jingle') {
  return `assets/radio/${station}-${seed}.mp3`;
}
