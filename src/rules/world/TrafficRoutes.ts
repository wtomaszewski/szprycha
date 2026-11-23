import { z } from 'zod';
import type { Vec2 } from '../types';
import { rightEdgeDistance } from '../detectors/GDZIE-03.ts';
import { RoadPath } from './RoadPath.ts';
import {
  contains,
  type Box,
  type Crossing,
  type Lane,
  type Zone,
} from './WorldModel.ts';

export const routeProperties = z.object({
  kind: z.enum([
    'pedestrian',
    'cyclist',
    'tram',
    'passenger',
    'emergency',
    'car',
    'bus',
    'tractor',
  ]),
  speed: z.number().positive(),
  event_only: z.boolean().default(false),
  start_s: z.number().nonnegative().default(0),
  repeat_s: z.number().positive().optional(),
  loop: z.literal(true).optional(),
  rural_edge: z.literal(true).optional(),
});
export const routeControlProperties = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('junction'),
    route: z.string(),
    vertex: z.number().int().nonnegative(),
    exit: z.number().int().positive(),
    lane: z.string(),
  }),
  z.object({
    kind: z.literal('platform'),
    route: z.string(),
    vertex: z.number().int().positive(),
    dwell_s: z.number().positive(),
  }),
  z.object({
    kind: z.literal('stop'),
    route: z.string(),
    vertex: z.number().int().nonnegative(),
    passenger: z.string(),
  }),
]);

export interface TrafficRoute extends z.infer<typeof routeProperties> {
  id: string;
  path: RoadPath;
  reverse?: RoadPath;
  crossings: Crossing[];
  junctions: RouteJunction[];
  stops: TramStop[];
  platforms: { distance: number; dwell: number }[];
}
export interface RouteJunction {
  distance: number;
  exit: number;
  lane: Lane;
}
export interface TramStop extends Box {
  distance: number;
  passenger: TrafficRoute;
}

type RouteInput = z.infer<typeof routeProperties> & {
  id: string;
  path: RoadPath;
};
type ControlInput = z.infer<typeof routeControlProperties> & Box;

function onRuralEdge(
  zones: readonly Zone[],
  pos: Vec2,
  heading: number,
  foot: boolean,
) {
  const sides = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
  return zones.some((zone) => {
    if (!contains(zone, pos)) return false;
    if (zone.kind === 'shoulder' && zone.direction && zone.shoulderUsable)
      return Math.cos(heading - sides[zone.direction]) * (foot ? -1 : 1) > 0.7;
    if (!foot || zone.kind !== 'roadway') return false;
    // The left road edge is the right edge with the direction reversed.
    return rightEdgeDistance(zone, pos, heading + Math.PI) < 0.55;
  });
}

export function buildTrafficRoutes(
  routes: RouteInput[],
  controls: ControlInput[],
  crossings: readonly Crossing[],
  lanes: readonly Lane[],
  zones: readonly Zone[],
  width: number,
  height: number,
): TrafficRoute[] {
  const byId = new Map<string, TrafficRoute>();
  for (const input of routes) {
    const { id, path, kind } = input;
    if (!id || byId.has(id)) throw new Error(`Duplicate traffic route: ${id}`);
    if (
      path.points.some(({ x, y }) => x < 0 || x > width || y < 0 || y > height)
    )
      throw new Error(`Traffic route outside map: ${id}`);
    const foot = kind === 'pedestrian';
    const bike = kind === 'cyclist';
    const walkZones = zones.filter(
      ({ kind, sharedSide }) =>
        kind === 'sidewalk' ||
        kind === 'pedestrian_zone' ||
        (kind === 'shared_path' && sharedSide !== 'bike'),
    );
    const bikeZones = zones.filter(
      ({ kind, sharedSide }) =>
        kind === 'bike_lane' ||
        kind === 'bike_path' ||
        (kind === 'shared_path' && sharedSide !== 'pedestrian'),
    );
    const motorRoute = kind === 'car' || kind === 'bus' || kind === 'tractor';
    if (input.rural_edge && !foot && !bike)
      throw new Error(`Invalid rural edge route: ${id}`);
    const allowed = crossings.filter(
      ({ kind }) =>
        kind === 'combined' || kind === (foot ? 'pedestrian' : 'bike'),
    );
    if (foot || bike || motorRoute) {
      const sample: Vec2 = { x: 0, y: 0 };
      const count = Math.ceil(path.length / 0.15);
      for (let i = 0; i <= count; i++) {
        const heading = path.place(
          Math.max(
            1e-6,
            Math.min(path.length - 1e-6, (i * path.length) / count),
          ),
          sample,
        );
        const legal = input.rural_edge
          ? onRuralEdge(zones, sample, heading, foot)
          : motorRoute
            ? zones.some(
                (zone) => zone.kind === 'roadway' && contains(zone, sample),
              )
            : allowed.some((box) => contains(box, sample)) ||
              (foot ? walkZones : bikeZones).some((zone) => {
                if (!contains(zone, sample)) return false;
                if (!bike)
                  return !zones.some(
                    (road) => road.kind === 'roadway' && contains(road, sample),
                  );
                if (!zone.direction) return true;
                const degrees = {
                  E: 0,
                  S: Math.PI / 2,
                  W: Math.PI,
                  N: -Math.PI / 2,
                };
                return Math.cos(heading - degrees[zone.direction]) > 0.99;
              });
        if (!legal)
          throw new Error(`Traffic route leaves its infrastructure: ${id}`);
      }
    }
    const onBoundary = ({ x, y }: Vec2) =>
      x === 0 || y === 0 || x === width || y === height;
    if (
      input.loop &&
      (kind !== 'tram' ||
        path.start.x !== path.end.x ||
        path.start.y !== path.end.y)
    )
      throw new Error(`Invalid tram loop: ${id}`);
    if (
      (kind === 'tram' ||
        kind === 'emergency' ||
        kind === 'bus' ||
        kind === 'tractor') &&
      (!input.repeat_s ||
        (!input.loop && (!onBoundary(path.start) || !onBoundary(path.end))))
    )
      throw new Error(
        `Repeating traffic route needs boundary endpoints and repeat_s: ${id}`,
      );
    if (kind === 'car' && input.repeat_s)
      throw new Error(`Forced car route cannot repeat: ${id}`);
    if (
      bike &&
      !input.event_only &&
      !input.rural_edge &&
      (!onBoundary(path.start) || !onBoundary(path.end))
    )
      throw new Error(`Cycle route needs boundary endpoints: ${id}`);
    byId.set(id, {
      ...input,
      reverse:
        foot && !input.rural_edge
          ? new RoadPath(id, [...path.points].reverse())
          : undefined,
      crossings:
        foot || bike
          ? allowed.filter((box) => {
              const entry = path.boxAhead(0, box, 0);
              if (!Number.isFinite(entry)) return false;
              const heading = path.place(entry, { x: 0, y: 0 });
              return box.axis === 'x'
                ? Math.abs(Math.cos(heading)) > 0.7
                : Math.abs(Math.sin(heading)) > 0.7;
            })
          : [],
      junctions: [],
      stops: [],
      platforms: [],
    });
  }
  const passengers = new Set<TrafficRoute>();
  for (const control of controls) {
    const route = byId.get(control.route);
    const segment = route?.path.segments[control.vertex];
    if (!route || !segment)
      throw new Error(`Unknown control vertex: ${control.id}`);
    const distance = segment.offset;
    if (control.kind === 'junction') {
      const lane = lanes.find(({ id }) => id === control.lane);
      const exit = route.path.segments[control.exit];
      if (
        !lane ||
        !exit ||
        exit.offset <= distance ||
        (route.kind !== 'tram' &&
          route.kind !== 'emergency' &&
          route.kind !== 'car') ||
        ((route.kind === 'tram' || route.kind === 'car') &&
          (lane.type !== route.kind ||
            Math.hypot(
              lane.end.x - segment.start.x,
              lane.end.y - segment.start.y,
            ) > 1e-6))
      )
        throw new Error(`Invalid junction control: ${control.id}`);
      if (
        route.junctions.some(
          (junction) => junction.lane.intersection === lane.intersection,
        )
      )
        throw new Error(`Duplicate junction control: ${control.id}`);
      route.junctions.push({ distance, exit: exit.offset, lane });
    } else if (control.kind === 'platform') {
      if (
        (route.kind !== 'tram' && route.kind !== 'bus') ||
        route.platforms.some((stop) => stop.distance === distance)
      )
        throw new Error(`Invalid platform: ${control.id}`);
      route.platforms.push({ distance, dwell: control.dwell_s });
    } else {
      const passenger = byId.get(control.passenger);
      if (
        route.kind !== 'tram' ||
        passenger?.kind !== 'passenger' ||
        passengers.has(passenger) ||
        !contains(control, passenger.path.start) ||
        contains(control, passenger.path.end) ||
        !zones.some(
          (zone) =>
            zone.kind === 'sidewalk' && contains(zone, passenger.path.end),
        ) ||
        Math.hypot(
          segment.start.x - passenger.path.start.x,
          segment.start.y - passenger.path.start.y,
        ) > 1.5
      )
        throw new Error(`Invalid tram stop: ${control.id}`);
      passengers.add(passenger);
      route.stops.push({
        id: control.id,
        x: control.x,
        y: control.y,
        width: control.width,
        height: control.height,
        distance,
        passenger,
      });
    }
  }
  for (const route of byId.values()) {
    if (route.kind === 'car' && !route.junctions.length)
      throw new Error(`Forced car route needs a junction: ${route.id}`);
    if (route.kind === 'passenger' && !passengers.has(route))
      throw new Error(`Passenger route without stop: ${route.id}`);
    route.junctions.sort((a, b) => a.distance - b.distance);
    route.stops.sort((a, b) => a.distance - b.distance);
    route.platforms.sort((a, b) => a.distance - b.distance);
  }
  return [...byId.values()];
}
