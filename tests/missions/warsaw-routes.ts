import type { Vec2 } from '../../src/rules/types';

export interface Waypoint extends Vec2 {
  wait?: number;
  signal?: 'left' | 'right';
  look?: boolean;
  walking?: boolean;
  maxInput?: number;
  photo?: boolean;
  until?: 'traffic-ended' | 'officer-go' | 'signaled' | 'driveway-stop';
}

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
    ],
  },
  'WAW-A1-02': {
    legal: [
      { x: 870, y: 975, until: 'traffic-ended' },
      { x: 870, y: 975, until: 'signaled', signal: 'left' },
      { x: 870, y: 1135, signal: 'left', look: true },
      { x: 970, y: 1144, wait: 0.5, signal: 'left', look: true },
      { x: 1446, y: 1132, look: true },
    ],
  },
  'WAW-A1-03': {
    legal: [
      { x: 1130, y: 548, wait: 5 },
      { x: 1130, y: 245 },
      { x: 1298, y: 245, signal: 'right' },
    ],
    shortcut: [
      { x: 1130, y: 548, wait: 5 },
      { x: 1130, y: 352 },
      // Aim inside pasaz_pierogi so the turn toward the finish cannot skirt B-1.
      { x: 1200, y: 316, signal: 'right' },
      { x: 1298, y: 245, signal: 'right' },
    ],
  },
  'WAW-A1-04': {
    legal: [
      { x: 2420, y: 348, look: true, signal: 'left' },
      { x: 2600, y: 328, look: true, signal: 'left' },
      { x: 2895, y: 344 },
      { x: 3174, y: 355 },
      { x: 3174, y: 596, walking: true },
      { x: 3034, y: 596, walking: false },
    ],
    shortcut: [
      { x: 2420, y: 348, look: true, signal: 'left' },
      { x: 2600, y: 328, look: true, signal: 'left' },
      { x: 2895, y: 344 },
      { x: 2914, y: 457 },
      { x: 2914, y: 558 },
      { x: 3034, y: 588 },
    ],
  },
  'WAW-A1-05': {
    legal: [
      { x: 3235, y: 675, maxInput: 0.3 },
      { x: 3519, y: 676, maxInput: 0.3 },
      { x: 3519, y: 764, walking: true },
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
    ],
  },
} satisfies Record<string, { legal: Waypoint[]; shortcut?: Waypoint[] }>;

export type WarsawMissionId = keyof typeof warsawRoutes;

export function approachWaypoint(
  pos: Vec2 & { walking?: boolean },
  target: Waypoint,
) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const distance = Math.hypot(dx, dy);
  const brake = distance < (target.photo ? 7 : 11);
  const strength = Math.min(
    target.maxInput ?? 1,
    pos.walking ? 1 : Math.max(0.22, distance / 130),
  );
  return {
    x: brake ? 0 : (dx / distance) * strength,
    y: brake ? 0 : (dy / distance) * strength,
    brake,
    scheme: 'simple' as const,
  };
}
