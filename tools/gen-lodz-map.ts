import { tiles } from '../src/render/artFrames.ts';
import { lodzScenery } from './lodz-scenery.ts';
import {
  centre,
  height,
  mapHeight,
  north,
  south,
  tile,
  west,
  width,
  microCityMap,
} from './micro-city-map.ts';
import {
  microCityPhaseOffset,
  parallelCrossingTiming,
} from './signal-timing.ts';
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
} = microCityMap({
  market: 'srodmiescie',
  avenue: 'aleja',
  westSouth: 'kolejowa',
  centralSouth: 'parkowa',
  eastSouth: 'magazyny',
});
drawRoads();

zone('piotrkowska', 1248, 448, 960, 480, 'living_zone', 'cobble');
zone('pasaz-wylaczony', 1632, 768, 32, 64, 'living_zone', 'cobble');
zone('pasaz-drugi-wlot', 1664, 768, 32, 64, 'living_zone', 'cobble');
paint(1152, 640, 96, 160, 'cobble');
paint(2208, 640, 96, 160, 'cobble');
sign('D-40', 'piotrkowska', 'W', 1248, 786);
sign('D-41', 'piotrkowska', 'E', 1258, 645);
sign('D-40', 'piotrkowska', 'E', 2208, 650);
sign('D-41', 'piotrkowska', 'W', 2198, 787);
sign('B-1', 'pasaz-wylaczony', 'W', 1632, 813);
sign('B-1', 'pasaz-drugi-wlot', 'E', 1696, 780);

paint(2656, 1216, 1024, 480, 'cobble');
paint(3200, 1216, 96, 64, 'asphalt');
sign('D-46', 'brama-podworka', 'N', 3190, 1218);
sign('D-47', 'brama-podworka', 'S', 3292, 1218);

zone('uliczka-jednokierunkowa', 3008, 672, 96, 352, 'roadway', 'asphalt', {
  direction: 'S',
});
zone('kontrapas', 3104, 672, 32, 352, 'bike_lane', 'bike', { direction: 'N' });
sign('D-3', 'uliczka-jednokierunkowa', 'N', 2998, 684);
sign('B-2', 'uliczka-jednokierunkowa', 'S', 3000, 1016, {
  exceptBicycles: true,
});
for (const y of [704, 832, 960]) sign('P-23', 'kontrapas', 'S', 3120, y);
paint(2784, 608, 480, 64, 'asphalt');
paint(3008, 960, 128, 64, 'asphalt');
paint(3104, 960, 32, 64, 'bike');

zone('aleja-ddr-polnoc', 2752, 640, 64, 384, 'bike_path', 'bike');
zone('aleja-ddr-poludnie', 2752, 1152, 64, 64, 'bike_path', 'bike');
sign('C-13', 'aleja-ddr-polnoc', 'N', 2744, 660);
sign('D-6a', 'aleja-E', 'E', 2866, 1010);
sign('D-6', 'aleja-E', 'E', 2886, 1010);
zone(
  'park-ciag-pieszo-rowerowy',
  1248,
  2048,
  896,
  96,
  'shared_path',
  'sidewalk',
);
sign('C-13/C-16', 'park-ciag-pieszo-rowerowy', 'W', 1260, 2134);
sign('C-13/C-16', 'park-ciag-pieszo-rowerowy', 'E', 2130, 2054);
zone('park-alejka-piesza', 1728, 2144, 96, 192, 'no_bikes', 'sidewalk');
sign('B-9', 'park-alejka-piesza', 'N', 1720, 2156);
sign('B-9', 'park-alejka-piesza', 'S', 1828, 2320, { displayOnly: true });

for (const [side, x] of [
  ['e', west + 64],
  ['w', west - 96],
] as const)
  zone(`pobocze-${side}`, x, 2624, 32, 960, 'shoulder', 'gravel', {
    shoulderUsable: true,
  });
const railY = 3104;
zone('tor-kolejowy', 448, railY, 1152, 32, 'rail', 'gravel');
sign('A-9', 'kolejowa-S', 'S', 1100, 3216);
connectRoads();

const tram = 'tramwaj-w-alei';
const tramPoints = [
  [centre, 0],
  [centre, north - 64],
  [centre, north + 64],
  [centre, 1456],
  [centre, south - 64],
  [centre, south + 64],
  [centre, mapHeight],
] as const;
for (const [junction, start, end, priorityClass] of [
  ['aleja', 0, 2, 'signal'],
  ['parkowa', 2, 5, 'main'],
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
mainSignal('aleja-tram-N', centre + 16, north - 70, 'ns');
sign('D-17', 'aleja-N', 'N', 2568, 1456);
markRoads();
for (let x = 448; x < 1600; x += tile) mark(x, railY, tiles.rails);

const scenery = lodzScenery(map);
scenery.collisions.push(
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
]);
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
    'pasazer-przystanku',
    [
      [2438, 1456],
      [2592, 1456],
    ],
    { kind: 'passenger', speed: 1.5 },
  ),
  polyline(
    'spacer-piotrkowska',
    [
      [1584, 650],
      [1584, 686],
    ],
    { kind: 'pedestrian', speed: 1.1, repeat_s: 4 },
  ),
  polyline(
    'piesza-miedzy-ogrodkami',
    [
      [1565, 914],
      [1565, 828],
    ],
    { kind: 'pedestrian', speed: 1.1, start_s: 4, repeat_s: 8 },
  ),
  polyline(
    'pieszy-przy-bramie',
    [
      [3152, 1192],
      [3380, 1192],
    ],
    { kind: 'pedestrian', speed: 1.25, repeat_s: 4 },
  ),
  polyline(
    'pieszy-cwiczenie-bramy',
    [
      [3238, 1205],
      [3330, 1205],
    ],
    { kind: 'pedestrian', speed: 1.25, event_only: true },
  ),
  polyline(
    'riksza',
    [
      [2112, 705],
      [1824, 705],
    ],
    { kind: 'cyclist', cycle_body: 'rickshaw', speed: 2, start_s: 2 },
  ),
  polyline(
    'rower-cargo',
    [
      [1750, 705],
      [1290, 705],
    ],
    { kind: 'cyclist', cycle_body: 'cargo', speed: 2.5, start_s: 1 },
  ),
]);
objectLayer('traffic_controls', [
  rect('przystanek-aleja', 2428, 1440, 132, 40, {
    kind: 'stop',
    route: tram,
    vertex: 3,
    passenger: 'pasazer-przystanku',
  }),
  rect('tramwaj-aleja', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'aleja-tram-N',
    vertex: 1,
    exit: 2,
  }),
  rect('tramwaj-parkowa', 0, 0, 0, 0, {
    kind: 'junction',
    route: tram,
    lane: 'parkowa-tram-N',
    vertex: 4,
    exit: 5,
  }),
]);
objectLayer('traffic_islands', [
  rect('wyspa-ronda', ring.x - 96, ring.y - 96, 192, 192, {
    road_radius: 224,
    corner_radius: 46,
  }),
]);
objectLayer('driveways', [
  rect('brama-podworka', 3200, 1136, 96, 144, { direction: 'N' }),
]);
objectLayer('spawns', [rect('player', 1438, 742, 0, 0, { heading: 0 })]);
objectLayer('triggers', []);
for (const [name, objects] of Object.entries(scenery))
  objectLayer(name, objects);

await write(
  'lodz',
  8,
  tileTerrain(width, height, surface),
  markings,
  { duskAt: 90, freeRideOnly: true },
  'compact',
);
