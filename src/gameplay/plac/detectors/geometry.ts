import { RIDER_RADIUS } from '../../bicycle';
import type { Point, ReportFault } from './types';

export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(p, a);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

export function touchesCone(
  cone: Point & { radius: number },
  from: Point,
  to: Point,
) {
  return distanceToSegment(cone, from, to) <= cone.radius + RIDER_RADIUS;
}

export function assessLane(
  offset: number,
  halfWidth: number,
  report: ReportFault,
) {
  if (offset >= halfWidth) report('offTrack', 'major');
  else if (offset + RIDER_RADIUS >= halfWidth) report('line', 'minor');
}
