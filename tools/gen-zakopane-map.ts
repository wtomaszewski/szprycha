import { tiles } from '../src/render/artFrames.ts';
import {
  centre,
  height,
  mapHeight,
  microCityMap,
  north,
  south,
  tile,
  west,
  width,
} from './micro-city-map.ts';
import {
  microCityPhaseOffset,
  parallelCrossingTiming,
} from './signal-timing.ts';
import { tileTerrain } from './tile-terrain.ts';
import { zakopaneScenery } from './zakopane-scenery.ts';

const {
  map,
  rect,
  polyline,
  objectLayer,
  write,
  surface,
  markings,
  zones,
  lanes,
  signs,
  signals,
  zone,
  sign,
  paint,
  mark,
  network,
  ring,
  halfWidth,
  drawRoads,
  connectRoads,
  mainSignal,
  markRoads,
  waterCollisions,
} = microCityMap({
  market: 'pod-krupowkami',
  avenue: 'przy-dworcu',
  westSouth: 'pod-reglami',
  centralSouth: 'pod-lasem',
  eastSouth: 'u-podnoza',
});

for (const [x, top, end] of [
  [0, 1696, 640],
  [640, 1728, 1216],
  [1216, 1760, 1536],
  [1536, 1728, 1984],
  [1984, 1696, 2304],
] as const)
  paint(x, top, end - x, 96, 'water');
drawRoads();

zone('krupowki', 1248, 608, 960, 192, 'pedestrian_zone', 'cobble');
zone('dojazd-do-krupowek', 1248, 800, 960, 128, 'shared_path', 'sidewalk');
sign('B-1', 'krupowki', 'W', 1250, 736);
sign('B-1', 'krupowki', 'E', 2206, 736, { displayOnly: true });
sign('B-1', 'krupowki', 'S', 1580, 804, { displayOnly: true });
sign('C-13/C-16', 'dojazd-do-krupowek', 'W', 1250, 907);

zone('sciezka-nad-potokiem', 1248, 1536, 1056, 96, 'shared_path', 'sidewalk');
zone('mostek-zachodni', 1568, 1632, 96, 416, 'shared_path', 'sidewalk');
zone('mostek-wschodni', 1888, 1632, 96, 416, 'shared_path', 'sidewalk');
zone('droga-za-potokiem', 1248, 2048, 1056, 96, 'shared_path', 'sidewalk');
sign('C-13/C-16', 'sciezka-nad-potokiem', 'W', 1272, 1531);
sign('C-13/C-16', 'droga-za-potokiem', 'E', 2280, 2149);
zone('alejka-lesna', 1536, 2144, 96, 288, 'no_bikes', 'sidewalk');
sign('B-9', 'alejka-lesna', 'N', 1528, 2156);

zone('parking-wyjazd', 3200, 1088, 96, 384, 'roadway', 'asphalt');
zone('parking-kontrapas', 3264, 1152, 32, 320, 'bike_lane', 'bike', {
  direction: 'S',
});
sign('B-2', 'parking-wyjazd', 'N', 3192, 1150, { exceptBicycles: true });
sign('P-23', 'parking-kontrapas', 'N', 3280, 1192);
sign('D-46', 'parking-wyjazd', 'S', 3302, 1152);
sign('D-47', 'parking-wyjazd', 'N', 3190, 1228);

zone('ddr-nad-potokiem-polnoc', 1888, 928, 96, 96, 'bike_path', 'bike');
zone('ddr-nad-potokiem-poludnie', 1888, 1152, 96, 384, 'bike_path', 'bike');
sign('C-13', 'ddr-nad-potokiem-polnoc', 'N', 1878, 942);
sign('D-6a', 'przy-dworcu-W', 'W', 1878, 1162);
zone('ddr-polnoc', 2752, 0, 64, north - 64, 'bike_path', 'bike');
zone(
  'ddr-srodek',
  2752,
  north + 64,
  64,
  south - north - 128,
  'bike_path',
  'bike',
);
zone(
  'ddr-poludnie',
  2752,
  south + 64,
  64,
  mapHeight - south - 64,
  'bike_path',
  'bike',
);
sign('C-13', 'ddr-polnoc', 'N', 2823, 658);
sign('C-13', 'ddr-poludnie', 'S', 2745, 2610);
for (const [side, x, direction] of [
  ['e', west + 64, 'N'],
  ['w', west - 96, 'S'],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
    direction,
  });

const railY = 3104;
zone('tor-kolejowy', 448, railY, 1152, 32, 'rail', 'gravel');
connectRoads();
sign('A-9', 'pod-reglami-S', 'S', 1100, 3216);
sign('D-17', 'przy-dworcu-N', 'N', 2459, 745);
sign('D-6a', 'przy-dworcu-E', 'E', 2866, 1010);
const tram = 'tramwaj-szkoleniowy';
const tramPoints = [
  [centre, 0],
  [centre, 896],
  [centre, north - 64],
  [centre, north + 64],
  [centre, 1536],
  [centre, south - 64],
  [centre, south + 64],
  [centre, mapHeight],
] as const;
for (const [junction, start, end, priorityClass] of [
  ['przy-dworcu', 0, 3, 'signal'],
  ['pod-lasem', 3, 6, 'main'],
] as const)
  lanes.push(
    polyline(`${junction}-tram-N`, tramPoints.slice(start, end), {
      type: 'tram',
      intersection: junction,
      side: 'N',
      width_px: 48,
      speedLimit: 30,
      priorityClass,
    }),
  );
mainSignal('przy-dworcu-tram-N', centre + 16, north - 70, 'ns');

markRoads();
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);

const scenery = zakopaneScenery(map);
scenery.collisions.push(
  ...waterCollisions('potok'),
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, { kind: 'wall' }),
);
objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer(
  'intersections',
  network.map(({ id, x, y, kind }) =>
    rect(id, x - halfWidth(x), y - 64, 2 * halfWidth(x), 128, { kind }),
  ),
);
objectLayer('crossings', [
  rect('las-przejazd', 2752, south - 64, 64, 128, {
    axis: 'y',
    kind: 'bike',
  }),
  rect('przejazd-nad-potokiem', 1888, 1024, 96, 128, {
    axis: 'y',
    kind: 'bike',
  }),
  rect('dworzec-przejazd', 2752, 1024, 64, 128, {
    axis: 'y',
    kind: 'bike',
    trafficGroup: 'dworzec-rower-pieszy',
  }),
  rect('dworzec-zebra', 2816, 1024, 32, 128, {
    axis: 'y',
    kind: 'pedestrian',
    trafficGroup: 'dworzec-rower-pieszy',
  }),
  rect('kolej-przejazd', 928, railY - 8, 192, 48, {
    kind: 'rail',
    axis: 'y',
    barriers: true,
    open_s: 23,
    lowering_s: 3,
    closed_s: 6,
    raising_s: 2,
    train_from_x: 448,
    train_to_x: 1600,
  }),
]);
objectLayer('crossing_signals', [
  rect('dworzec-s6', 2742, 1008, 0, 0, {
    crossing: 'dworzec-przejazd',
    stopRoadTraffic: true,
    ...parallelCrossingTiming(microCityPhaseOffset),
    twoWay: true,
  }),
  rect('dworzec-s5', 2856, 1008, 0, 0, {
    crossing: 'dworzec-zebra',
    ...parallelCrossingTiming(microCityPhaseOffset),
    twoWay: true,
  }),
]);
objectLayer('traffic_routes', [
  polyline(tram, tramPoints, {
    kind: 'tram',
    speed: 7,
    repeat_s: 8,
    start_s: 1,
  }),
  polyline(
    'pasazer-do-tramwaju',
    [
      [2448, 896],
      [2590, 896],
    ],
    {
      kind: 'passenger',
      speed: 1.5,
    },
  ),
  polyline(
    'spacer-po-deptaku',
    [
      [1312, 759],
      [1576, 753],
      [2100, 746],
    ],
    {
      kind: 'pedestrian',
      speed: 1.3,
    },
  ),
  polyline(
    'spacer-nad-potokiem',
    [
      [1280, 1570],
      [1619, 1570],
      [1619, 1980],
    ],
    {
      kind: 'pedestrian',
      speed: 1.25,
    },
  ),
  polyline(
    'rower-do-dworca',
    [
      [2784, 0],
      [2784, mapHeight],
    ],
    {
      kind: 'cyclist',
      speed: 3.4,
    },
  ),
]);
objectLayer('traffic_controls', [
  rect('przystanek-bez-wysepki', 2444, 872, 112, 52, {
    kind: 'stop',
    route: tram,
    vertex: 1,
    passenger: 'pasazer-do-tramwaju',
  }),
  rect('tramwaj-dworzec', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'przy-dworcu-tram-N',
    vertex: 2,
    exit: 3,
  }),
  rect('tramwaj-pod-lasem', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'pod-lasem-tram-N',
    vertex: 5,
    exit: 6,
  }),
]);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, {
    road_radius: 224,
    corner_radius: 46,
  }),
]);
objectLayer('driveways', [
  rect('parking-wyjazd', 3200, 1120, 96, 160, { direction: 'N' }),
]);
objectLayer('road_grades', [
  rect('zjazd-spod-regli', 3936, 1376, 128, 864, {
    downhill: 'S',
    grade: 0.12,
    sight_m: 6,
    fog_sight_m: 4,
  }),
]);
objectLayer('spawns', [rect('player', 1456, 829, 0, 0, { heading: 0 })]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);

await write(
  'zakopane',
  8,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90, freeRideOnly: true },
  'compact',
);
