import type { MissionDefinition } from '../src/content/missions.ts';
import type { GameContent } from '../src/content/schemas.ts';
import {
  contains,
  type WorldModel,
  type Zone,
} from '../src/rules/world/WorldModel.ts';

const coverageModules = [
  'M01',
  'M02',
  'M03',
  'M04',
  'M05',
  'M06',
  'M07',
] as const;
type Rule = Pick<GameContent['przepisy']['przepisy'][number], 'id' | 'modul'>;

const zoneRules: Partial<Record<Zone['kind'], readonly string[]>> = {
  bike_path: ['GDZIE-01'],
  bike_lane: ['GDZIE-02'],
  shared_path: ['GDZIE-11'],
  living_zone: ['GDZIE-07'],
  no_bikes: ['GDZIE-09'],
  sidewalk: ['GDZIE-04'],
};

const signRules: Readonly<Partial<Record<string, string>>> = {
  'A-7': 'ZNAK-A7',
  'B-1': 'ZNAK-B1',
  'B-2': 'ZNAK-B2T22',
  'B-9': 'ZNAK-B9',
  'B-20': 'ZNAK-STOP',
  'C-13': 'ZNAK-C13',
  'D-1': 'ZNAK-D1',
};

const nightRules = ['MSC-04', 'WYP-04', 'WYP-05', 'WYP-06'];

function mapFeatures(world?: WorldModel) {
  const signs = world?.signs.filter(({ displayOnly }) => !displayOnly) ?? [];
  const junctions = world?.intersections ?? [];
  const lanes = world?.lanes ?? [];
  const crossings = world?.crossings ?? [];
  const routes = world?.trafficRoutes ?? [];
  const zones = (kind: Zone['kind']) =>
    world?.zones.filter((zone) => zone.kind === kind).map(({ id }) => id) ?? [];
  const junctionIds = (kind: (typeof junctions)[number]['kind']) =>
    junctions.filter((junction) => junction.kind === kind).map(({ id }) => id);
  const bikeCrossings = crossings.filter(
    ({ kind }) => kind === 'bike' || kind === 'combined',
  );
  const priority = junctions.filter(({ kind }) => kind === 'priority');
  const mainRoads = priority.filter(({ lanes }) =>
    lanes.some(
      (lane) =>
        lane.priorityClass === 'main' &&
        signs.some(
          ({ code, affects }) => code === 'D-1' && affects === lane.id,
        ),
    ),
  );
  const priorityWithStop = mainRoads
    .filter(({ lanes }) =>
      lanes.some(
        ({ priorityClass, stopSign }) =>
          priorityClass === 'minor' && stopSign?.code === 'B-20',
      ),
    )
    .map(({ id }) => id);

  return {
    equalJunction: junctionIds('equal'),
    priorityWithStop,
    mainSignal:
      world?.signals.filter(({ code }) => code === 'S-1').map(({ id }) => id) ??
      [],
    arrow:
      world?.signals.filter(({ code }) => code === 'S-2').map(({ id }) => id) ??
      [],
    bikeSignal: bikeCrossings
      .filter(({ signal }) => signal)
      .map(({ id }) => id),
    roundabout: junctionIds('roundabout'),
    tram: routes.filter(({ kind }) => kind === 'tram').map(({ id }) => id),
    tramStop: world?.tramStops.map(({ id }) => id) ?? [],
    bikePath: zones('bike_path'),
    bikeLane: zones('bike_lane'),
    sharedPath: zones('shared_path'),
    bikeCrossing: bikeCrossings.map(({ id }) => id),
    calmZone: [...zones('living_zone'), ...zones('pedestrian_zone')],
    internalRoadExit: signs
      .filter(
        ({ code, affects }) =>
          code === 'D-47' && world?.driveways.some(({ id }) => id === affects),
      )
      .map(({ affects }) => affects),
    railCrossing: crossings
      .filter(({ kind }) => kind === 'rail')
      .map(({ id }) => id),
    shoulder: zones('shoulder'),
    bikeBan: [
      ...zones('no_bikes'),
      ...signs.filter(({ code }) => code === 'B-9').map(({ id }) => id),
    ],
    contraflow: signs
      .filter(({ code, exceptBicycles }) => code === 'B-2' && exceptBicycles)
      .map(({ id }) => id),
    night: world && Number.isFinite(world.duskAt) ? ['dusk_at_s'] : [],

    signs,
    priority: priority.map(({ id }) => id),
    driveway: world?.driveways.map(({ id }) => id) ?? [],
    parkedCars: world?.parkedCars.map(({ id }) => id) ?? [],
    pedestrianCrossing: crossings
      .filter(({ kind }) => kind === 'pedestrian')
      .map(({ id }) => id),
    usableShoulder: lanes.some(
      ({ shoulder, parallelBikeInfra }) =>
        shoulder?.shoulderUsable && !parallelBikeInfra,
    ),
    turns: world?.laneGraph.movements ?? [],
    oncomingCycles: routes.some(({ cycle_body }) => cycle_body !== undefined),
    tramJunction: routes.some(
      ({ kind, junctions }) => kind === 'tram' && junctions.length > 0,
    ),
    speedHazard:
      world &&
      (world.roadGrades.length > 0 ||
        world.zones.some(({ surface }) => surface === 'rough')),
    emergencyRoute: routes.some(
      ({ kind, event_only }) => kind === 'emergency' && !event_only,
    ),
  };
}

function mapSituations(
  f: ReturnType<typeof mapFeatures>,
  missions: readonly MissionDefinition[],
) {
  return {
    equalJunction: [f.equalJunction],
    priorityWithStop: [f.priorityWithStop],
    signals: [f.mainSignal, f.arrow, f.bikeSignal],
    roundabout: [f.roundabout],
    tramStop: [f.tram, f.tramStop],
    bikeInfrastructure: [f.bikePath, f.bikeLane, f.sharedPath],
    bikeCrossing: [f.bikeCrossing],
    calmZone: [f.calmZone],
    internalRoadExit: [f.internalRoadExit],
    railCrossing: [f.railCrossing],
    shoulderAndBan: [f.shoulder, f.bikeBan],
    contraflow: [f.contraflow],
    night: [
      [
        ...f.night,
        ...missions
          .filter(({ start }) => start.zmrok || start.noc)
          .map(({ id }) => id),
      ],
    ],
  };
}

function mapRules(world: WorldModel, f: ReturnType<typeof mapFeatures>) {
  const links = [
    [f.equalJunction.length, ['PIER-01']],
    [f.priority.length, ['PIER-02']],
    [f.mainSignal.length, ['SYG-01']],
    [f.arrow.length, ['ZNAK-S2']],
    [f.bikeSignal.length, ['SYG-02']],
    [f.roundabout.length, ['PIER-08']],
    [f.tramJunction, ['PIER-09']],
    [f.tramStop.length, ['MSC-02']],
    [world.crossings.some(({ tramPlatform }) => tramPlatform), ['PIER-10']],
    [f.bikeCrossing.length, ['PIER-05']],
    [f.pedestrianCrossing.length, ['GDZIE-06']],
    [f.driveway.length, ['PIER-06', 'MSC-03']],
    [f.railCrossing.length, ['MSC-01']],
    [f.usableShoulder, ['GDZIE-03b']],
    [f.night.length, nightRules],
    [f.parkedCars.length, ['MAN-06']],
    [f.speedHazard, ['MAN-08']],
    [f.oncomingCycles, ['MAN-14']],
    [
      f.turns.some(({ maneuver }) => maneuver === 'right'),
      ['MAN-01', 'MAN-02'],
    ],
    [f.turns.some(({ maneuver }) => maneuver === 'left'), ['MAN-01', 'MAN-03']],
    [f.emergencyRoute, ['PIER-07']],
  ] as const;
  return new Set([
    ...links.flatMap(([present, ids]) => (present ? ids : [])),
    ...world.zones.flatMap(({ kind }) => zoneRules[kind] ?? []),
    ...f.signs.flatMap(({ code }) => signRules[code] ?? []),
  ]);
}

function missionRules(mission: MissionDefinition, world: WorldModel) {
  const rules = new Set(mission.reguly_cwiczone);
  const locations = new Set([mission.start.poi, ...mission.checkpointy]);
  if (mission.start.zmrok || mission.start.noc)
    for (const id of nightRules) rules.add(id);
  for (const goal of mission.cele) {
    if (goal.wymagany_nawyk) rules.add(goal.wymagany_nawyk);
    if ('poi' in goal && goal.poi) locations.add(goal.poi);
    if (goal.typ === 'wybor') rules.add(goal.regula);
    if (goal.typ === 'przygotuj_rower') {
      for (const id of ['KASK-01', 'WYP-04', 'WYP-05']) rules.add(id);
    }
    if (goal.typ === 'sfotografuj') {
      const sign = world.signs.find(({ id }) => id === goal.znak);
      const rule = sign && signRules[sign.code];
      if (rule) rules.add(rule);
    }
  }
  for (const { regula, przy } of mission.zdarzenia_wymuszone) {
    rules.add(regula);
    locations.add(przy);
  }
  if (mission.skrot) {
    const segment = mission.skrot.odcinek;
    const sign = world.signs.find(
      ({ affects, displayOnly }) => affects === segment && !displayOnly,
    );
    const rule = sign && signRules[sign.code];
    if (rule) rules.add(rule);
    locations.add(segment);
  }
  for (const id of locations) {
    const area = world.pois.get(id) ?? world.triggers.get(id);
    const zone = area
      ? world.zones.find((zone) =>
          contains(zone, {
            x: area.x + area.width / 2,
            y: area.y + area.height / 2,
          }),
        )
      : world.zones.find((zone) => zone.id === id);
    if (zone) for (const rule of zoneRules[zone.kind] ?? []) rules.add(rule);
  }
  return rules;
}

export function analyseMapCoverage(
  world: WorldModel | undefined,
  missions: readonly MissionDefinition[],
  rules: readonly Rule[],
) {
  const features = mapFeatures(world);
  const mapRuleIds = world ? mapRules(world, features) : new Set<string>();
  const missionRuleIds = new Set(
    world
      ? missions.flatMap((mission) => [...missionRules(mission, world)])
      : [],
  );
  const modules = coverageModules.map((module) => {
    const ids = rules
      .filter(({ modul }) => modul === module)
      .map(({ id }) => id)
      .sort();
    return {
      module,
      map: ids.filter((id) => mapRuleIds.has(id)),
      missions: ids.filter((id) => missionRuleIds.has(id)),
    };
  });
  return {
    situations: mapSituations(features, world ? missions : []),
    modules,
  };
}
