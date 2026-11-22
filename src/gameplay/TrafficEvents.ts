import type { ForcedMissionEvent } from '../content/missions';
import type { ReplayProp } from './ReplayBuffer';
import type { RoadHazard } from '../rules/detectors/MAN-08';
import {
  TICKS_PER_SECOND,
  type AgentState,
  type EnvState,
  type RiderState,
  type Vec2,
} from '../rules/types.ts';
import {
  contains,
  sideVector,
  type Box,
  type Lane,
  distanceToLine,
  lateralOffset,
  type WorldModel,
} from '../rules/world/WorldModel.ts';
import { RoadPath } from '../rules/world/RoadPath.ts';
import type { TrafficRoute } from '../rules/world/TrafficRoutes';

export const eventRules = {
  cwiczenie_stop: ['ZNAK-STOP'],
  czytaj_oznakowanie: [
    'ZNAK-A7',
    'ZNAK-D1',
    'ZNAK-P23',
    'ZNAK-B9',
    'ZNAK-B2T22',
  ],
  cwiczenie_trasy: ['PIER-08', 'GDZIE-02', 'GDZIE-11', 'MAN-03', 'MAN-05'],
  swiatla_palac: ['SYG-01', 'SYG-02'],
  zielona_strzalka: ['ZNAK-S2'],
  delikatny_czujnik: ['GDZIE-01', 'MAN-08'],
  wskazowka_na_moscie: ['ZNAK-C13'],
  ulewa: ['GDZIE-04'],
  eskorta_franka: ['GDZIE-10'],
  przejazd_kolejowy: ['MSC-01'],
  po_zdarzeniu: ['PP-01'],
  start_kolumny: ['MSC-05'],
  start_finalu: ['GDZIE-01', 'MAN-04'],
  kontrola_swiatel: ['WYP-04', 'WYP-05'],
  pojazd_na_skrzyzowaniu: ['PIER-01', 'PIER-02'],
  pieszy_przy_bramie: ['PIER-06', 'MSC-03'],
  turysci_na_starowce: ['GDZIE-05', 'MAN-08'],
  rowerzysta_na_moscie: ['MAN-04'],
  polecenie_oli: ['SYG-03'],
  pojazd_uprzywilejowany: ['PIER-07'],
  pieszy_na_pasach: ['PIER-04', 'MAN-08'],
  pilka_na_jezdni: ['MAN-08'],
  drzwi_auta: ['MAN-06'],
  tramwaj_bez_wysepki: ['MSC-02'],
  telefon_dzwoni: ['MAN-11'],
  kolega_podwozka: ['MAN-10'],
  rowerzysta_pod_prad: ['MAN-08', 'GDZIE-03'],
} as const;

export type TrafficEventId = keyof typeof eventRules;
const forcedOnly = new Set<TrafficEventId>([
  'cwiczenie_stop',
  'czytaj_oznakowanie',
  'cwiczenie_trasy',
  'swiatla_palac',
  'zielona_strzalka',
  'delikatny_czujnik',
  'wskazowka_na_moscie',
  'ulewa',
  'eskorta_franka',
  'przejazd_kolejowy',
  'po_zdarzeniu',
  'start_kolumny',
  'start_finalu',
  'kontrola_swiatel',
  'pojazd_na_skrzyzowaniu',
  'pieszy_przy_bramie',
  'turysci_na_starowce',
  'polecenie_oli',
]);
export const eventIds = Object.keys(eventRules) as TrafficEventId[];
export const propIds = [
  'pilka_na_jezdni',
  'drzwi_auta',
  'rowerzysta_pod_prad',
] as const;
type PropId = (typeof propIds)[number];
export const hazardCyclistId = 'event-wrong-way-cyclist';
export const hazardBallId = 'event-ball';
export const DEFAULT_EVENT_SEED = 24;
const noticeTicks = 6 * TICKS_PER_SECOND;

export type EventWeight = (
  ruleIds: readonly string[],
  event: TrafficEventId,
) => number;
type Location = Pick<RiderState, 'pos' | 'heading'>;
type Site =
  | { type: 'route'; route: TrafficRoute; distance: number }
  | { type: 'prop'; path: RoadPath }
  | { type: 'door'; pos: Vec2; heading: number }
  | { type: 'officer'; lane: Lane }
  | { type: 'notice' };

export interface EventRouteLauncher {
  startEventRoute(
    route: TrafficRoute,
    distance: number,
    player: RiderState,
  ): boolean;
}

function distanceTo(box: Box, pos: Vec2) {
  return Math.hypot(
    Math.max(box.x - pos.x, 0, pos.x - box.x - box.width),
    Math.max(box.y - pos.y, 0, pos.y - box.y - box.height),
  );
}

function routeSite(
  id: TrafficEventId,
  world: WorldModel,
  pos: Vec2,
): Site | undefined {
  let closest = 12;
  let site: Site | undefined;
  for (const route of world.trafficRoutes) {
    if (id === 'pojazd_na_skrzyzowaniu' && route.kind === 'car') {
      for (const { lane } of route.junctions) {
        const gap = distanceTo(lane.intersection, pos);
        if (gap >= closest) continue;
        closest = gap;
        site = { type: 'route', route, distance: 0 };
      }
    }
    if (
      route.event_only &&
      (id === 'pieszy_przy_bramie' || id === 'turysci_na_starowce'
        ? route.kind === 'pedestrian'
        : id === 'rowerzysta_na_moscie' && route.kind === 'cyclist')
    ) {
      const start = route.path.start;
      const gap = Math.hypot(start.x - pos.x, start.y - pos.y);
      if (gap < closest) {
        closest = gap;
        site = { type: 'route', route, distance: 0 };
      }
    }
    if (id === 'pojazd_uprzywilejowany' && route.kind === 'emergency') {
      for (const { start, direction, length, offset } of route.path.segments) {
        const along = Math.max(
          0,
          Math.min(
            length,
            (pos.x - start.x) * direction.x + (pos.y - start.y) * direction.y,
          ),
        );
        const gap = Math.hypot(
          start.x + along * direction.x - pos.x,
          start.y + along * direction.y - pos.y,
        );
        if (gap < closest) {
          closest = gap;
          site = {
            type: 'route',
            route,
            distance: Math.max(0, offset + along - 10),
          };
        }
      }
    } else if (id === 'pieszy_na_pasach' && route.kind === 'pedestrian') {
      for (const crossing of route.crossings) {
        const gap = distanceTo(crossing, pos);
        if (gap < closest) {
          closest = gap;
          site = {
            type: 'route',
            route,
            distance: Math.max(0, route.path.boxAhead(0, crossing, 0.4) - 0.8),
          };
        }
      }
    } else if (id === 'tramwaj_bez_wysepki' && route.kind === 'tram') {
      for (const stop of route.stops) {
        const gap = distanceTo(stop, pos);
        if (gap < closest) {
          closest = gap;
          site = {
            type: 'route',
            route,
            distance: Math.max(0, stop.distance - 8),
          };
        }
      }
    }
  }
  return site;
}

function eventSite(
  id: TrafficEventId,
  world: WorldModel,
  { pos, heading }: Location,
): Site | undefined {
  switch (id) {
    case 'pojazd_na_skrzyzowaniu':
    case 'pieszy_przy_bramie':
    case 'turysci_na_starowce':
    case 'rowerzysta_na_moscie':
    case 'pojazd_uprzywilejowany':
    case 'pieszy_na_pasach':
    case 'tramwaj_bez_wysepki':
      return routeSite(id, world, pos);
    case 'polecenie_oli': {
      const lane = world.approachAt(pos, heading);
      if (lane?.mainSignal && distanceToLine(lane, pos) < 7)
        return { type: 'officer', lane };
      return;
    }
    case 'drzwi_auta': {
      const car = world.parkedCars.find((box) => distanceTo(box, pos) < 7);
      if (!car) return;
      const horizontal = car.width >= car.height;
      const x = car.x + car.width / 2;
      const y = car.y + car.height / 2;
      const side = horizontal ? (pos.y >= y ? 1 : -1) : pos.x >= x ? 1 : -1;
      return horizontal
        ? {
            type: 'door',
            pos: { x, y: y + (side * car.height) / 2 },
            heading: (side * Math.PI) / 2,
          }
        : {
            type: 'door',
            pos: { x: x + (side * car.width) / 2, y },
            heading: side > 0 ? 0 : Math.PI,
          };
    }
    case 'pilka_na_jezdni':
    case 'rowerzysta_pod_prad': {
      if (world.intersections.some((area) => contains(area, pos, 2))) return;
      const dx = Math.cos(heading);
      const dy = Math.sin(heading);
      const ahead = { x: pos.x + dx * 8, y: pos.y + dy * 8 };
      const wrongWay = id === 'rowerzysta_pod_prad';
      const road =
        (wrongWay &&
          world.zones.find(
            (zone) =>
              zone.kind === 'bike_lane' &&
              contains(zone, pos) &&
              contains(zone, ahead),
          )) ||
        world.zones.find(
          (zone) =>
            zone.kind === 'roadway' &&
            contains(zone, pos) &&
            contains(zone, ahead),
        );
      if (!road || world.intersections.some((area) => contains(area, ahead, 2)))
        return;
      if (wrongWay) {
        // A random encounter challenges riders following the lane direction.
        const centerX = road.x + road.width / 2;
        const centerY = road.y + road.height / 2;
        const direction = road.direction
          ? sideVector[road.direction]
          : road.width >= road.height
            ? { x: Math.sign(pos.y - centerY), y: 0 }
            : { x: 0, y: Math.sign(centerX - pos.x) };
        if (direction.x * dx + direction.y * dy < 0.92) return;
        const start = {
          x: pos.x + direction.x * 8,
          y: pos.y + direction.y * 8,
        };
        if (
          !contains(road, start) ||
          world.intersections.some((area) => contains(area, start, 2))
        )
          return;
        return { type: 'prop', path: new RoadPath(id, [start, pos]) };
      }
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const nearLowEdge = horizontal
        ? pos.y < road.y + road.height / 2
        : pos.x < road.x + road.width / 2;
      const start = horizontal
        ? { x: ahead.x, y: road.y + (nearLowEdge ? 0 : road.height) }
        : { x: road.x + (nearLowEdge ? 0 : road.width), y: ahead.y };
      if (Math.hypot(ahead.x - start.x, ahead.y - start.y) < 0.1) return;
      return { type: 'prop', path: new RoadPath(id, [start, ahead]) };
    }
    default:
      return { type: 'notice' };
  }
}

function siteAtArea(id: TrafficEventId, world: WorldModel, area: Box) {
  const pos = { x: area.x + area.width / 2, y: area.y + area.height / 2 };
  const preferred =
    'heading' in area && typeof area.heading === 'number' ? area.heading : 0;
  for (const heading of [preferred, 0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const site = eventSite(id, world, { pos, heading });
    if (site) return site;
  }
}

export function supportsForcedEvent(
  id: TrafficEventId,
  world: WorldModel,
  area: Box,
) {
  return Boolean(siteAtArea(id, world, area));
}

interface Encounter {
  id: TrafficEventId;
  source: 'forced' | 'random';
  endsAt: number;
  answered: boolean;
  officer?: {
    lane: Lane;
    stoppedTicks: number;
    orders: Record<string, 'stop' | 'go'>;
  };
  officerCleared?: boolean;
}

interface Prop extends ReplayProp {
  path?: RoadPath;
  distance: number;
  direction: number;
}

/** Simulation ticks drive both the seeded draws and the active encounters. */
export class TrafficEvents {
  readonly props: readonly Prop[] = propIds.map(() => ({
    x: 0,
    y: 0,
    heading: 0,
    active: false,
    distance: 0,
    direction: 0,
  }));
  readonly cyclist: AgentState = {
    id: hazardCyclistId,
    kind: 'cyclist',
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
  };
  readonly hazards: RoadHazard[] = [];
  private readonly movingHazards: readonly RoadHazard[] = [
    hazardBallId,
    hazardCyclistId,
  ].map((id) => ({
    id,
    pos: { x: 0, y: 0 },
    heading: 0,
    speed: 0,
    warned: false,
  }));
  private active?: Encounter;
  private readonly pending: { id: TrafficEventId; site: Site }[] = [];
  private state = 0;
  private tick = 0;
  private nextRandom = 0;

  constructor(
    private readonly world: WorldModel,
    private readonly routes: EventRouteLauncher,
    private readonly seed = DEFAULT_EVENT_SEED,
    private readonly weight: EventWeight = () => 1,
    private readonly randomEnabled = true,
    private readonly roadUsers: readonly AgentState[] = [],
  ) {
    this.reset();
  }

  get notice(): Encounter | undefined {
    return this.active;
  }

  get officerOrders(): EnvState['officerOrders'] {
    return this.active?.officer?.orders;
  }

  get hasPendingForced() {
    return (
      this.pending.length > 0 ||
      (this.active?.source === 'forced' &&
        (this.active.officer
          ? !this.active.officerCleared
          : this.active.endsAt - this.tick > noticeTicks - TICKS_PER_SECOND))
    );
  }

  get wrongWayCyclist() {
    return this.props[2]!.active ? this.cyclist : undefined;
  }

  reset() {
    this.state = this.seed >>> 0;
    this.tick = 0;
    this.nextRandom = 4 * TICKS_PER_SECOND;
    this.pending.length = 0;
    this.hazards.length = 0;
    this.active = undefined;
    for (const prop of this.props) prop.active = false;
  }

  force(event: ForcedMissionEvent, area: Box, player: RiderState) {
    const id = event.typ as TrafficEventId;
    const site =
      id === 'polecenie_oli'
        ? siteAtArea(id, this.world, area)
        : (eventSite(id, this.world, player) ??
          siteAtArea(id, this.world, area));
    if (!site || !Object.hasOwn(eventRules, id))
      throw new Error(`Event ${id} has no suitable site at ${area.id}`);
    if (this.pending.length || !this.start(id, site, 'forced', player))
      this.pending.push({ id, site });
  }

  respond(player: RiderState) {
    const encounter = this.notice;
    if (!encounter || encounter.answered) return false;
    if (encounter.id === 'telefon_dzwoni') {
      player.phoneInHand = true;
      return true;
    }
    if (encounter.id === 'kolega_podwozka') {
      encounter.answered = true;
      return true;
    }
    return false;
  }

  resolvePhoneResponse(
    accepted: boolean,
    wasMoving: boolean,
    player: RiderState,
  ) {
    if (!player.phoneInHand || (!accepted && !wasMoving)) return;
    if (this.active?.id === 'telefon_dzwoni') this.active.answered = true;
  }

  step(player: RiderState) {
    this.tick++;
    const encounter = this.active;
    const officer = encounter?.officer;
    if (officer && !encounter.officerCleared) {
      const distance = distanceToLine(officer.lane, player.pos);
      const stopped =
        player.speed === 0 &&
        distance > 0 &&
        distance < 3 &&
        Math.abs(lateralOffset(officer.lane, player.pos)) <=
          officer.lane.width / 2;
      officer.stoppedTicks = stopped ? officer.stoppedTicks + 1 : 0;
      encounter.endsAt = this.tick + noticeTicks;
      if (officer.stoppedTicks >= TICKS_PER_SECOND) {
        officer.orders[officer.lane.id] = 'go';
        encounter.officerCleared = true;
      }
    }
    if (this.active && this.tick >= this.active.endsAt) {
      const index = propIds.indexOf(this.active.id as PropId);
      if (index !== -1) this.props[index]!.active = false;
      this.active = undefined;
    }
    const next = this.pending[0];
    if (next && this.start(next.id, next.site, 'forced', player))
      this.pending.shift();
    if (
      this.randomEnabled &&
      !this.active &&
      this.pending.length === 0 &&
      this.tick >= this.nextRandom
    ) {
      this.nextRandom = this.tick + TICKS_PER_SECOND;
      if (player.mode === 'riding' && player.speed >= 1) this.draw(player);
    }
    this.moveProps(player);
  }

  private draw(player: RiderState) {
    const candidates = [];
    let total = 0;
    for (const id of eventIds) {
      if (forcedOnly.has(id)) continue;
      const site = eventSite(id, this.world, player);
      const weight = site ? this.weight(eventRules[id], id) : 0;
      if (site && Number.isFinite(weight) && weight > 0) {
        total += weight;
        candidates.push({ id, site, weight });
      }
    }
    this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0;
    let draw = (this.state / 0x1_0000_0000) * total;
    for (const { id, site, weight } of candidates) {
      draw -= weight;
      if (draw < 0) {
        if (this.start(id, site, 'random', player))
          this.nextRandom = this.tick + 18 * TICKS_PER_SECOND;
        break;
      }
    }
  }

  private start(
    id: TrafficEventId,
    site: Site,
    source: Encounter['source'],
    player: RiderState,
  ) {
    if (
      this.active ||
      (site.type === 'route' &&
        !this.routes.startEventRoute(site.route, site.distance, player))
    )
      return false;
    if (
      id === 'rowerzysta_pod_prad' &&
      site.type === 'prop' &&
      this.roadUsers.some(
        ({ pos }) => site.path.obstacleAhead(0, pos, 1.3) < 0.2,
      )
    )
      return false;
    const index = propIds.indexOf(id as PropId);
    if (index !== -1) {
      const prop = this.props[index]!;
      prop.active = true;
      prop.distance = 0;
      if (site.type === 'prop') {
        prop.path = site.path;
        this.movingHazards[index === 0 ? 0 : 1]!.warned = false;
        prop.heading = site.path.place(0, prop);
      } else if (site.type === 'door') {
        prop.x = site.pos.x;
        prop.y = site.pos.y;
        prop.direction = site.heading;
        prop.heading = site.heading - Math.PI / 2;
      }
    }
    this.active = {
      id,
      source,
      endsAt: this.tick + noticeTicks,
      answered: false,
      officer:
        site.type === 'officer'
          ? {
              lane: site.lane,
              stoppedTicks: 0,
              orders: { [site.lane.id]: 'stop' },
            }
          : undefined,
    };
    return true;
  }

  private moveProps(player: RiderState) {
    const door = this.active;
    if (door?.id === 'drzwi_auta') {
      const prop = this.props[1]!;
      const remaining = door.endsAt - this.tick;
      const open = Math.min(1, (noticeTicks - remaining) / 30, remaining / 30);
      prop.heading = prop.direction - ((1 - open) * Math.PI) / 2;
    }
    this.hazards.length = 0;
    for (
      let hazardIndex = 0;
      hazardIndex < this.movingHazards.length;
      hazardIndex++
    ) {
      const index = hazardIndex * 2;
      const prop = this.props[index]!;
      if (!prop.active) continue;
      const path = prop.path!;
      let gap = path.obstacleAhead(prop.distance, player.pos, 0.9);
      if (index === 2)
        for (const { pos } of this.roadUsers)
          gap = Math.min(gap, path.obstacleAhead(prop.distance, pos, 1.3));
      const distance = Math.min(
        path.length - prop.distance,
        gap,
        (index === 0 ? 4 : 2.5) / TICKS_PER_SECOND,
      );
      prop.distance += distance;
      prop.heading = path.place(prop.distance, prop);
      const hazard = this.movingHazards[hazardIndex]!;
      hazard.pos.x = prop.x;
      hazard.pos.y = prop.y;
      hazard.heading = prop.heading;
      hazard.speed = distance * TICKS_PER_SECOND;
      this.hazards.push(hazard);
      if (index === 2) {
        this.cyclist.pos.x = prop.x;
        this.cyclist.pos.y = prop.y;
        this.cyclist.heading = hazard.heading;
        this.cyclist.speed = hazard.speed;
      }
    }
  }
}
