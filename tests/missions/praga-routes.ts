import type { Vec2 } from '../../src/rules/types';

export interface Waypoint extends Vec2 {
  wait?: number;
  signal?: 'left' | 'right';
  look?: boolean;
}

export const pragaRoutes = {
  'WAW-T-02': {
    legal: [
      { x: 1790, y: 1057 },
      { x: 1914, y: 1057 },
    ],
  },
  'WAW-A1-01': {
    legal: [
      { x: 800, y: 337, wait: 0.5, signal: 'right' },
      { x: 800, y: 405, signal: 'right' },
      { x: 552, y: 405, wait: 5, signal: 'right' },
      { x: 235, y: 405 },
    ],
  },
  'WAW-A1-02': {
    legal: [
      { x: 870, y: 975, wait: 3.5 },
      { x: 870, y: 975, wait: 1.6, signal: 'left' },
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
} satisfies Record<string, { legal: Waypoint[]; shortcut?: Waypoint[] }>;

export type PragaMissionId = keyof typeof pragaRoutes;

export function approachWaypoint(pos: Vec2, target: Vec2) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const distance = Math.hypot(dx, dy);
  const brake = distance < 11;
  const strength = Math.min(1, Math.max(0.22, distance / 130));
  return {
    x: brake ? 0 : (dx / distance) * strength,
    y: brake ? 0 : (dy / distance) * strength,
    brake,
    scheme: 'simple' as const,
  };
}
