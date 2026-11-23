import { tiles } from '../src/render/artFrames.ts';
import { krakowScenery } from './krakow-scenery.ts';
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

type Point = readonly [number, number];

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
  westSouth: 'debnik',
  centralSouth: 'most',
  eastSouth: 'ogrody',
});

// The river bends between districts. Paint the approaches after the water so
// its remaining tiles can serve as the source of truth for the collision bank.
for (const [x, w, top, bottom] of [
  [0, 768, 1696, 1952],
  [768, 768, 1760, 2048],
  [1536, 768, 1824, 2112],
  [2304, 1536, 1856, 2112],
  [3840, 1024, 1792, 2048],
] as const)
  paint(x, top, w, bottom - top, 'water');

drawRoads();

zone('rynek-deptak', 1312, 352, 864, 352, 'pedestrian_zone', 'cobble', {
  surface: 'rough',
});
zone('rynek-dojscie', 1056, 704, 1120, 256, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('rynek-polnoc', 1344, 256, 768, 96, 'sidewalk', 'sidewalk');
zone('rynek-wejscie', 1696, 832, 96, 128, 'sidewalk', 'sidewalk');
zone('wawel-dziedziniec', 1312, 1312, 864, 416, 'park_path', 'cobble');
zone('wawel-kostka-pod-murem', 1312, 1632, 864, 96, 'park_path', 'cobble', {
  surface: 'rough',
});
zone('wawel-dojscie', 1664, 1216, 128, 96, 'park_path', 'sidewalk');
zone('kazimierz-plac', 2720, 1312, 1024, 384, 'living_zone', 'cobble', {
  surface: 'rough',
});
zone('kazimierz-dojscie', 2848, 1216, 608, 96, 'living_zone', 'cobble');
zone('kazimierz-chodnik', 2752, 1408, 256, 160, 'sidewalk', 'sidewalk');
zone('lacze-ddr-kazimierz', 2752, 1152, 416, 64, 'bike_path', 'bike');
zone('uliczka-kazimierz', 3040, 1216, 128, 384, 'roadway', 'asphalt', {
  direction: 'S',
});
zone('kontrapas-kazimierz', 3136, 1216, 32, 384, 'bike_lane', 'bike', {
  direction: 'N',
});
for (const [start, end] of [
  [0, 960],
  [1088, 2304],
  [2560, 3936],
  [4064, mapWidth],
] as const)
  zone(
    `ddr-bulwary-${start}`,
    start,
    2112,
    end - start,
    64,
    'bike_path',
    'bike',
  );
zone('ciag-bulwary', 2592, 2208, 1280, 64, 'shared_path', 'sidewalk');
zone('bulwary-wjazd-w', 2560, 2112, 32, 160, 'shared_path', 'sidewalk');
zone('bulwary-wjazd-e', 3744, 2112, 128, 96, 'shared_path', 'sidewalk');
zone('kopiec-alejka', 2624, 2816, 768, 64, 'park_path', 'sidewalk');
zone('kopiec-alejka-zachod', 2624, 2880, 64, 32, 'park_path', 'sidewalk');
zone('kopiec-alejka-wschod', 3296, 2880, 96, 32, 'park_path', 'sidewalk');
zone('kopiec-dojscie', 2816, 2560, 64, 256, 'park_path', 'sidewalk');
zone('kopiec-zakaz', 3392, 2816, 192, 64, 'no_bikes', 'sidewalk');
for (const [side, x] of [
  ['e', west + 64],
  ['w', west - 96],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
  });
zone('wyjazd-z-podworza', 736, 1088, 96, 192, 'roadway', 'gravel');
zone('ddr-przejazd-polnoc', 2752, 864, 64, 160, 'bike_path', 'bike');
zone('ddr-przejazd-poludnie', 2752, 1152, 64, 160, 'bike_path', 'bike');

for (const [id, x, y, w] of [
  ['krk-skrot-rynek', 1472, 800, 544],
  ['krk-skrot-kazimierz', 3200, 1504, 384],
  ['krk-skrot-kopiec', 2688, 2880, 608],
] as const) {
  zone(id, x, y, w, 32, 'park_path', 'cobble');
  sign('B-1', id, 'W', x - 8, y + 28);
}

sign('B-9', 'rynek-deptak', 'S', 1552, 716);
sign('B-9', 'kopiec-zakaz', 'W', 3396, 2884);
sign('D-40', 'rynek-dojscie', 'S', 1696, 950);
sign('D-41', 'rynek-dojscie', 'N', 1800, 954);
sign('D-40', 'kazimierz-plac', 'N', 2852, 1296);
sign('D-41', 'kazimierz-plac', 'S', 2912, 1300);
sign('B-2', 'uliczka-kazimierz', 'S', 3176, 1584, { exceptBicycles: true });
sign('P-23', 'kontrapas-kazimierz', 'S', 3152, 1552);
sign('C-13', 'ddr-bulwary-2560', 'W', 2597, 2179);
sign('C-13', 'ddr-bulwary-2560', 'E', 3740, 2180);
sign('C-13/C-16', 'ciag-bulwary', 'W', 2598, 2277);
sign('C-13/C-16', 'ciag-bulwary', 'E', 3868, 2276);
sign('D-46', 'wyjazd-podworze', 'N', 833, 1248);
sign('D-47', 'wyjazd-podworze', 'S', 735, 1216);
sign('A-9', 'debnik-S', 'S', 1088, 3220);
connectRoads();

const railY = 3104;
zone('tor-kolejowy', 448, railY, 1152, 32, 'rail', 'gravel');
const crossings = [
  ...columns.map((x) =>
    rect(
      `bulwary-przejazd-${x}`,
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
  rect('targ-zebra', 1408, 1024, 48, 128, { axis: 'y', kind: 'pedestrian' }),
  rect('debnik-kolej', 928, railY - 8, 192, 48, {
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
    cycle_s: 58,
    offset_s: 14,
    green_s: 8,
    twoWay: true,
  }),
  rect('aleja-zebra-s5', 2856, 1008, 0, 0, {
    crossing: 'aleja-zebra',
    cycle_s: 58,
    offset_s: 14,
    green_s: 8,
    twoWay: true,
  }),
];

const tramX = centre;
const tramPoints: Point[] = [
  [tramX, 0],
  [tramX, 800],
  [tramX, north - 64],
  [tramX, north + 64],
  [tramX, south - 64],
  [tramX, south + 64],
  [tramX, mapHeight],
];
const tram = 'tramwaj-aleja';
for (const [id, priority, start, stop] of [
  ['aleja', 'signal', 0, 2],
  ['most', 'main', 3, 4],
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
    'spacer-rynek',
    [
      [1424, 583],
      [1700, 583],
      [1952, 583],
      [2100, 583],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-kazimierz',
    [
      [2784, 1440],
      [2900, 1440],
      [2976, 1536],
    ],
    { kind: 'pedestrian', speed: 1.4 },
  ),
  polyline(
    'spacer-bulwary',
    [
      [2690, 2240],
      [3150, 2240],
      [3590, 2240],
    ],
    { kind: 'pedestrian', speed: 1.5 },
  ),
  polyline(
    'rower-bulwary',
    [
      [0, 2144],
      [mapWidth, 2144],
    ],
    { kind: 'cyclist', speed: 3.4 },
  ),
  polyline(
    'pieszy-targ',
    [
      [1432, 1008],
      [1432, 1168],
    ],
    { kind: 'pedestrian', speed: 1.45, event_only: true },
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
  rect('most-tram-skrzyzowanie', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'most-tram-N',
    vertex: 4,
    exit: 5,
  }),
];
markRoads();
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);
for (let y = 1216; y < 1600; y += tile) mark(3136, y, tiles.solidVertical);
for (let y = 1248; y < 1600; y += 96) mark(3136, y, tiles.bicycle);

const scenery = krakowScenery(map);
scenery.collisions.push(...waterCollisions('wisla'));
scenery.collisions.push(
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
  rect('wyjazd-podworze', 736, 1120, 96, 160, { direction: 'N' }),
]);
objectLayer('spawns', [rect('player', 1440, 768, 0, 0, { heading: 0 })]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);
await write(
  'krakow',
  10,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90 },
  'compact',
);
