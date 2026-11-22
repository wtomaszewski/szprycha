import type { Vec2 } from '../rules/types';
import { contains, type WorldModel } from '../rules/world/WorldModel';

export function nearbyPhotoSubject(
  world: Pick<WorldModel, 'zones' | 'crossings' | 'signs' | 'signals'>,
  position: Vec2,
  speed: number,
  walking: boolean,
  knownSigns: ReadonlyMap<string, unknown>,
  collected: Readonly<Record<string, string>>,
  range: number,
) {
  if (speed !== 0 || !walking) return;
  const zone = world.zones.find((area) => contains(area, position));
  if (
    !zone ||
    (zone.kind !== 'sidewalk' &&
      zone.kind !== 'pedestrian_zone' &&
      zone.kind !== 'park_path') ||
    world.crossings.some((area) => contains(area, position))
  )
    return;
  let closest: (Vec2 & { code: string }) | undefined;
  let distance = range;
  for (const candidates of [world.signs, world.signals]) {
    for (const sign of candidates) {
      if (
        ('displayOnly' in sign && sign.displayOnly) ||
        !knownSigns.has(sign.code) ||
        Object.hasOwn(collected, sign.code)
      )
        continue;
      const next = Math.hypot(sign.x - position.x, sign.y - position.y);
      if (next <= distance) {
        closest = sign;
        distance = next;
      }
    }
  }
  return closest;
}
