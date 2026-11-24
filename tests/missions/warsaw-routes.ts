import type { Vec2 } from '../../src/rules/types';

export interface Waypoint extends Vec2 {
  wait?: number;
  signal?: 'left' | 'right';
  look?: boolean;
  walking?: boolean;
  maxInput?: number;
  photo?: boolean;
  until?:
    | 'traffic-ended'
    | 'officer-go'
    | 'signaled'
    | 'driveway-stop'
    | 'bike-green'
    | 'main-east-red'
    | 'main-east-green'
    | 'arrow'
    | 'rail-open'
    | 'rail-south-open'
    | 'rail-closed'
    | 'tram-stopped'
    | 'tram-cleared';
  answer?: number;
  coast?: boolean;
  lights?: boolean;
  helmet?: boolean;
  crossingGreen?: string;
  crossingRed?: string;
  mainGreen?: string;
  mainRed?: string;
  railOpen?: string;
}

const pragaLoop: Waypoint[] = [
  { x: 420, y: 1540, maxInput: 0.44 },
  { x: 420, y: 2220, maxInput: 0.44 },
  { x: 420, y: 3324, maxInput: 0.44, signal: 'left' },
  { x: 1118, y: 3324, maxInput: 0.44, signal: 'left' },
  { x: 1118, y: 2204, maxInput: 0.44, signal: 'left' },
  { x: 480, y: 2204, maxInput: 0.44, signal: 'right' },
  { x: 480, y: 770, maxInput: 0.44 },
];

const pragaFinish: Waypoint[] = [
  { x: 480, y: 527, signal: 'right' },
  { x: 480, y: 480, signal: 'right' },
  { x: 580, y: 480, signal: 'right' },
];

const riverLoop: Waypoint[] = [
  { x: 2880, y: 642, maxInput: 0.37, walking: false },
  { x: 2880, y: 1268, maxInput: 0.37 },
  { x: 2880, y: 2210, maxInput: 0.37 },
  { x: 2880, y: 3500, maxInput: 0.37 },
  { x: 2880, y: 3456, maxInput: 0.37 },
  { x: 2880, y: 1750, maxInput: 0.37 },
  { x: 2880, y: 642, maxInput: 0.37 },
];

const viaOldTown: Waypoint[] = [
  { x: 3856, y: 1016, walking: false },
  { x: 2880, y: 1016, maxInput: 0.5 },
];

const bazaarToLoop: Waypoint[] = [
  { x: 1450, y: 1058 },
  { x: 480, y: 1058, signal: 'left' },
  { x: 420, y: 1120, signal: 'left' },
  ...pragaLoop,
  { x: 420, y: 1028, signal: 'left' },
  { x: 420, y: 1120, signal: 'left' },
  { x: 1446, y: 1132 },
];

const halinaToLoop: Waypoint[] = [
  { x: 1315, y: 260 },
  { x: 1330, y: 418 },
  { x: 420, y: 418, signal: 'left' },
  ...pragaLoop,
  ...pragaFinish,
];

export const warsawRoutes = {
  'WAW-T-02': {
    legal: [
      { x: 1790, y: 1057 },
      { x: 1914, y: 1057 },
    ],
  },
  'WAW-A1-01': {
    legal: [
      {
        x: 800,
        y: 337,
        maxInput: 0.3,
        signal: 'right',
        until: 'driveway-stop',
      },
      { x: 800, y: 405, maxInput: 0.3, signal: 'right' },
      { x: 552, y: 405, until: 'traffic-ended', signal: 'right' },
      { x: 235, y: 405 },
      { x: 235, y: 480 },
      { x: 420, y: 480, signal: 'right' },
      ...pragaLoop,
      ...pragaFinish,
    ],
  },
  'WAW-A1-02': {
    legal: [
      { x: 870, y: 975, until: 'traffic-ended' },
      { x: 870, y: 975, until: 'signaled', signal: 'left' },
      { x: 870, y: 1135, signal: 'left', look: true },
      { x: 970, y: 1144, wait: 0.5, signal: 'left', look: true },
      { x: 1446, y: 1132, look: true },
      ...bazaarToLoop,
    ],
  },
  'WAW-A1-03': {
    legal: [
      { x: 1130, y: 548, wait: 5 },
      { x: 1130, y: 245 },
      { x: 1298, y: 245, signal: 'right' },
      ...halinaToLoop,
    ],
    shortcut: [
      { x: 1130, y: 548, wait: 5 },
      { x: 1130, y: 352 },
      // Aim inside pasaz_pierogi so the turn toward the finish cannot skirt B-1.
      { x: 1200, y: 316, signal: 'right' },
      { x: 1298, y: 245, signal: 'right' },
      ...halinaToLoop,
    ],
  },
  'WAW-A1-04': {
    legal: [
      { x: 2420, y: 348, look: true, signal: 'left' },
      { x: 2600, y: 328, look: true, signal: 'left' },
      { x: 2895, y: 344 },
      { x: 3174, y: 355 },
      { x: 3174, y: 596, walking: true },
      { x: 2880, y: 630, walking: true },
      ...riverLoop,
      { x: 2880, y: 596, walking: true },
      { x: 3034, y: 596, walking: false },
    ],
    shortcut: [
      { x: 2420, y: 348, look: true, signal: 'left' },
      { x: 2600, y: 328, look: true, signal: 'left' },
      { x: 2895, y: 344 },
      { x: 2914, y: 457 },
      { x: 2914, y: 558 },
      { x: 2880, y: 630 },
      ...riverLoop,
      { x: 2880, y: 596, walking: true },
      { x: 3034, y: 588 },
    ],
  },
  'WAW-A1-05': {
    legal: [
      { x: 3235, y: 675, maxInput: 0.3 },
      { x: 3519, y: 676, maxInput: 0.3 },
      { x: 3519, y: 764, walking: true },
      { x: 3784, y: 764 },
      { x: 3856, y: 765 },
      { x: 3856, y: 962 },
      ...viaOldTown,
      ...riverLoop.map((point, index) => ({
        ...point,
        maxInput: [0, 3, 6].includes(index) ? 0.25 : 0.32,
        coast: ![0, 3, 6].includes(index),
      })),
      { x: 2880, y: 1016 },
      { x: 3856, y: 1016 },
      { x: 3856, y: 765, walking: true },
      { x: 3784, y: 764 },
    ],
  },
  'WAW-A1-06': {
    legal: [
      { x: 3358, y: 480, until: 'officer-go' },
      { x: 3587, y: 500 },
      { x: 3587, y: 541, walking: true },
      { x: 3708, y: 541 },
      { x: 3708, y: 373, photo: true },
      { x: 3810, y: 372 },
      { x: 3820, y: 346 },
      { x: 3860, y: 346, walking: false },
      ...viaOldTown,
      ...riverLoop,
      { x: 2880, y: 1016 },
      { x: 3856, y: 1016 },
      { x: 3860, y: 346 },
      { x: 3820, y: 346 },
    ],
  },
} satisfies Record<string, { legal: Waypoint[]; shortcut?: Waypoint[] }>;

export type WarsawMissionId = keyof typeof warsawRoutes;

export function approachWaypoint(
  pos: Vec2 & { walking?: boolean },
  target: Waypoint,
  gentle = false,
) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const distance = Math.hypot(dx, dy);
  const arrived = !target.coast && distance < (target.photo ? 7 : 11);
  const speedFactor =
    gentle && !target.coast
      ? Math.max(
          0.13,
          Math.sqrt(Math.max(0, distance - 5) * 50) / (pos.walking ? 32 : 150),
        )
      : pos.walking
        ? 1
        : Math.max(0.22, distance / 130);
  const strength = Math.min(target.maxInput ?? 1, speedFactor);
  return {
    x: arrived || distance === 0 ? 0 : (dx / distance) * strength,
    y: arrived || distance === 0 ? 0 : (dy / distance) * strength,
    brake: arrived && !gentle,
    arrived,
    scheme: 'simple' as const,
  };
}
