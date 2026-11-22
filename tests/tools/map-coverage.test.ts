import { describe, expect, it } from 'vitest';
import { missionSchema } from '../../src/content/missions.ts';
import { WorldModel } from '../../src/rules/world/WorldModel.ts';
import { analyseMapCoverage } from '../../tools/map-coverage.ts';
import { tiledMap } from '../../tools/tiled-map.ts';

function fixture() {
  const { rect, polyline } = tiledMap(10, 10);
  const layers = {
    intersections: [
      rect('equal', 0, 0, 32, 32, { kind: 'equal' }),
      rect('priority', 64, 64, 32, 32, { kind: 'priority' }),
      rect('lights', 160, 96, 32, 32, { kind: 'signals' }),
      rect('roundabout', 248, 248, 32, 32, { kind: 'roundabout' }),
    ],
    lanes: [
      polyline(
        'main',
        [
          [0, 72],
          [64, 72],
        ],
        {
          intersection: 'priority',
          side: 'W',
          priorityClass: 'main',
          type: 'car',
          width_px: 16,
          speedLimit: 30,
          turns: 'straight',
        },
      ),
      polyline(
        'minor',
        [
          [80, 0],
          [80, 64],
        ],
        {
          intersection: 'priority',
          side: 'N',
          priorityClass: 'minor',
          type: 'car',
          width_px: 16,
          speedLimit: 30,
          turns: 'straight',
        },
      ),
      polyline(
        'signal-inlet',
        [
          [176, 0],
          [176, 96],
        ],
        {
          intersection: 'lights',
          side: 'N',
          priorityClass: 'signal',
          type: 'car',
          width_px: 16,
          speedLimit: 30,
          turns: 'right',
        },
      ),
      polyline(
        'main-exit',
        [
          [96, 72],
          [320, 72],
        ],
        {
          intersection: 'priority',
          side: 'E',
          role: 'exit',
          speedLimit: 30,
        },
      ),
      polyline(
        'minor-exit',
        [
          [80, 96],
          [80, 320],
        ],
        {
          intersection: 'priority',
          side: 'S',
          role: 'exit',
          speedLimit: 30,
        },
      ),
      polyline(
        'signal-exit',
        [
          [160, 112],
          [0, 112],
        ],
        {
          intersection: 'lights',
          side: 'W',
          role: 'exit',
          speedLimit: 30,
        },
      ),
    ],
    signs: [
      rect('D-1', 64, 72, 0, 0, { code: 'D-1', affects: 'main', facing: 'W' }),
      rect('B-20', 80, 64, 0, 0, {
        code: 'B-20',
        affects: 'minor',
        facing: 'N',
      }),
      rect('D-47', 136, 40, 0, 0, {
        code: 'D-47',
        affects: 'driveway',
        facing: 'N',
      }),
      rect('B-2/T-22', 180, 40, 0, 0, {
        code: 'B-2',
        affects: 'bike-lane',
        facing: 'N',
        exceptBicycles: true,
      }),
      rect('display-only-B-9', 200, 40, 0, 0, {
        code: 'B-9',
        affects: 'sidewalk',
        facing: 'N',
        displayOnly: true,
      }),
    ],
    signals: [
      rect('S-1', 176, 96, 0, 0, {
        code: 'S-1',
        affects: 'signal-inlet',
        group: 'g',
        offset_s: 0,
        cycle_s: 20,
        green_s: 8,
        yellow_s: 2,
      }),
      rect('S-2', 176, 96, 0, 0, {
        code: 'S-2',
        affects: 'signal-inlet',
        group: 'g',
        from_s: 10,
        until_s: 15,
        direction: 'right',
      }),
    ],
    crossings: [
      rect('bike-crossing', 152, 128, 16, 24, { kind: 'bike', axis: 'y' }),
      rect('zebra', 176, 128, 16, 24, { kind: 'pedestrian', axis: 'y' }),
      rect('rail-crossing', 232, 176, 16, 24, { kind: 'rail', axis: 'y' }),
    ],
    crossing_signals: [
      rect('bike-signal', 152, 128, 0, 0, {
        crossing: 'bike-crossing',
        offset_s: 0,
        cycle_s: 20,
        green_s: 8,
      }),
      rect('pedestrian-signal', 176, 128, 0, 0, {
        crossing: 'zebra',
        offset_s: 0,
        cycle_s: 20,
        green_s: 8,
      }),
    ],
    zones: [
      rect('bike-path', 8, 140, 32, 16, { kind: 'bike_path' }),
      rect('bike-lane', 48, 140, 32, 16, { kind: 'bike_lane' }),
      rect('shared-path', 88, 140, 32, 16, { kind: 'shared_path' }),
      rect('living-zone', 128, 176, 32, 16, { kind: 'living_zone' }),
      rect('shoulder', 168, 176, 32, 16, { kind: 'shoulder' }),
      rect('no-bikes', 208, 176, 16, 16, { kind: 'no_bikes' }),
      rect('sidewalk', 64, 256, 64, 24, { kind: 'sidewalk' }),
    ],
    driveways: [rect('driveway', 136, 40, 16, 16, { direction: 'S' })],
    traffic_routes: [
      polyline(
        'tram',
        [
          [0, 224],
          [96, 224],
          [320, 224],
        ],
        {
          kind: 'tram',
          speed: 8,
          repeat_s: 20,
        },
      ),
      polyline(
        'passenger',
        [
          [96, 224],
          [96, 265],
        ],
        { kind: 'passenger', speed: 2 },
      ),
    ],
    traffic_controls: [
      rect('stop', 88, 216, 20, 25, {
        kind: 'stop',
        route: 'tram',
        vertex: 1,
        passenger: 'passenger',
      }),
    ],
    pois: [rect('start', 8, 8, 0, 0), rect('goal', 100, 148, 0, 0)],
  };
  const properties = [{ name: 'dusk_at_s', value: 90 }];
  return {
    layers,
    properties,
    read(omitted: readonly string[] = []) {
      return new WorldModel(
        {
          width: 10,
          height: 10,
          tilewidth: 32,
          tileheight: 32,
          properties,
          layers: Object.entries(layers).map(([name, objects]) => ({
            name,
            objects: objects.filter((object) => !omitted.includes(object.name)),
          })),
        },
        1.5,
      );
    },
  };
}

type Situation = keyof ReturnType<typeof analyseMapCoverage>['situations'];

const without: Record<Situation, string[]> = {
  equalJunction: ['equal'],
  priorityWithStop: ['B-20'],
  signals: ['bike-signal'],
  roundabout: ['roundabout'],
  tramStop: ['stop', 'passenger'],
  bikeInfrastructure: ['shared-path'],
  bikeCrossing: ['bike-signal', 'bike-crossing'],
  calmZone: ['living-zone'],
  internalRoadExit: ['D-47'],
  railCrossing: ['rail-crossing'],
  shoulderAndBan: ['no-bikes'],
  contraflow: [],
  night: [],
};

describe('road situations from a Tiled map', () => {
  const complete = analyseMapCoverage(fixture().read(), [], []).situations;
  const cases = Object.entries(without) as [Situation, string[]][];
  it.each(cases)(
    'detects %s only when all required features are present',
    (situation, removed) => {
      expect(complete[situation].every((part) => part.length > 0)).toBe(true);
      const map = fixture();
      if (situation === 'night') map.properties.length = 0;
      if (situation === 'contraflow') {
        const exception = map.layers.signs
          .find(({ name }) => name === 'B-2/T-22')
          ?.properties.find(({ name }) => name === 'exceptBicycles');
        expect(exception).toBeDefined();
        exception!.value = false;
      }
      const { situations } = analyseMapCoverage(map.read(removed), [], []);
      expect(situations[situation].some((part) => part.length === 0)).toBe(
        true,
      );
    },
  );
});

it('uses mission goals, forced events and target zones, and groups rules by the catalog module', () => {
  const map = fixture();
  map.properties.length = 0;
  const mission = missionSchema.parse({
    id: 'WAW-T-01',
    miasto: 'warszawa',
    mapa: 'miasteczko',
    akt: 0,
    tytul: 'misje.fixture.tytul',
    zleceniodawca: 'ola',
    typ: 'samouczek',
    start: { poi: 'start', zmrok: true },
    cele: [{ typ: 'dojedz', poi: 'goal', wymagany_nawyk: 'ZNAK-STOP' }],
    reguly_cwiczone: ['KASK-01'],
    zdarzenia_wymuszone: [
      { typ: 'polecenie_oli', przy: 'goal', regula: 'SYG-03' },
    ],
    par_s: 20,
    min_dobre_nawyki: 1,
    nagrody: { zetony: 0, xp: 0 },
  });
  const { modules, situations } = analyseMapCoverage(
    map.read(),
    [mission],
    [
      { id: 'KASK-01', modul: 'M01' },
      { id: 'WYP-04', modul: 'M01' },
      { id: 'GDZIE-11', modul: 'M02' },
      { id: 'SYG-03', modul: 'M03' },
      { id: 'ZNAK-STOP', modul: 'M03' },
      { id: 'ZNAK-B9', modul: 'M03' },
      { id: 'PIER-08', modul: 'M04' },
      { id: 'MSC-04', modul: 'M06' },
      { id: 'PLAC-01', modul: 'M08' },
    ],
  );
  expect(situations.night).toEqual([['WAW-T-01']]);
  expect(modules).toEqual([
    { module: 'M01', map: [], missions: ['KASK-01', 'WYP-04'] },
    { module: 'M02', map: ['GDZIE-11'], missions: ['GDZIE-11'] },
    { module: 'M03', map: ['ZNAK-STOP'], missions: ['SYG-03', 'ZNAK-STOP'] },
    { module: 'M04', map: ['PIER-08'], missions: [] },
    { module: 'M05', map: [], missions: [] },
    { module: 'M06', map: [], missions: ['MSC-04'] },
    { module: 'M07', map: [], missions: [] },
  ]);
});
