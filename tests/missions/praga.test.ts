import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { readContent } from '../../tools/content';
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
  type AgentState,
  type EnvState,
  type RiderState,
  type Verdict,
} from '../../src/rules/types';
import { WorldModel } from '../../src/rules/world/WorldModel';
import {
  TrafficParticipants,
  actorRadiusPx,
} from '../../src/sim/TrafficParticipants';
import {
  approachWaypoint,
  pragaRoutes,
  type PragaMissionId,
  type Waypoint,
} from './praga-routes';

const content = await readContent();

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

function runRoute(id: PragaMissionId, trial: 'legal' | 'shortcut') {
  const definition = content.misje.find((mission) => mission.id === id)!;
  const map = JSON.parse(
    readFileSync(`maps/${definition.mapa ?? definition.miasto}.tmj`, 'utf8'),
  ) as TiledMap;
  const settings = content.balans;
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
  );
  const engine = new RuleEngine(world, settings, manager);
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
  const verdicts: Verdict[] = [];
  const fired: string[] = [];
  const seenAgents = new Set<string>();
  engine.onVerdict((verdict) => verdicts.push(verdict));
  let attempt = 0;
  let waited = 0;
  let collision = false;
  let prepTicks = 0;
  const route: Waypoint[] = pragaRoutes[id][trial];
  for (let tick = 0; tick < 90 * TICKS_PER_SECOND && !mission.result; tick++) {
    const point = route[attempt];
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
    const agents: AgentState[] = [
      ...traffic.road.agents,
      ...traffic.routed.filter(({ active }) => active),
    ];
    collision =
      stepRider(
        rider,
        drive,
        [
          ...obstacles,
          ...agents.map(({ pos, kind }) => {
            const radius = actorRadiusPx[kind];
            return {
              x: pos.x / scale - radius,
              y: pos.y / scale - radius,
              width: radius * 2,
              height: radius * 2,
              kind: 'wall' as const,
            };
          }),
        ],
        map.width * map.tilewidth,
        map.height * map.tileheight,
      ) || collision;
    player.pos.x = rider.x * scale;
    player.pos.y = rider.y * scale;
    player.speed = rider.speed * scale;
    player.heading = rider.heading;
    events.step(player);
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
    );
    fired.push(...(effects?.events?.map(({ typ }) => typ) ?? []));
    if (effects?.respawn) {
      throw new Error(
        `${id} ${trial} rewound at ${rider.x.toFixed(0)},${rider.y.toFixed(0)} after ${mission.elapsedSeconds}s: ${JSON.stringify(engine.recent)}`,
      );
    }
    if (
      point &&
      !preparing &&
      drive.brake &&
      rider.speed === 0 &&
      ++waited >= Math.max(1, (point.wait ?? 0) * TICKS_PER_SECOND)
    ) {
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

it.each(Object.keys(pragaRoutes) as PragaMissionId[])(
  '%s finishes cleanly and rejects its faster illegal route',
  (id) => {
    const legal = runRoute(id, 'legal');
    const shortcut = runRoute(id, 'shortcut');
    expect(
      legal.mission.result,
      JSON.stringify({
        ...legal,
        mission: undefined,
        seenAgents: [...legal.seenAgents],
      }),
    ).toMatchObject({ status: 'completed', timeBonusEligible: true });
    expect(
      legal.mission.result?.verdicts.map(({ kind }) => kind),
    ).not.toContain('major');
    const habits: Record<PragaMissionId, string[]> = {
      'WAW-T-02': ['MSC-04'],
      'WAW-A1-01': ['PIER-01'],
      'WAW-A1-02': ['MSC-03', 'MAN-01', 'MAN-07'],
      'WAW-A1-03': ['ZNAK-STOP'],
    };
    expect(legal.mission.result?.verdicts).toEqual(
      expect.arrayContaining(
        habits[id].map((ruleId) =>
          expect.objectContaining({ ruleId, kind: 'good' }),
        ),
      ),
    );
    expect(legal.mission.result!.elapsedSeconds).toBeLessThan(
      legal.mission.definition.par_s,
    );
    expect(legal.collision).toBe(false);
    expect(legal.fired).toEqual(
      legal.mission.definition.zdarzenia_wymuszone.map(({ typ }) => typ),
    );
    expect(
      shortcut.mission.result,
      JSON.stringify({ ...shortcut, mission: undefined }),
    ).toMatchObject({
      status: 'failed',
      reason: 'skrot',
      timeBonusEligible: false,
      verdicts: expect.arrayContaining([
        expect.objectContaining({ ruleId: 'ZNAK-B1' }),
      ]),
    });
    expect(shortcut.mission.result!.elapsedSeconds).toBeLessThan(
      legal.mission.result!.elapsedSeconds,
    );
    const agent = {
      'WAW-A1-01': 'auto-z-prawej',
      'WAW-A1-02': 'pieszy-brama',
      'WAW-A1-03': 'auto-na-glownej',
      'WAW-T-02': undefined,
    }[id];
    if (agent) expect(legal.seenAgents).toContain(agent);
  },
);
