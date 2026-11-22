import type { Vec2 } from '../types';
import type { Footprint } from './Footprint';
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

  boxAhead(
    progress: number,
    box: Box,
    margin: number,
    footprint?: Footprint,
    lateral = 0,
  ) {
    const halfLength = footprint?.halfLength ?? 0;
    const halfWidth = footprint?.halfWidth ?? 0;
    for (const { start, end, offset, length, direction } of this.segments) {
      if (offset + length < progress) continue;
      const x = direction.x;
      const y = direction.y;
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      const dx = box.x + box.width / 2 - start.x;
      const dy = box.y + box.height / 2 - start.y;
      // The lateral axis is constant while the body moves along this segment.
      const across = dy * x - dx * y - lateral;
      if (
        Math.abs(across) >
        (box.width / 2 + margin) * absY +
          (box.height / 2 + margin) * absX +
          halfWidth
      )
        continue;
      const along = dx * x + dy * y;
      const reach =
        (box.width / 2 + margin) * absX +
        (box.height / 2 + margin) * absY +
        halfLength;
      let enter = Math.max(0, progress - offset, along - reach);
      let exit = Math.min(length, along + reach);
      const extraX = margin + halfLength * absX + halfWidth * absY;
      const extraY = margin + halfLength * absY + halfWidth * absX;
      const left = box.x - extraX + y * lateral;
      const right = box.x + box.width + extraX + y * lateral;
      const top = box.y - extraY - x * lateral;
      const bottom = box.y + box.height + extraY - x * lateral;
      if (
        Math.max(start.x, end.x) < left ||
        Math.min(start.x, end.x) > right ||
        Math.max(start.y, end.y) < top ||
        Math.min(start.y, end.y) > bottom
      )
        continue;
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

  /** First distance at which the moving body reaches an obstacle. */
  obstacleAhead(
    progress: number,
    pos: Vec2,
    clearance: number,
    footprint?: Footprint,
    lateral = 0,
    obstacle?: Footprint,
    heading = 0,
  ) {
    for (const {
      start,
      offset,
      length,
      direction,
      heading: segmentHeading,
    } of this.segments) {
      if (offset + length < progress) continue;
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      const along = dx * direction.x + dy * direction.y;
      // On the current segment, moving forward separates an obstacle that is
      // already behind the centre, even if it is still next to the rear.
      if (footprint && offset <= progress && offset + along < progress - 1e-6)
        continue;
      const across = dy * direction.x - dx * direction.y - lateral;
      let halfWidth = (footprint?.halfWidth ?? 0) + clearance;
      let halfLength = (footprint?.halfLength ?? 0) + clearance;
      if (obstacle) {
        const angle = heading - segmentHeading;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        halfWidth += obstacle.halfLength * sin + obstacle.halfWidth * cos;
        halfLength += obstacle.halfLength * cos + obstacle.halfWidth * sin;
      }
      if (Math.abs(across) >= halfWidth) continue;
      if (!footprint)
        halfLength = Math.sqrt(clearance * clearance - across * across);
      const first = Math.max(progress, offset, offset + along - halfLength);
      if (first <= offset + length && first < offset + along + halfLength)
        return first - progress;
    }
    return Infinity;
  }
}
