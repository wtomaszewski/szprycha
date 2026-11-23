import type { MissionCity } from '../../content/missions';
import type { GameContent } from '../../content/schemas';
import {
  contains,
  type PointOfInterest,
  type Sign,
  type WorldModel,
} from '../../rules/world/WorldModel';
import { routeFocus } from './focus';
import { corridors, raceCorridors, waypoints } from './routeData';
import {
  poiCentre,
  validateRoute,
  type RouteProof,
  type RouteStep,
} from './validateRoute';

export type CertifiedRoute = {
  id: string;
  steps: readonly RouteStep[];
  proof: RouteProof;
  rules: readonly string[];
  safeStop: boolean;
  district?: string;
  signs: readonly Sign[];
  race?: { rival: string; shortcut?: string; seconds: number };
};

type Rules = Pick<GameContent, 'balans' | 'przepisy'>;

export type RouteCatalogData = {
  readonly routes: readonly CertifiedRoute[];
  readonly nightRoutes: readonly CertifiedRoute[];
};

export class RouteCatalog implements RouteCatalogData {
  readonly routes: readonly CertifiedRoute[];
  readonly nightRoutes: readonly CertifiedRoute[];

  constructor(city: MissionCity, world: WorldModel, content: Rules) {
    const scale = world.metersPerPixel;
    const generated = new Map<string, PointOfInterest>();
    const point = (id: string, x: number, y: number, heading = 0) => {
      generated.set(id, { id, x, y, heading, width: 0, height: 0 });
      return id;
    };
    for (const [id, [x, y]] of Object.entries(waypoints[city]))
      point(id, x * scale, y * scale);

    // Junction arcs use the same directed movements and lane polylines as traffic.
    const laneSteps = new Map<string, Pick<RouteStep, 'through' | 'signal'>>();
    const junctions = world.laneGraph.movements.flatMap(
      ({ id, from, to, path, maneuver }) => {
        const lane = from.lane;
        if (
          !lane ||
          from.path.length < 9 ||
          to.path.length < 6 ||
          !(
            (lane.intersection.kind === 'equal' && maneuver === 'straight') ||
            (lane.intersection.kind === 'priority' &&
              lane.stopSign &&
              maneuver === 'straight') ||
            (lane.intersection.kind === 'roundabout' &&
              lane.priorityClass === 'roundabout_in') ||
            (lane.mainSignal && maneuver === 'straight') ||
            lane.arrow?.direction === maneuver
          )
        )
          return [];
        const lanePoint = (
          label: string,
          geometry: typeof path,
          distance: number,
        ) => {
          const position = { x: 0, y: 0 };
          const heading = geometry.place(distance, position);
          const key = point(
            `${id.replace(':', '-')}-${label}`,
            position.x,
            position.y,
            heading,
          );
          laneSteps.set(key, {
            through: label.startsWith('turn-'),
            signal: maneuver === 'straight' ? 'none' : maneuver,
          });
          return key;
        };
        return [
          [
            lanePoint('start', from.path, from.path.length - 9),
            lanePoint('approach', from.path, from.path.length - 2),
            ...Array.from(
              { length: Math.ceil(path.length / 1.8) - 1 },
              (_, i) => lanePoint(`turn-${i}`, path, (i + 1) * 1.8),
            ),
            lanePoint('exit', to.path, 5),
          ],
        ];
      },
    );

    const poi = (id: string) => world.pois.get(id) ?? generated.get(id);
    const edges = new Map<string, RouteStep | null>();
    const start = (poi: PointOfInterest): RouteStep => ({
      poi,
      walking: false,
    });
    const arc = (from: PointOfInterest, to: PointOfInterest) => {
      const id = `${from.id}/${to.id}`;
      if (!edges.has(id)) {
        const steps = [false, true].map((walking) => ({ poi: to, walking }));
        edges.set(
          id,
          steps.find((step) =>
            validateRoute(world, content, [start(from), step]),
          ) ?? null,
        );
      }
      return edges.get(id);
    };
    const seen = new Set<string>();
    const routes: CertifiedRoute[] = [];
    const nightRoutes: CertifiedRoute[] = [];
    const add = (
      ids: readonly string[],
      options: {
        race?: (typeof raceCorridors)[MissionCity];
        lane?: boolean;
      } = {},
    ) => {
      const id = ids.join('/');
      if (seen.has(id)) return;
      seen.add(id);
      const points = ids.map(poi);
      const first = points[0];
      if (!first || points.some((p) => !p)) return;
      const steps = [start(first)];
      for (const next of points.slice(1)) {
        const leg = options.lane
          ? { ...start(next!), ...laneSteps.get(next!.id) }
          : arc(steps.at(-1)!.poi, next!);
        if (!leg) return;
        steps.push(leg);
      }
      const from = poiCentre(first);
      const to = poiCentre(steps[1]!.poi);
      steps[0] = start({
        ...first,
        id: `${first.id}-order-start`,
        heading: Math.atan2(to.y - from.y, to.x - from.x),
      });
      const proof = validateRoute(world, content, steps);
      if (!proof || proof.metres < 3 || proof.seconds > 240) return;
      const last = steps.at(-1)!.poi;
      const signs = world.signs.filter((sign) =>
        last.width === 0
          ? Math.hypot(last.x - sign.x, last.y - sign.y) <= 1.5
          : contains(last, sign),
      );
      const centre = poiCentre(last);
      const safeStop =
        !world.intersections.some((area) => contains(area, centre)) &&
        !world.crossings.some((area) => contains(area, centre)) &&
        !world.zones.some(
          (area) => area.kind === 'roadway' && contains(area, centre),
        );
      const context =
        safeStop &&
        world.signals.some(
          (signal) =>
            signal.code === 'S-2' &&
            Math.hypot(centre.x - signal.x, centre.y - signal.y) <= 4,
        )
          ? ['ZNAK-S2']
          : [];
      const district = world.districts.find((area) =>
        contains(area, centre),
      )?.id;
      const rival = options.race && world.raceRoutes.get(options.race.rival);
      if (options.race && (!rival || !contains(last, rival.path.end))) return;
      const race =
        options.race && rival
          ? {
              rival: options.race.rival,
              shortcut: options.race.shortcut,
              seconds: rival.path.length / rival.speed,
            }
          : undefined;
      routes.push({
        id,
        steps,
        proof,
        signs,
        race,
        safeStop,
        district,
        rules: [...new Set([...routeFocus(world, proof, false), ...context])],
      });
      if (
        !options.race &&
        proof.metres >= 15 &&
        steps.every(({ walking }) => !walking)
      ) {
        const night = validateRoute(world, content, steps, true);
        if (night)
          nightRoutes.push({
            id,
            steps,
            proof: night,
            signs,
            safeStop,
            district,
            rules: routeFocus(world, night, true),
          });
      }
    };

    const race = raceCorridors[city];
    add(race.points, { race });
    const graph = new Map<string, Set<string>>();
    for (const chain of corridors[city]) {
      for (const ids of [chain, [...chain].reverse()]) {
        for (let index = 1; index < ids.length; index++) {
          const from = poi(ids[index - 1]!);
          const to = poi(ids[index]!);
          if (!from || !to || !arc(from, to)) continue;
          const destinations = graph.get(from.id) ?? new Set<string>();
          destinations.add(to.id);
          graph.set(from.id, destinations);
        }
      }
    }
    // Search the waypoint graph from each origin. A whole-path replay also
    // checks transitions between arcs, including clock-dependent rules.
    for (const origin of graph.keys()) {
      const queue = [[origin]];
      const visited = new Set([origin]);
      for (const path of queue) {
        if (path.length >= 5) continue;
        for (const next of graph.get(path.at(-1)!) ?? []) {
          if (visited.has(next)) continue;
          visited.add(next);
          const route = [...path, next];
          queue.push(route);
          add(route);
        }
      }
    }
    for (const chain of junctions) add(chain, { lane: true });
    this.routes = routes;
    this.nightRoutes = nightRoutes;
  }
}
