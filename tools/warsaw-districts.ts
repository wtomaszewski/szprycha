import {
  roadSignalTiming,
  sideArrowTiming,
  parallelCrossingTiming,
  transversePedestrianTiming,
  startOnRed,
} from './signal-timing.ts';
import { tiles } from '../src/render/artFrames.ts';
import type { Side } from '../src/rules/world/WorldModel.ts';
import type { tiledMap } from './tiled-map.ts';
import type { Surface } from './tile-terrain.ts';

type MapObjects = Pick<ReturnType<typeof tiledMap>, 'rect' | 'polyline'>;
type Point = [number, number];

export const palace = {
  id: 'pod-palacem',
  x: 3456,
  y: 1920,
  kind: 'signals',
} as const;
export const mokotow = {
  id: 'mokotow-stacja',
  x: 3456,
  y: 2880,
  kind: 'priority',
} as const;
const westBank = 2816;
const oldTownEnd = 1184;
const parkNorth = 2688;
export const duskAt = 90;

export function newWarsawDistricts(
  { rect, polyline }: MapObjects,
  mapWidth: number,
  mapHeight: number,
) {
  const zones = [
    rect('road-aleja-centrum', 3200, 1792, mapWidth - 3200, 256, {
      kind: 'roadway',
    }),
    rect('road-zakret-bulwary', 2976, 1824, 320, 320, { kind: 'roadway' }),
    rect('road-bulwary', 2976, 2048, 256, mapHeight - 2048, {
      kind: 'roadway',
    }),
    rect('road-mokotow', 3456, 2816, mapWidth - 3456, 128, { kind: 'roadway' }),
    rect('chodnik-aleja-polnoc', 3200, 1728, mapWidth - 3200, 64, {
      kind: 'sidewalk',
      width_m: 3,
    }),
    rect('chodnik-aleja-poludnie', 3232, 2048, mapWidth - 3232, 64, {
      kind: 'sidewalk',
      width_m: 3,
    }),
    rect('chodnik-przy-metrze', 3520, 1536, 64, 192, { kind: 'sidewalk' }),
    rect('ddr-palac-zachod', 3200, 1792, 192, 32, { kind: 'bike_path' }),
    rect('ddr-palac-wschod', 3520, 1792, mapWidth - 3520, 32, {
      kind: 'bike_path',
    }),
    rect('pas-rowerowy-powisle', 3520, 2016, mapWidth - 3520, 32, {
      kind: 'bike_lane',
      direction: 'E',
    }),
    rect('ddr-bulwary', 2848, 1184, 64, mapHeight - 1184, {
      kind: 'bike_path',
    }),
    rect('ciag-wspolny-bulwary', 2912, 1184, 64, 928, { kind: 'shared_path' }),
    rect('ciag-dzielony-piesi', 2912, 2112, 32, mapHeight - 2112, {
      kind: 'shared_path',
      sharedSide: 'pedestrian',
    }),
    rect('ciag-dzielony-rowery', 2944, 2112, 32, mapHeight - 2112, {
      kind: 'shared_path',
      sharedSide: 'bike',
    }),
    rect('promenada-bulwary', 2816, 1184, 32, mapHeight - 1184, {
      kind: 'sidewalk',
    }),
    rect('chodnik-przy-fontannach', 3232, 2112, 64, 480, { kind: 'sidewalk' }),
    rect('ulica-z-kontraruchem', 4016, 1600, 96, 192, {
      kind: 'roadway',
      direction: 'S',
    }),
    rect('kontrapas-centrum', 4080, 1600, 32, 192, {
      kind: 'bike_lane',
      direction: 'N',
    }),
    rect('pobocze-mokotow-polnoc', 3360, 2112, 32, 704, {
      kind: 'shoulder',
      shoulderUsable: true,
    }),
    rect('pobocze-mokotow-poludnie', 3520, 2944, 32, mapHeight - 2944, {
      kind: 'shoulder',
      shoulderUsable: true,
    }),
    rect('aleja-parkowa', 3232, 2688, 64, mapHeight - 2688, {
      kind: 'park_path',
    }),
    rect('lazienki-aleja-piesza', 3296, 2816, 96, 64, { kind: 'no_bikes' }),
    rect('lazienki-ciag-wspolny', 3232, 3072, 128, 64, { kind: 'shared_path' }),
    rect('chodnik-stacja', 3520, 2944, 288, 64, { kind: 'sidewalk' }),
    rect('tor-mokotow-zapory', 3264, 2400, 704, 32, { kind: 'rail' }),
    rect('tor-mokotow-bez-zapor', 3296, 3200, 768, 32, { kind: 'rail' }),
  ];
  const crossings = [
    rect('pod-palacem-przejazd', 3392, 1792, 128, 32, {
      kind: 'bike',
      axis: 'x',
    }),
    rect('pod-palacem-zebra', 4296, 1792, 48, 256, {
      kind: 'pedestrian',
      axis: 'y',
    }),
    rect('mokotow-przejazd-z-zaporami', 3392, 2392, 128, 48, {
      kind: 'rail',
      axis: 'y',
      barriers: true,
      open_s: 19,
      lowering_s: 3,
      closed_s: 6,
      raising_s: 2,
      train_from_x: 3330,
      train_to_x: 3870,
    }),
    rect('mokotow-przejazd-bez-zapor', 3392, 3192, 160, 48, {
      kind: 'rail',
      axis: 'y',
      barriers: false,
      open_s: 23,
      lowering_s: 3,
      closed_s: 7,
      raising_s: 1,
      offset_s: 10,
      train_from_x: 3350,
      train_to_x: 3960,
    }),
  ];
  const crossingSignals = [
    rect('palac-s6-wschod', 3528, 1808, 0, 0, {
      crossing: 'pod-palacem-przejazd',
      twoWay: true,
      ...parallelCrossingTiming(startOnRed),
    }),
    rect('palac-zebra-polnoc', 4352, 1784, 0, 0, {
      crossing: 'pod-palacem-zebra',
      ...transversePedestrianTiming(startOnRed),
    }),
  ];
  const signalPhase = (side: Side) => {
    const ew = side === 'E' || side === 'W';
    return {
      group: ew ? 'palac-ew' : 'palac-ns',
      ...roadSignalTiming(ew, startOnRed),
    };
  };
  const signals = [
    rect('palac-N-s1', 3384, 1784, 0, 0, {
      code: 'S-1',
      affects: 'pod-palacem-N',
      ...signalPhase('N'),
    }),
    rect('palac-S-s1', 3528, 2056, 0, 0, {
      code: 'S-1',
      affects: 'pod-palacem-S',
      ...signalPhase('S'),
    }),
    rect('palac-E-s1', 3532, 1840, 0, 0, {
      code: 'S-1',
      affects: 'pod-palacem-E',
      ...signalPhase('E'),
    }),
    rect('palac-W-s1', 3374, 2002, 0, 0, {
      code: 'S-1',
      affects: 'pod-palacem-W',
      ...signalPhase('W'),
    }),
    rect('palac-N-s2', 3384, 1800, 0, 0, {
      code: 'S-2',
      affects: 'pod-palacem-N',
      group: 'palac-ns',
      ...sideArrowTiming,
      direction: 'right',
    }),
    rect('palac-tram-s1', 3544, 1920, 0, 0, {
      code: 'S-1',
      affects: 'pod-palacem-tram-E',
      ...signalPhase('E'),
    }),
  ];
  const tramPoints: Point[] = [
    [mapWidth, 1920],
    [4512, 1920],
    [3910, 1920],
    [3520, 1920],
    [3392, 1920],
    [3200, 1920],
    [3152, 1936],
    [3118, 1970],
    [3104, 2016],
    [3104, mapHeight],
  ];
  const lanes = [
    polyline('pod-palacem-tram-E', tramPoints.slice(0, 4), {
      type: 'tram',
      side: 'E',
      intersection: palace.id,
      width_px: 56,
      speedLimit: 35,
      priorityClass: 'signal',
    }),
  ];
  const trafficRoutes = [
    polyline('tramwaj-aleja', tramPoints, {
      kind: 'tram',
      speed: 8,
      start_s: 1,
      repeat_s: 8,
    }),
    polyline(
      'pasazer-pod-palacem',
      [
        [3910, 1896],
        [3910, 1772],
      ],
      { kind: 'passenger', speed: 1.5 },
    ),
    polyline(
      'pieszy-pod-palacem',
      [
        [4320, 1768],
        [4320, 2080],
      ],
      { kind: 'pedestrian', speed: 1.5 },
    ),
    polyline(
      'spacer-przy-fontannach',
      [
        [3260, 2152],
        [3260, 2552],
      ],
      { kind: 'pedestrian', speed: 1.25 },
    ),
    polyline(
      'rowerzysta-bulwary',
      [
        [2872, mapHeight],
        [2872, 1264],
        [2896, 1288],
        [2896, mapHeight],
      ],
      { kind: 'cyclist', speed: 2.8 },
    ),
  ];
  // This stop is before the crossing and leaves room for the full tram to
  // clear the road before the next junction. Passengers cross the car lane.
  const trafficControls = [
    rect('palac-przystanek-z-wysepka', 0, 0, 0, 0, {
      kind: 'platform',
      route: 'tramwaj-aleja',
      vertex: 1,
      dwell_s: 2.5,
    }),
    rect('tramwaj-skrzyzowanie', 0, 0, 0, 0, {
      kind: 'junction',
      route: 'tramwaj-aleja',
      lane: 'pod-palacem-tram-E',
      vertex: 3,
      exit: 4,
    }),
    rect('palac-przystanek-bez-wysepki', 3886, 1792, 48, 111, {
      kind: 'stop',
      route: 'tramwaj-aleja',
      vertex: 2,
      passenger: 'pasazer-pod-palacem',
    }),
  ];
  const signs = [
    rect('palac-znak-ddr', 3600, 1768, 0, 0, {
      code: 'C-13',
      affects: 'ddr-palac-wschod',
      facing: 'E',
    }),
    rect('palac-znak-przejazdu', 3370, 1750, 0, 0, {
      code: 'D-6a',
      affects: 'pod-palacem-N',
      facing: 'N',
    }),
    rect('palac-znak-przystanku', 3920, 1774, 0, 0, {
      code: 'D-17',
      affects: 'pod-palacem-tram-E',
      facing: 'E',
    }),
    rect('palac-znak-przystanku-wysepka', 4504, 1942, 0, 0, {
      code: 'D-17',
      affects: 'pod-palacem-tram-E',
      facing: 'E',
    }),
    rect('kontraruch-b2-t22', 4126, 1776, 0, 0, {
      code: 'B-2',
      affects: 'ulica-z-kontraruchem',
      facing: 'S',
      exceptBicycles: true,
    }),
    rect('bulwary-c13', 2842, 1230, 0, 0, {
      code: 'C-13',
      affects: 'ddr-bulwary',
      facing: 'N',
    }),
    rect('bulwary-c13-c16-wspolny', 2960, 1268, 0, 0, {
      code: 'C-13/C-16',
      affects: 'ciag-wspolny-bulwary',
      facing: 'N',
    }),
    rect('bulwary-c13-c16-dzielony', 2944, 2140, 0, 0, {
      code: 'C-13/C-16',
      affects: 'ciag-dzielony-rowery',
      facing: 'N',
    }),
    rect('lazienki-znak-zakazu', 3304, 2828, 0, 0, {
      code: 'B-9',
      affects: 'lazienki-aleja-piesza',
      facing: 'W',
    }),
    rect('lazienki-znak-ciagu', 3244, 3084, 0, 0, {
      code: 'C-13/C-16',
      affects: 'lazienki-ciag-wspolny',
      facing: 'W',
    }),
    ...(
      [
        ['z-zaporami-N', 3380, 2328, 'A-9', 'N'],
        ['z-zaporami-S', 3532, 2484, 'A-9', 'S'],
        ['bez-zapor-N', 3376, 3120, 'A-10', 'N'],
        ['bez-zapor-S', 3564, 3304, 'A-10', 'S'],
        ['slupek-N', 3380, 2352, 'G-1a', 'N'],
        ['slupek-S', 3564, 3272, 'G-1a', 'S'],
        ['krzyz-N', 3376, 3174, 'G-3', 'N'],
        ['krzyz-S', 3564, 3254, 'G-3', 'S'],
      ] as const
    ).map(([id, x, y, code, facing]) =>
      rect('mokotow-' + id, x, y, 0, 0, {
        code,
        facing,
        affects: 'mokotow-stacja-' + (y < 2880 ? 'N' : 'S'),
      }),
    ),
  ];
  const districts = [
    rect(
      'srodmiescie',
      3328,
      oldTownEnd,
      mapWidth - 3328,
      parkNorth - oldTownEnd,
    ),
    rect('powisle', westBank, 1184, 512, parkNorth - 1184),
    rect(
      'lazienki-mokotow',
      westBank,
      parkNorth,
      mapWidth - westBank,
      mapHeight - parkNorth,
    ),
  ];
  const pois = [
    rect('pod_palacem', 3296, 1772, 0, 0, { heading: 0 }),
    rect('budka_przy_metrze', 3570, 1712, 0, 0),
    rect('kwiaciarnia_centrum', 4182, 1728, 0, 0),
    rect('kiosk_centrum', 4274, 1750, 0, 0),
    rect('bulwary_noca', 2880, 1750, 0, 0, { heading: Math.PI / 2 }),
    rect('centrum_nauki', 3312, 1504, 0, 0),
    rect('lazienki_palac', 3780, 2780, 0, 0),
    rect('stacja_mokotow', 3658, 2976, 0, 0),
  ];
  const blocks = [
    ...(
      [
        [320, 4],
        [220, 10],
        [136, 18],
        [72, 26],
        [8, 33],
      ] as const
    ).map(([size, floors]) =>
      rect('pkin-' + floors, 3808 - size / 2, 1570 - size / 2, size, size, {
        height: floors,
        roof: 'stone',
        wall: 'sand',
        landmarkId: 'pkin',
      }),
    ),
    ...(
      [
        [3584, 1474],
        [3904, 1474],
      ] as const
    ).map(([x, y], i) =>
      rect('pkin-skrzydlo-' + i, x, y, 128, 192, {
        height: 3,
        roof: 'stone',
        wall: 'sand',
      }),
    ),
    ...(
      [
        ['wiezowiec-szklo', 4160, 1536, 124, 152, 18, 'felt', 'glass', ''],
        [
          'wiezowiec-iglica',
          4340,
          1432,
          104,
          152,
          25,
          'felt',
          'glass',
          'glass-spire',
        ],
        ['wiezowiec-jasny', 4560, 1600, 116, 116, 12, 'stone', 'glass', ''],
        ['rotunda', 3660, 2128, 144, 120, 3, 'felt', 'glass', 'rotunda'],
        ['metro', 3560, 1680, 54, 28, 1, 'stone', 'concrete', 'metro'],
        ['kwiaciarnia', 4144, 1688, 76, 40, 1, 'tile', 'sand', ''],
        ['kiosk', 4250, 1708, 45, 38, 1, 'copper', 'plaster', ''],
        ['kopernik', 2976, 1232, 320, 240, 3, 'felt', 'concrete', 'kopernik'],
        [
          'planetarium',
          2976,
          1510,
          84,
          84,
          2,
          'stone',
          'concrete',
          'planetarium',
        ],
        [
          'palac-na-wodzie',
          3832,
          2656,
          192,
          128,
          3,
          'stone',
          'plaster',
          'palac-na-wodzie',
        ],
        [
          'stacja-podmiejska',
          3560,
          3008,
          200,
          104,
          2,
          'tile',
          'sand',
          'stacja',
        ],
        ['pawilon-parkowy', 3576, 2660, 112, 96, 2, 'copper', 'plaster', ''],
        ['dom-mokotow-1', 3720, 2672, 118, 96, 2, 'tile', 'sand', ''],
        ['dom-mokotow-2', 4096, 2680, 118, 96, 2, 'tile', 'brick', ''],
        ['dom-mokotow-3', 4032, 2980, 124, 108, 2, 'tile', 'plaster', ''],
        ['dom-mokotow-4', 4256, 2672, 144, 96, 2, 'tile', 'sand', ''],
        ['dom-mokotow-5', 4320, 2984, 120, 96, 2, 'tile', 'brick', ''],
      ] as const
    ).map(([id, x, y, w, h, height, roof, wall, landmarkId]) =>
      rect(id, x, y, w, h, {
        height,
        roof,
        wall,
        ...(landmarkId && { landmarkId }),
      }),
    ),
  ];
  const pond = { x: 3808, y: 2624, width: 256, height: 192 };

  const props = [
    ...Array.from({ length: 19 }, (_, i) =>
      rect('latarnia-bulwary-' + i, 2838, 1248 + i * 120, 0, 0, {
        kind: 'lamp',
        turn: 3,
      }),
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      rect(
        'latarnia-aleja-' + i,
        3570 + i * 142,
        i % 2 === 0 ? 1776 : 2072,
        0,
        0,
        { kind: 'lamp' },
      ),
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      rect('drzewo-park-' + i, 3298, 2710 + i * 84, 0, 0, { kind: 'tree' }),
    ),
    ...(
      [
        ['bench', 2930, 1638],
        ['bin', 2948, 1648],
        ['bench', 2930, 2054],
        ['bench', 3284, 2230],
        ['bin', 3284, 2254],
        ['bench', 3284, 2448],
        ['shelter', 3956, 1765],
        ['shelter', 4532, 1940],
        ['lamp', 4520, 1939],
        ['tree', 3276, 1592],
        ['tree', 3660, 2158],
        ['tree', 3870, 2180],
        ['tree', 3712, 2690],
        ['tree', 4070, 2720],
        ['tree', 4180, 2790],
        ['bench', 3780, 2740],
        ['lamp', 3780, 2760],
        ['shelter', 3630, 2986],
      ] as const
    ).map(([kind, x, y]) =>
      rect('prop-' + kind + '-' + x + '-' + y, x, y, 0, 0, { kind }),
    ),
  ];
  const decorations = [
    rect('fontanna-cyjan', 3314, 2270, 0, 0, {
      kind: 'fountain',
      color: 0x73eff7,
    }),
    rect('fontanna-roz', 3314, 2366, 0, 0, {
      kind: 'fountain',
      color: 0xff77a8,
    }),
    rect('fontanna-zloto', 3314, 2462, 0, 0, {
      kind: 'fountain',
      color: 0xffcd75,
    }),
    rect('pianista-pod-wierzba', 3268, 2992, 0, 0, { kind: 'pianist' }),
    rect('paw', 3792, 2672, 0, 0, { kind: 'peacock' }),
    rect('wiewiorka', 3752, 2724, 0, 0, { kind: 'squirrel' }),
    rect('wysepka-przystanku', 4384, 1940, 0, 0, { kind: 'tram-platform' }),
    ...Array.from({ length: 6 }, (_, i) =>
      rect('schody-bulwary-' + i, 2816, 1360 + i * 190, 0, 0, {
        kind: 'river-steps',
      }),
    ),
    rect('odbicie-palacu', 3832, 2784, 192, 32, { kind: 'palace-reflection' }),
  ];
  const containsTile = (x: number, y: number, area: typeof pond) =>
    x >= area.x &&
    x < area.x + area.width &&
    y >= area.y &&
    y < area.y + area.height;
  function terrain(x: number, y: number, roadway: boolean): [Surface, number] {
    const has = (kind: string) =>
      zones.some(
        (zone) =>
          zone.properties[0]?.value === kind && containsTile(x, y, zone),
      );
    const atRoad = roadway || has('roadway');
    const center = Math.abs(x - palace.x) < 64 && Math.abs(y - palace.y) < 128;
    const parkRoad = Math.abs(y - mokotow.y) < 64 && x >= mokotow.x;
    const tracks = has('rail');
    const inPond = containsTile(x, y, pond);
    const shared = has('shared_path');
    const surface: Surface = inPond
      ? 'water'
      : atRoad
        ? 'asphalt'
        : has('shoulder') || tracks
          ? 'gravel'
          : has('bike_path') || (shared && x >= 2944 && x < 2976 && y >= 2112)
            ? 'bike'
            : has('park_path') || shared || has('no_bikes') || has('sidewalk')
              ? 'sidewalk'
              : 'grass';
    const marker = tracks
      ? tiles.rails
      : x >= 3520 && (y === 1904 || y === 1968) && (x < 4288 || x >= 4352)
        ? tiles.solidHorizontal
        : atRoad && !center && x === 3472 && !parkRoad
          ? tiles.dashVertical
          : parkRoad && x > 3520 && y === 2896
            ? tiles.dashHorizontal
            : 0;
    return [surface, marker];
  }
  return {
    zones,
    signals,
    lanes,
    signs,
    crossings,
    crossingSignals,
    trafficRoutes,
    trafficControls,
    districts,
    pois,
    blocks,
    props,
    decorations,
    terrain,
    collisions: [
      rect('staw-palacowy', pond.x, pond.y, pond.width, pond.height, {
        kind: 'wall',
      }),
    ],
  };
}
