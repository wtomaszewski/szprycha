import { z } from 'zod';
import type {
  EnvState,
  Maneuver,
  RailState,
  SignalPhase,
  Vec2,
} from '../types';
import { LaneGraph, type BoundaryExit, type LaneEdge } from './LaneGraph.ts';
import { RoadPath } from './RoadPath.ts';
import {
  buildTrafficRoutes,
  routeControlProperties,
  routeProperties,
  type TrafficRoute,
} from './TrafficRoutes.ts';

const point = z.object({ x: z.number(), y: z.number() });
const property = z.object({ name: z.string(), value: z.unknown() });
const tiledObject = point.extend({
  name: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  polyline: z.array(point).optional(),
  properties: z.array(property).default([]),
});
const tiled = z.object({
  properties: z.array(property).default([]),
  tilewidth: z.number().positive(),
  tileheight: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  layers: z.array(
    z.object({ name: z.string(), objects: z.array(tiledObject).optional() }),
  ),
});
const sideSchema = z.enum(['N', 'E', 'S', 'W']);
const prioritySchema = z.enum([
  'equal',
  'main',
  'minor',
  'signal',
  'roundabout_in',
  'roundabout_ring',
]);
const zoneSchema = z.enum([
  'roadway',
  'sidewalk',
  'bike_path',
  'bike_lane',
  'shared_path',
  'shoulder',
  'living_zone',
  'pedestrian_zone',
  'park_path',
  'no_bikes',
  'rail',
]);
const railSchedule = z.object({
  open_s: z.number().positive(),
  lowering_s: z.number().positive(),
  closed_s: z.number().positive(),
  raising_s: z.number().positive(),
  offset_s: z.number().nonnegative().default(0),
});
const railStates = {
  open: { barrier: 'open', flashing: false },
  lowering: { barrier: 'lowering', flashing: true },
  closed: { barrier: 'closed', flashing: true },
  raising: { barrier: 'raising', flashing: true },
} as const satisfies Record<RailState['barrier'], RailState>;
const crossingSchema = z.enum(['pedestrian', 'bike', 'combined', 'rail']);
const intersectionSchema = z.enum([
  'equal',
  'priority',
  'signals',
  'roundabout',
]);
const laneProperties = z.object({
  side: sideSchema,
  priorityClass: prioritySchema,
  width_px: z.number().positive(),
  type: z.enum(['car', 'tram', 'bike']),
  speedLimit: z.number().positive(),
  from: z.string().min(1).optional(),
  turns: z.string().optional(),
  parallelBikeInfra: z.string().optional(),
  parallelShoulder: z.string().optional(),
});
const signProperties = z.object({
  code: z.string(),
  exceptBicycles: z.boolean().default(false),
  affects: z.string(),
  facing: sideSchema,
});
const signalProperties = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('S-1'),
    affects: z.string(),
    group: z.string(),
    offset_s: z.number().nonnegative(),
    cycle_s: z.number().positive(),
    green_s: z.number().positive(),
    yellow_s: z.number().positive(),
  }),
  z.object({
    code: z.literal('S-2'),
    affects: z.string(),
    group: z.string(),
    from_s: z.number().nonnegative(),
    until_s: z.number().positive(),
    direction: z.enum(['left', 'right']),
  }),
]);
const zoneProperties = z.object({
  width_m: z.number().positive().optional(),
  speedLimit: z.number().positive().optional(),
  direction: sideSchema.optional(),
  parallelBikeInfra: z.string().optional(),
  shoulderUsable: z.boolean().optional(),
  sharedSide: z.enum(['pedestrian', 'bike']).optional(),
  surface: z.enum(['rough']).optional(),
});

export interface Box extends Vec2 {
  id: string;
  width: number;
  height: number;
}
export interface Zone extends Box, z.infer<typeof zoneProperties> {
  kind: z.infer<typeof zoneSchema>;
}
export interface Crossing extends Box {
  kind: z.infer<typeof crossingSchema>;
  axis: 'x' | 'y';
  signal?: CrossingSignal;
  rail?: z.infer<typeof railSchedule>;
  trafficArea?: Box;
}
interface CrossingSignal extends Vec2 {
  offset_s: number;
  cycle_s: number;
  green_s: number;
}
export interface Driveway extends Box {
  direction: Side;
}
export interface Intersection extends Box {
  kind: z.infer<typeof intersectionSchema>;
  lanes: Lane[];
}
export type Side = z.infer<typeof sideSchema>;
export interface Lane extends Omit<
  z.infer<typeof laneProperties>,
  'width_px' | 'intersection'
> {
  id: string;
  intersection: Intersection;
  points: readonly Vec2[];
  path: RoadPath;
  end: Vec2;
  forward: Vec2;
  length: number;
  width: number;
  stopSign?: Sign;
  accessSign?: Sign;
  shoulder?: Zone;
  mainSignal?: MainSignal;
  arrow?: ArrowSignal;
}
export interface Sign extends Vec2, z.infer<typeof signProperties> {
  id: string;
}
type Signal = Vec2 & { id: string } & z.infer<typeof signalProperties>;
export type MainSignal = Extract<Signal, { code: 'S-1' }>;
export type ArrowSignal = Extract<Signal, { code: 'S-2' }>;

const pedestrianSpawn = z.object({
  heading: z.number(),
  speed: z.number().positive(),
  length_m: z.number().positive(),
});
export type PedestrianSpawn = Box & z.infer<typeof pedestrianSpawn>;

export const sideVector: Record<Side, Vec2> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};
export const zoneOrder: Record<Zone['kind'], number> = {
  bike_path: 0,
  bike_lane: 0,
  shared_path: 1,
  roadway: 2,
  sidewalk: 3,
  shoulder: 4,
  living_zone: 5,
  pedestrian_zone: 5,
  park_path: 5,
  no_bikes: 5,
  rail: 5,
};

export function contains(box: Box, point: Vec2, margin = 0) {
  return (
    point.x >= box.x - margin &&
    point.x < box.x + box.width + margin &&
    point.y >= box.y - margin &&
    point.y < box.y + box.height + margin
  );
}

/** Positive on the approach side of the line. The lane points toward the junction. */
export function distanceToLine(lane: Lane, pos: Vec2) {
  return (
    (lane.end.x - pos.x) * lane.forward.x +
    (lane.end.y - pos.y) * lane.forward.y
  );
}

export function lateralOffset(lane: Lane, pos: Vec2) {
  return (
    -(pos.x - lane.end.x) * lane.forward.y +
    (pos.y - lane.end.y) * lane.forward.x
  );
}

export class WorldModel {
  readonly metersPerPixel: number;
  readonly zones: readonly Zone[];
  readonly crossings: readonly Crossing[];
  readonly driveways: readonly Driveway[];
  readonly parkedCars: readonly Box[];
  readonly duskAt: number;
  readonly tramStops: readonly Box[];
  readonly intersections: readonly Intersection[];
  readonly lanes: readonly Lane[];
  readonly signs: readonly Sign[];
  readonly accessByZone = new Map<Zone, Sign>();
  readonly signals: readonly Signal[];
  readonly pedestrianSpawns: readonly PedestrianSpawn[];
  readonly laneGraph: LaneGraph;
  readonly trafficRoutes: readonly TrafficRoute[];
  readonly roadwayCyclistLanes: readonly Lane[];
  readonly trafficCarCount: number;
  private readonly lanesById: ReadonlyMap<string, Lane>;

  constructor(data: unknown, metersPerTile: number) {
    const map = tiled.parse(data);
    const scale = (this.metersPerPixel = metersPerTile / map.tilewidth);
    const layer = (name: string) =>
      map.layers.find((entry) => entry.name === name)?.objects ?? [];
    const properties = (object: { properties: z.infer<typeof property>[] }) =>
      Object.fromEntries(
        object.properties.map(({ name, value }) => [name, value]),
      );
    const box = (object: z.infer<typeof tiledObject>): Box => ({
      id: object.name,
      x: object.x * scale,
      y: object.y * scale,
      width: object.width * scale,
      height: object.height * scale,
    });
    this.zones = layer('zones')
      .flatMap((object) => {
        const props = properties(object);
        const kind = zoneSchema.safeParse(props.kind);
        return kind.success
          ? [
              {
                ...box(object),
                kind: kind.data,
                ...zoneProperties.parse(props),
              },
            ]
          : [];
      })
      .sort(
        (a, b) =>
          zoneOrder[a.kind] - zoneOrder[b.kind] ||
          (b.width_m ?? 0) - (a.width_m ?? 0),
      );
    this.duskAt =
      z.number().nonnegative().optional().parse(properties(map).dusk_at_s) ??
      Infinity;
    this.driveways = layer('driveways').map((object) => ({
      ...box(object),
      direction: sideSchema.parse(properties(object).direction),
    }));
    this.parkedCars = layer('parked_cars').map(box);
    const crossingLights = new Map(
      layer('crossing_signals').map((object) => {
        const props = z
          .object({
            crossing: z.string(),
            offset_s: z.number().nonnegative(),
            cycle_s: z.number().positive(),
            green_s: z.number().positive(),
          })
          .parse(properties(object));
        if (props.green_s >= props.cycle_s)
          throw new Error(`Invalid crossing signal: ${object.name}`);
        return [props.crossing, { ...box(object), ...props }];
      }),
    );
    if (crossingLights.size !== layer('crossing_signals').length)
      throw new Error('Duplicate crossing signal');
    const crossingGroups = new Map<string, Crossing[]>();
    this.crossings = layer('crossings').map((object) => {
      const props = properties(object);
      const crossing: Crossing = {
        ...box(object),
        kind: crossingSchema.parse(props.kind),
        axis: z.enum(['x', 'y']).parse(props.axis),
        signal: crossingLights.get(object.name),
        rail:
          props.kind === 'rail' && props.open_s !== undefined
            ? railSchedule.parse(props)
            : undefined,
      };
      if (typeof props.trafficGroup === 'string') {
        const group = crossingGroups.get(props.trafficGroup) ?? [];
        group.push(crossing);
        crossingGroups.set(props.trafficGroup, group);
      }
      return crossing;
    });
    for (const [id, group] of crossingGroups) {
      const x = Math.min(...group.map((crossing) => crossing.x));
      const y = Math.min(...group.map((crossing) => crossing.y));
      const width =
        Math.max(...group.map((crossing) => crossing.x + crossing.width)) - x;
      const height =
        Math.max(...group.map((crossing) => crossing.y + crossing.height)) - y;
      const area = { id, x, y, width, height };
      for (const crossing of group) crossing.trafficArea = area;
    }
    const intersections = layer('intersections').map(
      (object): Intersection => ({
        ...box(object),
        kind: intersectionSchema.parse(properties(object).kind),
        lanes: [],
      }),
    );
    const intersectionsById = new Map(
      intersections.map((intersection) => [intersection.id, intersection]),
    );
    if (
      [...crossingLights.keys()].some(
        (id) =>
          !this.crossings.some(
            (crossing) => crossing.id === id && crossing.kind !== 'rail',
          ),
      )
    )
      throw new Error('Unknown crossing for signal');
    this.intersections = intersections;
    if (intersectionsById.size !== intersections.length)
      throw new Error('Duplicate intersection id');
    const polyline = (object: z.infer<typeof tiledObject>) =>
      new RoadPath(
        object.name,
        object.polyline?.map((p) => ({
          x: (object.x + p.x) * scale,
          y: (object.y + p.y) * scale,
        })) ?? [],
      );
    const exits: BoundaryExit[] = [];
    this.lanes = layer('lanes').flatMap((object): Lane[] => {
      const props = properties(object);
      const intersection = intersectionsById.get(
        z.string().parse(props.intersection),
      );
      if (!intersection)
        throw new Error(
          `Lane ${object.name}: unknown intersection ${props.intersection}`,
        );
      const path = polyline(object);
      if (props.role === 'exit') {
        exits.push({
          id: object.name,
          intersection,
          path,
          side: sideSchema.parse(props.side),
          speedLimit: z.number().positive().parse(props.speedLimit),
        });
        return [];
      }
      if (props.role !== undefined && props.role !== 'approach')
        throw new Error(`Lane ${object.name}: unknown role ${props.role}`);
      const { width_px, ...approach } = laneProperties.parse(props);
      if (
        approach.parallelBikeInfra &&
        !this.zones.some(
          ({ id, kind }) =>
            id === approach.parallelBikeInfra &&
            (kind === 'bike_path' || kind === 'bike_lane'),
        )
      )
        throw new Error(`Unknown parallel bike infrastructure: ${object.name}`);
      const shoulder = approach.parallelShoulder
        ? this.zones.find(
            ({ id, kind }) =>
              id === approach.parallelShoulder && kind === 'shoulder',
          )
        : undefined;
      if (approach.parallelShoulder && !shoulder)
        throw new Error(`Unknown shoulder: ${object.name}`);
      const lane: Lane = {
        shoulder,
        ...approach,
        id: object.name,
        intersection,
        points: path.points,
        path,
        end: path.end,
        length: path.length,
        width: width_px * scale,
        forward: path.segments.at(-1)!.direction,
      };
      intersection.lanes.push(lane);
      return [lane];
    });
    this.lanesById = new Map(this.lanes.map((lane) => [lane.id, lane]));
    if (
      this.lanesById.size !== this.lanes.length ||
      exits.some(({ id }) => this.lanesById.has(id))
    )
      throw new Error('Duplicate lane id');
    this.pedestrianSpawns = layer('spawns').flatMap((object) => {
      const props = properties(object);
      return props.kind === 'pedestrian'
        ? [{ ...box(object), ...pedestrianSpawn.parse(props) }]
        : [];
    });
    this.signs = layer('signs').map((object) => ({
      ...box(object),
      ...signProperties.parse(properties(object)),
    }));
    this.signals = layer('signals').map((object) => ({
      ...box(object),
      ...signalProperties.parse(properties(object)),
    }));
    for (const sign of this.signs) {
      const lane = this.lanesById.get(sign.affects);
      if (sign.code === 'B-1' || sign.code === 'B-2' || sign.code === 'B-9') {
        const zone = this.zones.find(({ id }) => id === sign.affects);
        if (zone) {
          if (this.accessByZone.has(zone))
            throw new Error(`Duplicate access sign for zone: ${zone.id}`);
          this.accessByZone.set(zone, sign);
        } else if (lane) {
          if (lane.accessSign)
            throw new Error(`Duplicate access sign for lane: ${lane.id}`);
          lane.accessSign = sign;
        } else throw new Error(`Unknown access sign segment: ${sign.affects}`);
      } else {
        if (!lane) throw new Error(`Unknown sign lane: ${sign.affects}`);
        if (sign.code === 'B-20' || sign.code === 'A-7') lane.stopSign = sign;
      }
    }
    for (const signal of this.signals) {
      const lane = this.lanesById.get(signal.affects);
      if (!lane) throw new Error(`Unknown signal lane: ${signal.affects}`);
      if (signal.code === 'S-1') {
        if (
          lane.mainSignal ||
          signal.green_s + signal.yellow_s >= signal.cycle_s
        )
          throw new Error(`Invalid S-1: ${signal.id}`);
        lane.mainSignal = signal;
      } else {
        if (lane.arrow) throw new Error(`Duplicate S-2: ${signal.id}`);
        lane.arrow = signal;
      }
    }
    for (const lane of this.lanes) {
      const { mainSignal, arrow } = lane;
      if (lane.priorityClass === 'signal' && !mainSignal)
        throw new Error(`Lane ${lane.id}: missing S-1`);
      if (
        arrow &&
        (!mainSignal ||
          arrow.group !== mainSignal.group ||
          arrow.from_s < mainSignal.green_s + mainSignal.yellow_s ||
          arrow.until_s <= arrow.from_s ||
          arrow.until_s > mainSignal.cycle_s)
      )
        throw new Error(`Invalid S-2: ${arrow.id}`);
    }
    this.laneGraph = new LaneGraph(
      this.lanes,
      exits,
      map.width * map.tilewidth * scale,
      map.height * map.tileheight * scale,
    );
    this.trafficRoutes = buildTrafficRoutes(
      [
        ...layer('traffic_routes').map((object) => ({
          id: object.name,
          path: polyline(object),
          ...routeProperties.parse(properties(object)),
        })),
        ...this.pedestrianSpawns.map(
          ({ id, x, y, heading, length_m, speed }) => {
            const angle = (heading * Math.PI) / 180;
            return {
              id,
              kind: 'pedestrian' as const,
              speed,
              start_s: 0,
              path: new RoadPath(id, [
                { x, y },
                {
                  x: x + length_m * Math.cos(angle),
                  y: y + length_m * Math.sin(angle),
                },
              ]),
            };
          },
        ),
      ],
      layer('traffic_controls').map((object) => ({
        ...box(object),
        ...routeControlProperties.parse(properties(object)),
      })),
      this.crossings,
      this.lanes,
      this.zones,
      map.width * map.tilewidth * scale,
      map.height * map.tileheight * scale,
    );
    this.tramStops = this.trafficRoutes.flatMap(({ stops }) => stops);
    this.roadwayCyclistLanes = layer('spawns').flatMap((object) => {
      const props = properties(object);
      if (props.kind !== 'roadway_cyclist') return [];
      const lane = this.getLane(z.string().parse(props.lane));
      const edge = lane && this.laneGraph.approach(lane);
      if (!edge || !this.laneGraph.entries.includes(edge))
        throw new Error(`Invalid roadway cyclist entry: ${object.name}`);
      let current: LaneEdge = edge;
      const visited = new Set<LaneEdge>();
      while (current.lane) {
        if (visited.has(current))
          throw new Error(`Cyclic roadway cyclist route: ${current.id}`);
        visited.add(current);
        const { lane } = current;
        if (
          lane.parallelBikeInfra ||
          this.signs.some(
            ({ affects, code }) =>
              affects === lane.id && ['B-9', 'B-1'].includes(code),
          ) ||
          this.zones.some(
            (zone) =>
              zone.kind === 'no_bikes' &&
              lane.path.boxAhead(0, zone, 0) < Infinity,
          )
        )
          throw new Error(`Illegal roadway cyclist route: ${lane.id}`);
        const next: LaneEdge | undefined = current.movements.find(
          ({ maneuver }) => maneuver === 'straight',
        )?.to;
        if (!next)
          throw new Error(
            `Missing straight roadway cyclist movement: ${lane.id}`,
          );
        current = next;
      }
      return [lane!];
    });
    if (
      new Set(this.roadwayCyclistLanes).size !== this.roadwayCyclistLanes.length
    )
      throw new Error('Duplicate roadway cyclist entry');
    this.trafficCarCount = z
      .number()
      .int()
      .nonnegative()
      .max(this.lanes.filter(({ type }) => type === 'car').length)
      .default(0)
      .parse(properties(map).trafficCars);
  }

  getLane(id: string) {
    return this.lanesById.get(id);
  }

  approachAt(pos: Vec2, heading: number, zone?: Zone) {
    if (zone && zone.kind !== 'roadway' && zone.kind !== 'bike_lane')
      return undefined;
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    for (const lane of this.lanes) {
      if (lane.type === 'tram') continue;
      for (const { start, direction, length } of lane.path.segments) {
        if (direction.x * dx + direction.y * dy < Math.SQRT1_2) continue;
        const px = pos.x - start.x;
        const py = pos.y - start.y;
        const along = px * direction.x + py * direction.y;
        if (
          along >= 0 &&
          along <= length &&
          Math.abs(py * direction.x - px * direction.y) <= lane.width / 2
        )
          return lane;
      }
    }
  }

  phase(lane: Lane, at: number, env: EnvState): SignalPhase {
    const forced = env.signalOverrides?.[lane.id];
    if (forced !== undefined) return forced;
    const signal = lane.mainSignal;
    if (!signal) return 'off';
    const cycle = (at + signal.offset_s) % signal.cycle_s;
    if (cycle < signal.green_s) return 'green';
    if (cycle < signal.green_s + signal.yellow_s) return 'yellow';
    if (lane.arrow && cycle >= lane.arrow.from_s && cycle < lane.arrow.until_s)
      return 'arrow';
    return 'red';
  }

  crossingAllowsEntry(crossing: Crossing, at: number, env: EnvState) {
    const phase = this.crossingPhase(crossing, at, env);
    return phase === 'green' || phase === 'off';
  }

  crossingPhase(crossing: Crossing, at: number, env: EnvState): SignalPhase {
    const forced = env.signalOverrides?.[crossing.id];
    if (forced !== undefined) return forced;
    const signal = crossing.signal;
    if (!signal) return 'off';
    return (at + signal.offset_s) % signal.cycle_s < signal.green_s
      ? 'green'
      : 'red';
  }

  trafficPhase(lane: Lane, at: number, env: EnvState): SignalPhase {
    const order = env.officerOrders?.[lane.id];
    return order === 'stop'
      ? 'red'
      : order === 'go'
        ? 'green'
        : this.phase(lane, at, env);
  }

  railState(
    crossing: Crossing,
    at: number,
    env: EnvState,
  ): RailState | undefined {
    const forced = env.railOverrides?.[crossing.id];
    if (forced) return forced;
    const rail = crossing.rail;
    if (!rail) return undefined;
    const cycle =
      (at + rail.offset_s) %
      (rail.open_s + rail.lowering_s + rail.closed_s + rail.raising_s);
    if (cycle < rail.open_s) return railStates.open;
    if (cycle < rail.open_s + rail.lowering_s) return railStates.lowering;
    if (cycle < rail.open_s + rail.lowering_s + rail.closed_s)
      return railStates.closed;
    return railStates.raising;
  }

  arrowMatches(lane: Lane, maneuver: Maneuver) {
    return lane.arrow?.direction === maneuver;
  }
}
