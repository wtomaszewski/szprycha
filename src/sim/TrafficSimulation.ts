import type { GameContent } from '../content/schemas';
import type { IntersectionManager } from '../rules/priority/IntersectionManager';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
  type SignalPhase,
  type Vec2,
} from '../rules/types';
import {
  footprintReachesBox,
  footprintsOverlap,
  trafficFootprints,
  type Footprint,
} from '../rules/world/Footprint';
import type { LaneEdge, Movement } from '../rules/world/LaneGraph';
import { RoadPath } from '../rules/world/RoadPath';
import {
  contains,
  railBlocksEntry,
  distanceToLine,
  type Box,
  type Crossing,
  type Intersection,
  type Lane,
  type WorldModel,
} from '../rules/world/WorldModel';

const STEP = 1 / TICKS_PER_SECOND;
const ACCELERATION = 2.2;
const BRAKING = 4;
const STOP_CLEARANCE = 0.15;
const REQUEST_RANGE = 3.5;
const FOLLOWING_GAP = 0.65;
const CYCLE_OFFSET = 1.64;
const EMERGENCY_OFFSET = 1.05;
const HEADWAY = 0.65;
const CRUISE_SPEED = 7;
const TURN_SPEED = 4.5;
const EPSILON = 1e-8;
const PLAYER_LOOKAHEAD = 0.65;
const DEFAULT_SEED = 1403;

export type TrafficIntent =
  | 'driving'
  | 'following'
  | 'signal'
  | 'stop'
  | 'yield'
  | 'junction'
  | 'protective'
  | 'emergency';

export interface RoadTrafficAgent extends AgentState {
  kind: 'car' | 'cyclist';
  intent: TrafficIntent;
  destination?: string;
  junctionsPassed: number;
}

interface Car {
  agent: RoadTrafficAgent;
  edge: LaneEdge;
  distance: number;
  cruiseFactor: number;
  footprint: Footprint;
  entry?: LaneEdge;
  pullOver: number;
  route?: Movement;
  crossing: boolean;
  committed: boolean;
  reserved?: Intersection;
  phase: SignalPhase;
  stopOnYellow: boolean;
  stopTicks: number;
  arrival: number;
  reason?: TrafficIntent;
  request: boolean;
  approaching: boolean;
  gap: number;
  nextSpeed: number;
  travel: number;
}

export interface ClearingArea {
  area: Box;
  occupiedMargin: number;
  stopMargin: number;
}

export interface TrafficConditions {
  priorityAgents: readonly AgentState[];
  occupiedJunctions: ReadonlySet<Intersection>;
  clearingAreas: readonly ClearingArea[];
  emergency: readonly AgentState[];
  routed: readonly (AgentState & { active: boolean })[];
}

type Settings = GameContent['balans']['silnik'];

export class TrafficSimulation {
  readonly agents: readonly RoadTrafficAgent[];
  private readonly cars: Car[];
  private readonly junctions = new Map<Intersection, Car>();
  private readonly approaches: LaneEdge[];
  private readonly crossingIntervals = new Map<
    LaneEdge,
    Record<RoadTrafficAgent['kind'], { entry: number; exit: number }[]>
  >();
  private readonly playerAgent: AgentState = {
    id: 'player',
    kind: 'cyclist',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
  };
  private readonly junctionAgents: AgentState[] = [];
  private readonly walkingCrossings: (Crossing | undefined)[] = [];
  private playerLane?: Lane;
  private readonly playerAhead = { x: 0, y: 0 };
  private readonly spawnProbe: AgentState = {
    id: 'spawn',
    kind: 'car',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
  };
  private tick = 0;
  private randomState = 0;

  private readonly closedCrossings: Box[] = [];

  constructor(
    private readonly world: WorldModel,
    private readonly manager: IntersectionManager,
    private readonly settings: Settings,
    private readonly seed = DEFAULT_SEED,
    count = world.trafficCarCount,
    roadwayCyclists = false,
  ) {
    this.approaches = world.laneGraph.edges.filter(({ lane }) => lane);
    const areas = new Set<Box>(
      world.crossings.map((crossing) => crossing.trafficArea ?? crossing),
    );
    for (const route of world.trafficRoutes)
      for (const stop of route.stops) areas.add(stop);
    for (const edge of world.laneGraph.edges) {
      const path = edge.path;
      const reverse = new RoadPath(edge.id, [...path.points].reverse());
      const intervals = (kind: RoadTrafficAgent['kind'], lateral: number) => {
        const footprint = trafficFootprints[kind];
        const result = [];
        for (const area of areas) {
          const entry = path.boxAhead(0, area, 0.08, footprint, lateral);
          const exit =
            path.length - reverse.boxAhead(0, area, 0, footprint, -lateral);
          if (entry > 0 && entry < exit && exit < path.length)
            result.push({ entry, exit });
        }
        return result;
      };
      this.crossingIntervals.set(edge, {
        car: intervals('car', 0),
        cyclist: intervals('cyclist', CYCLE_OFFSET),
      });
    }
    if (!Number.isInteger(count) || count < 0 || count > this.approaches.length)
      throw new RangeError(
        `Expected 0–${this.approaches.length} cars, got ${count}`,
      );
    const cycleEntries = roadwayCyclists
      ? world.roadwayCyclistLanes.map((lane) => world.laneGraph.approach(lane)!)
      : [];
    this.cars = Array.from(
      { length: count + cycleEntries.length },
      (_, index) => {
        const entry = cycleEntries[index - count];
        return {
          agent: {
            id: entry
              ? `cyclist-roadway-${index - count + 1}`
              : `car-${index + 1}`,
            kind: entry ? 'cyclist' : 'car',
            pos: { x: 0, y: 0 },
            heading: 0,
            speed: 0,
            intent: 'driving',
            junctionsPassed: 0,
          },
          edge: entry ?? this.approaches[index]!,
          entry,
          distance: 0,
          cruiseFactor: 1,
          footprint: trafficFootprints[entry ? 'cyclist' : 'car'],
          pullOver: 0,
          crossing: false,
          committed: false,
          phase: 'off',
          stopOnYellow: true,
          stopTicks: 0,
          arrival: Infinity,
          request: false,
          approaching: false,
          gap: Infinity,
          nextSpeed: 0,
          travel: 0,
        };
      },
    );
    this.agents = this.cars.map(({ agent }) => agent);
    this.reset();
  }

  reset(seed = this.seed) {
    this.tick = 0;
    this.randomState = seed >>> 0;
    this.playerLane = undefined;
    this.junctions.clear();
    const lanes = [...this.approaches];
    for (const car of this.cars) {
      const edge = car.entry ?? lanes.splice(this.draw(lanes.length), 1)[0]!;
      car.cruiseFactor = 0.8 + this.draw(21) / 100;
      car.pullOver = 0;
      car.agent.junctionsPassed = 0;
      car.agent.speed = 0;
      car.agent.protectiveBrake = false;
      car.agent.intent = 'driving';
      car.agent.yieldingAtCrossing = false;
      car.reserved = undefined;
      this.setEdge(
        car,
        edge,
        car.entry ? 0 : edge.path.length * (0.16 + this.draw(13) / 100),
      );
      this.place(car);
    }
  }

  step(
    env: EnvState,
    player?: RiderState,
    pedestrians: readonly AgentState[] = [],
    conditions?: TrafficConditions,
  ) {
    const at = this.tick / TICKS_PER_SECOND;
    this.trackPlayer(player);
    if (player) {
      this.playerAhead.x =
        player.pos.x +
        Math.cos(player.heading) * player.speed * PLAYER_LOOKAHEAD;
      this.playerAhead.y =
        player.pos.y +
        Math.sin(player.heading) * player.speed * PLAYER_LOOKAHEAD;
    }
    for (const car of this.cars) {
      car.gap = this.gapAhead(car);
      this.prepare(car, at, env);
    }
    for (const intersection of this.world.intersections)
      this.reserve(intersection, at, env, conditions);
    for (let index = 0; index < pedestrians.length; index++) {
      const { crossingId, kind, pos } = pedestrians[index]!;
      this.walkingCrossings[index] = this.world.crossings.find((crossing) =>
        crossingId
          ? crossing.id === crossingId
          : kind === 'pedestrian' &&
            crossing.kind === 'pedestrian' &&
            contains(crossing, pos),
      );
    }
    this.closedCrossings.length = 0;
    for (const crossing of this.world.crossings) {
      if (crossing.kind === 'rail') {
        const rail = this.world.railState(crossing, at, env);
        if (railBlocksEntry(rail)) this.closedCrossings.push(crossing);
      } else if (
        crossing.signal?.stopRoadTraffic &&
        this.world.crossingPhase(crossing, at, env) === 'green'
      ) {
        this.closedCrossings.push(crossing.trafficArea ?? crossing);
      }
    }
    for (const car of this.cars)
      this.plan(car, player, pedestrians, conditions);
    for (const car of this.cars) this.advance(car);
    for (const car of this.cars) {
      if (!car.edge.lane && car.distance >= car.edge.path.length)
        this.reenter(car, player, conditions);
    }
    this.tick++;
  }

  junctionOccupied(intersection: Intersection) {
    const owner = this.junctions.get(intersection);
    return (
      owner?.committed ||
      Boolean(owner?.reserved && owner.edge.lane?.intersection !== intersection)
    );
  }

  private draw(n: number) {
    this.randomState =
      (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return Math.floor((this.randomState / 2 ** 32) * n);
  }

  private setEdge(car: Car, edge: LaneEdge, distance: number) {
    car.edge = edge;
    car.distance = distance;
    car.crossing = false;
    car.committed = false;
    car.phase = 'off';
    car.stopOnYellow = true;
    car.stopTicks = 0;
    car.arrival = Infinity;
    car.route = car.entry
      ? edge.movements.find(({ maneuver }) => maneuver === 'straight')
      : edge.movements.length
        ? edge.movements[this.draw(edge.movements.length)]
        : undefined;
    car.agent.maneuver = car.route?.maneuver;
    car.agent.destination = car.route?.to.id;
    car.agent.laneId = edge.lane?.id;
  }

  private trackPlayer(player?: RiderState) {
    if (!player || player.mode !== 'riding') {
      this.playerLane = undefined;
      return;
    }
    this.playerLane =
      this.playerLane && contains(this.playerLane.intersection, player.pos)
        ? this.playerLane
        : this.world.approachAt(player.pos, player.heading);
    if (!this.playerLane) return;
    this.playerAgent.pos = player.pos;
    this.playerAgent.heading = player.heading;
    this.playerAgent.speed = player.speed;
    this.playerAgent.laneId = this.playerLane.id;
    this.playerAgent.maneuver =
      player.maneuver ??
      (player.signal === 'none' ? 'straight' : player.signal);
  }

  private lateralOffset(car: Car) {
    return car.pullOver + (car.entry ? CYCLE_OFFSET : 0);
  }

  private stopDistance(car: Car) {
    return (
      car.edge.path.length -
      (car.edge.lane?.stopOffset ?? 0) -
      car.footprint.halfLength -
      STOP_CLEARANCE
    );
  }

  private gapAhead(car: Car) {
    let gap = Infinity;
    for (const other of this.cars) {
      if (other === car) continue;
      const reach = car.footprint.halfLength + other.footprint.halfLength;
      if (
        Math.abs(this.lateralOffset(car) - this.lateralOffset(other)) >=
        car.footprint.halfWidth + other.footprint.halfWidth
      )
        continue;
      if (car.edge === other.edge && !car.crossing) {
        const distance = other.crossing
          ? car.edge.path.length + other.distance
          : other.distance;
        if (distance > car.distance)
          gap = Math.min(gap, distance - car.distance - reach);
      }
      if (car.crossing && other.edge === car.route!.to && !other.crossing)
        gap = Math.min(
          gap,
          car.route!.path.length - car.distance + other.distance - reach,
        );
    }
    return gap;
  }

  private entryGap(edge: LaneEdge, entering: Car) {
    let gap = edge.lane
      ? edge.path.length - entering.footprint.halfLength - STOP_CLEARANCE
      : Infinity;
    for (const car of this.cars) {
      if (
        car !== entering &&
        car.edge === edge &&
        !car.crossing &&
        Math.abs(
          (entering.entry ? CYCLE_OFFSET : 0) - this.lateralOffset(car),
        ) <
          car.footprint.halfWidth + entering.footprint.halfWidth
      )
        gap = Math.min(gap, car.distance - car.footprint.halfLength);
    }
    return gap;
  }

  private prepare(car: Car, at: number, env: EnvState) {
    const lane = car.edge.lane;
    car.request = false;
    car.approaching = false;
    car.reason = undefined;
    if (!lane || car.committed) return;
    const phase = this.world.trafficPhase(lane, at, env);
    const toStop = this.stopDistance(car) - car.distance;
    const stopped =
      toStop <= 0.06 && car.agent.speed < this.settings.stop_predkosc_ms;
    if (stopped) {
      car.stopTicks++;
      car.arrival = Math.min(car.arrival, this.tick);
    } else if (car.stopTicks / TICKS_PER_SECOND < this.settings.stop_czas_s)
      car.stopTicks = 0;
    if (phase === 'yellow' && car.phase !== 'yellow')
      car.stopOnYellow =
        stopped || car.agent.speed ** 2 / (2 * BRAKING) <= toStop;
    car.phase = phase;
    if (
      phase === 'red' ||
      (phase === 'yellow' && car.stopOnYellow) ||
      (phase === 'arrow' && !this.world.arrowMatches(lane, car.route!.maneuver))
    ) {
      car.reason = 'signal';
    } else if (
      (phase === 'arrow' ||
        (phase === 'off' && lane.stopSign?.code === 'B-20')) &&
      car.stopTicks / TICKS_PER_SECOND < this.settings.stop_czas_s
    ) {
      car.reason = 'stop';
    } else if (
      toStop <=
        Math.max(REQUEST_RANGE, car.agent.speed * this.settings.ttc_minor_s) &&
      car.gap > FOLLOWING_GAP + toStop &&
      this.entryGap(car.route!.to, car) >=
        car.footprint.halfLength * 2 + FOLLOWING_GAP
    ) {
      car.approaching = true;
      car.request = toStop <= REQUEST_RANGE;
    } else if (toStop <= REQUEST_RANGE) car.reason = 'junction';
  }

  private reserve(
    intersection: Intersection,
    at: number,
    env: EnvState,
    conditions?: TrafficConditions,
  ) {
    const current = this.junctions.get(intersection);
    if (current) {
      if (current.committed || current.edge.lane?.intersection !== intersection)
        return;
      current.reserved = undefined;
      this.junctions.delete(intersection);
    }
    if (conditions?.occupiedJunctions.has(intersection)) return;
    const transit = conditions?.priorityAgents ?? [];
    const approaching = this.junctionAgents;
    approaching.length = 0;
    for (const agent of transit) approaching.push(agent);
    let playerRequest = false;
    if (this.playerLane?.intersection === intersection) {
      approaching.push(this.playerAgent);
      const toLine = distanceToLine(this.playerLane, this.playerAgent.pos);
      playerRequest = toLine >= -EPSILON && toLine <= REQUEST_RANGE;
    }
    for (const car of this.cars) {
      if (car.approaching && car.edge.lane?.intersection === intersection)
        approaching.push(car.agent);
    }
    let winner: Car | undefined;
    let tieWinner: Car | undefined;
    let allStopped =
      !playerRequest || this.playerAgent.speed < this.settings.stop_predkosc_ms;
    for (const car of this.cars) {
      if (car.edge.lane?.intersection !== intersection || !car.request)
        continue;
      if (
        !Number.isFinite(car.arrival) ||
        car.agent.speed >= this.settings.stop_predkosc_ms
      )
        allStopped = false;
      const { maneuver } = car.route!;
      const lane = car.edge.lane;
      const movingConflict = this.manager.conflict(
        lane,
        maneuver,
        approaching,
        at,
        env,
        false,
      );
      if (movingConflict && movingConflict.ttc < this.settings.ttc_minor_s) {
        car.reason = 'yield';
        allStopped = false;
        continue;
      }
      // A right-hand tie may release an AI car only if it owes no priority to the player.
      if (
        playerRequest &&
        this.manager.mustYield(lane, maneuver, this.playerAgent, at, env)
      ) {
        car.reason = 'yield';
        continue;
      }
      if (
        transit.some((agent) =>
          this.manager.mustYield(lane, maneuver, agent, at, env),
        )
      ) {
        car.reason = 'yield';
        continue;
      }
      let blocked = false;
      let yieldsOnlyToRight = true;
      for (const other of this.cars) {
        if (
          other === car ||
          !other.request ||
          other.edge.lane?.intersection !== intersection
        )
          continue;
        const rule = this.manager.mustYield(
          lane,
          maneuver,
          other.agent,
          at,
          env,
        );
        if (!rule) continue;
        blocked = true;
        if (rule !== 'PIER-01') yieldsOnlyToRight = false;
      }
      if (blocked) car.reason = 'yield';
      else if (!winner || car.arrival < winner.arrival) winner = car;
      if (yieldsOnlyToRight && (!tieWinner || car.arrival < tieWinner.arrival))
        tieWinner = car;
    }
    // A circular right-hand tie can move once all contenders have stopped.
    const selected = winner ?? (allStopped ? tieWinner : undefined);
    if (selected) {
      selected.reason = undefined;
      selected.reserved = intersection;
      this.junctions.set(intersection, selected);
    }
  }

  private obstacleGap(
    car: Car,
    pos: Vec2,
    clearance: number,
    other: AgentState | RiderState,
  ) {
    const path = car.crossing ? car.route!.path : car.edge.path;
    const next = car.crossing ? car.route!.to.path : car.route?.path;
    const footprint =
      trafficFootprints['kind' in other ? other.kind : 'cyclist'];
    if (
      car.agent.kind === 'car' &&
      (!('kind' in other) || other.kind === 'cyclist')
    )
      clearance = Math.max(clearance, this.world.cyclingClearance);
    const lateral = this.lateralOffset(car);
    return Math.min(
      path.obstacleAhead(
        car.distance,
        pos,
        clearance,
        car.footprint,
        lateral,
        footprint,
        other.heading,
      ),
      next
        ? path.length -
            car.distance +
            next.obstacleAhead(
              0,
              pos,
              clearance,
              car.footprint,
              lateral,
              footprint,
              other.heading,
            )
        : Infinity,
    );
  }

  private crossingGap(car: Car, crossing: Box, margin = 0.15) {
    const { pos, heading } = car.agent;
    const dx =
      pos.x -
      Math.max(crossing.x, Math.min(pos.x, crossing.x + crossing.width));
    const dy =
      pos.y -
      Math.max(crossing.y, Math.min(pos.y, crossing.y + crossing.height));
    // A vehicle whose rear still touches the crossing can continue to clear it.
    if (
      footprintReachesBox(car.agent, crossing, margin) &&
      dx * Math.cos(heading) + dy * Math.sin(heading) > EPSILON
    )
      return Infinity;
    const path = car.crossing ? car.route!.path : car.edge.path;
    const next = car.crossing ? car.route!.to.path : car.route?.path;
    const lateral = this.lateralOffset(car);
    return Math.min(
      path.boxAhead(car.distance, crossing, margin, car.footprint, lateral),
      next
        ? path.length -
            car.distance +
            next.boxAhead(0, crossing, margin, car.footprint, lateral)
        : Infinity,
    );
  }

  private plan(
    car: Car,
    player: RiderState | undefined,
    pedestrians: readonly AgentState[],
    conditions?: TrafficConditions,
  ) {
    const speed = car.agent.speed;
    const speedLimit = Math.min(
      (car.entry ? 4.2 : (this.world.trafficCruise ?? CRUISE_SPEED)) *
        car.cruiseFactor,
      car.edge.speedLimit / 3.6,
    );
    const hasRightOfEntry =
      car.committed ||
      (car.reserved !== undefined &&
        car.reserved === car.edge.lane?.intersection);
    const toStop =
      car.edge.lane && !hasRightOfEntry
        ? this.stopDistance(car) - car.distance
        : Infinity;
    const following = car.gap - FOLLOWING_GAP;
    let room = Math.min(toStop, following);
    for (const crossing of this.closedCrossings)
      if (!footprintReachesBox(car.agent, crossing))
        room = Math.min(room, this.crossingGap(car, crossing));
    if (!car.crossing) {
      // Leave crossings clear even when the next signal has queued traffic.
      for (const { entry, exit } of this.crossingIntervals.get(car.edge)![
        car.agent.kind
      ]) {
        if (car.distance <= entry + EPSILON && car.distance + room < exit)
          room = Math.min(room, entry - car.distance);
      }
    }
    let target = Math.min(
      speedLimit,
      this.brakingSpeed(room),
      this.brakingSpeed(following - speed * HEADWAY),
    );
    if (
      car.route &&
      (car.crossing || car.edge.path.length - car.distance < REQUEST_RANGE) &&
      car.route.maneuver !== 'straight'
    )
      target = Math.min(target, TURN_SPEED);

    const playerGap = player
      ? Math.min(
          this.obstacleGap(car, player.pos, 0.22, player),
          this.obstacleGap(car, this.playerAhead, 0.22, player),
        )
      : Infinity;
    let pedestrianGap = Infinity;
    let markedCrossingGap = Infinity;
    for (let index = 0; index < pedestrians.length; index++) {
      const pedestrian = pedestrians[index]!;
      const crossing = this.walkingCrossings[index];
      const gap = crossing
        ? this.crossingGap(car, crossing.trafficArea ?? crossing)
        : this.obstacleGap(car, pedestrian.pos, 0.12, pedestrian);
      pedestrianGap = Math.min(pedestrianGap, gap);
      if (crossing?.kind === 'pedestrian' || crossing?.kind === 'combined')
        markedCrossingGap = Math.min(markedCrossingGap, gap);
    }
    for (const {
      area,
      occupiedMargin,
      stopMargin,
    } of conditions?.clearingAreas ?? []) {
      // Finish a reserved crossing before yielding to a waiting walker. A car
      // blocking the walker's gate may need this junction to clear the area.
      if (
        !car.committed &&
        !(car.reserved && car.edge.lane?.intersection !== car.reserved) &&
        !footprintReachesBox(car.agent, area, occupiedMargin)
      )
        pedestrianGap = Math.min(
          pedestrianGap,
          this.crossingGap(car, area, stopMargin),
        );
    }
    const yieldingToEmergency =
      !car.committed &&
      !car.crossing &&
      (car.edge.from.kind === 'boundary' ||
        car.distance > car.footprint.halfLength + FOLLOWING_GAP) &&
      conditions?.emergency.some((agent) =>
        this.emergencyApproaching(car, agent),
      );
    const offset = yieldingToEmergency ? EMERGENCY_OFFSET : 0;
    const shift = Math.max(-STEP, Math.min(STEP, offset - car.pullOver));
    const shiftX = -Math.sin(car.agent.heading) * shift;
    const shiftY = Math.cos(car.agent.heading) * shift;
    if (
      !player ||
      Math.hypot(
        player.pos.x - car.agent.pos.x - shiftX,
        player.pos.y - car.agent.pos.y - shiftY,
      ) >=
        car.footprint.halfWidth + 0.55
    )
      car.pullOver += shift;
    if (yieldingToEmergency) target = 0;
    const playerTarget = this.brakingSpeed(playerGap);
    car.agent.protectiveBrake =
      playerTarget + EPSILON <
      Math.min(target, this.brakingSpeed(pedestrianGap));
    target = Math.min(target, playerTarget, this.brakingSpeed(pedestrianGap));
    const next = Math.max(
      speed - BRAKING * STEP,
      Math.min(speed + ACCELERATION * STEP, target),
    );
    car.travel = Math.max(
      0,
      Math.min(next * STEP, room, playerGap, pedestrianGap),
    );
    car.nextSpeed = car.travel / STEP;
    car.agent.yieldingAtCrossing =
      markedCrossingGap <= pedestrianGap &&
      markedCrossingGap < Math.min(room, 3) &&
      car.nextSpeed <= this.settings.stop_predkosc_ms;
    car.agent.intent = car.agent.protectiveBrake
      ? 'protective'
      : yieldingToEmergency
        ? 'emergency'
        : pedestrianGap < Math.min(room, 3)
          ? 'yield'
          : following < toStop && target < speedLimit - EPSILON
            ? 'following'
            : car.crossing
              ? 'junction'
              : toStop < REQUEST_RANGE
                ? (car.reason ?? 'junction')
                : 'driving';
  }

  private emergencyApproaching(car: Car, emergency: AgentState) {
    const dx = car.agent.pos.x - emergency.pos.x;
    const dy = car.agent.pos.y - emergency.pos.y;
    const h = emergency.heading;
    const ahead = dx * Math.cos(h) + dy * Math.sin(h);
    const side = dy * Math.cos(h) - dx * Math.sin(h);
    return (
      Math.cos(car.agent.heading - h) > 0.98 &&
      ahead > -14 &&
      ahead < 16 &&
      side >= 0 &&
      side < 2.55
    );
  }

  private brakingSpeed(room: number) {
    return Math.sqrt(2 * BRAKING * Math.max(0, room));
  }

  private advance(car: Car) {
    car.distance += car.travel;
    car.agent.speed = car.nextSpeed;
    if (
      !car.crossing &&
      car.edge.lane &&
      car.reserved === car.edge.lane.intersection &&
      car.distance > this.stopDistance(car)
    )
      car.committed = true;
    if (car.crossing) {
      const { path, to } = car.route!;
      if (car.distance >= path.length) {
        car.agent.junctionsPassed++;
        this.setEdge(car, to, car.distance - path.length);
      }
    } else if (car.edge.lane && car.distance >= car.edge.path.length) {
      car.distance -= car.edge.path.length;
      car.crossing = true;
    } else if (!car.edge.lane) {
      car.distance = Math.min(car.distance, car.edge.path.length);
    }
    if (
      car.reserved &&
      car.edge.lane?.intersection !== car.reserved &&
      car.distance >= car.footprint.halfLength + 0.05
    ) {
      this.junctions.delete(car.reserved);
      car.reserved = undefined;
    }
    this.place(car);
  }

  private place(car: Car) {
    const path = car.crossing ? car.route!.path : car.edge.path;
    const heading = (car.agent.heading = path.place(
      car.distance,
      car.agent.pos,
    ));
    const offset = this.lateralOffset(car);
    car.agent.pos.x -= Math.sin(heading) * offset;
    car.agent.pos.y += Math.cos(heading) * offset;
    car.agent.junctionProgress = car.crossing
      ? car.distance
      : car.distance - path.length;
  }

  private reenter(
    car: Car,
    player?: RiderState,
    conditions?: TrafficConditions,
  ) {
    const entries = car.entry ? [car.entry] : this.world.laneGraph.entries;
    const first = this.draw(entries.length);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[(first + i) % entries.length]!;
      if (this.entryGap(entry, car) < car.footprint.halfLength + FOLLOWING_GAP)
        continue;
      if (
        player &&
        entry.path.obstacleAhead(
          0,
          player.pos,
          0.22,
          car.footprint,
          car.entry ? CYCLE_OFFSET : 0,
          trafficFootprints.cyclist,
          player.heading,
        ) < FOLLOWING_GAP
      )
        continue;
      if (conditions) {
        const probe = this.spawnProbe;
        probe.kind = car.agent.kind;
        probe.heading = entry.path.place(0, probe.pos);
        if (car.entry) {
          probe.pos.x -= Math.sin(probe.heading) * CYCLE_OFFSET;
          probe.pos.y += Math.cos(probe.heading) * CYCLE_OFFSET;
        }
        if (
          conditions.routed.some(
            (agent) => agent.active && footprintsOverlap(probe, agent, 0.05),
          )
        )
          continue;
      }
      car.pullOver = 0;
      this.setEdge(car, entry, 0);
      car.agent.speed = 0;
      this.place(car);
      return;
    }
    car.agent.speed = 0;
  }
}
