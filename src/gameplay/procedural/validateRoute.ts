import type { GameContent } from '../../content/schemas';
import { RuleEngine } from '../../rules/RuleEngine';
import { distanceInto } from '../../rules/priority/ConflictGeometry';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
  type Vec2,
} from '../../rules/types';
import {
  contains,
  distanceToLine,
  type PointOfInterest,
  sideVector,
  type WorldModel,
} from '../../rules/world/WorldModel';
import { ZoneTracker } from '../../rules/world/ZoneTracker';
import { RIDER_RADIUS, overlaps } from '../bicycle';

export type RouteStep = {
  poi: PointOfInterest;
  walking: boolean;
  through?: boolean;
  signal?: RiderState['signal'];
};
export type RouteProof = {
  seconds: number;
  metres: number;
  habits: readonly string[];
  visited: readonly string[];
};

type Rules = Pick<GameContent, 'balans' | 'przepisy'>;
export const poiCentre = ({ x, y, width, height }: PointOfInterest) => ({
  x: x + width / 2,
  y: y + height / 2,
});

export function validateRoute(
  world: WorldModel,
  content: Rules,
  route: readonly RouteStep[],
  night = false,
): RouteProof | undefined {
  if (route.length < 2) return;
  const radius = RIDER_RADIUS * world.metersPerPixel;
  const nearbyBans = world.signs.filter(
    ({ code, displayOnly }) => code === 'B-9' && !displayOnly,
  );
  const habits = new Set<string>();
  const visited = new Set<string>();
  const env: EnvState = {
    time: night ? 'night' : 'day',
    weather: 'clear',
    visibilityLow: false,
  };
  const engine = new RuleEngine(world, content);
  const tracker = new ZoneTracker(world);
  const rider: RiderState = {
    id: 'procedural',
    pos: poiCentre(route[0]!.poi),
    heading: route[0]!.poi.heading,
    mode: 'riding',
    speed: 0,
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: true },
    lights: { front: true, rear: true },
    shoulderCheck: { lastLeftAt: -Infinity },
  };
  let invalid = false;
  let ticks = 0;
  let metres = 0;
  engine.onVerdict(({ ruleId, kind }) => {
    if (kind === 'good') habits.add(ruleId);
    else invalid = true;
  });
  const clock = () => ticks / TICKS_PER_SECOND;
  const tick = () => {
    engine.step(rider, [], env);
    ticks++;
  };
  const wait = (seconds: number) => {
    rider.speed = 0;
    for (let i = 0; i < Math.ceil(seconds * TICKS_PER_SECOND); i++) tick();
  };
  const walls = world.walls.map((wall) => ({ ...wall, kind: 'wall' as const }));
  const clear = ({ x, y }: Vec2) =>
    x >= radius &&
    y >= radius &&
    x <= world.width - radius &&
    y <= world.height - radius &&
    !walls.some((wall) => overlaps(x, y, radius, wall));

  for (let index = 1; index < route.length; index++) {
    const { poi, walking, through, signal } = route[index]!;
    const start = rider.pos;
    const end = poiCentre(poi);
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length === 0 || !clear(start)) return;
    const heading = Math.atan2(end.y - start.y, end.x - start.x);
    const turn = Math.atan2(
      Math.sin(heading - rider.heading),
      Math.cos(heading - rider.heading),
    );
    rider.heading = heading;
    rider.mode = walking ? 'walking_bike' : 'riding';
    if (!route[index - 1]!.through) {
      if (signal && signal !== 'none' && rider.signal === signal) {
        rider.signal = 'none';
        tick();
      }
      rider.signal =
        signal ?? (turn > 0.45 ? 'right' : turn < -0.45 ? 'left' : 'none');
      if (rider.shoulderCheck) rider.shoulderCheck.lastLeftAt = clock();
      wait(
        Math.max(
          content.balans.silnik.sygnalizacja_min_przed_s,
          content.balans.silnik.stop_czas_s,
        ),
      );
    }
    const maxSpeed = walking ? 1.25 : 2.4;
    for (let along = 0; along < length && !invalid;) {
      const left = length - along;
      const speed = Math.min(
        maxSpeed,
        rider.speed + 2 / TICKS_PER_SECOND,
        through ? maxSpeed : Math.sqrt(2 * 2 * left),
      );
      const delta = Math.min(left, speed / TICKS_PER_SECOND);
      const fraction = (along + delta) / length;
      const next = {
        x: start.x + fraction * (end.x - start.x),
        y: start.y + fraction * (end.y - start.y),
      };
      if (!clear(next)) return;
      tracker.update(rider);
      const lane = tracker.lane;
      const stop =
        !walking &&
        lane &&
        distanceToLine(lane, rider.pos) >= 0 &&
        distanceToLine(lane, next) < 0;
      const crossing = world.crossings.find(
        (box) =>
          !contains(box, rider.pos) &&
          contains(box, next) &&
          distanceInto(box, rider.pos, heading) <= delta + 1e-6,
      );
      const blocked = () =>
        (stop &&
          lane.mainSignal &&
          world.phase(lane, clock(), env) !== 'green') ||
        (crossing?.signal &&
          !world.crossingAllowsEntry(crossing, clock(), env)) ||
        (crossing?.kind === 'rail' &&
          (world.railState(crossing, clock(), env)?.flashing ||
            world.railState(
              crossing,
              clock() +
                (crossing.axis === 'x' ? crossing.width : crossing.height) /
                  maxSpeed +
                1,
              env,
            )?.flashing));
      if (stop && lane.stopSign?.code === 'B-20')
        wait(content.balans.silnik.stop_czas_s + 0.1);
      for (let delay = 0; blocked(); delay++) {
        if (delay >= 180) return;
        wait(0.5);
      }
      rider.pos = next;
      rider.speed = speed;
      tick();
      tracker.update(rider);
      const { zone, intersection, driveway } = tracker;
      if (!zone && !intersection && !crossing && !tracker.crossing && !driveway)
        return;
      if (
        zone?.kind === 'rail' &&
        tracker.crossing?.kind !== 'rail' &&
        !world.crossings.some(
          (area) => area.kind === 'rail' && contains(area, next),
        )
      )
        return;
      const direction = zone?.direction && sideVector[zone.direction];
      if (
        !walking &&
        direction &&
        direction.x * Math.cos(heading) + direction.y * Math.sin(heading) < -0.1
      )
        return;
      if (
        walking &&
        zone?.kind === 'roadway' &&
        !tracker.crossing &&
        !driveway &&
        !world.zones.some((z) => z.kind === 'sidewalk' && contains(z, next))
      )
        return;
      for (const area of world.crossings)
        if (area.kind === 'rail' && contains(area, next)) visited.add(area.id);
      for (const [area, sign] of world.accessByZone)
        if (contains(area, next)) visited.add(sign.id);
      for (const area of [zone, intersection, driveway, tracker.crossing])
        if (area) visited.add(area.id);
      if (tracker.lane) {
        visited.add(tracker.lane.id);
        if (tracker.lane.stopSign) visited.add(tracker.lane.stopSign.id);
        if (tracker.lane.mainSignal) visited.add(tracker.lane.mainSignal.id);
        if (tracker.lane.arrow) visited.add(tracker.lane.arrow.id);
      }
      for (const area of world.zones)
        if (
          (area.kind === 'living_zone' || area.kind === 'pedestrian_zone') &&
          contains(area, next)
        )
          visited.add(area.id);
      for (const sign of nearbyBans)
        if (Math.hypot(next.x - sign.x, next.y - sign.y) <= 2)
          visited.add(sign.id);
      for (const area of world.tramStops)
        if (contains(area, next)) visited.add(area.id);
      along += delta;
    }
    if (invalid) return;
    metres += length;
    if (!through) wait(0.1);
  }
  engine.finish();
  if (!invalid)
    return {
      seconds: clock(),
      metres,
      habits: [...habits],
      visited: [...visited],
    };
}
