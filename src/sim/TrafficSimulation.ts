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
import type { LaneEdge, Movement } from '../rules/world/LaneGraph';
import {
  contains,
  type Crossing,
  type Intersection,
  type Lane,
  type WorldModel,
} from '../rules/world/WorldModel';

const STEP = 1 / TICKS_PER_SECOND;
const ACCELERATION = 2.2;
const BRAKING = 4;
const STOP_MARGIN = 0.85;
const REQUEST_RANGE = 3.5;
const SPACING = 2.5;
const HEADWAY = 0.65;
const CRUISE_SPEED = 7;
const TURN_SPEED = 4.5;
const EPSILON = 1e-8;
const PLAYER_LOOKAHEAD = 0.65;
const DEFAULT_SEED = 1403;
export const CAR_RADIUS_PX = 14;

export type TrafficIntent =
  | 'driving'
  | 'following'
  | 'signal'
  | 'stop'
  | 'yield'
  | 'junction'
  | 'protective';

export interface TrafficCar extends AgentState {
  kind: 'car';
  intent: TrafficIntent;
  destination?: string;
  junctionsPassed: number;
}

interface Car {
  agent: TrafficCar;
  edge: LaneEdge;
  distance: number;
  cruiseFactor: number;
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

type Settings = GameContent['balans']['silnik'];

export class TrafficSimulation {
  readonly agents: readonly TrafficCar[];
  readonly radius: number;
  private readonly cars: Car[];
  private readonly junctions = new Map<Intersection, Car>();
  private readonly approaches: LaneEdge[];
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
  private tick = 0;
  private randomState = 0;

  constructor(
    private readonly world: WorldModel,
    private readonly manager: IntersectionManager,
    private readonly settings: Settings,
    private readonly seed = DEFAULT_SEED,
    count = world.trafficCarCount,
  ) {
    this.radius = CAR_RADIUS_PX * world.metersPerPixel;
    this.approaches = world.laneGraph.edges.filter(({ lane }) => lane);
    if (!Number.isInteger(count) || count < 0 || count > this.approaches.length)
      throw new RangeError(
        `Expected 0–${this.approaches.length} cars, got ${count}`,
      );
    this.cars = Array.from({ length: count }, (_, index) => ({
      agent: {
        id: `car-${index + 1}`,
        kind: 'car',
        pos: { x: 0, y: 0 },
        heading: 0,
        speed: 0,
        intent: 'driving',
        junctionsPassed: 0,
      },
      edge: this.approaches[index]!,
      distance: 0,
      cruiseFactor: 1,
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
    }));
    this.agents = this.cars.map(({ agent }) => agent);
    this.reset();
  }

  reset() {
    this.tick = 0;
    this.randomState = this.seed >>> 0;
    this.playerLane = undefined;
    this.junctions.clear();
    const lanes = [...this.approaches];
    for (const car of this.cars) {
      const index = this.draw(lanes.length);
      const edge = lanes.splice(index, 1)[0]!;
      car.cruiseFactor = 0.8 + this.draw(21) / 100;
      car.agent.junctionsPassed = 0;
      car.agent.speed = 0;
      car.agent.protectiveBrake = false;
      car.agent.intent = 'driving';
      car.reserved = undefined;
      this.setEdge(car, edge, edge.path.length * (0.16 + this.draw(13) / 100));
      this.place(car);
    }
  }

  step(
    env: EnvState,
    player?: RiderState,
    pedestrians: readonly AgentState[] = [],
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
      this.reserve(intersection, at, env);
    for (let index = 0; index < pedestrians.length; index++) {
      const { pos } = pedestrians[index]!;
      this.walkingCrossings[index] = this.world.crossings.find(
        (crossing) => crossing.kind === 'pedestrian' && contains(crossing, pos),
      );
    }
    for (const car of this.cars) this.plan(car, player, pedestrians);
    for (const car of this.cars) this.advance(car);
    for (const car of this.cars) {
      if (!car.edge.lane && car.distance >= car.edge.path.length)
        this.reenter(car, player);
    }
    this.tick++;
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
    car.route = edge.movements.length
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

  private gapAhead(car: Car) {
    let gap = Infinity;
    for (const other of this.cars) {
      if (other === car) continue;
      if (car.edge === other.edge && !car.crossing) {
        const distance = other.crossing
          ? car.edge.path.length + other.distance
          : other.distance;
        if (distance > car.distance)
          gap = Math.min(gap, distance - car.distance);
      }
      if (car.crossing && other.edge === car.route!.to && !other.crossing)
        gap = Math.min(
          gap,
          car.route!.path.length - car.distance + other.distance,
        );
    }
    return gap;
  }

  private entryGap(edge: LaneEdge) {
    let gap = edge.path.length - STOP_MARGIN;
    for (const car of this.cars) {
      if (car.edge === edge && !car.crossing) gap = Math.min(gap, car.distance);
    }
    return gap;
  }

  private prepare(car: Car, at: number, env: EnvState) {
    const lane = car.edge.lane;
    car.request = false;
    car.approaching = false;
    car.reason = undefined;
    if (!lane || car.committed) return;
    const phase = this.world.phase(lane, at, env);
    const toStop = car.edge.path.length - STOP_MARGIN - car.distance;
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
      car.gap > SPACING + toStop &&
      this.entryGap(car.route!.to) >= SPACING * 2
    ) {
      car.approaching = true;
      car.request = toStop <= REQUEST_RANGE;
    } else if (toStop <= REQUEST_RANGE) car.reason = 'junction';
  }

  private reserve(intersection: Intersection, at: number, env: EnvState) {
    const current = this.junctions.get(intersection);
    if (current) {
      if (current.committed || current.edge.lane?.intersection !== intersection)
        return;
      current.reserved = undefined;
      this.junctions.delete(intersection);
    }
    const approaching = this.junctionAgents;
    approaching.length = 0;
    if (this.playerLane?.intersection === intersection)
      approaching.push(this.playerAgent);
    for (const car of this.cars) {
      if (car.approaching && car.edge.lane?.intersection === intersection)
        approaching.push(car.agent);
    }
    let winner: Car | undefined;
    let tieWinner: Car | undefined;
    let allStopped = true;
    for (const car of this.cars) {
      if (car.edge.lane?.intersection !== intersection || !car.request)
        continue;
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
      if (
        !Number.isFinite(car.arrival) ||
        car.agent.speed >= this.settings.stop_predkosc_ms
      )
        allStopped = false;
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

  private obstacleGap(car: Car, pos: Vec2, radius: number) {
    if (car.crossing) {
      const { path, to } = car.route!;
      return Math.min(
        path.obstacleAhead(car.distance, pos, radius),
        path.length - car.distance + to.path.obstacleAhead(0, pos, radius),
      );
    }
    const { path } = car.edge;
    return Math.min(
      path.obstacleAhead(car.distance, pos, radius),
      car.route
        ? path.length -
            car.distance +
            car.route.path.obstacleAhead(0, pos, radius)
        : Infinity,
    );
  }

  private crossingGap(car: Car, crossing: Crossing) {
    const path = car.crossing ? car.route!.path : car.edge.path;
    const next = car.crossing ? car.route!.to.path : car.route?.path;
    const margin = this.radius + 0.55;
    return Math.min(
      path.boxAhead(car.distance, crossing, margin),
      next
        ? path.length - car.distance + next.boxAhead(0, crossing, margin)
        : Infinity,
    );
  }

  private plan(
    car: Car,
    player: RiderState | undefined,
    pedestrians: readonly AgentState[],
  ) {
    const speed = car.agent.speed;
    const speedLimit = Math.min(
      CRUISE_SPEED * car.cruiseFactor,
      car.edge.speedLimit / 3.6,
    );
    const hasRightOfEntry =
      car.committed ||
      (car.reserved !== undefined &&
        car.reserved === car.edge.lane?.intersection);
    const toStop =
      car.edge.lane && !hasRightOfEntry
        ? car.edge.path.length - STOP_MARGIN - car.distance
        : Infinity;
    const following = car.gap - SPACING;
    const room = Math.min(toStop, following);
    let target = Math.min(
      speedLimit,
      this.brakingSpeed(toStop),
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
          this.obstacleGap(car, player.pos, this.radius + 0.85),
          this.obstacleGap(car, this.playerAhead, this.radius + 0.85),
        )
      : Infinity;
    let pedestrianGap = Infinity;
    for (let index = 0; index < pedestrians.length; index++) {
      const pedestrian = pedestrians[index]!;
      const crossing = this.walkingCrossings[index];
      pedestrianGap = Math.min(
        pedestrianGap,
        crossing
          ? this.crossingGap(car, crossing)
          : this.obstacleGap(car, pedestrian.pos, this.radius + 0.55),
      );
    }
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
    car.agent.intent = car.agent.protectiveBrake
      ? 'protective'
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
      car.distance > car.edge.path.length - STOP_MARGIN
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
      car.distance >= SPACING
    ) {
      this.junctions.delete(car.reserved);
      car.reserved = undefined;
    }
    this.place(car);
  }

  private place(car: Car) {
    const path = car.crossing ? car.route!.path : car.edge.path;
    car.agent.heading = path.place(car.distance, car.agent.pos);
    car.agent.junctionProgress = car.crossing
      ? car.distance
      : car.distance - path.length;
  }

  private reenter(car: Car, player?: RiderState) {
    const entries = this.world.laneGraph.entries;
    const first = this.draw(entries.length);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[(first + i) % entries.length]!;
      if (this.entryGap(entry) < SPACING * 2) continue;
      if (
        player &&
        entry.path.obstacleAhead(0, player.pos, this.radius + 0.85) < SPACING
      )
        continue;
      this.setEdge(car, entry, 0);
      car.agent.speed = 0;
      this.place(car);
      return;
    }
    car.agent.speed = 0;
  }
}
