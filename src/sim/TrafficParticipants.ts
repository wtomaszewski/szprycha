import type { GameContent } from '../content/schemas';
import type { IntersectionManager } from '../rules/priority/IntersectionManager';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
} from '../rules/types';
import {
  footprintReachesBox,
  footprintsOverlap,
  trafficFootprints,
  type Footprint,
} from '../rules/world/Footprint';
import { RoadPath } from '../rules/world/RoadPath';
import type {
  RouteJunction,
  TrafficRoute,
  TramStop,
} from '../rules/world/TrafficRoutes';
import {
  distanceToLine,
  type Box,
  type Crossing,
  type Intersection,
  type WorldModel,
} from '../rules/world/WorldModel';
import {
  TrafficSimulation,
  type TrafficConditions,
  type ClearingArea,
} from './TrafficSimulation';

const STEP = 1 / TICKS_PER_SECOND;
const APPROACH_RANGE = 11;
const EPSILON = 1e-6;

export interface RoutedAgent extends AgentState {
  active: boolean;
  intent:
    | 'walking'
    | 'driving'
    | 'signal'
    | 'yield'
    | 'junction'
    | 'boarding'
    | 'protective';
  trips: number;
  signalActive: boolean;
  stopId?: string;
  tramHeadings?: { front: number; rear: number };
}
interface CrossingGate {
  crossing: Crossing;
  entry: number;
  exit: number;
}
interface Journey {
  path: RoadPath;
  gates: CrossingGate[];
}
interface RouteActor {
  agent: RoutedAgent;
  route: TrafficRoute;
  footprint: Footprint;
  outward: Journey;
  returnLeg?: Journey;
  journey: Journey;
  distance: number;
  startsAt: number;
  gateIndex: number;
  crossing?: CrossingGate;
  junctionIndex: number;
  stopLineTicks: number;
  holdsJunction: boolean;
  stopIndex: number;
  boarding?: TramStop;
}

function journey(
  path: RoadPath,
  reverse: RoadPath,
  route: TrafficRoute,
  footprint: Footprint,
): Journey {
  return {
    path,
    gates: route.crossings
      .map((crossing) => ({
        crossing,
        entry: path.boxAhead(0, crossing, 0.05, footprint),
        exit: path.length - reverse.boxAhead(0, crossing, 0.05, footprint),
      }))
      .filter(({ entry }) => Number.isFinite(entry))
      .sort((a, b) => a.entry - b.entry),
  };
}

function overlaps(a: Box, b: Box) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

export class TrafficParticipants {
  readonly road: TrafficSimulation;
  readonly routed: readonly RoutedAgent[];
  readonly emergencyEvents: readonly RoutedAgent[];
  private readonly actors: RouteActor[];
  private readonly footAndBike: AgentState[] = [];
  private readonly priorityAgents: AgentState[] = [];
  private readonly occupiedJunctions = new Set<Intersection>();
  private readonly clearingAreas: ClearingArea[] = [];
  private readonly activeEmergency: AgentState[] = [];
  private readonly conditions: TrafficConditions;
  private readonly tramSample = { x: 0, y: 0 };
  private readonly playerAhead = { x: 0, y: 0 };
  private readonly playerAgent: AgentState = {
    id: 'player',
    kind: 'cyclist',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
  };
  private tick = 0;

  constructor(
    private readonly world: WorldModel,
    private readonly manager: IntersectionManager,
    private readonly settings: GameContent['balans']['silnik'],
    seed?: number,
    private readonly mode: 'ambient' | 'scheduled' | 'mission-only' = 'ambient',
  ) {
    this.road = new TrafficSimulation(
      world,
      manager,
      settings,
      seed,
      mode === 'mission-only' ? 0 : world.trafficCarCount,
      mode !== 'mission-only',
    );
    this.actors = world.trafficRoutes.map((route) => {
      const reverse =
        route.reverse ??
        new RoadPath(route.id, [...route.path.points].reverse());
      const kind = route.kind === 'passenger' ? 'pedestrian' : route.kind;
      const footprint = trafficFootprints[kind];
      const outward = journey(route.path, reverse, route, footprint);
      return {
        agent: {
          id: route.id,
          kind,
          bikeInfrastructure: kind === 'cyclist' || undefined,
          pos: { x: 0, y: 0 },
          heading: 0,
          speed: 0,
          active: false,
          signalActive: false,
          tramHeadings: kind === 'tram' ? { front: 0, rear: 0 } : undefined,
          trips: 0,
          intent: 'driving',
        },
        route,
        footprint,
        outward,
        returnLeg: route.reverse
          ? journey(reverse, route.path, route, footprint)
          : undefined,
        journey: outward,
        distance: 0,
        startsAt: 0,
        gateIndex: 0,
        junctionIndex: 0,
        stopLineTicks: 0,
        holdsJunction: false,
        stopIndex: 0,
      };
    });
    this.routed = this.actors.map(({ agent }) => agent);
    this.conditions = {
      priorityAgents: this.priorityAgents,
      occupiedJunctions: this.occupiedJunctions,
      clearingAreas: this.clearingAreas,
      emergency: this.activeEmergency,
      routed: this.routed,
    };
    this.emergencyEvents = this.routed.filter(
      ({ kind }) => kind === 'emergency',
    );
    this.reset();
  }

  reset() {
    this.tick = 0;
    this.road.reset();
    for (const actor of this.actors) {
      actor.agent.trips = 0;
      this.restart(
        actor,
        actor.route.kind === 'passenger' ||
          this.mode === 'mission-only' ||
          this.isEventRoute(actor.route)
          ? Infinity
          : actor.route.start_s,
      );
      if (actor.startsAt === 0) this.activate(actor);
    }
  }

  private isEventRoute(route: TrafficRoute) {
    return (
      route.event_only ||
      route.kind === 'car' ||
      (this.mode !== 'ambient' &&
        (route.kind === 'emergency' ||
          (route.kind === 'tram' && route.stops.length > 0) ||
          (route.kind === 'pedestrian' && route.crossings.length > 0)))
    );
  }

  startEventRoute(route: TrafficRoute, distance: number, player: RiderState) {
    const actor = this.actors.find((candidate) => candidate.route === route);
    if (!actor || actor.agent.active || !this.isEventRoute(route)) return false;
    const clearance = actor.footprint.halfLength + 0.3;
    for (const control of route.junctions) {
      if (
        distance >= control.distance - clearance &&
        distance <= control.exit + clearance
      )
        distance = Math.max(0, control.distance - clearance - 0.1);
    }
    const pos = { x: 0, y: 0 };
    const heading = route.path.place(distance, pos);
    const candidate = { ...actor.agent, pos, heading };
    if (
      !this.clearOfRoadUsers(candidate, player) ||
      this.actors.some(
        ({ agent }) => agent.active && footprintsOverlap(candidate, agent, 0.3),
      )
    )
      return false;

    actor.distance = distance;
    while (
      route.junctions[actor.junctionIndex] &&
      route.junctions[actor.junctionIndex]!.exit + clearance < distance
    )
      actor.junctionIndex++;
    while (
      route.stops[actor.stopIndex] &&
      route.stops[actor.stopIndex]!.distance < distance
    )
      actor.stopIndex++;
    while (
      actor.journey.gates[actor.gateIndex] &&
      actor.journey.gates[actor.gateIndex]!.exit < distance
    )
      actor.gateIndex++;
    this.place(actor);
    this.activate(actor);
    return true;
  }

  step(env: EnvState, player?: RiderState, eventCyclist?: AgentState) {
    const at = this.tick / TICKS_PER_SECOND;
    this.footAndBike.length = 0;
    this.priorityAgents.length = 0;
    this.occupiedJunctions.clear();
    this.clearingAreas.length = 0;
    this.activeEmergency.length = 0;
    if (player) {
      this.playerAhead.x =
        player.pos.x + Math.cos(player.heading) * player.speed * 0.55;
      this.playerAhead.y =
        player.pos.y + Math.sin(player.heading) * player.speed * 0.55;
    }
    for (const actor of this.actors) {
      if (
        !actor.agent.active &&
        at >= actor.startsAt &&
        this.clearOfRoadUsers(actor.agent, player)
      )
        this.activate(actor);
      if (!actor.agent.active || actor.route.kind === 'passenger') continue;
      if (
        actor.agent.kind === 'tram' ||
        actor.agent.kind === 'emergency' ||
        actor.agent.kind === 'car'
      )
        continue;
      this.walkOrCycle(actor, at, env, player);
      if (actor.agent.active) this.footAndBike.push(actor.agent);
    }
    if (eventCyclist) this.footAndBike.push(eventCyclist);
    // Seed the reservations before any new request. Trips run in map order.
    for (const actor of this.actors) {
      if (actor.holdsJunction)
        this.occupiedJunctions.add(
          actor.route.junctions[actor.junctionIndex]!.lane.intersection,
        );
    }
    for (const actor of this.actors) {
      if (!actor.agent.active) continue;
      if (
        actor.route.kind === 'tram' ||
        actor.route.kind === 'emergency' ||
        actor.route.kind === 'car'
      )
        this.driveSpecial(actor, at, env, player);
    }
    this.road.step(env, player, this.footAndBike, this.conditions);
    this.tick++;
  }

  private activate(actor: RouteActor) {
    actor.agent.active = true;
    actor.agent.signalActive = actor.route.kind === 'emergency';
  }

  private restart(actor: RouteActor, at: number) {
    actor.agent.active = false;
    actor.agent.signalActive = false;
    actor.agent.speed = 0;
    actor.agent.protectiveBrake = false;
    actor.agent.crossingId = undefined;
    actor.agent.laneId = undefined;
    actor.agent.maneuver = undefined;
    actor.agent.junctionProgress = undefined;
    actor.agent.stopId = undefined;
    actor.agent.intent =
      actor.agent.kind === 'pedestrian' ? 'walking' : 'driving';
    actor.distance = 0;
    actor.startsAt = at;
    actor.journey = actor.outward;
    actor.gateIndex = 0;
    actor.crossing = undefined;
    actor.junctionIndex = 0;
    actor.stopLineTicks = 0;
    actor.holdsJunction = false;
    actor.stopIndex = 0;
    actor.boarding = undefined;
    this.place(actor);
  }

  private place(actor: RouteActor) {
    const {
      agent,
      distance,
      journey: { path },
    } = actor;
    agent.heading = path.place(distance, agent.pos);
    const headings = agent.tramHeadings;
    if (headings) {
      const sample = this.tramSample;
      const half = actor.footprint.halfLength;
      path.place(distance + half, sample);
      headings.front = Math.atan2(
        sample.y - agent.pos.y,
        sample.x - agent.pos.x,
      );
      path.place(distance - half, sample);
      headings.rear = Math.atan2(
        agent.pos.y - sample.y,
        agent.pos.x - sample.x,
      );
    }
  }

  private clearOfRoadUsers(candidate: AgentState, player?: RiderState) {
    for (const agent of this.road.agents) {
      if (footprintsOverlap(candidate, agent, 0.1)) return false;
    }
    return (
      !player || !footprintsOverlap(candidate, this.asCyclist(player), 0.3)
    );
  }

  private asCyclist(player: RiderState) {
    const agent = this.playerAgent;
    agent.pos = player.pos;
    agent.heading = player.heading;
    agent.speed = player.speed;
    return agent;
  }

  private roadUserIn(box: Box, margin: number, player?: RiderState) {
    return (
      Boolean(
        player && footprintReachesBox(this.asCyclist(player), box, margin),
      ) ||
      this.road.agents.some((agent) => footprintReachesBox(agent, box, margin))
    );
  }

  private playerGap(actor: RouteActor, player?: RiderState) {
    if (!player) return Infinity;
    const { path } = actor.journey;
    return Math.min(
      path.obstacleAhead(
        actor.distance,
        player.pos,
        0.2,
        actor.footprint,
        0,
        trafficFootprints.cyclist,
        player.heading,
      ),
      path.obstacleAhead(
        actor.distance,
        this.playerAhead,
        0.2,
        actor.footprint,
        0,
        trafficFootprints.cyclist,
        player.heading,
      ),
    );
  }

  private walkOrCycle(
    actor: RouteActor,
    at: number,
    env: EnvState,
    player?: RiderState,
  ) {
    const {
      agent,
      journey: { path, gates },
    } = actor;
    const gate = gates[actor.gateIndex];
    const speed =
      agent.kind === 'cyclist' && gate && gate.entry - actor.distance < 2
        ? Math.min(2.6, actor.route.speed)
        : actor.route.speed;
    let room = path.length - actor.distance;
    agent.intent = agent.kind === 'pedestrian' ? 'walking' : 'driving';
    if (
      gate &&
      !actor.crossing &&
      gate.entry <= actor.distance + speed * STEP + EPSILON
    ) {
      const open = this.world.crossingAllowsEntry(gate.crossing, at, env);
      const area = gate.crossing.trafficArea ?? gate.crossing;
      const roadOccupied = this.roadUserIn(area, 0.04, player);
      if (open && roadOccupied)
        this.clearingAreas.push({
          area,
          occupiedMargin: 0.04,
          stopMargin: 0.13,
        });
      const occupied =
        roadOccupied ||
        this.actors.some(
          (other) =>
            other !== actor &&
            other.agent.active &&
            (other.crossing
              ? overlaps(gate.crossing, other.crossing.crossing)
              : (other.agent.kind === 'tram' ||
                  other.agent.kind === 'emergency') &&
                footprintReachesBox(other.agent, area, 0.04)),
        );
      if (open && !occupied) {
        actor.crossing = gate;
        agent.crossingId = gate.crossing.id;
      } else {
        room = Math.min(room, gate.entry - actor.distance);
        agent.intent = open ? 'yield' : 'signal';
      }
    }
    const playerGap = this.playerGap(actor, player);
    this.move(actor, speed, room, playerGap);
    if (actor.crossing && actor.distance + EPSILON >= actor.crossing.exit) {
      actor.crossing = undefined;
      agent.crossingId = undefined;
      actor.gateIndex++;
    }
    if (actor.distance + EPSILON < path.length) return;
    agent.trips++;
    if (this.isEventRoute(actor.route)) this.restart(actor, Infinity);
    else if (actor.returnLeg) {
      actor.journey =
        actor.journey === actor.outward ? actor.returnLeg : actor.outward;
      actor.distance = 0;
      actor.gateIndex = 0;
      this.place(actor);
    } else this.restart(actor, at + 2);
  }

  private driveSpecial(
    actor: RouteActor,
    at: number,
    env: EnvState,
    player?: RiderState,
  ) {
    const { agent, route, distance } = actor;
    const { footprint } = actor;
    // Turning cars can project beyond the end of the perpendicular road.
    const car = trafficFootprints.car;
    const junctionClearance =
      agent.kind === 'tram'
        ? Math.hypot(car.halfLength, car.halfWidth) + 0.15
        : 0.15;
    const junction = route.junctions[actor.junctionIndex];
    const emergency = route.kind === 'emergency';
    const stop = route.stops[actor.stopIndex];
    let room = route.path.length - distance;
    agent.intent = 'driving';
    if (emergency) this.activeEmergency.push(agent);
    if (
      junction &&
      junction.distance - distance < APPROACH_RANGE + footprint.halfLength
    ) {
      const { lane } = junction;
      const phase = this.world.trafficPhase(lane, at, env);
      const permitted = emergency || phase === 'green' || phase === 'off';
      const stopAt =
        junction.distance - footprint.halfLength - junctionClearance;
      const atStopLine = stopAt - distance <= 0.08;
      const needsStop =
        !emergency && phase === 'off' && lane.stopSign?.code === 'B-20';
      if (
        needsStop &&
        atStopLine &&
        agent.speed < this.settings.stop_predkosc_ms
      )
        actor.stopLineTicks++;
      const hasStopped =
        !needsStop || actor.stopLineTicks * STEP >= this.settings.stop_czas_s;
      agent.laneId = lane.id;
      agent.maneuver = 'straight';
      agent.junctionProgress = distance - junction.distance;
      if (
        !emergency &&
        permitted &&
        stopAt - distance < APPROACH_RANGE &&
        (!stop || stop.distance > junction.distance)
      )
        this.priorityAgents.push(agent);
      if (!actor.holdsJunction) {
        const canEnter =
          permitted &&
          hasStopped &&
          !this.occupiedJunctions.has(lane.intersection) &&
          !this.road.junctionOccupied(lane.intersection) &&
          (emergency || !this.mustYield(junction, at, env, player));
        if (canEnter && atStopLine) {
          actor.holdsJunction = true;
          this.occupiedJunctions.add(lane.intersection);
        } else {
          room = Math.min(room, stopAt - distance);
          if (room < 3)
            agent.intent = !permitted
              ? 'signal'
              : canEnter
                ? 'junction'
                : 'yield';
        }
      } else agent.intent = 'junction';
    }
    if (stop) room = this.atTramStop(actor, stop, room, player);
    for (const walker of this.footAndBike) {
      const box =
        walker.crossingId &&
        this.world.crossings.find(({ id }) => id === walker.crossingId);
      if (box)
        room = Math.min(
          room,
          route.path.boxAhead(distance, box, 0.1, footprint),
        );
      room = Math.min(
        room,
        route.path.obstacleAhead(
          distance,
          walker.pos,
          0.1,
          footprint,
          0,
          trafficFootprints[walker.kind],
          walker.heading,
        ),
      );
    }
    if (emergency || route.kind === 'car') {
      for (const car of this.road.agents) {
        if (Math.cos(car.heading - agent.heading) < 0.98) continue;
        room = Math.min(
          room,
          route.path.obstacleAhead(
            distance,
            car.pos,
            0.12,
            footprint,
            0,
            trafficFootprints[car.kind],
            car.heading,
          ),
        );
      }
    }
    this.move(actor, route.speed, room, this.playerGap(actor, player));
    if (junction && agent.laneId) {
      agent.junctionProgress = actor.distance - junction.distance;
      if (
        actor.distance >=
        junction.exit + footprint.halfLength + junctionClearance
      ) {
        actor.holdsJunction = false;
        actor.junctionIndex++;
        actor.stopLineTicks = 0;
        agent.laneId = undefined;
        agent.junctionProgress = undefined;
      }
    }
    if (actor.distance + EPSILON >= route.path.length) {
      agent.trips++;
      this.restart(
        actor,
        this.isEventRoute(route) ? Infinity : at + route.repeat_s!,
      );
    }
  }

  private mustYield(
    control: RouteJunction,
    at: number,
    env: EnvState,
    player?: RiderState,
  ) {
    const { lane } = control;
    if (player?.mode === 'riding') {
      const approach = this.world.approachAt(player.pos, player.heading);
      if (
        approach?.intersection === lane.intersection &&
        distanceToLine(approach, player.pos) <= APPROACH_RANGE
      ) {
        const agent = this.asCyclist(player);
        agent.laneId = approach.id;
        agent.maneuver =
          player.maneuver ??
          (player.signal === 'none' ? 'straight' : player.signal);
        if (this.manager.mustYield(lane, 'straight', agent, at, env))
          return true;
      }
    }
    return this.road.agents.some(
      (agent) =>
        agent.laneId &&
        (agent.junctionProgress ?? -Infinity) >= -APPROACH_RANGE &&
        this.manager.mustYield(lane, 'straight', agent, at, env),
    );
  }

  private atTramStop(
    actor: RouteActor,
    stop: TramStop,
    room: number,
    player?: RiderState,
  ) {
    const remaining = stop.distance - actor.distance;
    if (remaining < 7)
      this.clearingAreas.push({
        area: stop,
        occupiedMargin: 0.04,
        stopMargin: 0.15,
      });
    if (remaining > EPSILON) return Math.min(room, remaining);
    const passenger = this.actors.find(
      ({ route }) => route === stop.passenger,
    )!;
    actor.agent.intent = 'boarding';
    actor.agent.stopId = stop.id;
    if (!actor.boarding) {
      if (this.roadUserIn(stop, 0.04, player)) return 0;
      actor.boarding = stop;
      this.activate(passenger);
    }
    this.footAndBike.push(passenger.agent);
    this.move(
      passenger,
      passenger.route.speed,
      passenger.journey.path.length - passenger.distance,
      this.playerGap(passenger, player),
    );
    if (passenger.distance + EPSILON < passenger.journey.path.length) return 0;
    passenger.agent.trips++;
    this.restart(passenger, Infinity);
    this.footAndBike.pop();
    actor.boarding = undefined;
    actor.agent.stopId = undefined;
    actor.stopIndex++;
    return room;
  }

  private move(
    actor: RouteActor,
    speed: number,
    room: number,
    playerGap: number,
  ) {
    const agent = actor.agent;
    const target = Math.min(
      speed,
      Math.sqrt(6 * Math.max(0, Math.min(room, playerGap))),
    );
    const nextSpeed = Math.max(
      agent.speed - 4 * STEP,
      Math.min(agent.speed + 2.5 * STEP, target),
    );
    const travel = Math.max(0, Math.min(room, playerGap, nextSpeed * STEP));
    agent.protectiveBrake = playerGap + EPSILON < Math.min(room, speed * 0.6);
    if (agent.protectiveBrake) agent.intent = 'protective';
    agent.speed = travel / STEP;
    actor.distance += travel;
    this.place(actor);
  }
}
