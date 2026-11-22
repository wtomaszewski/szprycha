import type { Maneuver, Vec2 } from '../types';
import type { Intersection, Lane, Side } from './WorldModel';
import { RoadPath } from './RoadPath.ts';

export const sides = ['N', 'E', 'S', 'W'] as const;
export const maneuvers = ['straight', 'left', 'right'] as const;
export const otherSide = (side: Side, offset: number) =>
  sides[(sides.indexOf(side) + offset + 4) % 4]!;
export const exitOffset = { straight: 2, left: 1, right: -1 } as const;

export interface LaneNode {
  id: string;
  pos: Vec2;
  kind: 'inlet' | 'outlet' | 'boundary';
}
export interface LaneEdge {
  id: string;
  from: LaneNode;
  to: LaneNode;
  path: RoadPath;
  speedLimit: number;
  lane?: Lane;
  movements: Movement[];
}
export interface Movement {
  id: string;
  from: LaneEdge;
  to: LaneEdge;
  path: RoadPath;
  maneuver: Maneuver;
}
export interface BoundaryExit {
  id: string;
  intersection: Intersection;
  side: Side;
  path: RoadPath;
  speedLimit: number;
}

const arm = (intersection: Intersection, side: Side) =>
  `${intersection.id}-${side}`;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function onArm({ x, y, width, height }: Intersection, side: Side, pos: Vec2) {
  if (side === 'N' || side === 'S')
    return (
      near(pos.y, side === 'N' ? y : y + height) &&
      pos.x > x &&
      pos.x < x + width
    );
  return (
    near(pos.x, side === 'W' ? x : x + width) && pos.y > y && pos.y < y + height
  );
}

function outwardComponent(side: Side, direction: Vec2) {
  return { N: -direction.y, E: direction.x, S: direction.y, W: -direction.x }[
    side
  ];
}

function turnPoints(from: LaneEdge, to: LaneEdge) {
  const start = from.path.end;
  const end = to.path.start;
  const incoming = from.path.segments.at(-1)!.direction;
  const outgoing = to.path.segments[0]!.direction;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Blend the inlet and outlet tangents to keep the car's body on the bend.
  const leadIn = 0.55 * Math.max(0, dx * incoming.x + dy * incoming.y);
  const leadOut = 0.55 * Math.max(0, dx * outgoing.x + dy * outgoing.y);
  const first = {
    x: start.x + leadIn * incoming.x,
    y: start.y + leadIn * incoming.y,
  };
  const last = {
    x: end.x - leadOut * outgoing.x,
    y: end.y - leadOut * outgoing.y,
  };
  const points = [start];
  for (let step = 1; step < 12; step++) {
    const t = step / 12;
    const u = 1 - t;
    points.push({
      x:
        u ** 3 * start.x +
        3 * u ** 2 * t * first.x +
        3 * u * t ** 2 * last.x +
        t ** 3 * end.x,
      y:
        u ** 3 * start.y +
        3 * u ** 2 * t * first.y +
        3 * u * t ** 2 * last.y +
        t ** 3 * end.y,
    });
  }
  points.push(end);
  return points;
}

export class LaneGraph {
  readonly nodes: LaneNode[] = [];
  readonly edges: LaneEdge[] = [];
  readonly movements: Movement[] = [];
  readonly entries: LaneEdge[] = [];
  private readonly approaches = new Map<Lane, LaneEdge>();

  constructor(
    lanes: readonly Lane[],
    exits: readonly BoundaryExit[],
    width: number,
    height: number,
  ) {
    const carLanes = lanes.filter((lane) => lane.type === 'car');
    const upstreamArms = new Map<
      string,
      { intersection: Intersection; side: Side }
    >();
    for (const lane of carLanes) {
      for (const side of sides)
        upstreamArms.set(arm(lane.intersection, side), {
          intersection: lane.intersection,
          side,
        });
    }
    const boundary = (p: Vec2) =>
      near(p.x, 0) || near(p.x, width) || near(p.y, 0) || near(p.y, height);
    const outlets = new Map<string, LaneEdge>();
    const names = new Set<string>();
    const register = (id: string, path: RoadPath) => {
      if (!id || names.has(id))
        throw new Error(`Lane graph: duplicate or empty lane id ${id}`);
      names.add(id);
      if (
        path.points.some(
          ({ x, y }) => x < 0 || x > width || y < 0 || y > height,
        )
      )
        throw new Error(`Lane ${id}: polyline outside map`);
    };
    const addOutlet = (key: string, edge: LaneEdge) => {
      if (outlets.has(key))
        throw new Error(`Lane ${edge.id}: ambiguous outlet ${key}`);
      outlets.set(key, edge);
    };
    for (const lane of carLanes) {
      const { id, path, from, intersection, side, speedLimit } = lane;
      register(id, path);
      if (
        !onArm(intersection, side, path.end) ||
        outwardComponent(side, lane.forward) >= 0
      )
        throw new Error(`Lane ${id}: stop line must face into its inlet`);
      const edge = this.edge(
        id,
        path,
        speedLimit,
        from ? 'outlet' : 'boundary',
        'inlet',
        lane,
      );
      this.approaches.set(lane, edge);
      if (from) {
        const upstream = upstreamArms.get(from);
        if (
          !upstream ||
          upstream.intersection === intersection ||
          !onArm(upstream.intersection, upstream.side, path.start) ||
          outwardComponent(upstream.side, path.segments[0]!.direction) <= 0
        )
          throw new Error(`Lane ${id}: invalid upstream outlet ${from}`);
        addOutlet(from, edge);
      } else {
        if (!boundary(path.start))
          throw new Error(`Lane ${id}: entry must start at the map boundary`);
        this.entries.push(edge);
      }
    }
    for (const { id, path, intersection, side, speedLimit } of exits) {
      register(id, path);
      if (
        !onArm(intersection, side, path.start) ||
        outwardComponent(side, path.segments[0]!.direction) <= 0 ||
        !boundary(path.end)
      )
        throw new Error(`Lane ${id}: invalid boundary exit`);
      addOutlet(
        arm(intersection, side),
        this.edge(id, path, speedLimit, 'outlet', 'boundary'),
      );
    }
    if (exits.length > 0 && !this.entries.length)
      throw new Error(
        'Lane graph: boundary exits require at least one boundary entry',
      );

    for (const [lane, from] of this.approaches) {
      const turns = lane.turns?.split(',').map((turn) => turn.trim()) ?? [];
      if (
        !turns.length ||
        new Set(turns).size !== turns.length ||
        turns.some((turn) => !maneuvers.some((maneuver) => maneuver === turn))
      )
        throw new Error(`Lane ${lane.id}: invalid turns`);
      for (const maneuver of maneuvers) {
        if (!turns.includes(maneuver)) continue;
        const side = otherSide(lane.side, exitOffset[maneuver]);
        const to = outlets.get(arm(lane.intersection, side));
        if (!to)
          throw new Error(`Lane ${lane.id}: missing outlet for ${maneuver}`);
        const id = `${lane.id}:${maneuver}`;
        const movement = {
          id,
          from,
          to,
          maneuver,
          path: new RoadPath(
            id,
            maneuver === 'straight'
              ? [from.to.pos, to.from.pos]
              : turnPoints(from, to),
          ),
        };
        from.movements.push(movement);
        this.movements.push(movement);
      }
      if (
        lane.arrow &&
        !from.movements.some(
          ({ maneuver }) => maneuver === lane.arrow?.direction,
        )
      )
        throw new Error(`Lane ${lane.id}: S-2 points to a prohibited turn`);
    }
  }

  approach(lane: Lane) {
    return this.approaches.get(lane);
  }

  private edge(
    id: string,
    path: RoadPath,
    speedLimit: number,
    start: LaneNode['kind'],
    end: LaneNode['kind'],
    lane?: Lane,
  ) {
    const from = { id: `${id}:start`, pos: path.start, kind: start };
    const to = { id: `${id}:end`, pos: path.end, kind: end };
    const edge = { id, from, to, path, speedLimit, lane, movements: [] };
    this.nodes.push(from, to);
    this.edges.push(edge);
    return edge;
  }
}
