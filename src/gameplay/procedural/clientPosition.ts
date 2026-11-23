import type { Vec2 } from '../../rules/types';
import {
  boxCenter,
  contains,
  type Box,
  type PointOfInterest,
  type WorldModel,
} from '../../rules/world/WorldModel.ts';

type MapGeometry = Pick<
  WorldModel,
  | 'zones'
  | 'walls'
  | 'crossings'
  | 'driveways'
  | 'width'
  | 'height'
  | 'metersPerPixel'
>;

const sidewalkSearchPx = 144;
const maxSearchPx = 384;
const offsets: { dx: number; dy: number; distance: number }[] = [];
for (let dy = -maxSearchPx; dy <= maxSearchPx; dy += 8)
  for (let dx = -maxSearchPx; dx <= maxSearchPx; dx += 8) {
    const distance = Math.hypot(dx, dy);
    if (distance >= 24 && distance <= maxSearchPx)
      offsets.push({ dx, dy, distance });
  }
offsets.sort((a, b) => a.distance - b.distance);

// A route can start on a road or mid-bridge. Prefer a nearby walking area
// and keep the client clear of traffic, including when waiting by the shore.
export function clientPosition(
  world: MapGeometry,
  poi: PointOfInterest,
): Vec2 | undefined {
  const origin = boxCenter(poi);
  const scale = world.metersPerPixel;
  const margin = 9 * scale;
  const nearby = (area: Box) =>
    contains(area, origin, (maxSearchPx + 1) * scale + margin);
  const obstacles = [
    ...world.walls,
    ...world.crossings,
    ...world.driveways,
    ...world.zones.filter(({ kind }) =>
      [
        'roadway',
        'bike_path',
        'bike_lane',
        'shared_path',
        'rail',
        'shoulder',
      ].includes(kind),
    ),
  ].filter(nearby);
  const walkable = world.zones.filter(
    (area) =>
      ['sidewalk', 'pedestrian_zone', 'park_path', 'no_bikes'].includes(
        area.kind,
      ) && nearby(area),
  );
  let nearest: Vec2 | undefined;
  for (const { dx, dy, distance } of offsets) {
    if (distance > sidewalkSearchPx && nearest) return nearest;
    const point = { x: origin.x + dx * scale, y: origin.y + dy * scale };
    if (
      point.x < margin ||
      point.y < margin ||
      point.x >= world.width - margin ||
      point.y >= world.height - margin ||
      obstacles.some((area) => contains(area, point, margin))
    )
      continue;
    if (
      distance > sidewalkSearchPx ||
      walkable.some((area) => contains(area, point))
    )
      return point;
    nearest ??= point;
  }
  return nearest;
}
