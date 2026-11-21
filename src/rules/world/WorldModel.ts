import { z } from 'zod';
import type { EnvState, Maneuver, SignalPhase, Vec2 } from '../types';

const point = z.object({ x: z.number(), y: z.number() });
const tiledObject = point.extend({
  name: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  polyline: z.array(point).optional(),
  properties: z
    .array(z.object({ name: z.string(), value: z.unknown() }))
    .default([]),
});
const tiled = z.object({
  tilewidth: z.number().positive(),
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
const crossingSchema = z.enum(['pedestrian', 'bike', 'combined', 'rail']);
const intersectionSchema = z.enum([
  'equal',
  'priority',
  'signals',
  'roundabout',
]);
const laneProperties = z.object({
  intersection: z.string(),
  side: sideSchema,
  priorityClass: prioritySchema,
  width_px: z.number().positive(),
  type: z.enum(['car', 'tram', 'bike']),
  speedLimit: z.number().positive(),
  parallelBikeInfra: z.string().optional(),
});
const signProperties = z.object({
  code: z.string(),
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
  points: Vec2[];
  start: Vec2;
  end: Vec2;
  forward: Vec2;
  length: number;
  width: number;
  stopSign?: Sign;
  mainSignal?: MainSignal;
  arrow?: ArrowSignal;
}
export interface Sign extends Vec2, z.infer<typeof signProperties> {
  id: string;
}
type Signal = Vec2 & { id: string } & z.infer<typeof signalProperties>;
export type MainSignal = Extract<Signal, { code: 'S-1' }>;
export type ArrowSignal = Extract<Signal, { code: 'S-2' }>;

const trainingSpawn = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('car'),
    laneId: z.string(),
    speed: z.number().positive(),
    start_m: z.number().negative(),
  }),
  z.object({
    kind: z.literal('pedestrian'),
    heading: z.number(),
    speed: z.number().positive(),
    length_m: z.number().positive(),
  }),
]);
export type TrainingSpawn = Box & z.infer<typeof trainingSpawn>;

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

export function contains(box: Box, point: Vec2) {
  return (
    point.x >= box.x &&
    point.x < box.x + box.width &&
    point.y >= box.y &&
    point.y < box.y + box.height
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
  readonly intersections: readonly Intersection[];
  readonly lanes: readonly Lane[];
  readonly signs: readonly Sign[];
  readonly signals: readonly Signal[];
  readonly trainingSpawns: readonly TrainingSpawn[];
  private readonly lanesById: ReadonlyMap<string, Lane>;

  constructor(data: unknown, metersPerTile: number) {
    const map = tiled.parse(data);
    const scale = (this.metersPerPixel = metersPerTile / map.tilewidth);
    const layer = (name: string) =>
      map.layers.find((entry) => entry.name === name)?.objects ?? [];
    const properties = (object: z.infer<typeof tiledObject>) =>
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
    this.crossings = layer('crossings').map((object) => {
      const props = properties(object);
      return {
        ...box(object),
        kind: crossingSchema.parse(props.kind),
        axis: z.enum(['x', 'y']).parse(props.axis),
      };
    });
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
    this.intersections = intersections;
    this.lanes = layer('lanes').map((object): Lane => {
      const {
        intersection: intersectionId,
        width_px,
        ...props
      } = laneProperties.parse(properties(object));
      const intersection = intersectionsById.get(intersectionId);
      const points = object.polyline?.map((p) => ({
        x: (object.x + p.x) * scale,
        y: (object.y + p.y) * scale,
      }));
      const start = points?.[0];
      const end = points?.at(-1);
      if (!start || !end || !points || !intersection)
        throw new Error(`Invalid lane: ${object.name}`);
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length === 0) throw new Error(`Empty lane: ${object.name}`);
      if (
        props.parallelBikeInfra &&
        !this.zones.some(
          ({ id, kind }) =>
            id === props.parallelBikeInfra &&
            (kind === 'bike_path' || kind === 'bike_lane'),
        )
      )
        throw new Error(`Unknown parallel bike infrastructure: ${object.name}`);
      const lane = {
        ...props,
        id: object.name,
        intersection,
        points,
        start,
        end,
        length,
        width: width_px * scale,
        forward: {
          x: (end.x - start.x) / length,
          y: (end.y - start.y) / length,
        },
      };
      intersection.lanes.push(lane);
      return lane;
    });
    this.lanesById = new Map(this.lanes.map((lane) => [lane.id, lane]));
    this.trainingSpawns = layer('spawns').flatMap((object) => {
      const props = properties(object);
      if (props.kind !== 'car' && props.kind !== 'pedestrian') return [];
      return [{ ...box(object), ...trainingSpawn.parse(props) }];
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
      if (!lane) throw new Error(`Unknown sign lane: ${sign.affects}`);
      if (sign.code === 'B-20' || sign.code === 'A-7') lane.stopSign = sign;
    }
    for (const signal of this.signals) {
      const lane = this.lanesById.get(signal.affects);
      if (!lane) throw new Error(`Unknown signal lane: ${signal.affects}`);
      if (signal.code === 'S-1') lane.mainSignal = signal;
      else lane.arrow = signal;
    }
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
      if (lane.forward.x * dx + lane.forward.y * dy < Math.SQRT1_2) continue;
      const distance = distanceToLine(lane, pos);
      if (
        distance >= 0 &&
        distance <= lane.length &&
        Math.abs(lateralOffset(lane, pos)) <= lane.width / 2
      )
        return lane;
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

  arrowMatches(lane: Lane, maneuver: Maneuver) {
    return lane.arrow?.direction === maneuver;
  }
}
