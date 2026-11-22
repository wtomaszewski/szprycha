import { readFileSync } from 'node:fs';
import { readContent } from '../../tools/content';
import { MissionRace } from '../../src/gameplay/MissionRace';
import { MissionSystem } from '../../src/gameplay/MissionSystem';
import { TrafficEvents } from '../../src/gameplay/TrafficEvents';
import {
  stepRider,
  type Obstacle,
  type Rider,
} from '../../src/gameplay/bicycle';
import { RuleEngine } from '../../src/rules/RuleEngine';
import { IntersectionManager } from '../../src/rules/priority/IntersectionManager';
import {
  TICKS_PER_SECOND,
  type EnvState,
  type RiderState,
  type Verdict,
} from '../../src/rules/types';
import { WorldModel } from '../../src/rules/world/WorldModel';
import { TrafficParticipants } from '../../src/sim/TrafficParticipants';
import {
  createTrafficObstacles,
  placeTrafficObstacles,
} from '../../src/gameplay/trafficObstacles';
import {
  approachWaypoint,
  type WarsawMissionId,
  type Waypoint,
} from './warsaw-routes';

export const missionContent = await readContent();

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: {
    name: string;
    objects?: (Omit<Obstacle, 'kind'> & {
      properties?: { name: string; value: unknown }[];
    })[];
  }[];
}

export function runWarsawRoute(
  id: WarsawMissionId,
  route: readonly Waypoint[],
  afterViolation?: readonly Waypoint[],
) {
  const definition = missionContent.misje.find((mission) => mission.id === id)!;
  const map = JSON.parse(
    readFileSync(`maps/${definition.mapa ?? definition.miasto}.tmj`, 'utf8'),
  ) as TiledMap;
  const settings = missionContent.balans;
  const world = new WorldModel(map, settings.silnik.kafel_m);
  const scale = world.metersPerPixel;
  const manager = new IntersectionManager(world);
  const traffic = new TrafficParticipants(
    world,
    manager,
    settings.silnik,
    undefined,
    definition.ruch_ai === false ? 'mission-only' : 'scheduled',
  );
  const events = new TrafficEvents(
    world,
    traffic,
    undefined,
    undefined,
    definition.ruch_ai !== false,
    traffic.road.agents,
  );
  const mission = new MissionSystem(
    definition,
    world,
    settings.misja.major_do_porazki,
    settings,
    definition.wyscig &&
      new MissionRace(
        definition.wyscig.trasa_rywala,
        definition,
        world,
        missionContent,
      ),
  );
  let engine = new RuleEngine(world, missionContent, manager);
  const rider: Rider = {
    x: mission.start.x / scale,
    y: mission.start.y / scale,
    heading: mission.start.heading,
    speed: 0,
    walking: false,
  };
  const player: RiderState = {
    id: 'player',
    pos: { ...mission.start },
    heading: rider.heading,
    speed: 0,
    mode: 'riding',
    signal: 'none',
    ageBand: '10to15',
    helmet: { worn: true, fastened: definition.start.kask_zapiety ?? true },
    lights: { front: false, rear: false },
    shoulderCheck: { lastLeftAt: -Infinity },
  };
  const env: EnvState = {
    time: definition.start.zmrok ? 'dusk' : 'day',
    weather: 'clear',
    visibilityLow: false,
  };
  const obstacles: Obstacle[] = map.layers.flatMap(({ name, objects }) =>
    name === 'blocks' || name === 'collisions'
      ? (objects ?? []).map((box) => ({
          ...box,
          kind:
            name === 'blocks' ||
            box.properties?.some(
              ({ name, value }) => name === 'kind' && value === 'wall',
            )
              ? 'wall'
              : 'curb',
        }))
      : [],
  );
  for (const car of world.parkedCars)
    obstacles.push({
      x: car.x / scale,
      y: car.y / scale,
      width: car.width / scale,
      height: car.height / scale,
      kind: 'wall',
    });
  const dynamic = [...traffic.road.agents, ...traffic.routed].map((agent) => ({
    agent,
    parts: createTrafficObstacles(agent, scale),
  }));
  obstacles.push(...dynamic.flatMap(({ parts }) => parts));
  const verdicts: Verdict[] = [];
  const fired: string[] = [];
  const seenAgents = new Set<string>();
  const observe = () => engine.onVerdict((verdict) => verdicts.push(verdict));
  observe();
  let resumed = false;
  let attempt = 0;
  let waited = 0;
  let collision = false;
  let prepTicks = 0;
  for (let tick = 0; tick < 90 * TICKS_PER_SECOND && !mission.result; tick++) {
    const point = route[attempt];
    if (point?.walking !== undefined && rider.speed === 0)
      rider.walking = point.walking;
    player.mode = rider.walking ? 'walking_bike' : 'riding';
    const preparing = mission.preparingBike;
    const drive =
      point && !preparing
        ? approachWaypoint(rider, point)
        : { x: 0, y: 0, brake: true, scheme: 'simple' as const };
    if (preparing) {
      if (++prepTicks === 10) player.helmet.fastened = true;
      if (prepTicks === 30) player.lights!.front = player.lights!.rear = true;
    }
    player.signal = point?.signal ?? 'none';
    if (point?.look) player.shoulderCheck!.lastLeftAt = engine.at;
    for (const { agent, parts } of dynamic)
      placeTrafficObstacles(parts, agent, scale);
    collision =
      stepRider(
        rider,
        drive,
        obstacles,
        map.width * map.tilewidth,
        map.height * map.tileheight,
      ) || collision;
    player.pos.x = rider.x * scale;
    player.pos.y = rider.y * scale;
    player.speed = rider.speed * scale;
    player.heading = rider.heading;
    events.step(player);
    env.officerOrders = events.officerOrders;
    traffic.step(env, player);
    const active = [
      ...traffic.road.agents,
      ...traffic.routed.filter(({ active }) => active),
    ];
    for (const { id } of active) seenAgents.add(id);
    verdicts.length = 0;
    engine.step(player, active, env, events.hazards);
    const effects = mission.step(
      player.pos,
      verdicts,
      (forced, area) => events.force(forced, area, player),
      () => events.hasPendingForced,
      {
        helmet: player.helmet.fastened,
        lights: player.lights!.front && player.lights!.rear,
      },
      player.speed,
    );
    fired.push(...(effects?.events?.map(({ typ }) => typ) ?? []));
    if (effects?.respawn) {
      if (
        afterViolation &&
        !resumed &&
        verdicts.some(({ kind }) => kind === 'major')
      ) {
        resumed = true;
        route = afterViolation;
        attempt = 0;
        waited = 0;
        Object.assign(rider, {
          x: effects.respawn.x / scale,
          y: effects.respawn.y / scale,
          speed: 0,
          walking: false,
          heading: effects.respawn.heading,
        });
        engine = engine.afterCheckpoint();
        observe();
        continue;
      }
      throw new Error(
        `${id} rewound at ${rider.x.toFixed(0)},${rider.y.toFixed(0)} after ${mission.elapsedSeconds}s: ${JSON.stringify(engine.recent)}`,
      );
    }
    if (
      point &&
      !preparing &&
      drive.brake &&
      rider.speed === 0 &&
      (point.until !== 'driveway-stop' || engine.drivewayStopReady) &&
      (point.until !== 'signaled' || engine.signalReady) &&
      (point.until !== 'officer-go' || events.notice?.officerCleared) &&
      (point.until !== 'traffic-ended' ||
        (fired.length > 0 && !events.notice)) &&
      ++waited >= Math.max(1, (point.wait ?? 0) * TICKS_PER_SECOND)
    ) {
      if (point.photo) mission.photograph(player.pos, player.speed);
      attempt++;
      waited = 0;
    }
  }
  return {
    mission,
    fired,
    seenAgents,
    collision,
    rider,
    target: mission.target?.area.id,
    verdicts: engine.recent,
    attempt,
  };
}
