import type { Vec2 } from '../types';
import type { Box } from './WorldModel';

interface Segment {
  start: Vec2;
  end: Vec2;
  offset: number;
  length: number;
  direction: Vec2;
  heading: number;
}

export class RoadPath {
  readonly segments: readonly Segment[];
  readonly length: number;
  readonly start: Vec2;
  readonly end: Vec2;

  constructor(
    id: string,
    readonly points: readonly Vec2[],
  ) {
    const start = points[0];
    const end = points.at(-1);
    if (!start || !end || points.length < 2)
      throw new Error(
        `Lane ${id}: expected a polyline with at least two points`,
      );
    this.start = start;
    this.end = end;
    let offset = 0;
    this.segments = points.slice(1).map((end, index) => {
      const start = points[index]!;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) throw new Error(`Lane ${id}: zero-length segment`);
      const segment = {
        start,
        end,
        offset,
        length,
        direction: { x: dx / length, y: dy / length },
        heading: Math.atan2(dy, dx),
      };
      offset += length;
      return segment;
    });
    this.length = offset;
  }

  place(distance: number, pos: Vec2) {
    for (const segment of this.segments) {
      if (
        distance >= segment.offset + segment.length &&
        segment.end !== this.end
      )
        continue;
      const along = distance - segment.offset;
      pos.x = segment.start.x + segment.direction.x * along;
      pos.y = segment.start.y + segment.direction.y * along;
      return segment.heading;
    }
    return 0;
  }

  boxAhead(progress: number, box: Box, margin: number) {
    const left = box.x - margin;
    const right = box.x + box.width + margin;
    const top = box.y - margin;
    const bottom = box.y + box.height + margin;
    for (const { start, end, offset, length, direction } of this.segments) {
      if (
        offset + length < progress ||
        Math.max(start.x, end.x) < left ||
        Math.min(start.x, end.x) > right ||
        Math.max(start.y, end.y) < top ||
        Math.min(start.y, end.y) > bottom
      )
        continue;
      let enter = Math.max(0, progress - offset);
      let exit = length;
      if (direction.x !== 0) {
        const a = (left - start.x) / direction.x;
        const b = (right - start.x) / direction.x;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
      }
      if (direction.y !== 0) {
        const a = (top - start.y) / direction.y;
        const b = (bottom - start.y) / direction.y;
        enter = Math.max(enter, Math.min(a, b));
        exit = Math.min(exit, Math.max(a, b));
      }
      if (enter <= exit) return offset + enter - progress;
    }
    return Infinity;
  }

  /** First distance at which the centre line overlaps the obstacle's safety radius. */
  obstacleAhead(progress: number, pos: Vec2, radius: number) {
    for (const { start, offset, length, direction } of this.segments) {
      if (offset + length < progress) continue;
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      const along = dx * direction.x + dy * direction.y;
      const across = dx * direction.y - dy * direction.x;
      if (Math.abs(across) >= radius) continue;
      const reach = Math.sqrt(radius * radius - across * across);
      const first = Math.max(progress, offset, offset + along - reach);
      if (first <= offset + length && first < offset + along + reach)
        return first - progress;
    }
    return Infinity;
  }
}
