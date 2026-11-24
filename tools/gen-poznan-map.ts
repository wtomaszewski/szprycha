import {
  parallelCrossingTiming,
  microCityPhaseOffset,
} from './signal-timing.ts';
import { tiles } from '../src/render/artFrames.ts';
import {
  centre,
  columns,
  height,
  mapHeight,
  mapWidth,
  microCityMap,
  north,
  south,
  tile,
  west,
  width,
} from './micro-city-map.ts';
import { poznanScenery } from './poznan-scenery.ts';
import { tileTerrain } from './tile-terrain.ts';

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
  market: 'rynek',
  avenue: 'aleja',
  westSouth: 'kolejowa',
  centralSouth: 'bulwary',
  eastSouth: 'ogrody',
  westSignalStopOffset: 64,
});

for (const [x, w, top, bottom] of [
  [0, 1088, 1696, 1952],
  [1088, 384, 1728, 1984],
  [1472, 544, 1728, 1888],
  [2016, 288, 1728, 2016],
  [2304, 704, 1696, 2016],
  [3008, 1056, 1664, 1984],
  [4064, 800, 1696, 1984],
] as const)
  paint(x, top, w, bottom - top, 'water');
drawRoads();

zone('stary-rynek', 1248, 384, 960, 576, 'living_zone', 'cobble');
zone('skrot-przez-pasaz', 1632, 736, 64, 96, 'living_zone', 'cobble', {
  width_m: 4,
});
sign('B-1', 'skrot-przez-pasaz', 'W', 1632, 809);
sign('D-40', 'stary-rynek', 'S', 2016, 952);
sign('D-41', 'stary-rynek', 'N', 2076, 946);

zone('dziedziniec-browaru', 2656, 1216, 1088, 448, 'living_zone', 'cobble');
zone('browar-wyjazd', 3200, 1088, 96, 384, 'roadway', 'asphalt');
zone('browar-kontrapas', 3264, 1152, 32, 320, 'bike_lane', 'bike', {
  direction: 'S',
});
sign('B-2', 'browar-wyjazd', 'N', 3192, 1150, { exceptBicycles: true });
sign('P-23', 'browar-kontrapas', 'N', 3280, 1192);
sign('D-46', 'browar-wyjazd', 'S', 3302, 1152);
sign('D-47', 'browar-wyjazd', 'N', 3190, 1228);

zone(
  'bulwar-pieszo-rowerowy',
  1248,
  1568,
  1056,
  160,
  'shared_path',
  'sidewalk',
);
zone('most-tumski', 1664, 1728, 96, 256, 'shared_path', 'sidewalk');
zone('ostrow-dojscie', 1664, 1984, 96, 192, 'shared_path', 'sidewalk');
zone('ostrow-tumski', 1376, 1888, 640, 352, 'pedestrian_zone', 'cobble');
// Keep the bridge approach on the shared path above the plaza surface.
paint(1664, 1888, 96, 288, 'sidewalk');
zone('alejka-przy-katedrze', 1504, 2240, 96, 192, 'no_bikes', 'sidewalk');
sign('C-13/C-16', 'bulwar-pieszo-rowerowy', 'W', 1280, 1566);
sign('C-13/C-16', 'most-tumski', 'N', 1654, 1700);
sign('C-13/C-16', 'ostrow-dojscie', 'S', 1774, 2168);
sign('B-9', 'alejka-przy-katedrze', 'N', 1496, 2238);
sign('B-9', 'alejka-przy-katedrze', 'S', 1608, 2424, { displayOnly: true });

for (const [start, end] of [
  [0, 960],
  [1088, 2304],
  [2560, 3936],
  [4064, mapWidth],
] as const) {
  const id = `ddr-warta-${start}`;
  zone(id, start, 2240, end - start, 64, 'bike_path', 'bike');
}
sign('C-13', 'ddr-warta-2560', 'W', 3850, 2314);
zone('aleja-ddr-polnoc', 2752, 640, 64, 384, 'bike_path', 'bike');
zone('aleja-ddr-poludnie', 2752, 1152, 64, 64, 'bike_path', 'bike');
zone('dojazd-do-sluzy', 2016, 1120, 224, 32, 'bike_lane', 'bike', {
  direction: 'E',
});
zone('sluza-rowerowa', 2240, 1088, 64, 64, 'bike_lane', 'bike', {
  direction: 'E',
});
zones.push(
  rect('wysepka-tramwajowa', 2448, 576, 27, 256, { kind: 'tram_platform' }),
);
for (const [side, x] of [
  ['e', west + 64],
  ['w', west - 96],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
  });

const railY = 3104;
zone('tor-kolejowy', 448, railY, 1152, 32, 'rail', 'gravel');
connectRoads();
sign('A-9', 'kolejowa-S', 'S', 1100, 3216);
sign('D-6', 'aleja-N', 'S', 2569, 624);
sign('D-17', 'aleja-N', 'N', 2459, 745);
sign('D-6a', 'aleja-E', 'E', 2866, 1010);
sign('D-6', 'aleja-E', 'E', 2886, 1010);

const crossings = [
  ...columns.map((x) =>
    rect(`warta-przejazd-${x}`, x - halfWidth(x), 2240, halfWidth(x) * 2, 64, {
      axis: 'x',
      kind: 'bike',
    }),
  ),
  rect('zebra-na-wysepke', 2475, 576, 85, 32, {
    axis: 'x',
    kind: 'pedestrian',
    tramPlatform: true,
  }),
  rect('aleja-przejazd', 2752, 1024, 64, 128, {
    axis: 'y',
    kind: 'bike',
    trafficGroup: 'aleja-rower-pieszy',
  }),
  rect('aleja-zebra', 2816, 1024, 32, 128, {
    axis: 'y',
    kind: 'pedestrian',
    trafficGroup: 'aleja-rower-pieszy',
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
];

const tram = 'tramwaj-warta';
const tramPoints = [
  [centre, 0],
  [centre, 720],
  [centre, north - 64],
  [centre, north + 64],
  [centre, 1440],
  [centre, south - 64],
  [centre, south + 64],
  [centre, mapHeight],
] as const;
lanes.push(
  polyline('aleja-tram-N', tramPoints.slice(0, 3), {
    type: 'tram',
    intersection: 'aleja',
    side: 'N',
    width_px: 48,
    speedLimit: 30,
    priorityClass: 'signal',
  }),
  polyline('bulwary-tram-N', tramPoints.slice(3, 6), {
    type: 'tram',
    intersection: 'bulwary',
    side: 'N',
    width_px: 48,
    speedLimit: 30,
    priorityClass: 'main',
  }),
);
mainSignal('aleja-tram-N', centre + 16, north - 70, 'ns');

markRoads();
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);

const scenery = poznanScenery(map);
scenery.collisions.push(
  ...waterCollisions('warta'),
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
objectLayer('crossings', crossings);
objectLayer('crossing_signals', [
  rect('aleja-s6', 2742, 1008, 0, 0, {
    crossing: 'aleja-przejazd',
    stopRoadTraffic: true,
    ...parallelCrossingTiming(microCityPhaseOffset),
    twoWay: true,
  }),
  rect('aleja-s5', 2856, 1008, 0, 0, {
    crossing: 'aleja-zebra',
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
    'pasazer-bez-wysepki',
    [
      [2446, 1440],
      [2588, 1440],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'pasazerka-na-wysepke',
    [
      [2610, 592],
      [2466, 592],
    ],
    {
      kind: 'pedestrian',
      speed: 1.4,
      start_s: 4,
      repeat_s: 10,
    },
  ),
  polyline(
    'spacer-po-rynku',
    [
      [1296, 714],
      [1590, 714],
      [2030, 714],
    ],
    {
      kind: 'pedestrian',
      speed: 1.35,
    },
  ),
  polyline(
    'spacer-nad-warta',
    [
      [1300, 1696],
      [1590, 1696],
      [1992, 1696],
    ],
    {
      kind: 'pedestrian',
      speed: 1.4,
    },
  ),
  polyline(
    'rower-nad-warta',
    [
      [0, 2272],
      [mapWidth, 2272],
    ],
    {
      kind: 'cyclist',
      speed: 3.4,
    },
  ),
]);
objectLayer('traffic_controls', [
  rect('peron-wysepka', 2448, 576, 27, 256, {
    kind: 'platform',
    route: tram,
    vertex: 1,
    dwell_s: 6,
  }),
  rect('przystanek-bez-wysepki', 2444, 1414, 112, 52, {
    kind: 'stop',
    route: tram,
    vertex: 4,
    passenger: 'pasazer-bez-wysepki',
  }),
  rect('tramwaj-na-alei', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'aleja-tram-N',
    vertex: 2,
    exit: 3,
  }),
  rect('tramwaj-na-bulwarach', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'bulwary-tram-N',
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
  rect('browar-wyjazd', 3200, 1120, 96, 160, { direction: 'N' }),
]);
objectLayer('spawns', [
  rect('player', 1752, 667, 0, 0, { heading: -Math.PI / 2 }),
]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);

await write(
  'poznan',
  8,
  tileTerrain(width, height, surface),
  markings,
  {
    duskAt: 90,
    freeRideOnly: true,
  },
  'compact',
);
