import type { Waypoint } from './warsaw-routes';

const toRiver: Waypoint[] = [
  { x: 3248, y: 1808 },
  { x: 3248, y: 1748, walking: true },
  { x: 2880, y: 1738 },
];

const riverTour: Waypoint[] = [
  { x: 2880, y: 642, maxInput: 0.4, walking: false },
  { x: 2880, y: 1750, maxInput: 0.4 },
  { x: 2880, y: 2210, maxInput: 0.4 },
  { x: 2880, y: 3500, maxInput: 0.34 },
  { x: 2880, y: 3456, maxInput: 0.4 },
  { x: 2880, y: 1750, maxInput: 0.34 },
];

const fromRiver: Waypoint[] = [
  { x: 2880, y: 1748, walking: true },
  { x: 3248, y: 1748 },
  { x: 3248, y: 1808 },
];

const parkTour: Waypoint[] = [
  { x: 3261, y: 2764, maxInput: 0.28 },
  { x: 3260, y: 3110, maxInput: 0.28 },
  { x: 3260, y: 3290, maxInput: 0.28 },
  { x: 3260, y: 3360, maxInput: 0.28 },
  { x: 2880, y: 3360, maxInput: 0.28 },
  { x: 2880, y: 2150, maxInput: 0.29 },
  { x: 2880, y: 2210, maxInput: 0.29 },
  { x: 2880, y: 1750, maxInput: 0.25 },
  { x: 2880, y: 2530, maxInput: 0.28 },
  { x: 3260, y: 2530, walking: true },
  { x: 3260, y: 2764, walking: false, maxInput: 0.28 },
  { x: 3500, y: 2764, maxInput: 0.28 },
];

const stadiumLap: Waypoint[] = [
  { x: 1600, y: 2528, maxInput: 0.35 },
  { x: 1600, y: 1410, maxInput: 0.35 },
  { x: 2048, y: 1410, maxInput: 0.35 },
  { x: 2048, y: 2528, maxInput: 0.35 },
];

export const stadiumLaps: Waypoint[] = [
  ...stadiumLap,
  ...stadiumLap,
  { x: 1856, y: 2528, maxInput: 0.35 },
];

export const stadiumShortcut: Waypoint[] = [
  ...stadiumLaps,
  { x: 1856, y: 2780 },
  { x: 1856, y: 3168 },
];

export const campaignRoutes = {
  'WAW-A2-01': [
    { x: 3312, y: 1504 },
    { x: 3248, y: 1808 },
    { x: 3359, y: 1808, until: 'bike-green' },
    { x: 3560, y: 1808 },
    { x: 4660, y: 1808 },
    { x: 4580, y: 1856 },
    { x: 3540, y: 1856, until: 'main-east-red' },
    { x: 3540, y: 1856, until: 'main-east-green' },
    { x: 3305, y: 1856 },
    ...toRiver,
    ...riverTour,
    ...fromRiver,
  ],
  'WAW-A2-02': [
    { x: 3424, y: 1769, until: 'arrow', wait: 0.6, signal: 'right' },
    { x: 3424, y: 1840, maxInput: 0.45, signal: 'right' },
    { x: 3305, y: 1856, signal: 'right' },
    ...toRiver,
    ...riverTour,
    ...fromRiver,
  ],
  'WAW-A2-03': [
    { x: 4006, y: 1862 },
    { x: 3948, y: 1862, wait: 8 },
    { x: 3648, y: 1862 },
    { x: 3560, y: 1808 },
    { x: 3557, y: 1808, until: 'bike-green' },
    ...toRiver,
    ...riverTour,
    ...fromRiver,
  ],
  'WAW-A2-04': [
    { x: 3312, y: 1504 },
    { x: 2880, y: 1490 },
    { x: 2880, y: 1268, maxInput: 0.4 },
    { x: 2880, y: 2210, maxInput: 0.45 },
    { x: 2880, y: 3500, maxInput: 0.32 },
    { x: 2880, y: 1750, maxInput: 0.32 },
    { x: 2880, y: 642, maxInput: 0.37 },
    { x: 2880, y: 1268, maxInput: 0.38 },
  ],
  'WAW-A2-05': [
    { x: 2880, y: 2210, maxInput: 0.34 },
    { x: 2880, y: 1268 },
    ...riverTour,
    { x: 2880, y: 1268 },
  ],
  'WAW-A2-06': [
    { x: 2550, y: 347 },
    { x: 2856, y: 347, photo: true },
    { x: 3174, y: 355 },
    { x: 3174, y: 595, walking: true },
    { x: 2880, y: 642 },
    { x: 2880, y: 1268, walking: false },
    ...riverTour,
    { x: 2880, y: 1268 },
  ],
  'WAW-A3-01': [
    { x: 3260, y: 2530, maxInput: 0.34, lights: true },
    { x: 3261, y: 2764 },
    { x: 3500, y: 2764 },
    ...parkTour,
  ],
  'WAW-A3-02': [
    { x: 3260, y: 3290, answer: 1 },
    { x: 3260, y: 3110 },
    { x: 3261, y: 2764, signal: 'right' },
    { x: 3500, y: 2764, signal: 'right' },
    ...parkTour,
  ],
  'WAW-A3-03': [
    { x: 3424, y: 2358, until: 'rail-closed' },
    { x: 3424, y: 2358, until: 'rail-open' },
    { x: 3424, y: 2480 },
    { x: 3424, y: 2885, signal: 'left' },
    { x: 3520, y: 2912, signal: 'left' },
    { x: 3658, y: 2976, walking: true },
    { x: 3658, y: 2912 },
    { x: 4700, y: 2912, walking: false },
    { x: 4810, y: 2920 },
    { x: 4810, y: 3480, maxInput: 0.25 },
    { x: 4670, y: 3480, maxInput: 0.25 },
    { x: 3488, y: 3480, maxInput: 0.25 },
    { x: 3488, y: 3268, until: 'rail-south-open' },
    { x: 3488, y: 3140 },
    { x: 3488, y: 2980 },
    { x: 3658, y: 2976, walking: true },
  ],
  'WAW-A3-04': [
    { x: 3560, y: 1808 },
    { x: 3552, y: 1748, walking: true },
    { x: 3552, y: 1748, answer: 1 },
    { x: 3552, y: 1748, answer: 2 },
    { x: 3552, y: 1748, answer: 0 },
    { x: 3552, y: 1748, answer: 1 },
  ],
  'WAW-A3-05': [
    { x: 3500, y: 2764, answer: 0 },
    { x: 3261, y: 2764 },
    { x: 3260, y: 2530, walking: true },
    { x: 3260, y: 2145 },
    { x: 3488, y: 2090 },
    { x: 3488, y: 2076, walking: false, until: 'officer-go' },
    { x: 3488, y: 1825, maxInput: 0.5 },
    { x: 3488, y: 1745 },
    { x: 2880, y: 1738 },
    { x: 2880, y: 1268 },
    { x: 2878, y: 347 },
    { x: 2550, y: 347 },
    { x: 1950, y: 347 },
    { x: 1820, y: 480, signal: 'left' },
    { x: 1900, y: 540, wait: 8 },
    { x: 1878, y: 842 },
    { x: 1972, y: 948 },
    { x: 2010, y: 1090 },
    { x: 1962, y: 1200 },
    { x: 1824, y: 1270 },
    { x: 1856, y: 2528 },
    { x: 1600, y: 2528 },
    { x: 1600, y: 3168 },
    { x: 1856, y: 3168 },
  ],
  'WAW-A3-06': [
    ...stadiumLaps,
    { x: 1600, y: 2528 },
    { x: 1600, y: 3168 },
    { x: 1856, y: 3168 },
  ],
} satisfies Record<string, Waypoint[]>;
