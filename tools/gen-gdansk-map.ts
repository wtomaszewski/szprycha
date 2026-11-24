import {
  parallelCrossingTiming,
  microCityPhaseOffset,
} from './signal-timing.ts';
import { tiles } from '../src/render/artFrames.ts';
import { gdanskScenery } from './gdansk-scenery.ts';
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
  market: 'targ',
  avenue: 'aleja',
  westSouth: 'olowianka',
  centralSouth: 'nabrzeze',
  eastSouth: 'brzezno',
});

// A compressed Motława and bay frame the training districts and their bridges.
for (const [x, w, top, bottom] of [
  [0, 1152, 1728, 1952],
  [1152, 384, 1760, 2048],
  [1536, 768, 1792, 2112],
  [2304, 864, 1760, 2112],
  [3168, 768, 1728, 2048],
  [3936, 928, 1696, 2080],
  [2624, 480, 3392, mapHeight],
  [3104, 448, 3328, mapHeight],
  [3552, 384, 3264, mapHeight],
] as const)
  paint(x, top, w, bottom - top, 'water');
drawRoads();

zone('dlugi-targ', 1248, 384, 928, 384, 'pedestrian_zone', 'cobble');
zone('targ-dojscie', 1248, 768, 928, 192, 'living_zone', 'cobble');
zone('skrot-przez-targ', 1664, 800, 64, 128, 'living_zone', 'cobble');
zone('zuraw-nabrzeze', 1248, 1408, 992, 384, 'pedestrian_zone', 'sidewalk');
zone('zuraw-dojscie', 1632, 1216, 160, 192, 'sidewalk', 'sidewalk');
zone('olowianka-brzeg', 1344, 2112, 896, 256, 'sidewalk', 'cobble');
zone('olowianka-dojscie', 1664, 2368, 96, 64, 'sidewalk', 'sidewalk');
zone('kladka-zuraw', 1664, 1792, 96, 320, 'no_bikes', 'sidewalk');
zone('stocznia-nabrzeze', 2656, 1280, 1088, 448, 'living_zone', 'cobble');
zone('skrot-miedzy-halami', 3456, 1504, 64, 128, 'living_zone', 'cobble');
zone('stocznia-wjazd', 3136, 1216, 128, 416, 'roadway', 'asphalt', {
  direction: 'S',
});
zone('stocznia-kontrapas', 3232, 1216, 32, 416, 'bike_lane', 'bike', {
  direction: 'N',
});
zone('stocznia-dojscie', 3392, 1728, 96, 64, 'shared_path', 'sidewalk');
zone('kladka-stocznia', 3392, 1792, 96, 256, 'shared_path', 'sidewalk');
zone('stocznia-drugi-brzeg', 3264, 2048, 448, 128, 'shared_path', 'sidewalk');

for (const [start, end] of [
  [0, 960],
  [1088, 2304],
  [2560, 3936],
  [4064, mapWidth],
] as const)
  zone(
    `ddr-motlawa-${start}`,
    start,
    2112,
    end - start,
    64,
    'bike_path',
    'bike',
  );

zone('aleja-ddr-polnoc', 2752, 640, 64, 384, 'bike_path', 'bike');
zone('aleja-ddr-poludnie', 2752, 1152, 64, 128, 'bike_path', 'bike');
zone('promenada', 2624, 2816, 1216, 96, 'shared_path', 'sidewalk');
zone('promenada-zachod', 2624, 2560, 96, 256, 'shared_path', 'sidewalk');
zone('promenada-wschod', 3744, 2560, 96, 256, 'shared_path', 'sidewalk');
// The service road is separate from the signed shared path.
zone('droga-nadmorska', 2656, 2976, 1152, 96, 'roadway', 'asphalt', {
  direction: 'E',
  surface: 'rough',
});
zone('nadmorskie-dojscie', 2624, 2912, 96, 160, 'park_path', 'sidewalk');
zone('nadmorskie-wyjscie', 3712, 2912, 128, 160, 'park_path', 'sidewalk');
zone('skrot-przez-wydmy', 2944, 2912, 64, 64, 'park_path', 'gravel');
paint(2624, 3072, 1312, 192, 'sand');
paint(2624, 3264, 928, 64, 'sand');
paint(2624, 3328, 480, 64, 'sand');
zone('plaza-wejscie', 3392, 3072, 96, 160, 'park_path', 'sidewalk');
zone('brzezno-dojscie', 3648, 2560, 96, 256, 'sidewalk', 'sidewalk');

for (const [side, x] of [
  ['e', west + 64],
  ['w', west - 96],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
  });
zone('wyjazd-magazyn', 736, 1088, 96, 192, 'roadway', 'gravel');

sign('D-40', 'targ-dojscie', 'S', 1688, 954);
sign('D-41', 'targ-dojscie', 'N', 1796, 951);
sign('B-1', 'skrot-przez-targ', 'E', 1664, 894);
sign('B-1', 'skrot-przez-targ', 'W', 1728, 837, { displayOnly: true });
sign('B-9', 'kladka-zuraw', 'N', 1658, 1792);
sign('B-9', 'kladka-zuraw', 'S', 1768, 2112, { displayOnly: true });
sign('B-2', 'stocznia-wjazd', 'S', 3274, 1628, { exceptBicycles: true });
sign('P-23', 'stocznia-kontrapas', 'S', 3250, 1574);
sign('B-1', 'skrot-miedzy-halami', 'E', 3456, 1597);
sign('B-1', 'skrot-miedzy-halami', 'W', 3520, 1539, { displayOnly: true });
sign('C-13', 'aleja-ddr-poludnie', 'S', 2744, 1262);
sign('C-13', 'aleja-ddr-polnoc', 'N', 2826, 742);
sign('C-13/C-16', 'promenada', 'W', 2738, 2909);
sign('C-13/C-16', 'promenada-zachod', 'N', 2618, 2640);
sign('C-13/C-16', 'promenada-wschod', 'N', 3848, 2640);
sign('C-13/C-16', 'kladka-stocznia', 'N', 3388, 1792);
sign('C-13/C-16', 'kladka-stocznia', 'S', 3496, 2048);
sign('B-1', 'skrot-przez-wydmy', 'N', 2939, 2912);
sign('B-1', 'skrot-przez-wydmy', 'S', 3014, 2982, { displayOnly: true });
sign('D-46', 'wyjazd-magazyn', 'N', 833, 1248);
sign('D-47', 'wyjazd-magazyn', 'S', 735, 1216);
sign('A-9', 'olowianka-S', 'S', 1088, 3220);
connectRoads();

const railY = 3104;
zone('tor-towarowy', 448, railY, 1152, 32, 'rail', 'gravel');
const crossings = [
  ...columns.map((x) =>
    rect(
      `motlawa-przejazd-${x}`,
      x - halfWidth(x),
      2112,
      2 * halfWidth(x),
      64,
      { axis: 'x', kind: 'bike' },
    ),
  ),
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
  rect('olowianka-kolej', 928, railY - 8, 192, 48, {
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
sign('D-6a', 'aleja-E', 'E', 2866, 1010);
sign('D-6', 'aleja-E', 'E', 2886, 1010);
const crossingSignals = [
  rect('aleja-przejazd-s6', 2742, 1008, 0, 0, {
    crossing: 'aleja-przejazd',
    stopRoadTraffic: true,
    ...parallelCrossingTiming(microCityPhaseOffset),
    twoWay: true,
  }),
  rect('aleja-zebra-s5', 2856, 1008, 0, 0, {
    crossing: 'aleja-zebra',
    ...parallelCrossingTiming(microCityPhaseOffset),
    twoWay: true,
  }),
];

const tram = 'tramwaj-nabrzeze';
const tramPoints = [
  [centre, 0],
  [centre, 800],
  [centre, north - 64],
  [centre, north + 64],
  [centre, south - 64],
  [centre, south + 64],
  [centre, mapHeight],
] as const;
for (const [id, priority, start, stop] of [
  ['aleja', 'signal', 0, 2],
  ['nabrzeze', 'main', 3, 4],
] as const)
  lanes.push(
    polyline(`${id}-tram-N`, tramPoints.slice(start, stop + 1), {
      type: 'tram',
      intersection: id,
      side: 'N',
      width_px: 48,
      speedLimit: 30,
      priorityClass: priority,
    }),
  );
mainSignal('aleja-tram-N', centre + 16, north - 70, 'ns');

const trafficRoutes = [
  polyline(tram, tramPoints, {
    kind: 'tram',
    speed: 7,
    repeat_s: 8,
    start_s: 1,
  }),
  polyline(
    'pasazer-aleja',
    [
      [centre + 14, 800],
      [centre + 150, 800],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'spacer-dlugi-targ',
    [
      [1308, 638],
      [1720, 638],
      [2064, 638],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-nad-motlawa',
    [
      [1328, 1752],
      [1640, 1752],
      [2104, 1752],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-brzezno',
    [
      [2810, 2844],
      [3180, 2844],
      [3620, 2844],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'rower-nad-motlawa',
    [
      [0, 2144],
      [mapWidth, 2144],
    ],
    { kind: 'cyclist', speed: 3.4 },
  ),
  polyline(
    'pieszy-zebra',
    [
      [2832, 1000],
      [2832, 1172],
    ],
    { kind: 'pedestrian', speed: 1.45 },
  ),
];
const trafficControls = [
  rect('aleja-przystanek', centre + 12, 774, 112, 52, {
    kind: 'stop',
    route: tram,
    vertex: 1,
    passenger: 'pasazer-aleja',
  }),
  rect('aleja-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'aleja-tram-N',
    vertex: 2,
    exit: 3,
  }),
  rect('nabrzeze-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'nabrzeze-tram-N',
    vertex: 4,
    exit: 5,
  }),
];

markRoads();
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);
for (let y = 1216; y < 1632; y += tile) mark(3232, y, tiles.solidVertical);
for (let y = 1248; y < 1632; y += 96) mark(3232, y, tiles.bicycle);

const scenery = gdanskScenery(map);
scenery.collisions.push(
  ...waterCollisions('woda'),
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, { kind: 'wall' }),
);
objectLayer('zones', zones);
objectLayer('lanes', lanes);
objectLayer(
  'intersections',
  network.map(({ id, x, y, kind }) =>
    rect(id, x - halfWidth(x), y - 64, 2 * halfWidth(x), 128, { kind }),
  ),
);
objectLayer('crossings', crossings);
objectLayer('signs', signs);
objectLayer('signals', signals);
objectLayer('crossing_signals', crossingSignals);
objectLayer('traffic_routes', trafficRoutes);
objectLayer('traffic_controls', trafficControls);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, {
    road_radius: 224,
    corner_radius: 46,
  }),
]);
objectLayer('driveways', [
  rect('wyjazd-magazyn', 736, 1120, 96, 160, { direction: 'N' }),
]);
objectLayer('spawns', [rect('player', 1390, 836, 0, 0, { heading: 0 })]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);
await write(
  'gdansk',
  10,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90, freeRideOnly: true },
  'compact',
);
